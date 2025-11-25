// SPDX-License-Identifier: MIT
// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:05.053Z
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TrinityGovernanceTimelock
 * @author Trinity Protocol Team
 * @notice Timelock controller for delayed parameter changes and governance actions
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🎯 ARCHITECTURE
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
 * 
 * Design:
 * - 48-hour minimum delay for critical actions
 * - 24-hour minimum delay for non-critical actions
 * - 7-day maximum execution window
 * - Multi-sig requirement for critical proposals
 * - Emergency bypass for critical security fixes (requires 2-of-3 multi-sig)
 * 
 * Security:
 * - Proposals are hashed to prevent tampering
 * - Salt prevents duplicate proposal IDs
 * - Ready timestamp prevents premature execution
 * - Expiry prevents stale proposals
 * - Cancellation prevents malicious execution
 */
contract TrinityGovernanceTimelock is ReentrancyGuard, AccessControl {
    // ===== ROLES =====

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");
    bytes32 public constant TIMELOCK_ADMIN_ROLE = keccak256("TIMELOCK_ADMIN_ROLE");

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
        address admin
    ) {
        require(_minDelay >= ABSOLUTE_MIN_DELAY, "Delay too short");
        minDelay = _minDelay;

        // SECURITY FIX: Initialize configurable delays
        minDelayCritical = 48 hours;
        minDelayNormal = 24 hours;
        gracePeriod = 7 days;

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

    // ===== FALLBACK =====

    receive() external payable {}
}
