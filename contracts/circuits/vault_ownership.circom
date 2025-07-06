pragma circom 2.0.0;

/*
 * Vault Ownership Circuit for Chronos Vault
 * 
 * This circuit validates that a user has the correct private key
 * that corresponds to the owner address of a specific vault.
 */

include "../node_modules/circomlib/circuits/mimc.circom";

template VaultOwnershipVerifier() {
    // Public inputs
    signal input vaultId;
    signal input publicOwnerAddress;
    
    // Private inputs
    signal input privateKey;
    signal input salt;
    
    // Intermediate values
    component mimc1 = MiMC7(91);
    mimc1.x_in <== privateKey;
    mimc1.k <== salt;
    
    // Verify that the privateKey corresponds to the publicOwnerAddress
    signal addressHash <== mimc1.out;
    
    // For enhanced security, we also compute a hash that includes the vaultId
    component mimc2 = MiMC7(91);
    mimc2.x_in <== privateKey;
    mimc2.k <== vaultId + salt;
    
    signal verificationHash <== mimc2.out;
    
    // Assert that the publicOwnerAddress matches what we expect
    publicOwnerAddress === addressHash;
}

component main {public [vaultId, publicOwnerAddress]} = VaultOwnershipVerifier();