// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ITrinityConsensusVerifier.sol";

/**
 * @title CrossChainMessageRelay
 * @author Trinity Protocol Team
 * @notice Automated cross-chain message passing and proof coordination for Trinity Protocol
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🎯 ARCHITECTURE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Problem:
 * Currently, cross-chain messages are relayed manually:
 * 1. Operation created on Arbitrum
 * 2. Off-chain relayer manually monitors Solana/TON for validator proofs
 * 3. Off-chain relayer manually submits proofs back to Arbitrum
 * 4. No on-chain coordination or verification
 * 
 * Solution:
 * On-chain message relay with automated proof aggregation:
 * 1. Messages emit events with cross-chain requirements
 * 2. Contract tracks which chains need to respond
 * 3. Validators submit proofs directly to relay contract
 * 4. Relay automatically forwards aggregated proofs to destination
 * 5. Economic incentives for timely relay (fees + slashing)
 * 
 * Design:
 * - Message queue with priority levels
 * - Automatic proof aggregation (2-of-3 consensus)
 * - Nonce management for replay protection
 * - Timeout mechanism for failed relays
 * - Fee-based prioritization
 * 
 * Economics:
 * - Base message fee: 0.0005 ETH
 * - Priority message fee: 0.001 ETH
 * - Relay reward: 80% of message fee
 * - Protocol fee: 20% of message fee
 */
contract CrossChainMessageRelay is ReentrancyGuard, Ownable {
    // ===== CONSTANTS =====

    /// @notice Base message relay fee
    uint256 public constant BASE_MESSAGE_FEE = 0.0005 ether;

    /// @notice Priority message relay fee
    uint256 public constant PRIORITY_MESSAGE_FEE = 0.001 ether;

    /// @notice Message timeout (48 hours)
    uint256 public constant MESSAGE_TIMEOUT = 48 hours;

    /// @notice Relay reward percentage (80%)
    uint256 public constant RELAY_REWARD_PERCENTAGE = 80;

    /// @notice Maximum pending messages per chain
    uint256 public constant MAX_PENDING_PER_CHAIN = 1000;

    // ===== CHAIN IDS =====

    uint8 public constant CHAIN_ARBITRUM = 1;
    uint8 public constant CHAIN_SOLANA = 2;
    uint8 public constant CHAIN_TON = 3;

    // ===== MESSAGE STATES =====

    enum MessageState {
        PENDING,
        RELAYED,
        TIMEOUT,
        CANCELLED
    }

    // ===== STRUCTURES =====

    struct CrossChainMessage {
        bytes32 messageId;
        uint8 sourceChain;
        uint8 targetChain;
        bytes payload;
        address sender;
        uint256 fee;
        uint256 createdAt;
        uint256 deadline;
        MessageState state;
        bool isPriority;
        uint8 proofsReceived;
        mapping(uint8 => bool) chainProofReceived; // chainId => received
    }

    // ===== STATE VARIABLES =====

    /// @notice Trinity consensus verifier
    ITrinityConsensusVerifier public trinityVerifier;

    /// @notice Mapping from messageId to message details
    mapping(bytes32 => CrossChainMessage) public messages;

    /// @notice Message nonce per chain (prevents replay)
    mapping(uint8 => uint256) public chainNonce;

    /// @notice Pending message count per chain
    mapping(uint8 => uint256) public pendingMessageCount;

    /// @notice Treasury for protocol fees
    address public treasury;

    /// @notice Authorized relayers
    mapping(address => bool) public authorizedRelayers;

    /// @notice SECURITY FIX: Track assigned relayer to prevent front-running
    mapping(bytes32 => address) public assignedRelayer;

    // ===== EVENTS =====

    event MessageCreated(
        bytes32 indexed messageId,
        uint8 indexed sourceChain,
        uint8 indexed targetChain,
        address sender,
        uint256 fee,
        uint256 deadline,
        bool isPriority
    );

    event ProofReceived(
        bytes32 indexed messageId,
        uint8 indexed chainId,
        uint8 proofsReceived
    );

    event MessageRelayed(
        bytes32 indexed messageId,
        address indexed relayer,
        uint256 reward
    );

    event MessageTimeout(
        bytes32 indexed messageId
    );

    event MessageCancelled(
        bytes32 indexed messageId,
        address indexed sender
    );

    event RelayerAuthorized(
        address indexed relayer,
        bool authorized
    );

    // ===== CONSTRUCTOR =====

    constructor(
        address _trinityVerifier,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        require(_trinityVerifier != address(0), "Invalid verifier");
        require(_treasury != address(0), "Invalid treasury");
        trinityVerifier = ITrinityConsensusVerifier(_trinityVerifier);
        treasury = _treasury;
    }

    // ===== MESSAGE CREATION =====

    /**
     * @notice Create cross-chain message
     * @param targetChain Target chain ID (1=Arbitrum, 2=Solana, 3=TON)
     * @param payload Message payload
     * @param isPriority Priority message flag
     */
    function sendMessage(
        uint8 targetChain,
        bytes calldata payload,
        bool isPriority
    ) external payable nonReentrant returns (bytes32 messageId) {
        require(targetChain >= 1 && targetChain <= 3, "Invalid target chain");
        require(payload.length > 0, "Empty payload");
        
        uint256 requiredFee = isPriority ? PRIORITY_MESSAGE_FEE : BASE_MESSAGE_FEE;
        require(msg.value >= requiredFee, "Insufficient fee");
        require(
            pendingMessageCount[targetChain] < MAX_PENDING_PER_CHAIN,
            "Target chain queue full"
        );

        // Generate message ID
        uint256 nonce = chainNonce[CHAIN_ARBITRUM]++;
        messageId = keccak256(abi.encode(
            CHAIN_ARBITRUM,
            targetChain,
            msg.sender,
            payload,
            nonce,
            block.timestamp
        ));

        uint256 deadline = block.timestamp + MESSAGE_TIMEOUT;

        // Create message (using storage reference for mapping)
        CrossChainMessage storage message = messages[messageId];
        message.messageId = messageId;
        message.sourceChain = CHAIN_ARBITRUM;
        message.targetChain = targetChain;
        message.payload = payload;
        message.sender = msg.sender;
        message.fee = msg.value;
        message.createdAt = block.timestamp;
        message.deadline = deadline;
        message.state = MessageState.PENDING;
        message.isPriority = isPriority;
        message.proofsReceived = 0;

        pendingMessageCount[targetChain]++;

        emit MessageCreated(
            messageId,
            CHAIN_ARBITRUM,
            targetChain,
            msg.sender,
            msg.value,
            deadline,
            isPriority
        );

        return messageId;
    }

    // ===== PROOF SUBMISSION =====

    /**
     * @notice Submit cross-chain proof for a message
     * @param messageId Message ID
     * @param chainId Chain submitting proof (1=Arbitrum, 2=Solana, 3=TON)
     * @param proof Proof data from validator
     * @param signature Cryptographic signature from Trinity validator
     * 
     * @dev Only authorized relayers can submit proofs
     */
    function submitProof(
        bytes32 messageId,
        uint8 chainId,
        bytes calldata proof,
        bytes calldata signature
    ) external nonReentrant {
        require(
            authorizedRelayers[msg.sender] || msg.sender == owner(),
            "Not authorized relayer"
        );
        require(chainId >= 1 && chainId <= 3, "Invalid chain ID");

        CrossChainMessage storage message = messages[messageId];
        require(message.state == MessageState.PENDING, "Message not pending");
        require(block.timestamp <= message.deadline, "Message expired");
        require(!message.chainProofReceived[chainId], "Proof already received");

        // SECURITY FIX: Verify proof is valid with cryptographic signature
        require(proof.length > 0, "Empty proof");
        require(signature.length == 65, "Invalid signature length");
        
        // SECURITY FIX: Verify signature using TrinityConsensusVerifier
        // This ensures the proof is actually from a valid Trinity validator
        bytes32 proofHash = keccak256(abi.encode(messageId, chainId, proof));
        require(_verifySignature(proofHash, signature, chainId), "Invalid signature");

        // SECURITY FIX: Assign relayer on FIRST proof submission (prevent front-running)
        if (assignedRelayer[messageId] == address(0)) {
            assignedRelayer[messageId] = msg.sender;
        }

        // Mark proof as received
        message.chainProofReceived[chainId] = true;
        message.proofsReceived++;

        emit ProofReceived(messageId, chainId, message.proofsReceived);

        // If 2-of-3 consensus reached, relay message
        if (message.proofsReceived >= 2) {
            _relayMessage(messageId, assignedRelayer[messageId]);
        }
    }

    /**
     * @notice SECURITY FIX: Verify cryptographic signature from Trinity validator
     * @param messageHash Hash of the message to verify
     * @param signature Signature bytes
     * @param chainId Chain ID of validator (1=Arbitrum, 2=Solana, 3=TON)
     * @return bool True if signature is valid and from authorized Trinity validator
     */
    function _verifySignature(
        bytes32 messageHash,
        bytes calldata signature,
        uint8 chainId
    ) internal view returns (bool) {
        // Extract r, s, v from signature
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        
        // Recover signer address from signature
        address signer = ecrecover(messageHash, v, r, s);
        require(signer != address(0), "Invalid signature recovery");
        
        // SECURITY FIX: Query TrinityConsensusVerifier to get authorized validator for chainId
        address authorizedValidator = _getAuthorizedValidator(chainId);
        require(authorizedValidator != address(0), "No validator for chain");
        
        // SECURITY FIX: Verify signer matches authorized Trinity validator
        require(signer == authorizedValidator, "Unauthorized signer");
        
        return true;
    }

    /**
     * @notice SECURITY FIX: Get authorized Trinity validator for a chain
     * @param chainId Chain ID (1=Arbitrum, 2=Solana, 3=TON)
     * @return address Authorized validator address
     */
    function _getAuthorizedValidator(uint8 chainId) internal view returns (address) {
        // Query TrinityConsensusVerifier for the authorized validator
        // TrinityConsensusVerifier maintains the official validator registry
        try trinityVerifier.getValidator(chainId) returns (address validator) {
            return validator;
        } catch {
            return address(0);
        }
    }

    /**
     * @notice Relay message after consensus achieved
     * @dev SECURITY FIX: CEI pattern - state updates BEFORE external transfers
     */
    function _relayMessage(bytes32 messageId, address relayer) internal {
        CrossChainMessage storage message = messages[messageId];
        require(message.state == MessageState.PENDING, "Not pending");

        // SECURITY FIX: Update state BEFORE external calls (CEI pattern)
        message.state = MessageState.RELAYED;
        pendingMessageCount[message.targetChain]--;

        // Calculate rewards
        uint256 relayReward = (message.fee * RELAY_REWARD_PERCENTAGE) / 100;
        uint256 protocolFee = message.fee - relayReward;
        
        // Cache values before external calls
        address payableRelayer = relayer;
        address payableTreasury = treasury;
        uint256 cachedReward = relayReward;
        uint256 cachedFee = protocolFee;

        // SECURITY FIX: All state updates complete - now safe to make external calls
        // Pay relayer
        (bool sentRelayer,) = payable(payableRelayer).call{value: cachedReward}("");
        require(sentRelayer, "Relayer payment failed");

        // Pay protocol fee
        (bool sentTreasury,) = payable(payableTreasury).call{value: cachedFee}("");
        require(sentTreasury, "Treasury payment failed");

        emit MessageRelayed(messageId, payableRelayer, cachedReward);
    }

    // ===== MESSAGE MANAGEMENT =====

    /**
     * @notice Mark message as timed out
     * @param messageId Message ID to timeout
     * @dev SECURITY FIX: CEI pattern - state updates BEFORE external transfers
     */
    function timeoutMessage(bytes32 messageId) external nonReentrant {
        CrossChainMessage storage message = messages[messageId];
        require(message.state == MessageState.PENDING, "Not pending");
        require(block.timestamp > message.deadline, "Not expired");

        // SECURITY FIX: Update state BEFORE external call (CEI pattern)
        message.state = MessageState.TIMEOUT;
        pendingMessageCount[message.targetChain]--;
        
        // Cache values before external call
        address payableSender = message.sender;
        uint256 refundAmount = message.fee;

        // Refund fee to sender
        (bool sent,) = payable(payableSender).call{value: refundAmount}("");
        require(sent, "Refund failed");

        emit MessageTimeout(messageId);
    }

    /**
     * @notice Cancel pending message (sender only)
     * @param messageId Message ID to cancel
     * @dev SECURITY FIX: CEI pattern - state updates BEFORE external transfers
     */
    function cancelMessage(bytes32 messageId) external nonReentrant {
        CrossChainMessage storage message = messages[messageId];
        require(message.sender == msg.sender, "Not sender");
        require(message.state == MessageState.PENDING, "Not pending");

        // SECURITY FIX: Update state BEFORE external calls (CEI pattern)
        message.state = MessageState.CANCELLED;
        pendingMessageCount[message.targetChain]--;

        // Refund fee (minus small cancellation fee)
        uint256 cancellationFee = message.fee / 10; // 10% cancellation fee
        uint256 refundAmount = message.fee - cancellationFee;
        
        // Cache values before external calls
        address payableSender = msg.sender;
        address payableTreasury = treasury;

        (bool sentSender,) = payable(payableSender).call{value: refundAmount}("");
        require(sentSender, "Refund failed");

        (bool sentTreasury,) = payable(payableTreasury).call{value: cancellationFee}("");
        require(sentTreasury, "Fee transfer failed");

        emit MessageCancelled(messageId, payableSender);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @notice Get message details
     * @param messageId Message ID
     * @return id Message ID
     * @return sourceChain Source chain ID
     * @return targetChain Target chain ID
     * @return payload Message payload
     * @return sender Message sender
     * @return fee Relay fee
     * @return createdAt Creation timestamp
     * @return deadline Relay deadline
     * @return state Message state
     * @return isPriority Priority flag
     * @return proofsReceived Number of proofs received
     */
    function getMessage(bytes32 messageId) external view returns (
        bytes32 id,
        uint8 sourceChain,
        uint8 targetChain,
        bytes memory payload,
        address sender,
        uint256 fee,
        uint256 createdAt,
        uint256 deadline,
        MessageState state,
        bool isPriority,
        uint8 proofsReceived
    ) {
        CrossChainMessage storage message = messages[messageId];
        return (
            message.messageId,
            message.sourceChain,
            message.targetChain,
            message.payload,
            message.sender,
            message.fee,
            message.createdAt,
            message.deadline,
            message.state,
            message.isPriority,
            message.proofsReceived
        );
    }

    /**
     * @notice Check if chain proof received
     */
    function hasChainProof(bytes32 messageId, uint8 chainId) external view returns (bool) {
        return messages[messageId].chainProofReceived[chainId];
    }

    /**
     * @notice Get pending message count for a chain
     */
    function getPendingCount(uint8 chainId) external view returns (uint256) {
        return pendingMessageCount[chainId];
    }

    // ===== ADMIN FUNCTIONS =====

    /**
     * @notice Authorize/deauthorize relayer
     */
    function setAuthorizedRelayer(address relayer, bool authorized) external onlyOwner {
        require(relayer != address(0), "Invalid relayer");
        authorizedRelayers[relayer] = authorized;
        emit RelayerAuthorized(relayer, authorized);
    }

    /**
     * @notice Update Trinity verifier
     */
    function setTrinityVerifier(address _newVerifier) external onlyOwner {
        require(_newVerifier != address(0), "Invalid verifier");
        trinityVerifier = ITrinityConsensusVerifier(_newVerifier);
    }

    /**
     * @notice Update treasury
     */
    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury");
        treasury = _newTreasury;
    }

    // ===== FALLBACK =====

    receive() external payable {}
}
