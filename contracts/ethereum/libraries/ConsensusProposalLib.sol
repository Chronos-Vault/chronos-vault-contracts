// SPDX-License-Identifier: MIT
// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:14.847Z
pragma solidity ^0.8.20;

/**
 * @title ConsensusProposalLib
 * @notice Library for managing 2-of-3 consensus proposals (validator rotation & Merkle updates)
 * @dev Extracted from TrinityConsensusVerifier v3.3 to reduce bytecode size
 */
library ConsensusProposalLib {
    
    // ===== CONSTANTS =====
    
    uint256 internal constant ROTATION_PROPOSAL_EXPIRY = 7 days;
    uint256 internal constant MERKLE_PROPOSAL_EXPIRY = 3 days;
    
    // ===== STRUCTS =====
    
    struct ValidatorRotationProposal {
        uint8 chainId;
        address oldValidator;
        address newValidator;
        uint256 proposedAt;
        address proposedBy; // v3.5.2: Track proposer to prevent self-confirmation
        uint8 confirmations;
        mapping(address => bool) confirmedBy;
        bool executed;
    }
    
    struct MerkleRootProposal {
        uint8 chainId; // v3.5.5 HIGH FIX H-3: Store chainId to prevent cross-chain replay
        bytes32 newRoot;
        uint256 proposedAt;
        address proposedBy; // v3.5.2: Track proposer to prevent self-confirmation
        uint8 confirmations;
        mapping(address => bool) confirmedBy;
        bool executed;
    }
    
    // ===== PROPOSAL VALIDATION =====
    
    /**
     * @notice Check if validator rotation proposal is expired
     */
    function isRotationProposalExpired(
        uint256 proposedAt,
        uint256 currentTime
    ) internal pure returns (bool) {
        return currentTime > proposedAt + ROTATION_PROPOSAL_EXPIRY;
    }
    
    /**
     * @notice Check if Merkle root proposal is expired
     */
    function isMerkleProposalExpired(
        uint256 proposedAt,
        uint256 currentTime
    ) internal pure returns (bool) {
        return currentTime > proposedAt + MERKLE_PROPOSAL_EXPIRY;
    }
    
    /**
     * @notice Generate proposal ID for validator rotation
     */
    function generateRotationProposalId(
        uint8 chainId,
        address oldValidator,
        address newValidator,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "VALIDATOR_ROTATION",
            chainId,
            oldValidator,
            newValidator,
            timestamp
        ));
    }
    
    /**
     * @notice Generate proposal ID for Merkle root update
     */
    function generateMerkleProposalId(
        uint8 chainId,
        bytes32 newRoot,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "MERKLE_UPDATE",
            chainId,
            newRoot,
            timestamp
        ));
    }
    
    /**
     * @notice Check if proposal has sufficient confirmations (2-of-3)
     */
    function hasConsensus(uint8 confirmations) internal pure returns (bool) {
        return confirmations >= 2;
    }
    
    /**
     * @notice Validate addresses for rotation proposal
     */
    function validateRotationAddresses(
        address oldValidator,
        address newValidator
    ) internal pure returns (bool) {
        return oldValidator != address(0) && 
               newValidator != address(0) && 
               oldValidator != newValidator;
    }
    
    /**
     * @notice Validate new Merkle root is not zero
     */
    function validateMerkleRoot(bytes32 newRoot) internal pure returns (bool) {
        return newRoot != bytes32(0);
    }
    
    /**
     * @notice Validate proposer is not confirming their own proposal
     * @dev CRITICAL FIX: Enforces no-self-confirmation rule
     * @param proposer Address that created the proposal
     * @param confirmer Address attempting to confirm
     * @return valid True if confirmer is not the proposer
     */
    function requireNotProposer(address proposer, address confirmer) internal pure returns (bool) {
        require(proposer != confirmer, "Cannot confirm own proposal");
        return true;
    }
    
    /**
     * @notice Validate chain ID is within valid range (1-3)
     * @dev MEDIUM FIX: Prevents cross-chain proposal replay
     * @param chainId Chain identifier to validate
     */
    function requireValidChainId(uint8 chainId) internal pure {
        require(chainId >= 1 && chainId <= 3, "Invalid chain ID");
    }
}
