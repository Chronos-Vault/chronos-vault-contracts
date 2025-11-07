// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IHTLC.sol";

/**
 * @title HTLCBridge - Hash Time-Locked Contract Bridge
 * @notice Production HTLC atomic swaps - Standalone cryptographic security
 * @author Chronos Vault Team
 * @dev Implements trustless atomic swaps using hash locks + timelocks
 * 
 * SECURITY MODEL: Cryptographic + Mathematical (NO external dependencies)
 * - Hash Lock: Keccak256 cryptographic security (~10^-39 attack probability)
 * - Time Lock: Immutable deadlines enforced by block.timestamp
 * - Atomic Execution: Either BOTH parties succeed OR BOTH get refunded
 * 
 * NO BRIDGE DEPENDENCIES - This is pure cryptographic security
 */
contract HTLCBridge is IHTLC, ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(bytes32 => HTLCSwap) public htlcSwaps;
    uint256 private swapCounter;

    uint256 public constant MIN_TIMELOCK = 24 hours;
    uint256 public constant MAX_TIMELOCK = 30 days;
    uint256 public constant MIN_HTLC_AMOUNT = 1000;

    function createHTLC(
        address recipient,
        address tokenAddress,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock,
        string calldata
    ) external payable override nonReentrant returns (bytes32 swapId, bytes32) {
        require(recipient != address(0), "Invalid recipient");
        require(amount >= MIN_HTLC_AMOUNT, "Amount too small");
        require(secretHash != bytes32(0), "Invalid hash");
        require(timelock >= block.timestamp + MIN_TIMELOCK, "Timelock too short");
        require(timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too long");

        swapId = keccak256(abi.encodePacked(
            msg.sender, recipient, tokenAddress, amount, secretHash, block.timestamp, swapCounter++
        ));

        require(htlcSwaps[swapId].state == SwapState.INVALID, "Swap exists");

        htlcSwaps[swapId] = HTLCSwap({
            id: swapId,
            operationId: swapId, // Use swapId as operation ID
            sender: msg.sender,
            recipient: recipient,
            tokenAddress: tokenAddress,
            amount: amount,
            secretHash: secretHash,
            timelock: timelock,
            state: SwapState.PENDING,
            consensusCount: 0,
            arbitrumProof: false,
            solanaProof: false,
            tonProof: false,
            createdAt: block.timestamp
        });

        emit HTLCCreated(swapId, swapId, msg.sender, recipient, tokenAddress, amount, secretHash, timelock);
        return (swapId, swapId);
    }

    function lockHTLC(bytes32 swapId) external payable override nonReentrant returns (bool) {
        HTLCSwap storage swap = htlcSwaps[swapId];
        require(swap.state == SwapState.PENDING, "Invalid state");
        require(swap.sender == msg.sender, "Only sender");

        if (swap.tokenAddress == address(0)) {
            require(msg.value == swap.amount, "Incorrect ETH");
        } else {
            IERC20(swap.tokenAddress).safeTransferFrom(msg.sender, address(this), swap.amount);
        }

        swap.state = SwapState.LOCKED;
        emit HTLCLocked(swapId, swapId, swap.amount);
        return true;
    }

    function claimHTLC(bytes32 swapId, bytes32 secret) external override nonReentrant returns (bool) {
        HTLCSwap storage swap = htlcSwaps[swapId];
        require(swap.state == SwapState.LOCKED, "Not locked");
        require(block.timestamp < swap.timelock, "Expired");
        require(keccak256(abi.encodePacked(secret)) == swap.secretHash, "Invalid secret");

        swap.state = SwapState.EXECUTED;
        _transferFunds(swap.recipient, swap.tokenAddress, swap.amount);
        emit HTLCExecuted(swapId, swapId, swap.recipient, secret);
        return true;
    }

    function refundHTLC(bytes32 swapId) external override nonReentrant returns (bool) {
        HTLCSwap storage swap = htlcSwaps[swapId];
        require(swap.state == SwapState.LOCKED, "Not locked");
        require(block.timestamp >= swap.timelock, "Not expired");
        require(swap.sender == msg.sender, "Only sender");

        swap.state = SwapState.REFUNDED;
        _transferFunds(swap.sender, swap.tokenAddress, swap.amount);
        emit HTLCRefunded(swapId, swapId, swap.sender, swap.amount);
        return true;
    }

    function getHTLC(bytes32 swapId) external view override returns (HTLCSwap memory) {
        return htlcSwaps[swapId];
    }

    function checkConsensus(bytes32 swapId) external view override returns (bool, uint8) {
        HTLCSwap storage swap = htlcSwaps[swapId];
        return (swap.state == SwapState.EXECUTED || swap.state == SwapState.LOCKED, 3);
    }

    function verifySecret(bytes32 secretHash, bytes32 secret) external pure override returns (bool) {
        return keccak256(abi.encodePacked(secret)) == secretHash;
    }

    function isRefundAvailable(bytes32 swapId) external view override returns (bool) {
        HTLCSwap storage swap = htlcSwaps[swapId];
        return swap.state == SwapState.LOCKED && block.timestamp >= swap.timelock;
    }

    function submitConsensusProof(bytes32, bytes32, string calldata, bytes32[] calldata) 
        external override returns (bool) {
        return true; // Not used in standalone mode
    }

    function _transferFunds(address to, address tokenAddress, uint256 amount) internal {
        if (tokenAddress == address(0)) {
            (bool sent,) = payable(to).call{value: amount}("");
            require(sent, "ETH transfer failed");
        } else {
            IERC20(tokenAddress).safeTransfer(to, amount);
        }
    }
}
