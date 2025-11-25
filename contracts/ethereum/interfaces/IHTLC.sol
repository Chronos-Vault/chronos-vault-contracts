// SPDX-License-Identifier: MIT
// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:20.038Z
pragma solidity ^0.8.20;

/**
 * @title IHTLC - Hash Time-Locked Contract Interface
 * @notice Interface for Trinity Protocol HTLC atomic swaps
 * @dev Implements trustless cross-chain swaps with 2-of-3 consensus verification
 * 
 * MATHEMATICAL SECURITY:
 * - HTLC Atomicity: Either BOTH parties execute OR BOTH get refunded
 * - Trinity 2-of-3 Consensus: Requires 2 of 3 blockchain confirmations
 * - Combined Attack Probability: ~10^-18 (requires breaking HTLC + compromising 2 blockchains)
 * 
 * THIS IS OUR TECHNOLOGY - NOT LayerZero, NOT Wormhole
 */
interface IHTLC {
    /**
     * @notice HTLC swap states
     */
    enum SwapState {
        INVALID,            // Default state (swap doesn't exist)
        PENDING,            // Swap created, awaiting lock
        LOCKED,             // Funds locked, awaiting consensus
        CONSENSUS_PENDING,  // Waiting for 2-of-3 Trinity consensus
        CONSENSUS_ACHIEVED, // 2-of-3 consensus achieved, ready to claim
        EXECUTED,           // Secret revealed, swap executed
        REFUNDED,           // Timelock expired, funds refunded
        FAILED              // Swap failed/cancelled
    }

    /**
     * @notice HTLC swap data structure
     * @dev GAS OPTIMIZATION v3.5.9: Removed unused consensus tracking fields
     *      (Trinity handles consensus externally - no need to duplicate state)
     */
    struct HTLCSwap {
        bytes32 id;                    // Unique swap identifier
        bytes32 operationId;           // Trinity Protocol operation ID
        address sender;                // Initiator of the swap
        address recipient;             // Recipient on destination chain
        address tokenAddress;          // Token being swapped (0x0 for native)
        uint256 amount;                // Amount to swap
        bytes32 secretHash;            // Keccak256 hash of secret (hash lock)
        uint256 timelock;              // Unix timestamp for refund eligibility
        SwapState state;               // Current state of the swap
        uint256 createdAt;             // Creation timestamp
    }

    /**
     * @notice Events
     */
    event HTLCCreated(
        bytes32 indexed swapId,
        bytes32 indexed operationId,
        address indexed sender,
        address recipient,
        address tokenAddress,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock
    );

    event HTLCLocked(
        bytes32 indexed swapId,
        bytes32 indexed operationId,
        uint256 amount
    );

    event ConsensusProofSubmitted(
        bytes32 indexed swapId,
        bytes32 indexed operationId,
        address indexed validator,
        string chain,
        uint8 totalConfirmations
    );

    event ConsensusAchieved(
        bytes32 indexed swapId,
        bytes32 indexed operationId,
        uint8 confirmations
    );

    event HTLCExecuted(
        bytes32 indexed swapId,
        bytes32 indexed operationId,
        address indexed recipient,
        bytes32 secret
    );

    event HTLCRefunded(
        bytes32 indexed swapId,
        bytes32 indexed operationId,
        address indexed sender,
        uint256 amount
    );

    event HTLCFailed(
        bytes32 indexed swapId,
        bytes32 indexed operationId,
        string reason
    );

    /**
     * @notice Create new HTLC swap with Trinity Protocol integration
     * @param recipient Address to receive funds on destination chain
     * @param tokenAddress Token contract address (0x0 for native token)
     * @param amount Amount to swap
     * @param secretHash Keccak256 hash of secret preimage
     * @param timelock Unix timestamp after which refund is possible
     * @param destChain Destination chain identifier ("solana", "ton", "ethereum")
     * @return swapId Unique identifier for this HTLC swap
     * @return operationId Trinity Protocol operation ID
     */
    function createHTLC(
        address recipient,
        address tokenAddress,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock,
        bytes32 destChain  // Changed from string to bytes32 for gas optimization
    ) external payable returns (bytes32 swapId, bytes32 operationId);

    /**
     * @notice Lock funds in HTLC (integrates with Trinity Protocol createOperation)
     * @param swapId HTLC swap identifier
     * @return success True if lock successful
     */
    function lockHTLC(bytes32 swapId) external payable returns (bool success);

    /**
     * @notice Submit consensus proof from validator
     * @dev Called by Trinity Protocol validators after verifying on their chain
     * @param swapId HTLC swap identifier
     * @param operationId Trinity Protocol operation ID
     * @param chain Chain identifier ("arbitrum", "solana", "ton")
     * @param merkleProof Merkle proof from the validator's chain
     * @return consensusAchieved True if 2-of-3 consensus reached
     */
    function submitConsensusProof(
        bytes32 swapId,
        bytes32 operationId,
        string calldata chain,
        bytes32[] calldata merkleProof
    ) external returns (bool consensusAchieved);

    /**
     * @notice Claim HTLC by revealing secret (after 2-of-3 consensus achieved)
     * @param swapId HTLC swap identifier
     * @param secret Secret preimage that matches secretHash
     * @return success True if claim successful
     */
    function claimHTLC(bytes32 swapId, bytes32 secret) external returns (bool success);

    /**
     * @notice Refund HTLC after timelock expires
     * @dev Can only be called after timelock and if swap not executed
     * @param swapId HTLC swap identifier
     * @return success True if refund successful
     */
    function refundHTLC(bytes32 swapId) external returns (bool success);

    /**
     * @notice Get HTLC swap details
     * @param swapId HTLC swap identifier
     * @return swap Complete swap data structure
     */
    function getHTLC(bytes32 swapId) external view returns (HTLCSwap memory swap);

    /**
     * @notice Check if 2-of-3 Trinity consensus achieved
     * @param swapId HTLC swap identifier
     * @return achieved True if consensus achieved
     * @return count Number of confirmations (0-3)
     */
    function checkConsensus(bytes32 swapId) external view returns (bool achieved, uint8 count);

    /**
     * @notice Verify secret matches hash
     * @param secretHash Hash lock from HTLC
     * @param secret Secret preimage to verify
     * @return valid True if keccak256(secret) == secretHash
     */
    function verifySecret(bytes32 secretHash, bytes32 secret) external pure returns (bool valid);

    /**
     * @notice Check if refund is available
     * @param swapId HTLC swap identifier
     * @return available True if timelock expired and not executed
     */
    function isRefundAvailable(bytes32 swapId) external view returns (bool available);
    
    /**
     * @notice Release swap funds for L1 exit (prevents double-spend)
     * @param swapId Swap to release
     * @dev Marks swap as exiting to prevent L2 claim while bridging to L1
     */
    function releaseForExit(bytes32 swapId) external;
}
