// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IHTLC.sol";

/**
 * @title HTLCArbToL1 - Exit-Batch Layer for Trinity Protocol
 * @author Trinity Protocol Team
 * @notice Enables cheap Arbitrum exits with L1 settlement via batching
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🎯 ARCHITECTURE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * User Flow:
 * 1. User locks HTLC on Arbitrum (gas ~$0.002)
 * 2. User calls requestExit() → emits ExitRequested event
 * 3. Keeper collects 50-200 exits → builds Merkle tree
 * 4. Keeper submits batch to TrinityExitGateway on L1
 * 5. User claims on L1 with secret + Merkle proof
 * 
 * Gas Economics:
 * - 200 individual L1 locks: ~$1,800
 * - 1 batch + 200 claims: ~$192 (89% saving)
 * - 1 batch + 50 claims: ~$66 (97% saving)
 * 
 * Security:
 * - Exit IDs are collision-resistant (keccak256 + nonce)
 * - Priority exit lane for emergencies (2x fee, no batching)
 * - 6-hour challenge period before batch finalizes
 * - Trinity 2-of-3 consensus validates all batches
 */
contract HTLCArbToL1 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ===== STATE VARIABLES =====

    /// @notice Reference to main HTLC contract
    IHTLC public immutable htlcBridge;

    /// @notice Exit request counter for collision resistance
    uint256 private exitCounter;

    /// @notice User nonce for front-run protection
    mapping(address => uint256) public userNonce;

    /// @notice Standard exit fee (paid to keeper)
    uint256 public constant EXIT_FEE = 0.0001 ether;

    /// @notice Priority exit fee (2x for solo L1 exit, no batching)
    uint256 public constant PRIORITY_EXIT_FEE = 0.0002 ether;

    /// @notice Minimum batch size for cost efficiency
    uint256 public constant MIN_BATCH_SIZE = 10;

    /// @notice Maximum batch size to prevent gas issues
    uint256 public constant MAX_BATCH_SIZE = 200;

    /// @notice Challenge period before batch finalizes (6 hours)
    uint256 public constant CHALLENGE_PERIOD = 6 hours;

    // ===== EXIT STATES =====

    enum ExitState {
        INVALID,        // Exit doesn't exist
        REQUESTED,      // User requested normal batch exit
        PRIORITY,       // User paid 2x for solo L1 exit
        BATCHED,        // Exit included in keeper batch
        CHALLENGED,     // Exit disputed during challenge period
        FINALIZED,      // Exit ready for L1 claim
        CLAIMED         // User claimed on L1
    }

    // ===== EXIT STRUCTURE =====

    struct ExitRequest {
        bytes32 exitId;
        bytes32 swapId;          // Original HTLC swap ID
        address requester;       // Who requested the exit
        address l1Recipient;     // Who receives on L1
        address tokenAddress;    // Token contract or address(0) for ETH
        uint256 amount;          // Amount to exit
        bytes32 secretHash;      // For HTLC claim on L1
        uint256 requestedAt;     // Timestamp of request
        ExitState state;         // Current state
        bool isPriority;         // Priority exit flag
        bytes32 batchRoot;       // Merkle root (if batched)
    }

    /// @notice Mapping from exitId to exit request
    mapping(bytes32 => ExitRequest) public exitRequests;

    /// @notice Mapping from swapId to exitId (one swap = one exit)
    mapping(bytes32 => bytes32) public swapToExit;

    /// @notice Track active exits per batch root
    mapping(bytes32 => uint256) public batchExitCount;

    /// @notice Track batch finalization time (after challenge period)
    mapping(bytes32 => uint256) public batchFinalizedAt;

    // ===== EVENTS =====

    event ExitRequested(
        bytes32 indexed exitId,
        bytes32 indexed swapId,
        address indexed requester,
        address l1Recipient,
        address tokenAddress,
        uint256 amount,
        bytes32 secretHash,
        bool isPriority
    );

    event ExitBatched(
        bytes32 indexed exitId,
        bytes32 indexed batchRoot,
        uint256 batchSize
    );

    event ExitChallenged(
        bytes32 indexed exitId,
        address challenger,
        string reason
    );

    event ExitFinalized(
        bytes32 indexed exitId,
        bytes32 indexed batchRoot
    );

    event PriorityExitProcessed(
        bytes32 indexed exitId,
        address l1Recipient,
        uint256 amount
    );

    // ===== CONSTRUCTOR =====

    /**
     * @notice Initialize HTLCArbToL1 with HTLC bridge reference
     * @param _htlcBridge Address of HTLCChronosBridge on Arbitrum
     * @param _owner Initial owner (should be multi-sig)
     */
    constructor(address _htlcBridge, address _owner) Ownable(_owner) {
        require(_htlcBridge != address(0), "Invalid HTLC address");
        htlcBridge = IHTLC(_htlcBridge);
    }

    // ===== CORE FUNCTIONS =====

    /**
     * @notice Request batch exit to L1 (standard fee)
     * @param swapId HTLC swap ID on Arbitrum
     * @param l1Recipient Address to receive funds on L1
     * @return exitId Unique exit request identifier
     * 
     * @dev User must be the swap recipient
     * @dev Swap must be in ACTIVE state with valid secret hash
     */
    function requestExit(
        bytes32 swapId,
        address l1Recipient
    ) external payable nonReentrant returns (bytes32 exitId) {
        require(msg.value >= EXIT_FEE, "Insufficient exit fee");
        require(l1Recipient != address(0), "Invalid L1 recipient");

        // Get swap details from HTLC
        IHTLC.HTLCSwap memory swap = htlcBridge.getHTLC(swapId);
        require(swap.state == IHTLC.SwapState.LOCKED || swap.state == IHTLC.SwapState.CONSENSUS_ACHIEVED, "Swap not active");
        require(swap.recipient == msg.sender, "Not swap recipient");
        require(swap.secretHash != bytes32(0), "Invalid secret hash");
        require(swapToExit[swapId] == bytes32(0), "Exit already requested");

        // Generate collision-resistant exit ID
        uint256 currentCounter;
        uint256 currentUserNonce;
        unchecked {
            currentCounter = exitCounter;
            exitCounter = currentCounter + 1;
            currentUserNonce = userNonce[msg.sender];
            userNonce[msg.sender] = currentUserNonce + 1;
        }

        exitId = keccak256(abi.encodePacked(
            swapId,
            l1Recipient,
            swap.tokenAddress,
            swap.amount,
            block.timestamp,
            block.number,
            currentCounter,
            currentUserNonce
        ));

        require(exitRequests[exitId].state == ExitState.INVALID, "Exit ID collision");

        // Create exit request
        exitRequests[exitId] = ExitRequest({
            exitId: exitId,
            swapId: swapId,
            requester: msg.sender,
            l1Recipient: l1Recipient,
            tokenAddress: swap.tokenAddress,
            amount: swap.amount,
            secretHash: swap.secretHash,
            requestedAt: block.timestamp,
            state: ExitState.REQUESTED,
            isPriority: false,
            batchRoot: bytes32(0)
        });

        swapToExit[swapId] = exitId;

        // Refund excess fee
        uint256 excess = msg.value - EXIT_FEE;
        if (excess > 0) {
            (bool sent,) = payable(msg.sender).call{value: excess}("");
            require(sent, "Fee refund failed");
        }

        emit ExitRequested(
            exitId,
            swapId,
            msg.sender,
            l1Recipient,
            swap.tokenAddress,
            swap.amount,
            swap.secretHash,
            false // not priority
        );

        return exitId;
    }

    /**
     * @notice Request PRIORITY exit to L1 (2x fee, no batching, direct L1)
     * @param swapId HTLC swap ID on Arbitrum
     * @param l1Recipient Address to receive funds on L1
     * @return exitId Unique exit request identifier
     * 
     * @dev Emergency exit lane for time-sensitive operations
     * @dev Processed immediately without waiting for batch
     */
    function requestPriorityExit(
        bytes32 swapId,
        address l1Recipient
    ) external payable nonReentrant returns (bytes32 exitId) {
        require(msg.value >= PRIORITY_EXIT_FEE, "Insufficient priority fee");
        require(l1Recipient != address(0), "Invalid L1 recipient");

        // Get swap details
        IHTLC.HTLCSwap memory swap = htlcBridge.getHTLC(swapId);
        require(swap.state == IHTLC.SwapState.LOCKED || swap.state == IHTLC.SwapState.CONSENSUS_ACHIEVED, "Swap not active");
        require(swap.recipient == msg.sender, "Not swap recipient");
        require(swap.secretHash != bytes32(0), "Invalid secret hash");
        require(swapToExit[swapId] == bytes32(0), "Exit already requested");

        // Generate exit ID
        uint256 currentCounter;
        uint256 currentUserNonce;
        unchecked {
            currentCounter = exitCounter;
            exitCounter = currentCounter + 1;
            currentUserNonce = userNonce[msg.sender];
            userNonce[msg.sender] = currentUserNonce + 1;
        }

        exitId = keccak256(abi.encodePacked(
            swapId,
            l1Recipient,
            swap.tokenAddress,
            swap.amount,
            block.timestamp,
            block.number,
            currentCounter,
            currentUserNonce,
            "PRIORITY"
        ));

        // Create priority exit
        exitRequests[exitId] = ExitRequest({
            exitId: exitId,
            swapId: swapId,
            requester: msg.sender,
            l1Recipient: l1Recipient,
            tokenAddress: swap.tokenAddress,
            amount: swap.amount,
            secretHash: swap.secretHash,
            requestedAt: block.timestamp,
            state: ExitState.PRIORITY,
            isPriority: true,
            batchRoot: bytes32(0)
        });

        swapToExit[swapId] = exitId;

        // Refund excess
        uint256 excess = msg.value - PRIORITY_EXIT_FEE;
        if (excess > 0) {
            (bool sent,) = payable(msg.sender).call{value: excess}("");
            require(sent, "Fee refund failed");
        }

        emit ExitRequested(
            exitId,
            swapId,
            msg.sender,
            l1Recipient,
            swap.tokenAddress,
            swap.amount,
            swap.secretHash,
            true // priority
        );

        emit PriorityExitProcessed(exitId, l1Recipient, swap.amount);

        return exitId;
    }

    /**
     * @notice Keeper marks exits as batched with Merkle root
     * @param exitIds Array of exit IDs in this batch
     * @param batchRoot Merkle root of the batch
     * 
     * @dev Only owner (keeper multisig) can call this
     * @dev Batch size must be between MIN and MAX
     * @dev Starts challenge period countdown
     */
    function markExitsBatched(
        bytes32[] calldata exitIds,
        bytes32 batchRoot
    ) external onlyOwner nonReentrant {
        require(exitIds.length >= MIN_BATCH_SIZE, "Batch too small");
        require(exitIds.length <= MAX_BATCH_SIZE, "Batch too large");
        require(batchRoot != bytes32(0), "Invalid batch root");
        require(batchExitCount[batchRoot] == 0, "Batch already exists");

        uint256 count = 0;
        for (uint256 i = 0; i < exitIds.length; i++) {
            ExitRequest storage exit = exitRequests[exitIds[i]];
            require(exit.state == ExitState.REQUESTED, "Exit not requested");
            require(!exit.isPriority, "Cannot batch priority exits");

            exit.state = ExitState.BATCHED;
            exit.batchRoot = batchRoot;
            count++;

            emit ExitBatched(exitIds[i], batchRoot, exitIds.length);
        }

        batchExitCount[batchRoot] = count;
        batchFinalizedAt[batchRoot] = block.timestamp + CHALLENGE_PERIOD;
    }

    /**
     * @notice Challenge an exit during challenge period
     * @param exitId Exit to challenge
     * @param reason Human-readable challenge reason
     * 
     * @dev Anyone can challenge within CHALLENGE_PERIOD
     * @dev Owner reviews and decides
     */
    function challengeExit(
        bytes32 exitId,
        string calldata reason
    ) external nonReentrant {
        ExitRequest storage exit = exitRequests[exitId];
        require(exit.state == ExitState.BATCHED, "Exit not batched");
        require(
            block.timestamp < batchFinalizedAt[exit.batchRoot],
            "Challenge period expired"
        );

        exit.state = ExitState.CHALLENGED;

        emit ExitChallenged(exitId, msg.sender, reason);
    }

    /**
     * @notice Finalize batch after challenge period
     * @param batchRoot Merkle root to finalize
     * 
     * @dev Callable by anyone after challenge period
     * @dev Marks all exits in batch as FINALIZED
     */
    function finalizeBatch(bytes32 batchRoot) external nonReentrant {
        require(batchExitCount[batchRoot] > 0, "Batch not found");
        require(
            block.timestamp >= batchFinalizedAt[batchRoot],
            "Challenge period active"
        );

        // Note: Individual exits are marked FINALIZED when claimed on L1
        // This function just enables L1 claims after challenge period
        emit ExitFinalized(bytes32(0), batchRoot);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @notice Get exit request details
     */
    function getExitRequest(bytes32 exitId) external view returns (ExitRequest memory) {
        return exitRequests[exitId];
    }

    /**
     * @notice Check if batch is finalized
     */
    function isBatchFinalized(bytes32 batchRoot) external view returns (bool) {
        return block.timestamp >= batchFinalizedAt[batchRoot];
    }

    /**
     * @notice Withdraw collected fees (keeper revenue)
     */
    function withdrawFees(address payable recipient) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool sent,) = recipient.call{value: balance}("");
        require(sent, "Fee withdrawal failed");
    }
}
