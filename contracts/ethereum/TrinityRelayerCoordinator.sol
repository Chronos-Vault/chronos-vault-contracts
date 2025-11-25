// SPDX-License-Identifier: MIT
// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:03.697Z
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ITrinityConsensusVerifier.sol";

/**
 * @title TrinityRelayerCoordinator
 * @author Trinity Protocol Team
 * @notice Automated multi-chain proof relaying and consensus coordination
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🎯 ARCHITECTURE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Problem:
 * Currently, Trinity proof relay is manual:
 * 1. Off-chain relayer monitors all 3 chains (Arbitrum, Solana, TON)
 * 2. Relayer collects validator signatures manually
 * 3. Relayer submits proofs to TrinityConsensusVerifier manually
 * 4. No automated fallback if relayer fails
 * 
 * Solution:
 * On-chain coordination of proof relay with economic incentives:
 * 1. Relayers register and post bonds
 * 2. Operations emit events with proof requirements
 * 3. Relayers compete to submit valid proofs first
 * 4. First valid proof earns the relay fee
 * 5. Invalid proofs result in slashing
 * 
 * Design:
 * - Proof bounty system (operations pay relay fees)
 * - Automated validator signature aggregation
 * - Nonce management for proof freshness
 * - Slashing for invalid/duplicate proofs
 * - Fallback mechanism if no relayer submits within timeout
 * 
 * Economics:
 * - Base relay fee: 0.001 ETH per operation
 * - Express relay fee: 0.002 ETH (priority queue)
 * - Relayer bond: 0.5 ETH (prevents spam)
 * - Slash amount: 10% of bond for invalid proofs
 */
contract TrinityRelayerCoordinator is ReentrancyGuard, Pausable, Ownable {
    // ===== CONSTANTS =====

    /// @notice Minimum relayer bond
    uint256 public constant MIN_RELAYER_BOND = 0.5 ether;

    /// @notice Base relay fee per operation
    uint256 public constant BASE_RELAY_FEE = 0.001 ether;

    /// @notice Express relay fee (priority)
    uint256 public constant EXPRESS_RELAY_FEE = 0.002 ether;

    /// @notice Proof submission timeout (24 hours)
    uint256 public constant PROOF_TIMEOUT = 24 hours;

    /// @notice Slash percentage for invalid proofs
    uint256 public constant INVALID_PROOF_SLASH = 10;

    /// @notice Maximum pending proofs per relayer
    uint256 public constant MAX_PENDING_PROOFS_PER_RELAYER = 50;

    // ===== RELAYER STATES =====

    enum RelayerState {
        INVALID,
        ACTIVE,
        SUSPENDED,
        SLASHED
    }

    // ===== PROOF REQUEST STATES =====

    enum ProofRequestState {
        PENDING,
        RELAYED,
        EXPIRED,
        CANCELLED
    }

    // ===== STRUCTURES =====

    struct Relayer {
        address relayerAddress;
        uint256 bondAmount;
        uint256 registeredAt;
        RelayerState state;
        uint256 successfulRelays;
        uint256 failedRelays;
        uint256 totalFeesEarned;
        uint256 activePendingProofs;
    }

    struct ProofRequest {
        bytes32 operationId;
        address requester;
        uint256 relayFee;
        uint256 requestedAt;
        uint256 deadline;
        ProofRequestState state;
        bool isExpress;
        address assignedRelayer;
        uint8 proofsReceived;                    // ARCHITECTURE FIX: Track number of chain proofs received
        mapping(uint8 => bool) chainProofReceived; // ARCHITECTURE FIX: Track which chains submitted proofs
    }

    // ===== STATE VARIABLES =====

    /// @notice TrinityConsensusVerifier contract
    ITrinityConsensusVerifier public trinityVerifier;

    /// @notice Mapping from relayer address to relayer details
    mapping(address => Relayer) public relayers;

    /// @notice List of active relayers
    address[] public activeRelayers;

    /// @notice Mapping for O(1) removal from active relayers
    /// @dev SECURITY FIX: Stores index + 1 (0 = not present)
    mapping(address => uint256) private activeRelayerIndex;

    /// @notice Mapping from operationId to proof request
    mapping(bytes32 => ProofRequest) public proofRequests;

    /// @notice Queue of pending proof requests (FIFO)
    bytes32[] public pendingProofQueue;

    /// @notice Express queue (priority)
    bytes32[] public expressProofQueue;
    
    /// @notice SECURITY FIX: Track queue front pointers (avoid unbounded growth)
    uint256 public pendingQueueFront;
    uint256 public expressQueueFront;

    /// @notice Treasury for fees
    address public treasury;

    // ===== EVENTS =====

    event RelayerRegistered(
        address indexed relayer,
        uint256 bondAmount
    );

    event RelayerSlashed(
        address indexed relayer,
        uint256 slashAmount,
        string reason
    );

    event ProofRequested(
        bytes32 indexed operationId,
        address indexed requester,
        uint256 relayFee,
        uint256 deadline,
        bool isExpress
    );

    event ProofRelayed(
        bytes32 indexed operationId,
        address indexed relayer,
        uint256 feeEarned
    );

    event ProofExpired(
        bytes32 indexed operationId
    );

    event ProofCancelled(
        bytes32 indexed operationId,
        address indexed requester
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

    // ===== RELAYER REGISTRATION =====

    /**
     * @notice Register as a relayer by posting bond
     */
    function registerRelayer() external payable nonReentrant whenNotPaused {
        require(msg.value >= MIN_RELAYER_BOND, "Insufficient bond");
        require(relayers[msg.sender].state == RelayerState.INVALID, "Already registered");

        relayers[msg.sender] = Relayer({
            relayerAddress: msg.sender,
            bondAmount: msg.value,
            registeredAt: block.timestamp,
            state: RelayerState.ACTIVE,
            successfulRelays: 0,
            failedRelays: 0,
            totalFeesEarned: 0,
            activePendingProofs: 0
        });

        // Add to active relayers (index + 1 stored)
        activeRelayerIndex[msg.sender] = activeRelayers.length + 1;
        activeRelayers.push(msg.sender);

        emit RelayerRegistered(msg.sender, msg.value);
    }

    // ===== PROOF REQUEST MANAGEMENT =====

    /**
     * @notice Request proof relay for an operation
     * @param operationId Trinity operation ID
     * @param isExpress Priority relay (costs 2x)
     */
    function requestProofRelay(
        bytes32 operationId,
        bool isExpress
    ) external payable nonReentrant whenNotPaused {
        uint256 requiredFee = isExpress ? EXPRESS_RELAY_FEE : BASE_RELAY_FEE;
        require(msg.value >= requiredFee, "Insufficient relay fee");
        require(
            proofRequests[operationId].state == ProofRequestState(0),
            "Request exists"
        );

        uint256 deadline = block.timestamp + PROOF_TIMEOUT;

        // ARCHITECTURE FIX: Initialize struct fields individually (can't use literal syntax with mappings)
        ProofRequest storage request = proofRequests[operationId];
        request.operationId = operationId;
        request.requester = msg.sender;
        request.relayFee = msg.value;
        request.requestedAt = block.timestamp;
        request.deadline = deadline;
        request.state = ProofRequestState.PENDING;
        request.isExpress = isExpress;
        request.assignedRelayer = address(0);
        request.proofsReceived = 0;
        // chainProofReceived mapping initialized to false by default

        // Add to appropriate queue
        if (isExpress) {
            expressProofQueue.push(operationId);
        } else {
            pendingProofQueue.push(operationId);
        }

        emit ProofRequested(
            operationId,
            msg.sender,
            msg.value,
            deadline,
            isExpress
        );
    }

    /**
     * @notice Submit proof for a pending request
     * @param operationId Operation ID
     * @param chainId Chain that submitted proof (1=Arbitrum, 2=Solana, 3=TON)
     * @param validatorIndex Validator index (0-2)
     * @param signature Validator signature
     * 
     * @dev ARCHITECTURE: Verifies signature locally using TrinityConsensusVerifier.getValidator()
     * @dev TrinityConsensusVerifier remains single source of truth for validator registry
     */
    function submitProof(
        bytes32 operationId,
        uint8 chainId,
        uint8 validatorIndex,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        Relayer storage relayer = relayers[msg.sender];
        require(relayer.state == RelayerState.ACTIVE, "Relayer not active");
        require(
            relayer.activePendingProofs < MAX_PENDING_PROOFS_PER_RELAYER,
            "Too many pending proofs"
        );

        ProofRequest storage request = proofRequests[operationId];
        require(request.state == ProofRequestState.PENDING, "Request not pending");
        require(block.timestamp <= request.deadline, "Request expired");

        // ARCHITECTURE FIX: Verify signature locally (TrinityConsensusVerifier is not proof ingestion service)
        bool isValidSignature = _verifySignature(operationId, chainId, signature);
        
        if (isValidSignature) {
            // Valid proof - mark proof received for this chain
            if (!request.chainProofReceived[chainId]) {
                request.chainProofReceived[chainId] = true;
                request.proofsReceived++;
            }
            
            // SECURITY FIX: Only increment activePendingProofs on FIRST assignment
            // Multiple signatures for same operation should not count multiple times
            if (request.assignedRelayer == address(0)) {
                relayer.activePendingProofs++;
                request.assignedRelayer = msg.sender;
            }
            
            // Check if operation reached consensus (2-of-3 chains)
            if (request.proofsReceived >= 2) {
                _completeProofRelay(operationId, msg.sender);
            }
        } else {
            // SECURITY FIX: Slash relayer WITHOUT reverting (slash must persist)
            // Invalid proof - slash relayer and record failure
            _slashRelayer(msg.sender, "Invalid signature");
            // Do NOT revert - slash must stick
        }
    }

    /**
     * @notice Complete proof relay and pay relayer
     * @dev SECURITY FIX: CEI pattern - state updates BEFORE external transfer
     * @dev SECURITY FIX: Prevent double-relay race (check state immediately)
     */
    function _completeProofRelay(bytes32 operationId, address relayerAddress) internal {
        ProofRequest storage request = proofRequests[operationId];
        Relayer storage relayer = relayers[relayerAddress];

        require(request.state == ProofRequestState.PENDING, "Not pending");
        
        // SECURITY FIX: Prevent double-relay race by checking and setting state atomically
        // Allow ANY relayer who reaches consensus to complete (not just assignedRelayer)
        // This prevents lockup when different relayers submit signatures

        // SECURITY FIX: Update state BEFORE external transfer (CEI pattern + reentrancy protection)
        request.state = ProofRequestState.RELAYED;
        relayer.successfulRelays++;
        relayer.totalFeesEarned += request.relayFee;
        
        // SECURITY FIX: Decrement activePendingProofs for ASSIGNED relayer (if any)
        if (request.assignedRelayer != address(0)) {
            relayers[request.assignedRelayer].activePendingProofs--;
        }
        
        uint256 paymentAmount = request.relayFee;
        
        // SECURITY FIX: Remove from queue (prevent unbounded growth)
        _removeFromQueue(operationId, request.isExpress);

        // Pay relayer who completed consensus (may be different from assigned)
        (bool sent,) = payable(relayerAddress).call{value: paymentAmount}("");
        require(sent, "Fee payment failed");

        emit ProofRelayed(operationId, relayerAddress, paymentAmount);
    }

    /**
     * @notice Check if operation reached 2-of-3 consensus
     * @dev ARCHITECTURE: Queries TrinityConsensusVerifier.getOperation() for authoritative state
     */
    function _checkConsensusReached(bytes32 operationId) internal view returns (bool) {
        // Query TrinityConsensusVerifier for consensus count
        (,,, uint8 chainConfirmations,,) = trinityVerifier.getOperation(operationId);
        return chainConfirmations >= 2;
    }

    /**
     * @notice Mark expired proof requests
     * @param operationId Operation ID to expire
     * @dev SECURITY FIX: CEI pattern, queue removal, and counter cleanup
     */
    function expireProofRequest(bytes32 operationId) external nonReentrant {
        ProofRequest storage request = proofRequests[operationId];
        require(request.state == ProofRequestState.PENDING, "Not pending");
        require(block.timestamp > request.deadline, "Not expired");

        // SECURITY FIX: Update state BEFORE external transfer (CEI pattern)
        request.state = ProofRequestState.EXPIRED;
        uint256 refundAmount = request.relayFee;
        address requesterAddress = request.requester;
        bool isExpressRequest = request.isExpress;
        address assignedRelayerAddress = request.assignedRelayer;
        
        // SECURITY FIX: Decrement activePendingProofs if relayer was assigned
        if (assignedRelayerAddress != address(0)) {
            relayers[assignedRelayerAddress].activePendingProofs--;
        }
        
        // SECURITY FIX: Remove from queue
        _removeFromQueue(operationId, isExpressRequest);

        // Refund relay fee to requester
        (bool sent,) = payable(requesterAddress).call{value: refundAmount}("");
        require(sent, "Refund failed");

        emit ProofExpired(operationId);
    }

    /**
     * @notice Cancel proof request (requester only, before relay)
     * @dev SECURITY FIX: CEI pattern, queue removal, and counter cleanup
     */
    function cancelProofRequest(bytes32 operationId) external nonReentrant {
        ProofRequest storage request = proofRequests[operationId];
        require(request.requester == msg.sender, "Not requester");
        require(request.state == ProofRequestState.PENDING, "Not pending");

        // SECURITY FIX: Update state BEFORE external transfer (CEI pattern)
        request.state = ProofRequestState.CANCELLED;
        uint256 refundAmount = request.relayFee;
        bool isExpressRequest = request.isExpress;
        address assignedRelayerAddress = request.assignedRelayer;
        
        // SECURITY FIX: Decrement activePendingProofs if relayer was assigned
        if (assignedRelayerAddress != address(0)) {
            relayers[assignedRelayerAddress].activePendingProofs--;
        }
        
        // SECURITY FIX: Remove from queue
        _removeFromQueue(operationId, isExpressRequest);

        // Refund relay fee
        (bool sent,) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "Refund failed");

        emit ProofCancelled(operationId, msg.sender);
    }

    /**
     * @notice Remove completed/expired/cancelled request from queue
     * @param operationId Operation ID to remove
     * @param isExpress Whether request was in express queue
     * @dev SECURITY FIX: Advances queue front pointer (prevents unbounded growth)
     */
    function _removeFromQueue(bytes32 operationId, bool isExpress) internal {
        if (isExpress) {
            // Advance express queue front if this is the front item
            if (expressQueueFront < expressProofQueue.length && 
                expressProofQueue[expressQueueFront] == operationId) {
                expressQueueFront++;
            }
        } else {
            // Advance pending queue front if this is the front item
            if (pendingQueueFront < pendingProofQueue.length && 
                pendingProofQueue[pendingQueueFront] == operationId) {
                pendingQueueFront++;
            }
        }
    }

    // ===== SIGNATURE VERIFICATION =====

    /**
     * @notice Verify validator signature for proof
     * @param operationId Operation ID being proven
     * @param chainId Chain ID of validator (1=Arbitrum, 2=Solana, 3=TON)
     * @param signature Validator signature (65 bytes: r, s, v)
     * @return bool True if signature is valid and from authorized validator
     * 
     * @dev ARCHITECTURE: Mirrors CrossChainMessageRelay's verification pattern
     * @dev Uses TrinityConsensusVerifier.getValidator() as source of truth for validator registry
     */
    function _verifySignature(
        bytes32 operationId,
        uint8 chainId,
        bytes calldata signature
    ) internal view returns (bool) {
        require(chainId >= 1 && chainId <= 3, "Invalid chain ID");
        require(signature.length == 65, "Invalid signature length");

        // Decode signature (r, s, v)
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        
        // Recover signer address from signature
        address signer = ecrecover(operationId, v, r, s);
        if (signer == address(0)) {
            return false; // Invalid signature recovery
        }
        
        // Query TrinityConsensusVerifier for authorized validator
        address authorizedValidator = _getAuthorizedValidator(chainId);
        if (authorizedValidator == address(0)) {
            return false; // No validator registered for this chain
        }
        
        // Verify signer matches authorized Trinity validator
        return (signer == authorizedValidator);
    }

    /**
     * @notice Get authorized Trinity validator for a chain
     * @param chainId Chain ID (1=Arbitrum, 2=Solana, 3=TON)
     * @return address Authorized validator address (address(0) if error)
     * 
     * @dev Queries TrinityConsensusVerifier as single source of truth
     */
    function _getAuthorizedValidator(uint8 chainId) internal view returns (address) {
        try trinityVerifier.getValidator(chainId) returns (address validator) {
            return validator;
        } catch {
            return address(0);
        }
    }

    // ===== SLASHING =====

    /**
     * @notice Slash relayer for invalid proof submission
     * @dev SECURITY FIX: Force removal if bond drops below minimum
     */
    function _slashRelayer(address relayerAddress, string memory reason) internal {
        Relayer storage relayer = relayers[relayerAddress];
        require(relayer.state == RelayerState.ACTIVE, "Relayer not active");

        uint256 slashAmount = (relayer.bondAmount * INVALID_PROOF_SLASH) / 100;
        
        // SECURITY FIX: Update state BEFORE external transfer (CEI pattern)
        relayer.bondAmount -= slashAmount;
        relayer.failedRelays++;
        
        // SECURITY FIX: Force slashed state if bond drops below minimum
        if (relayer.bondAmount < MIN_RELAYER_BOND) {
            relayer.state = RelayerState.SLASHED;
            // Remove from active relayers
            _removeFromActiveRelayers(relayerAddress);
        } else {
            // Just suspend if bond still above minimum
            relayer.state = RelayerState.SUSPENDED;
        }

        // Send slashed amount to treasury AFTER state updates
        (bool sent,) = treasury.call{value: slashAmount}("");
        require(sent, "Slash transfer failed");

        emit RelayerSlashed(relayerAddress, slashAmount, reason);
    }

    /**
     * @notice Remove relayer from active list (O(1))
     * @dev SECURITY FIX: Uses index + 1 storage pattern (same as KeeperRegistry)
     */
    function _removeFromActiveRelayers(address relayerAddress) internal {
        uint256 storedValue = activeRelayerIndex[relayerAddress];
        
        // storedValue == 0 means not present (already removed)
        if (storedValue == 0) {
            return; // Safe to skip
        }
        
        // Convert to actual index
        uint256 index = storedValue - 1;
        
        // Verify synchronization
        require(activeRelayers[index] == relayerAddress, "Array desync");
        
        // Move last relayer to deleted position
        address lastRelayer = activeRelayers[activeRelayers.length - 1];
        activeRelayers[index] = lastRelayer;
        activeRelayerIndex[lastRelayer] = index + 1; // Store index + 1
        
        // Remove last position
        activeRelayers.pop();
        delete activeRelayerIndex[relayerAddress]; // Sets to 0 = "not present"
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @notice Get next pending proof request
     * @return operationId Next operation ID, or bytes32(0) if queue empty
     * @dev SECURITY FIX: Skips over stale entries (handles out-of-order completion)
     */
    function getNextPendingProof() external view returns (bytes32) {
        // SECURITY FIX: Priority: express queue first, skip stale entries
        for (uint256 i = expressQueueFront; i < expressProofQueue.length; i++) {
            bytes32 expressOp = expressProofQueue[i];
            // Return first pending request found
            if (proofRequests[expressOp].state == ProofRequestState.PENDING) {
                return expressOp;
            }
        }
        
        // SECURITY FIX: Then check regular queue, skip stale entries
        for (uint256 i = pendingQueueFront; i < pendingProofQueue.length; i++) {
            bytes32 pendingOp = pendingProofQueue[i];
            // Return first pending request found
            if (proofRequests[pendingOp].state == ProofRequestState.PENDING) {
                return pendingOp;
            }
        }
        
        return bytes32(0);
    }

    /**
     * @notice Get active relayers
     */
    function getActiveRelayers() external view returns (address[] memory) {
        return activeRelayers;
    }

    /**
     * @notice Get proof request details
     * @param operationId Operation ID
     * @return operationIdRet Operation ID
     * @return requester Requester address
     * @return relayFee Relay fee
     * @return requestedAt Request timestamp
     * @return deadline Deadline timestamp
     * @return state Request state
     * @return isExpress Priority flag
     * @return assignedRelayer Assigned relayer address
     * @return proofsReceived Number of chain proofs received
     * 
     * @dev Cannot return the full struct due to mapping field
     */
    function getProofRequest(bytes32 operationId) external view returns (
        bytes32 operationIdRet,
        address requester,
        uint256 relayFee,
        uint256 requestedAt,
        uint256 deadline,
        ProofRequestState state,
        bool isExpress,
        address assignedRelayer,
        uint8 proofsReceived
    ) {
        ProofRequest storage request = proofRequests[operationId];
        return (
            request.operationId,
            request.requester,
            request.relayFee,
            request.requestedAt,
            request.deadline,
            request.state,
            request.isExpress,
            request.assignedRelayer,
            request.proofsReceived
        );
    }

    /**
     * @notice Check if a specific chain has submitted proof
     * @param operationId Operation ID
     * @param chainId Chain ID (1=Arbitrum, 2=Solana, 3=TON)
     * @return bool True if chain proof received
     */
    function hasChainProof(bytes32 operationId, uint8 chainId) external view returns (bool) {
        return proofRequests[operationId].chainProofReceived[chainId];
    }

    // ===== ADMIN FUNCTIONS =====

    /**
     * @notice Update Trinity verifier address
     */
    function setTrinityVerifier(address _newVerifier) external onlyOwner {
        require(_newVerifier != address(0), "Invalid verifier");
        trinityVerifier = ITrinityConsensusVerifier(_newVerifier);
    }

    /**
     * @notice Update treasury address
     */
    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury");
        treasury = _newTreasury;
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ===== FALLBACK =====

    receive() external payable {}
}
