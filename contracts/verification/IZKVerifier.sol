// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IZKVerifier
 * @author Chronos Vault Team
 * @notice Interface for ZK proof verification in Trinity Protocol
 */
interface IZKVerifier {
    
    /**
     * @notice Verify a multi-signature ZK proof
     * @param proof The Groth16 proof (8 uint256 values)
     * @param publicInputs Public inputs for verification
     * @return valid True if proof is valid
     */
    function verifyMultisigProof(
        uint256[8] calldata proof,
        uint256[] calldata publicInputs
    ) external view returns (bool valid);
    
    /**
     * @notice Verify a vault ownership ZK proof
     * @param proof The Groth16 proof
     * @param ownerPublicKeyHash Hash of owner's public key
     * @param vaultRoot Merkle root of vault state
     * @param challengeHash Challenge hash for replay protection
     * @return valid True if proof is valid
     */
    function verifyVaultOwnership(
        uint256[8] calldata proof,
        uint256 ownerPublicKeyHash,
        uint256 vaultRoot,
        uint256 challengeHash
    ) external view returns (bool valid);
    
    /**
     * @notice Batch verify multiple proofs
     * @param proofs Array of proofs
     * @param publicInputsArray Array of public inputs per proof
     * @return allValid True if all proofs are valid
     */
    function batchVerifyMultisigProofs(
        uint256[8][] calldata proofs,
        uint256[][] calldata publicInputsArray
    ) external view returns (bool allValid);
}
