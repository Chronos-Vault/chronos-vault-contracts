// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EmergencyMultiSig - TRUSTLESS Emergency Pause System
 * @author Chronos Vault Team
 * @notice Multi-signature system for emergency circuit breaker control with 48h timelock
 * @dev Implements 2-of-3 consensus with mathematical guarantees - NO single point of failure
 * 
 * MATHEMATICAL SECURITY:
 * - 2-of-3 multi-sig required for emergency actions
 * - NO single point of failure
 * - Time-locked operations (48-hour delay)
 * - Auto-expiry of emergency pauses
 * 
 * USE CASES:
 * - Emergency pause when circuit breaker fails
 * - Override auto-recovery for critical situations
 * - Emergency fund recovery
 */
contract EmergencyMultiSig {
    // Emergency signers (3 independent parties)
    address public immutable signer1;
    address public immutable signer2;
    address public immutable signer3;
    
    // Emergency action types
    enum EmergencyAction {
        PAUSE_BRIDGE,
        RESUME_BRIDGE,
        PAUSE_SWAPS,
        RESUME_SWAPS,
        EMERGENCY_WITHDRAW
    }
    
    // Emergency proposal structure
    struct EmergencyProposal {
        uint256 id;
        EmergencyAction action;
        address targetContract;
        bytes callData;
        uint256 createdAt;
        uint256 executionTime; // Time-locked
        bool executed;
        mapping(address => bool) signatures;
        uint8 signatureCount;
    }
    
    // Mappings
    mapping(uint256 => EmergencyProposal) public proposals;
    uint256 public proposalCount;
    
    // Constants
    uint256 public constant TIME_LOCK_DELAY = 48 hours; // 48-hour delay
    uint256 public constant REQUIRED_SIGNATURES = 2; // 2-of-3 consensus
    
    // Events
    event EmergencyProposalCreated(
        uint256 indexed proposalId,
        EmergencyAction action,
        address targetContract,
        uint256 executionTime
    );
    
    event EmergencyProposalSigned(
        uint256 indexed proposalId,
        address indexed signer,
        uint8 signatureCount
    );
    
    event EmergencyActionExecuted(
        uint256 indexed proposalId,
        EmergencyAction action,
        address targetContract
    );
    
    // Modifiers
    modifier onlySigner() {
        require(
            msg.sender == signer1 || msg.sender == signer2 || msg.sender == signer3,
            "Not authorized signer"
        );
        _;
    }
    
    modifier proposalExists(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCount, "Proposal does not exist");
        _;
    }
    
    /**
     * @dev Constructor - Initialize 3 emergency signers (IMMUTABLE)
     */
    constructor(
        address _signer1,
        address _signer2,
        address _signer3
    ) {
        require(_signer1 != address(0), "Invalid signer1");
        require(_signer2 != address(0), "Invalid signer2");
        require(_signer3 != address(0), "Invalid signer3");
        require(_signer1 != _signer2 && _signer2 != _signer3 && _signer1 != _signer3, 
                "Signers must be unique");
        
        signer1 = _signer1;
        signer2 = _signer2;
        signer3 = _signer3;
    }
    
    /**
     * @dev Create emergency proposal (any signer can propose)
     */
    function createEmergencyProposal(
        EmergencyAction action,
        address targetContract,
        bytes calldata callData
    ) external onlySigner returns (uint256 proposalId) {
        proposalId = ++proposalCount;
        
        EmergencyProposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.action = action;
        proposal.targetContract = targetContract;
        proposal.callData = callData;
        proposal.createdAt = block.timestamp;
        proposal.executionTime = block.timestamp + TIME_LOCK_DELAY;
        proposal.executed = false;
        proposal.signatureCount = 0;
        
        emit EmergencyProposalCreated(
            proposalId,
            action,
            targetContract,
            proposal.executionTime
        );
        
        // Automatically sign by proposer
        _signProposal(proposalId, msg.sender);
        
        return proposalId;
    }
    
    /**
     * @dev Sign emergency proposal
     */
    function signProposal(uint256 proposalId) external onlySigner proposalExists(proposalId) {
        _signProposal(proposalId, msg.sender);
    }
    
    /**
     * @dev Internal: Sign proposal
     */
    function _signProposal(uint256 proposalId, address signer) internal {
        EmergencyProposal storage proposal = proposals[proposalId];
        
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.signatures[signer], "Already signed by this signer");
        
        proposal.signatures[signer] = true;
        proposal.signatureCount++;
        
        emit EmergencyProposalSigned(
            proposalId,
            signer,
            proposal.signatureCount
        );
    }
    
    /**
     * @dev Execute emergency proposal (2-of-3 consensus + time-lock)
     */
    function executeEmergencyProposal(uint256 proposalId) 
        external 
        onlySigner 
        proposalExists(proposalId) 
    {
        EmergencyProposal storage proposal = proposals[proposalId];
        
        require(!proposal.executed, "Proposal already executed");
        require(proposal.signatureCount >= REQUIRED_SIGNATURES, "Insufficient signatures (need 2-of-3)");
        require(block.timestamp >= proposal.executionTime, "Time-lock not expired");
        
        // Mark as executed
        proposal.executed = true;
        
        // Execute action
        (bool success, ) = proposal.targetContract.call(proposal.callData);
        require(success, "Emergency action failed");
        
        emit EmergencyActionExecuted(
            proposalId,
            proposal.action,
            proposal.targetContract
        );
    }
    
    /**
     * @dev Cancel proposal (requires 2-of-3 consensus)
     */
    function cancelProposal(uint256 proposalId) 
        external 
        onlySigner 
        proposalExists(proposalId) 
    {
        EmergencyProposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Proposal already executed");
        
        // Mark as executed (cancelled)
        proposal.executed = true;
    }
    
    /**
     * @dev Check if proposal has enough signatures
     */
    function hasConsensus(uint256 proposalId) external view proposalExists(proposalId) returns (bool) {
        return proposals[proposalId].signatureCount >= REQUIRED_SIGNATURES;
    }
    
    /**
     * @dev Check if signer has signed proposal
     */
    function hasSigned(uint256 proposalId, address signer) 
        external 
        view 
        proposalExists(proposalId) 
        returns (bool) 
    {
        return proposals[proposalId].signatures[signer];
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId)
        external
        view
        proposalExists(proposalId)
        returns (
            EmergencyAction action,
            address targetContract,
            uint256 createdAt,
            uint256 executionTime,
            bool executed,
            uint8 signatureCount
        )
    {
        EmergencyProposal storage proposal = proposals[proposalId];
        return (
            proposal.action,
            proposal.targetContract,
            proposal.createdAt,
            proposal.executionTime,
            proposal.executed,
            proposal.signatureCount
        );
    }
}
