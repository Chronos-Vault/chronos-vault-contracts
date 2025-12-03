// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ProofValidation Library
 * @notice Handles Merkle proof verification and multi-chain consensus validation
 * @dev Extracted from CrossChainBridgeOptimized v3.1 for bytecode optimization
 * 
 * OPTIMIZATION IMPACT:
 * - Reduces main contract bytecode by ~600-800 bytes
 * - Merkle proof computation in library code
 * - Signature verification logic extracted
 * 
 * FUNCTIONS:
 * - verifyMerkleProof: Validates Merkle tree inclusion proofs
 * - computeMerkleRoot: Computes Merkle root from leaf and proof
 * - recoverValidatorSigner: Recovers signer address from signature
 * - validateSignatureCount: Checks if enough valid signatures provided
 */
library ProofValidation {
    using ECDSA for bytes32;
    
    /**
     * @notice Verifies a Merkle proof
     * @dev Uses optimized hashing to verify leaf inclusion in Merkle tree
     * @param leaf The leaf hash to verify
     * @param proof Array of sibling hashes from leaf to root
     * @param root The expected Merkle root
     * @return valid True if proof is valid
     */
    function verifyMerkleProof(
        bytes32 leaf,
        bytes32[] memory proof,
        bytes32 root
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                // Hash(current, proof[i])
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                // Hash(proof[i], current)
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == root;
    }
    
    /**
     * @notice Verifies a Merkle proof with nonce for replay protection
     * @dev v3.4: Includes merkle nonce in leaf hash to prevent replay attacks
     * @param leaf The base leaf hash to verify
     * @param proof Array of sibling hashes from leaf to root
     * @param root The expected Merkle root
     * @param nonce The merkle nonce for replay protection
     * @return valid True if proof is valid
     */
    function verifyMerkleProofWithNonce(
        bytes32 leaf,
        bytes32[] memory proof,
        bytes32 root,
        uint256 nonce
    ) internal pure returns (bool) {
        // HIGH FIX: Enforce proof length limit in library (defense-in-depth)
        // Prevents gas griefing even if caller forgets to check
        require(proof.length <= 32, "Proof too deep");
        
        bytes32 nonceLeaf = keccak256(abi.encodePacked(leaf, nonce));
        bytes32 computedHash = nonceLeaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == root;
    }
    
    /**
     * @notice Computes Merkle root from leaf and proof path
     * @dev Helper function for proof verification with caching
     * @param leaf The leaf hash
     * @param proof Array of sibling hashes
     * @return root The computed Merkle root
     */
    function computeMerkleRoot(
        bytes32 leaf,
        bytes32[] memory proof
    ) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash;
    }
    
    /**
     * @notice Recovers validator address from signature
     * @dev Creates Ethereum signed message hash and recovers signer
     * @param messageHash The original message hash
     * @param signature The validator's signature
     * @return signer The recovered address
     */
    function recoverValidatorSigner(
        bytes32 messageHash,
        bytes memory signature
    ) internal pure returns (address) {
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
        
        return ECDSA.recover(ethSignedMessageHash, signature);
    }
    
    /**
     * @notice Validates if signature count meets consensus threshold
     * @dev Trinity Protocol requires 2-of-3 consensus
     * @param validSignatures Number of valid signatures
     * @param requiredConsensus Required number of signatures (always 2)
     * @return meetsThreshold True if consensus requirements met
     */
    function validateSignatureCount(
        uint256 validSignatures,
        uint256 requiredConsensus
    ) internal pure returns (bool) {
        return validSignatures >= requiredConsensus;
    }
    
    /**
     * @notice Creates message hash for consensus-based operations
     * @dev Used in createOperation with validator consensus
     * @param operationId Unique operation identifier
     * @param sourceChain Source blockchain name
     * @param destChain Destination blockchain name
     * @param amount Transfer amount
     * @param sender Operation initiator
     * @return messageHash The computed message hash
     */
    function createConsensusMessageHash(
        bytes32 operationId,
        string memory sourceChain,
        string memory destChain,
        uint256 amount,
        address sender
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            operationId,
            sourceChain,
            destChain,
            amount,
            sender
        ));
    }
    // LOW-11 FIX: Removed unused createChainBoundRootHash function to save ~120 bytes bytecode
}
