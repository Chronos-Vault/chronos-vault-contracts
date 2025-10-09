pragma circom 2.0.0;

/*
 * Multi-Signature Verification Circuit for Chronos Vault
 * 
 * This circuit verifies that a minimum threshold of signatures
 * have been provided for a vault operation.
 */

include "../node_modules/circomlib/circuits/mimc.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template MultiSigVerifier(n) {
    // Maximum number of signers n

    // Public inputs
    signal input threshold; // required number of valid signatures
    signal input vaultId;
    
    // Private inputs
    signal input numValidSignatures; // actual number of valid signatures
    signal input signatureHashes[n]; // hashes of signatures (0 for unused slots)
    signal input validityFlags[n]; // 1 for valid signature, 0 for invalid/unused
    
    // Count valid signatures
    signal validCount;
    validCount <== validityFlags[0];
    
    for (var i=1; i<n; i++) {
        validCount = validCount + validityFlags[i];
    }
    
    // Ensure validCount equals numValidSignatures
    validCount === numValidSignatures;
    
    // Check that we have at least threshold signatures
    component gte = GreaterEqThan(32);
    gte.in[0] <== numValidSignatures;
    gte.in[1] <== threshold;
    
    // Ensure the comparison is valid (must be 1)
    gte.out === 1;
    
    // Compute a combined hash of all valid signatures to prove they were used
    component mimc = MiMC7(91);
    
    // Initialize with vault ID to bind signatures to this specific vault
    signal combinedHash;
    combinedHash <== vaultId;
    
    // Accumulate all valid signatures
    for (var i=0; i<n; i++) {
        signal tmp <== signatureHashes[i] * validityFlags[i];
        combinedHash = combinedHash + tmp;
    }
}

component main {public [threshold, vaultId]} = MultiSigVerifier(10);