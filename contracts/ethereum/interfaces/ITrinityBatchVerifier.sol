// SPDX-License-Identifier: MIT
// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:18.944Z
pragma solidity ^0.8.20;

/**
 * @title ITrinityBatchVerifier - Batch Verification Interface for Exit-Batch System
 * @notice Extends Trinity Protocol to support batch exit verification
 * @dev Validators verify sum of exit amounts matches batchRoot
 */
interface ITrinityBatchVerifier {
    /**
     * @notice Verify batch with 2-of-3 Trinity consensus
     * @param batchRoot Merkle root of all exits in batch
     * @param expectedTotal Sum of all exit amounts (must match)
     * @param merkleProof Trinity consensus proof
     * @param trinityOperationId Unique operation identifier
     * @return valid True if 2-of-3 consensus achieved AND expectedTotal verified
     * 
     * @dev Trinity validators:
     * 1. Reconstruct Merkle tree from actual exit data on their chain
     * 2. Compute sum of all exit amounts
     * 3. Verify hash(batchRoot, actualSum) matches operation data
     * 4. Sign if match, reject if mismatch
     */
    function verifyBatch(
        bytes32 batchRoot,
        uint256 expectedTotal,
        bytes32[] calldata merkleProof,
        bytes32 trinityOperationId
    ) external view returns (bool valid);
    
    /**
     * @notice Create batch verification operation
     * @param batchRoot Merkle root of exits
     * @param expectedTotal Expected sum of exit amounts
     * @return operationId Trinity operation ID
     */
    function createBatchOperation(
        bytes32 batchRoot,
        uint256 expectedTotal
    ) external payable returns (bytes32 operationId);
}
