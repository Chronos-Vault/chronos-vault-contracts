/**
 * Quantum-Resistant Encryption Integration Tests
 * 
 * This test suite verifies the integration between various components of the
 * quantum-resistant encryption system, ensuring proper operation of the
 * progressive security tiers and multi-signature functionality.
 */

import { expect } from 'chai';
import { 
  quantumResistantEncryptionFinalizer,
  SecurityTier,
  VaultSecurityConfig
} from '../../server/security/quantum-resistant-encryption-finalizer';
import { QuantumResistantAlgorithm } from '../../server/security/quantum-resistant-encryption';

// Sample test data
const TEST_VAULT_ID = `test-vault-${Date.now()}`;
const TEST_OWNER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TEST_SIGNER_1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TEST_SIGNER_2 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const TEST_SECRET_DATA = 'This is highly confidential data that should be protected from quantum attacks';

describe('Quantum-Resistant Encryption Integration', () => {
  describe('Security Tier Configuration', () => {
    it('should determine the correct security tier based on asset value', () => {
      // Test standard tier (0-10,000)
      const standardTier = quantumResistantEncryptionFinalizer.getSecurityTierForValue(5000);
      expect(standardTier.tier).to.equal(SecurityTier.STANDARD);
      
      // Test enhanced tier (10,000-100,000)
      const enhancedTier = quantumResistantEncryptionFinalizer.getSecurityTierForValue(50000);
      expect(enhancedTier.tier).to.equal(SecurityTier.ENHANCED);
      
      // Test advanced tier (100,000-1,000,000)
      const advancedTier = quantumResistantEncryptionFinalizer.getSecurityTierForValue(500000);
      expect(advancedTier.tier).to.equal(SecurityTier.ADVANCED);
      
      // Test maximum tier (1,000,000+)
      const maximumTier = quantumResistantEncryptionFinalizer.getSecurityTierForValue(2000000);
      expect(maximumTier.tier).to.equal(SecurityTier.MAXIMUM);
    });
    
    it('should correctly configure vault security based on value', () => {
      // Configure a standard tier vault
      const standardConfig = quantumResistantEncryptionFinalizer.configureVaultSecurity(
        'standard-vault',
        5000,
        [TEST_OWNER_ADDRESS]
      );
      
      expect(standardConfig.tier).to.equal(SecurityTier.STANDARD);
      expect(standardConfig.requireMultiSignature).to.be.false;
      
      // Configure a maximum tier vault
      const maximumConfig = quantumResistantEncryptionFinalizer.configureVaultSecurity(
        'maximum-vault',
        2000000,
        [TEST_OWNER_ADDRESS, TEST_SIGNER_1, TEST_SIGNER_2],
        { requireGeolocation: true, requireBiometrics: true }
      );
      
      expect(maximumConfig.tier).to.equal(SecurityTier.MAXIMUM);
      expect(maximumConfig.requireMultiSignature).to.be.true;
      expect(maximumConfig.requireGeolocation).to.be.true;
      expect(maximumConfig.requireBiometrics).to.be.true;
    });
  });
  
  describe('Encryption and Decryption', () => {
    let vaultConfig: VaultSecurityConfig;
    
    beforeEach(() => {
      // Configure a test vault with enhanced security
      vaultConfig = quantumResistantEncryptionFinalizer.configureVaultSecurity(
        TEST_VAULT_ID,
        50000, // 50k value for ENHANCED tier
        [TEST_OWNER_ADDRESS, TEST_SIGNER_1]
      );
    });
    
    it('should encrypt data according to the security tier configuration', async () => {
      // Encrypt test data
      const encryptedResult = await quantumResistantEncryptionFinalizer.encryptData(
        TEST_VAULT_ID,
        TEST_SECRET_DATA,
        TEST_OWNER_ADDRESS
      );
      
      // Verify the encryption result matches the expected security tier
      expect(encryptedResult.securityTier).to.equal(SecurityTier.ENHANCED);
      expect(encryptedResult.ciphertext).to.be.a('string');
      expect(encryptedResult.encapsulatedKey).to.be.a('string');
      expect(encryptedResult.hybridMode).to.be.true;
      expect(encryptedResult.securityHash).to.be.a('string');
    });
    
    it('should successfully decrypt previously encrypted data', async () => {
      // Encrypt test data
      const encryptedResult = await quantumResistantEncryptionFinalizer.encryptData(
        TEST_VAULT_ID,
        TEST_SECRET_DATA,
        TEST_OWNER_ADDRESS
      );
      
      // Add required signatures (for enhanced tier)
      await quantumResistantEncryptionFinalizer.addSignature(
        TEST_VAULT_ID,
        TEST_OWNER_ADDRESS,
        'test-signature-1',
        QuantumResistantAlgorithm.FALCON
      );
      
      await quantumResistantEncryptionFinalizer.addSignature(
        TEST_VAULT_ID,
        TEST_SIGNER_1,
        'test-signature-2',
        QuantumResistantAlgorithm.FALCON
      );
      
      // Decrypt the data
      const decryptedData = await quantumResistantEncryptionFinalizer.decryptData(
        encryptedResult,
        TEST_VAULT_ID,
        TEST_OWNER_ADDRESS
      );
      
      // Verify the decrypted data matches the original
      expect(decryptedData).to.equal(TEST_SECRET_DATA);
    });
    
    it('should fail decryption if multi-signature requirement is not met', async () => {
      // Configure a vault with multi-signature requirement
      const multiSigVaultId = 'multi-sig-vault';
      quantumResistantEncryptionFinalizer.configureVaultSecurity(
        multiSigVaultId,
        500000, // 500k value for ADVANCED tier
        [TEST_OWNER_ADDRESS, TEST_SIGNER_1, TEST_SIGNER_2]
      );
      
      // Encrypt test data
      const encryptedResult = await quantumResistantEncryptionFinalizer.encryptData(
        multiSigVaultId,
        TEST_SECRET_DATA,
        TEST_OWNER_ADDRESS
      );
      
      // Add only one signature (not enough for ADVANCED tier)
      await quantumResistantEncryptionFinalizer.addSignature(
        multiSigVaultId,
        TEST_OWNER_ADDRESS,
        'test-signature-1',
        QuantumResistantAlgorithm.DILITHIUM
      );
      
      // Attempt to decrypt (should fail)
      try {
        await quantumResistantEncryptionFinalizer.decryptData(
          encryptedResult,
          multiSigVaultId,
          TEST_OWNER_ADDRESS
        );
        // Should not reach here
        expect.fail('Decryption should have failed due to missing signatures');
      } catch (error) {
        expect(error.message).to.include('Multi-signature requirement not met');
      }
    });
  });
  
  describe('Multi-Signature Management', () => {
    it('should correctly track and verify signatures', async () => {
      // Configure a vault with multi-signature requirement
      const multiSigVaultId = 'multi-sig-management-vault';
      quantumResistantEncryptionFinalizer.configureVaultSecurity(
        multiSigVaultId,
        500000, // ADVANCED tier
        [TEST_OWNER_ADDRESS, TEST_SIGNER_1, TEST_SIGNER_2]
      );
      
      // Add first signature
      const result1 = await quantumResistantEncryptionFinalizer.addSignature(
        multiSigVaultId,
        TEST_OWNER_ADDRESS,
        'test-signature-1',
        QuantumResistantAlgorithm.DILITHIUM
      );
      
      expect(result1.signers).to.have.length(1);
      expect(result1.isComplete).to.be.false;
      
      // Add second signature
      const result2 = await quantumResistantEncryptionFinalizer.addSignature(
        multiSigVaultId,
        TEST_SIGNER_1,
        'test-signature-2',
        QuantumResistantAlgorithm.DILITHIUM
      );
      
      expect(result2.signers).to.have.length(2);
      expect(result2.isComplete).to.be.true; // ADVANCED tier requires 2 signatures
      
      // Get signature bundle
      const bundle = quantumResistantEncryptionFinalizer.getSignatureBundle(multiSigVaultId);
      expect(bundle).to.exist;
      expect(bundle.isComplete).to.be.true;
      expect(bundle.signers).to.have.length(2);
    });
    
    it('should reject signatures from unauthorized signers', async () => {
      // Configure a vault with specific authorized signers
      const restrictedVaultId = 'restricted-signers-vault';
      quantumResistantEncryptionFinalizer.configureVaultSecurity(
        restrictedVaultId,
        50000, // ENHANCED tier
        [TEST_OWNER_ADDRESS, TEST_SIGNER_1] // Only these two are authorized
      );
      
      // Attempt to add signature from unauthorized signer
      try {
        await quantumResistantEncryptionFinalizer.addSignature(
          restrictedVaultId,
          TEST_SIGNER_2, // Not in the authorized list
          'test-signature-unauthorized',
          QuantumResistantAlgorithm.FALCON
        );
        // Should not reach here
        expect.fail('Should have rejected unauthorized signer');
      } catch (error) {
        expect(error.message).to.include('not authorized');
      }
    });
  });
  
  describe('Security Tier Updates', () => {
    it('should correctly update security requirements when asset value changes', () => {
      // Initial configuration for standard tier
      const vaultId = 'updateable-vault';
      const initialConfig = quantumResistantEncryptionFinalizer.configureVaultSecurity(
        vaultId,
        5000, // STANDARD tier
        [TEST_OWNER_ADDRESS]
      );
      
      expect(initialConfig.tier).to.equal(SecurityTier.STANDARD);
      expect(initialConfig.requireMultiSignature).to.be.false;
      
      // Update to MAXIMUM tier
      const updatedTier = quantumResistantEncryptionFinalizer.updateVaultSecurityTier(
        vaultId,
        2000000 // MAXIMUM tier
      );
      
      expect(updatedTier).to.exist;
      expect(updatedTier.tier).to.equal(SecurityTier.MAXIMUM);
      
      // Check that the vault config was updated
      const updatedConfig = quantumResistantEncryptionFinalizer.getVaultSecurityConfig(vaultId);
      expect(updatedConfig).to.exist;
      expect(updatedConfig.tier).to.equal(SecurityTier.MAXIMUM);
      expect(updatedConfig.requireMultiSignature).to.be.true;
    });
  });
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle security hash verification failures', async () => {
      // Configure a vault
      const vaultId = 'tamper-test-vault';
      quantumResistantEncryptionFinalizer.configureVaultSecurity(
        vaultId,
        5000, // STANDARD tier
        [TEST_OWNER_ADDRESS]
      );
      
      // Encrypt data
      const encryptedResult = await quantumResistantEncryptionFinalizer.encryptData(
        vaultId,
        TEST_SECRET_DATA,
        TEST_OWNER_ADDRESS
      );
      
      // Tamper with the security hash
      const tamperedResult = {
        ...encryptedResult,
        securityHash: 'tampered-hash-value'
      };
      
      // Attempt to decrypt with tampered hash
      try {
        await quantumResistantEncryptionFinalizer.decryptData(
          tamperedResult,
          vaultId,
          TEST_OWNER_ADDRESS
        );
        // Should not reach here
        expect.fail('Decryption should have failed due to tampered hash');
      } catch (error) {
        expect(error.message).to.include('Security hash verification failed');
      }
    });
    
    it('should handle unknown vault IDs gracefully', async () => {
      // Attempt to get config for non-existent vault
      const nonExistentConfig = quantumResistantEncryptionFinalizer.getVaultSecurityConfig('non-existent-vault');
      expect(nonExistentConfig).to.be.undefined;
      
      // Attempt to update tier for non-existent vault
      const nonExistentUpdate = quantumResistantEncryptionFinalizer.updateVaultSecurityTier('non-existent-vault', 5000);
      expect(nonExistentUpdate).to.be.undefined;
    });
  });
});