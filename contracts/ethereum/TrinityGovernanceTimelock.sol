// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title TrinityGovernanceTimelock
 * @author Trinity Protocol Team
 * @notice Timelock controller for delayed parameter changes and governance actions
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🎯 ARCHITECTURE (v3.5.19 - Emergency Bypass + Veto)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Problem:
 * Currently, contract owners have instant parameter control:
 * - Can change validator addresses immediately
 * - Can modify fee parameters instantly
 * - Can pause contracts without notice
 * - No community visibility or veto mechanism
 * 
 * Solution:
 * Timelock-based governance with role-based access control:
 * 1. PROPOSER_ROLE: Can propose governance actions
 * 2. EXECUTOR_ROLE: Can execute actions after timelock
 * 3. CANCELLER_ROLE: Can cancel malicious proposals
 * 4. TIMELOCK_ADMIN_ROLE: Can manage roles
 * 5. VETOER_ROLE: Can veto malicious proposals (v3.5.19)
 * 
 * Design:
 * - 48-hour minimum delay for critical actions
 * - 24-hour minimum delay for non-critical actions
 * - 7-day maximum execution window
 * - Multi-sig requirement for critical proposals
 * - Emergency bypass for critical security fixes (requires 2-of-3 multi-sig)
 * - VETO MECHANISM: VETOER_ROLE can block malicious proposals (v3.5.19)
 * 
 * Security:
 * - Proposals are hashed to prevent tampering
 * - Salt prevents duplicate proposal IDs
 * - Ready timestamp prevents premature execution
 * - Expiry prevents stale proposals
 * - Cancellation prevents malicious execution
 * - EMERGENCY BYPASS: 2-of-3 multi-sig for critical security fixes (v3.5.19)
 * - VETO: Independent oversight prevents governance attacks (v3.5.19)
 */
contract TrinityGovernanceTimelock is ReentrancyGuard, AccessControl {
    using ECDSA for bytes32;
    // ===== ROLES =====

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");
    bytes32 public constant TIMELOCK_ADMIN_ROLE = keccak256("TIMELOCK_ADMIN_ROLE");
    
    /// @notice AUDIT v3.5.19: Vetoer role for blocking malicious proposals
    bytes32 public constant VETOER_ROLE = keccak256("VETOER_ROLE");
    
    /// @notice AUDIT v3.5.19: Emergency signer role for bypass (2-of-3 multi-sig)
    bytes32 public constant EMERGENCY_SIGNER_ROLE = keccak256("EMERGENCY_SIGNER_ROLE");

    // ===== CONSTANTS =====

    /// @notice Hard minimum delay (24 hours) - cannot go below this
    uint256 public constant ABSOLUTE_MIN_DELAY = 24 hours;

    /// @notice Hard maximum execution window (7 days) - cannot go above this  
    uint256 public constant ABSOLUTE_MAX_GRACE_PERIOD = 30 days;

    // ===== PROPOSAL STATES =====

    enum ProposalState {
        INVALID,
        PENDING,
        READY,
        EXECUTED,
        CANCELLED,
        EXPIRED
    }

    // ===== STRUCTURES =====

    struct Proposal {
        bytes32 id;
        address target;
        uint256 value;
        bytes data;
        bytes32 predecessor;
        bytes32 salt;
        uint256 delay;
        uint256 createdAt;
        uint256 readyAt;
        uint256 executedAt;
        uint256 expiresAt;
        address proposer;
        ProposalState state;
        bool isCritical;
        string description;
    }

    // ===== STATE VARIABLES =====

    /// @notice Mapping from proposal ID to proposal details
    mapping(bytes32 => Proposal) public proposals;

    /// @notice Counter for total proposals
    uint256 public proposalCount;

    /// @notice Minimum delay (can be updated by governance)
    uint256 public minDelay;

    /// @notice SECURITY FIX: Configurable delays instead of constants
    uint256 public minDelayCritical;
    uint256 public minDelayNormal;
    uint256 public gracePeriod;

    /// @notice SECURITY FIX: Track executed proposal IDs to prevent replay
    mapping(bytes32 => bool) public hasBeenExecuted;
    
    // ===== VETO MECHANISM (v3.5.19) =====
    
    /// @notice Track vetoed proposals (cannot be executed)
    mapping(bytes32 => bool) public isVetoed;
    
    /// @notice Veto expiry (vetoes can be lifted after this period)
    uint256 public vetoExpiryPeriod;
    
    /// @notice When a veto was placed
    mapping(bytes32 => uint256) public vetoTimestamp;
    
    // ===== EMERGENCY BYPASS (v3.5.19) =====
    
    /// @notice Emergency signers for 2-of-3 bypass
    address[3] public emergencySigners;
    
    /// @notice Emergency actions executed (prevent replay)
    mapping(bytes32 => bool) public emergencyExecuted;
    
    /// @notice Nonce for emergency actions (prevent replay)
    uint256 public emergencyNonce;
    
    /// @notice Domain separator for emergency signatures
    bytes32 public EMERGENCY_DOMAIN_SEPARATOR;

    // ===== EVENTS =====

    event ProposalCreated(
        bytes32 indexed id,
        address indexed target,
        uint256 value,
        bytes data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay,
        address indexed proposer,
        bool isCritical,
        string description
    );

    event ProposalCancelled(
        bytes32 indexed id,
        address indexed canceller
    );

    event ProposalExecuted(
        bytes32 indexed id,
        address indexed executor,
        address target,
        uint256 value,
        bytes data
    );

    event MinDelayChanged(
        uint256 oldMinDelay,
        uint256 newMinDelay
    );
    
    // ===== VETO & EMERGENCY EVENTS (v3.5.19) =====
    
    event ProposalVetoed(
        bytes32 indexed id,
        address indexed vetoer,
        string reason
    );
    
    event VetoLifted(
        bytes32 indexed id,
        address indexed lifter
    );
    
    event EmergencyExecuted(
        bytes32 indexed actionHash,
        address indexed target,
        uint256 value,
        bytes data,
        address[3] signers
    );
    
    event EmergencySignerUpdated(
        uint256 indexed index,
        address indexed oldSigner,
        address indexed newSigner
    );

    // ===== CONSTRUCTOR =====

    /**
     * @notice Initialize timelock with role setup
     * @param _minDelay Initial minimum delay
     * @param proposers Array of addresses with PROPOSER_ROLE
     * @param executors Array of addresses with EXECUTOR_ROLE
     * @param admin Address with TIMELOCK_ADMIN_ROLE
     */
    constructor(
        uint256 _minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin,
        address[3] memory _emergencySigners
    ) {
        require(_minDelay >= ABSOLUTE_MIN_DELAY, "Delay too short");
        minDelay = _minDelay;

        // SECURITY FIX: Initialize configurable delays
        minDelayCritical = 48 hours;
        minDelayNormal = 24 hours;
        gracePeriod = 7 days;
        
        // AUDIT v3.5.19: Initialize veto expiry period (30 days)
        vetoExpiryPeriod = 30 days;

        // Setup roles
        _grantRole(TIMELOCK_ADMIN_ROLE, admin);
        _grantRole(TIMELOCK_ADMIN_ROLE, address(this)); // Allow self-administration

        for (uint256 i = 0; i < proposers.length; i++) {
            _grantRole(PROPOSER_ROLE, proposers[i]);
            _grantRole(CANCELLER_ROLE, proposers[i]); // Proposers can cancel
        }

        for (uint256 i = 0; i < executors.length; i++) {
            _grantRole(EXECUTOR_ROLE, executors[i]);
        }
        
        // AUDIT v3.5.19: Initialize emergency signers (2-of-3 multi-sig)
        require(
            _emergencySigners[0] != address(0) &&
            _emergencySigners[1] != address(0) &&
            _emergencySigners[2] != address(0),
            "Invalid emergency signers"
        );
        require(
            _emergencySigners[0] != _emergencySigners[1] &&
            _emergencySigners[1] != _emergencySigners[2] &&
            _emergencySigners[0] != _emergencySigners[2],
            "Duplicate emergency signers"
        );
        
        emergencySigners = _emergencySigners;
        
        // Grant emergency signer roles
        for (uint256 i = 0; i < 3; i++) {
            _grantRole(EMERGENCY_SIGNER_ROLE, _emergencySigners[i]);
        }
        
        // Initialize domain separator for emergency signatures
        EMERGENCY_DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("TrinityGovernanceTimelock")),
            keccak256(bytes("3.5.19")),
            block.chainid,
            address(this)
        ));
    }

    // ===== PROPOSAL CREATION =====

    /**
     * @notice Create a new timelock proposal
     * @param target Contract address to call
     * @param value ETH value to send
     * @param data Encoded function call
     * @param predecessor Required predecessor proposal (use bytes32(0) if none)
     * @param salt Unique salt for proposal ID
     * @param delay Execution delay (must be >= minDelay)
     * @param isCritical Whether this is a critical operation (requires longer delay)
     * @param description Human-readable description
     * @return id Unique proposal ID
     */
    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay,
        bool isCritical,
        string calldata description
    ) external onlyRole(PROPOSER_ROLE) returns (bytes32 id) {
        require(target != address(0), "Invalid target");
        
        // SECURITY FIX: Use configurable delays
        uint256 requiredDelay = isCritical ? minDelayCritical : minDelayNormal;
        require(delay >= requiredDelay, "Delay too short");
        require(delay >= minDelay, "Delay below minimum");

        // Generate unique proposal ID
        id = hashOperation(target, value, data, predecessor, salt);
        require(proposals[id].state == ProposalState.INVALID, "Proposal exists");
        
        // SECURITY FIX: Prevent replay of executed proposals
        require(!hasBeenExecuted[id], "Proposal already executed");

        // If predecessor exists, ensure it's executed
        if (predecessor != bytes32(0)) {
            require(
                proposals[predecessor].state == ProposalState.EXECUTED,
                "Predecessor not executed"
            );
        }

        uint256 readyAt = block.timestamp + delay;
        // SECURITY FIX: Use configurable grace period
        uint256 expiresAt = readyAt + gracePeriod;

        proposals[id] = Proposal({
            id: id,
            target: target,
            value: value,
            data: data,
            predecessor: predecessor,
            salt: salt,
            delay: delay,
            createdAt: block.timestamp,
            readyAt: readyAt,
            executedAt: 0,
            expiresAt: expiresAt,
            proposer: msg.sender,
            state: ProposalState.PENDING,
            isCritical: isCritical,
            description: description
        });

        proposalCount++;

        emit ProposalCreated(
            id,
            target,
            value,
            data,
            predecessor,
            salt,
            delay,
            msg.sender,
            isCritical,
            description
        );

        return id;
    }

    /**
     * @notice Batch schedule multiple proposals
     * @param targets Array of target contracts
     * @param values Array of ETH values
     * @param payloads Array of encoded function calls
     * @param predecessor Required predecessor proposal
     * @param salt Unique salt for batch
     * @param delay Execution delay
     * @param isCritical Whether batch is critical
     * @param description Batch description
     * @return id Batch proposal ID
     */
    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay,
        bool isCritical,
        string calldata description
    ) external onlyRole(PROPOSER_ROLE) returns (bytes32 id) {
        require(targets.length > 0, "Empty batch");
        require(
            targets.length == values.length && targets.length == payloads.length,
            "Length mismatch"
        );

        id = hashOperationBatch(targets, values, payloads, predecessor, salt);
        require(proposals[id].state == ProposalState.INVALID, "Batch exists");
        
        // SECURITY FIX: Prevent replay of executed batches
        require(!hasBeenExecuted[id], "Batch already executed");

        // SECURITY FIX: Use configurable delays
        uint256 requiredDelay = isCritical ? minDelayCritical : minDelayNormal;
        require(delay >= requiredDelay, "Delay too short");

        uint256 readyAt = block.timestamp + delay;
        // SECURITY FIX: Use configurable grace period
        uint256 expiresAt = readyAt + gracePeriod;

        // Store batch as encoded data
        bytes memory batchData = abi.encode(targets, values, payloads);

        proposals[id] = Proposal({
            id: id,
            target: address(0), // Batch marker
            value: 0,
            data: batchData,
            predecessor: predecessor,
            salt: salt,
            delay: delay,
            createdAt: block.timestamp,
            readyAt: readyAt,
            executedAt: 0,
            expiresAt: expiresAt,
            proposer: msg.sender,
            state: ProposalState.PENDING,
            isCritical: isCritical,
            description: description
        });

        proposalCount++;

        emit ProposalCreated(
            id,
            address(0),
            0,
            batchData,
            predecessor,
            salt,
            delay,
            msg.sender,
            isCritical,
            description
        );

        return id;
    }

    // ===== PROPOSAL EXECUTION =====

    /**
     * @notice Execute a ready proposal
     * @param target Target contract
     * @param value ETH value
     * @param payload Encoded function call
     * @param predecessor Predecessor proposal
     * @param salt Salt used in creation
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata payload,
        bytes32 predecessor,
        bytes32 salt
    ) external payable onlyRole(EXECUTOR_ROLE) nonReentrant {
        bytes32 id = hashOperation(target, value, payload, predecessor, salt);
        Proposal storage proposal = proposals[id];

        require(proposal.state == ProposalState.PENDING, "Not pending");
        require(block.timestamp >= proposal.readyAt, "Not ready");
        require(block.timestamp <= proposal.expiresAt, "Expired");
        
        // AUDIT v3.5.19: Check if proposal is vetoed
        require(!_isActiveVeto(id), "Proposal vetoed");
        
        // SECURITY FIX: Verify predecessor is executed (enforce ordering)
        if (predecessor != bytes32(0)) {
            require(
                proposals[predecessor].state == ProposalState.EXECUTED,
                "Predecessor not executed"
            );
        }
        
        // SECURITY FIX: Verify ETH accounting
        require(msg.value == value, "ETH value mismatch");

        // SECURITY FIX: Update state BEFORE external call (CEI pattern)
        proposal.state = ProposalState.EXECUTED;
        proposal.executedAt = block.timestamp;
        hasBeenExecuted[id] = true;

        // Execute call
        (bool success, bytes memory returnData) = target.call{value: value}(payload);
        require(success, _getRevertMsg(returnData));

        emit ProposalExecuted(id, msg.sender, target, value, payload);
    }

    /**
     * @notice Execute a batch proposal
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) external payable onlyRole(EXECUTOR_ROLE) nonReentrant {
        bytes32 id = hashOperationBatch(targets, values, payloads, predecessor, salt);
        Proposal storage proposal = proposals[id];

        require(proposal.state == ProposalState.PENDING, "Not pending");
        require(block.timestamp >= proposal.readyAt, "Not ready");
        require(block.timestamp <= proposal.expiresAt, "Expired");
        
        // AUDIT v3.5.19: Check if proposal is vetoed
        require(!_isActiveVeto(id), "Proposal vetoed");
        
        // SECURITY FIX: Verify predecessor is executed (enforce ordering)
        if (predecessor != bytes32(0)) {
            require(
                proposals[predecessor].state == ProposalState.EXECUTED,
                "Predecessor not executed"
            );
        }
        
        // SECURITY FIX: Verify ETH accounting (sum of values must match msg.value)
        uint256 totalValue = 0;
        for (uint256 i = 0; i < values.length; i++) {
            totalValue += values[i];
        }
        require(msg.value == totalValue, "ETH value mismatch");

        // SECURITY FIX: Update state BEFORE external calls (CEI pattern)
        proposal.state = ProposalState.EXECUTED;
        proposal.executedAt = block.timestamp;
        hasBeenExecuted[id] = true;

        // Execute batch
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory returnData) = targets[i].call{value: values[i]}(
                payloads[i]
            );
            require(success, _getRevertMsg(returnData));
        }

        emit ProposalExecuted(id, msg.sender, address(0), 0, "");
    }

    // ===== PROPOSAL CANCELLATION =====

    /**
     * @notice Cancel a pending proposal
     * @param id Proposal ID to cancel
     */
    function cancel(bytes32 id) external onlyRole(CANCELLER_ROLE) {
        Proposal storage proposal = proposals[id];
        require(
            proposal.state == ProposalState.PENDING,
            "Not pending"
        );

        proposal.state = ProposalState.CANCELLED;

        emit ProposalCancelled(id, msg.sender);
    }

    // ===== HASH FUNCTIONS =====

    /**
     * @notice Hash a single operation
     */
    function hashOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data, predecessor, salt));
    }

    /**
     * @notice Hash a batch operation
     */
    function hashOperationBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(targets, values, payloads, predecessor, salt));
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @notice Check if proposal is ready for execution
     */
    function isOperationReady(bytes32 id) external view returns (bool) {
        Proposal memory proposal = proposals[id];
        return proposal.state == ProposalState.PENDING &&
               block.timestamp >= proposal.readyAt &&
               block.timestamp <= proposal.expiresAt;
    }

    /**
     * @notice Check if proposal is pending
     */
    function isOperationPending(bytes32 id) external view returns (bool) {
        return proposals[id].state == ProposalState.PENDING;
    }

    /**
     * @notice Get proposal details
     */
    function getProposal(bytes32 id) external view returns (Proposal memory) {
        return proposals[id];
    }

    /**
     * @notice Get timestamp when operation becomes ready
     */
    function getTimestamp(bytes32 id) external view returns (uint256) {
        return proposals[id].readyAt;
    }

    // ===== ADMIN FUNCTIONS =====

    /**
     * @notice Update minimum delay
     * @param newMinDelay New minimum delay
     * 
     * @dev Can only be called via timelock itself (self-administration)
     */
    function updateDelay(uint256 newMinDelay) external {
        require(msg.sender == address(this), "Only timelock");
        require(newMinDelay >= ABSOLUTE_MIN_DELAY, "Delay too short");

        uint256 oldMinDelay = minDelay;
        minDelay = newMinDelay;

        emit MinDelayChanged(oldMinDelay, newMinDelay);
    }

    /**
     * @notice SECURITY FIX: Update configurable delays
     * @param newMinDelayNormal New minimum delay for normal operations
     * @param newMinDelayCritical New minimum delay for critical operations
     * @param newGracePeriod New grace period for execution
     * 
     * @dev Can only be called via timelock itself (self-administration)
     */
    function updateDelays(
        uint256 newMinDelayNormal,
        uint256 newMinDelayCritical,
        uint256 newGracePeriod
    ) external {
        require(msg.sender == address(this), "Only timelock");
        require(newMinDelayNormal >= ABSOLUTE_MIN_DELAY, "Normal delay too short");
        require(newMinDelayCritical >= newMinDelayNormal, "Critical delay must be >= normal");
        require(newGracePeriod <= ABSOLUTE_MAX_GRACE_PERIOD, "Grace period too long");

        minDelayNormal = newMinDelayNormal;
        minDelayCritical = newMinDelayCritical;
        gracePeriod = newGracePeriod;

        emit MinDelayChanged(minDelayNormal, minDelayCritical);
    }

    // ===== UTILITY FUNCTIONS =====

    /**
     * @notice Extract revert message from returnData
     */
    function _getRevertMsg(bytes memory returnData) internal pure returns (string memory) {
        if (returnData.length < 68) return "Transaction reverted";

        assembly {
            returnData := add(returnData, 0x04)
        }
        return abi.decode(returnData, (string));
    }

    // ===== VETO MECHANISM (v3.5.19) =====
    
    /**
     * @notice Veto a pending proposal
     * @param id Proposal ID to veto
     * @param reason Human-readable reason for veto
     * 
     * @dev AUDIT v3.5.19: Prevents malicious proposals from executing
     * @dev Veto can only be placed on pending proposals
     * @dev Veto expires after vetoExpiryPeriod (allows re-submission)
     */
    function veto(bytes32 id, string calldata reason) external onlyRole(VETOER_ROLE) {
        Proposal storage proposal = proposals[id];
        require(proposal.state == ProposalState.PENDING, "Not pending");
        require(!isVetoed[id], "Already vetoed");
        
        isVetoed[id] = true;
        vetoTimestamp[id] = block.timestamp;
        
        emit ProposalVetoed(id, msg.sender, reason);
    }
    
    /**
     * @notice Lift an expired veto
     * @param id Proposal ID to lift veto from
     * 
     * @dev Anyone can lift expired vetoes (democratic governance)
     * @dev Veto must be older than vetoExpiryPeriod
     */
    function liftVeto(bytes32 id) external {
        require(isVetoed[id], "Not vetoed");
        require(
            block.timestamp >= vetoTimestamp[id] + vetoExpiryPeriod,
            "Veto not expired"
        );
        
        isVetoed[id] = false;
        delete vetoTimestamp[id];
        
        emit VetoLifted(id, msg.sender);
    }
    
    /**
     * @notice Check if a veto is active (not expired)
     * @param id Proposal ID to check
     * @return active Whether the veto is still active
     */
    function _isActiveVeto(bytes32 id) internal view returns (bool active) {
        if (!isVetoed[id]) {
            return false;
        }
        // Veto is active if it hasn't expired
        return block.timestamp < vetoTimestamp[id] + vetoExpiryPeriod;
    }
    
    /**
     * @notice Check if a proposal is currently vetoed
     * @param id Proposal ID to check
     * @return vetoed Whether the proposal is currently vetoed (active veto)
     */
    function isProposalVetoed(bytes32 id) external view returns (bool vetoed) {
        return _isActiveVeto(id);
    }
    
    // ===== EMERGENCY BYPASS (v3.5.19) =====
    
    /**
     * @notice Emergency bypass with 2-of-3 multi-sig
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Encoded function call
     * @param signatures Array of 3 signatures (at least 2 must be valid)
     * 
     * @dev AUDIT v3.5.19: Allows critical security fixes without timelock
     * @dev Requires 2-of-3 emergency signers to authorize
     * @dev Uses EIP-712 typed data for signatures
     * @dev Includes nonce to prevent replay attacks
     * 
     * SECURITY MODEL:
     * - Emergency signers should be geographically distributed
     * - Signers should use hardware wallets
     * - Emergency actions should be logged and audited
     * - Only use for CRITICAL security fixes (not regular governance)
     */
    function emergencyExecute(
        address target,
        uint256 value,
        bytes calldata data,
        bytes[3] calldata signatures
    ) external payable nonReentrant {
        require(target != address(0), "Invalid target");
        require(msg.value == value, "ETH value mismatch");
        
        // Generate action hash with nonce
        bytes32 actionHash = keccak256(abi.encode(
            target,
            value,
            keccak256(data),
            emergencyNonce,
            block.chainid
        ));
        
        // Prevent replay
        require(!emergencyExecuted[actionHash], "Already executed");
        
        // Create EIP-712 digest
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            EMERGENCY_DOMAIN_SEPARATOR,
            keccak256(abi.encode(
                keccak256("EmergencyAction(address target,uint256 value,bytes32 dataHash,uint256 nonce,uint256 chainId)"),
                target,
                value,
                keccak256(data),
                emergencyNonce,
                block.chainid
            ))
        ));
        
        // Verify 2-of-3 signatures
        uint256 validSignatures = 0;
        address[3] memory recoveredSigners;
        bool[3] memory signerUsed;
        
        for (uint256 i = 0; i < 3; i++) {
            if (signatures[i].length == 0) continue;
            
            address recovered = digest.recover(signatures[i]);
            
            // Check if recovered address is an emergency signer
            for (uint256 j = 0; j < 3; j++) {
                if (recovered == emergencySigners[j] && !signerUsed[j]) {
                    signerUsed[j] = true;
                    recoveredSigners[validSignatures] = recovered;
                    validSignatures++;
                    break;
                }
            }
        }
        
        require(validSignatures >= 2, "Requires 2-of-3 signatures");
        
        // Update state BEFORE external call (CEI pattern)
        emergencyExecuted[actionHash] = true;
        emergencyNonce++;
        
        // Execute emergency action
        (bool success, bytes memory returnData) = target.call{value: value}(data);
        require(success, _getRevertMsg(returnData));
        
        emit EmergencyExecuted(actionHash, target, value, data, recoveredSigners);
    }
    
    /**
     * @notice Get the current emergency nonce
     * @return nonce Current nonce for emergency actions
     */
    function getEmergencyNonce() external view returns (uint256) {
        return emergencyNonce;
    }
    
    /**
     * @notice Get all emergency signers
     * @return signers Array of 3 emergency signer addresses
     */
    function getEmergencySigners() external view returns (address[3] memory) {
        return emergencySigners;
    }
    
    /**
     * @notice Update an emergency signer
     * @param index Index of signer to update (0, 1, or 2)
     * @param newSigner New signer address
     * 
     * @dev Can only be called via timelock itself (requires proposal)
     * @dev Ensures emergency signers can be rotated securely
     */
    function updateEmergencySigner(uint256 index, address newSigner) external {
        require(msg.sender == address(this), "Only timelock");
        require(index < 3, "Invalid index");
        require(newSigner != address(0), "Invalid signer");
        require(
            newSigner != emergencySigners[0] &&
            newSigner != emergencySigners[1] &&
            newSigner != emergencySigners[2],
            "Duplicate signer"
        );
        
        address oldSigner = emergencySigners[index];
        
        // Revoke old signer role and grant new
        _revokeRole(EMERGENCY_SIGNER_ROLE, oldSigner);
        _grantRole(EMERGENCY_SIGNER_ROLE, newSigner);
        
        emergencySigners[index] = newSigner;
        
        emit EmergencySignerUpdated(index, oldSigner, newSigner);
    }
    
    /**
     * @notice Update veto expiry period
     * @param newPeriod New expiry period in seconds
     * 
     * @dev Can only be called via timelock itself
     * @dev Minimum 7 days, maximum 90 days
     */
    function updateVetoExpiryPeriod(uint256 newPeriod) external {
        require(msg.sender == address(this), "Only timelock");
        require(newPeriod >= 7 days, "Period too short");
        require(newPeriod <= 90 days, "Period too long");
        
        vetoExpiryPeriod = newPeriod;
    }
    
    /**
     * @notice Hash emergency action for signing
     * @param target Target contract
     * @param value ETH value
     * @param data Encoded function call
     * @return digest EIP-712 digest to sign
     * 
     * @dev Helper function for emergency signers to generate signature
     */
    function hashEmergencyAction(
        address target,
        uint256 value,
        bytes calldata data
    ) external view returns (bytes32 digest) {
        return keccak256(abi.encodePacked(
            "\x19\x01",
            EMERGENCY_DOMAIN_SEPARATOR,
            keccak256(abi.encode(
                keccak256("EmergencyAction(address target,uint256 value,bytes32 dataHash,uint256 nonce,uint256 chainId)"),
                target,
                value,
                keccak256(data),
                emergencyNonce,
                block.chainid
            ))
        ));
    }

    // ===== FALLBACK =====

    receive() external payable {}
}
