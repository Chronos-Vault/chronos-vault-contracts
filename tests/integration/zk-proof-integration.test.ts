/**
 * Zero-Knowledge Proof System Integration Tests
 * 
 * This test suite verifies the integration between various components of the 
 * zero-knowledge proof system, ensuring they work correctly together.
 */

import { expect } from 'chai';
import { zkProofAggregation } from '../../server/security/zk-proof-aggregation';
import { enhancedZeroKnowledgeService } from '../../server/security/enhanced-zero-knowledge-service';
import { ZkProofType } from '../../server/security/zero-knowledge-shield';
import { BlockchainType } from '../../shared/types';

// Sample test data
const TEST_VAULT_ID = `test-vault-${Date.now()}`;
const TEST_USER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TEST_TON_ADDRESS = 'EQAvDfYmkVV2zFXzC0Hs2e2RGWJyMXHpnMTXH4jnI2W3AwLb';
const TEST_SOLANA_ADDRESS = 'ChronoSVauLt111111111111111111111111111111111';

describe('Zero-Knowledge Proof System Integration', () => {
  describe('Proof Generation & Verification', () => {
    it('should generate and verify a proof for Ethereum blockchain', async () => {
      // Generate a proof for Ethereum
      const proof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.ETHEREUM,
        TEST_USER_ADDRESS,
        ZkProofType.VAULT_OWNERSHIP,
        { unlockTime: Date.now() + 3600000 }
      );

      // Verify the proof
      const result = await enhancedZeroKnowledgeService.verifyEnhancedProof(
        proof,
        ZkProofType.VAULT_OWNERSHIP,
        BlockchainType.ETHEREUM
      );

      expect(result.success).to.be.true;
      expect(result.blockchainType).to.equal(BlockchainType.ETHEREUM);
      expect(result.proofType).to.equal(ZkProofType.VAULT_OWNERSHIP);
    });

    it('should generate and verify proofs for multiple blockchains', async () => {
      // Generate proofs for each chain
      const ethereumProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.ETHEREUM,
        TEST_USER_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'primary' }
      );

      const tonProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.TON,
        TEST_TON_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'backup' }
      );

      const solanaProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.SOLANA,
        TEST_SOLANA_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'monitoring' }
      );

      // Verify each proof individually
      const ethereumResult = await enhancedZeroKnowledgeService.verifyEnhancedProof(
        ethereumProof,
        ZkProofType.CROSS_CHAIN,
        BlockchainType.ETHEREUM
      );

      const tonResult = await enhancedZeroKnowledgeService.verifyEnhancedProof(
        tonProof,
        ZkProofType.CROSS_CHAIN,
        BlockchainType.TON
      );

      const solanaResult = await enhancedZeroKnowledgeService.verifyEnhancedProof(
        solanaProof,
        ZkProofType.CROSS_CHAIN,
        BlockchainType.SOLANA
      );

      expect(ethereumResult.success).to.be.true;
      expect(tonResult.success).to.be.true;
      expect(solanaResult.success).to.be.true;
    });
  });

  describe('Proof Aggregation', () => {
    it('should aggregate proofs from multiple chains', async () => {
      // Generate proofs for each chain
      const ethereumProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.ETHEREUM,
        TEST_USER_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'primary' }
      );

      const tonProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.TON,
        TEST_TON_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'backup' }
      );

      const solanaProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.SOLANA,
        TEST_SOLANA_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'monitoring' }
      );

      // Aggregate the proofs
      const proofs = {
        [BlockchainType.ETHEREUM]: ethereumProof,
        [BlockchainType.TON]: tonProof,
        [BlockchainType.SOLANA]: solanaProof
      };

      const aggregatedProof = await zkProofAggregation.aggregateProofs(
        TEST_VAULT_ID,
        proofs,
        BlockchainType.ETHEREUM,
        { testMetadata: 'Integration Test' }
      );

      expect(aggregatedProof).to.exist;
      expect(aggregatedProof.vaultId).to.equal(TEST_VAULT_ID);
      expect(aggregatedProof.chains).to.have.length(3);
      expect(aggregatedProof.primaryChain).to.equal(BlockchainType.ETHEREUM);
      expect(aggregatedProof.status).to.equal('verified');
      expect(aggregatedProof.validatedBy).to.have.length.at.least(2);
    });

    it('should validate an aggregated proof', async () => {
      // Generate proofs for two chains (minimum threshold)
      const ethereumProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.ETHEREUM,
        TEST_USER_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'primary' }
      );

      const tonProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.TON,
        TEST_TON_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'backup' }
      );

      // Aggregate the proofs
      const proofs = {
        [BlockchainType.ETHEREUM]: ethereumProof,
        [BlockchainType.TON]: tonProof
      };

      const aggregatedProof = await zkProofAggregation.aggregateProofs(
        TEST_VAULT_ID,
        proofs,
        BlockchainType.ETHEREUM
      );

      // Validate the aggregated proof
      const isValid = zkProofAggregation.validateAggregatedProof(aggregatedProof.id);
      expect(isValid).to.be.true;
    });

    it('should add a new chain validation to an existing proof', async () => {
      // Generate proofs for two chains initially
      const ethereumProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.ETHEREUM,
        TEST_USER_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'primary' }
      );

      const tonProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.TON,
        TEST_TON_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'backup' }
      );

      // Aggregate the initial proofs
      const proofs = {
        [BlockchainType.ETHEREUM]: ethereumProof,
        [BlockchainType.TON]: tonProof
      };

      const aggregatedProof = await zkProofAggregation.aggregateProofs(
        TEST_VAULT_ID,
        proofs,
        BlockchainType.ETHEREUM
      );

      // Generate a new proof for Solana
      const solanaProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.SOLANA,
        TEST_SOLANA_ADDRESS,
        ZkProofType.CROSS_CHAIN,
        { chainRole: 'monitoring' }
      );

      // Add the new chain validation
      const updatedProof = await zkProofAggregation.addChainValidation(
        aggregatedProof.id,
        BlockchainType.SOLANA,
        solanaProof
      );

      // Verify the update was successful
      expect(updatedProof.chains).to.include(BlockchainType.SOLANA);
      expect(updatedProof.validatedBy).to.include(BlockchainType.SOLANA);
      expect(updatedProof.proofs[BlockchainType.SOLANA]).to.exist;
      expect(updatedProof.status).to.equal('verified');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid proofs and maintain system integrity', async () => {
      // Generate a valid proof
      const validProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.ETHEREUM,
        TEST_USER_ADDRESS,
        ZkProofType.VAULT_OWNERSHIP
      );

      // Create an invalid proof by tampering with the valid proof
      const invalidProof = {
        ...validProof,
        proof: validProof.proof.substring(0, validProof.proof.length - 5) + 'tampered',
        publicInputs: [...validProof.publicInputs, 'extraInput']
      };

      // Verify both proofs
      const validResult = await enhancedZeroKnowledgeService.verifyEnhancedProof(
        validProof,
        ZkProofType.VAULT_OWNERSHIP,
        BlockchainType.ETHEREUM
      );

      const invalidResult = await enhancedZeroKnowledgeService.verifyEnhancedProof(
        invalidProof,
        ZkProofType.VAULT_OWNERSHIP,
        BlockchainType.ETHEREUM
      ).catch(e => ({ success: false, error: e.message }));

      // The valid proof should verify, but the tampered one should fail
      expect(validResult.success).to.be.true;
      expect(invalidResult.success).to.be.false;
    });

    it('should require a minimum threshold of chain validations', async () => {
      // Generate a proof for only one chain (below threshold)
      const ethereumProof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.ETHEREUM,
        TEST_USER_ADDRESS,
        ZkProofType.CROSS_CHAIN
      );

      // Aggregate with just one proof (should be 'pending')
      const proofs = {
        [BlockchainType.ETHEREUM]: ethereumProof
      };

      const aggregatedProof = await zkProofAggregation.aggregateProofs(
        TEST_VAULT_ID,
        proofs,
        BlockchainType.ETHEREUM
      );

      // Status should be pending since it's below threshold
      expect(aggregatedProof.status).to.equal('pending');
      expect(zkProofAggregation.validateAggregatedProof(aggregatedProof.id)).to.be.false;
    });
  });

  describe('Performance and Security', () => {
    it('should handle concurrent proof verification', async () => {
      // Generate multiple proofs
      const proofPromises = [];
      for (let i = 0; i < 5; i++) {
        const vaultId = `${TEST_VAULT_ID}-${i}`;
        proofPromises.push(
          enhancedZeroKnowledgeService.generateEnhancedProof(
            vaultId,
            BlockchainType.ETHEREUM,
            TEST_USER_ADDRESS,
            ZkProofType.VAULT_OWNERSHIP
          )
        );
      }

      const generatedProofs = await Promise.all(proofPromises);

      // Verify all proofs concurrently
      const verificationPromises = generatedProofs.map(proof => 
        enhancedZeroKnowledgeService.verifyEnhancedProof(
          proof,
          ZkProofType.VAULT_OWNERSHIP,
          BlockchainType.ETHEREUM
        )
      );

      const results = await Promise.all(verificationPromises);

      // All verifications should succeed
      expect(results.every(r => r.success)).to.be.true;
    });

    it('should maintain privacy and not expose sensitive data', async () => {
      // Generate a proof with sensitive data
      const sensitiveData = {
        privateKey: 'this_should_never_appear_in_proof',
        balance: 1000000,
        personalData: 'secret_user_info'
      };

      const proof = await enhancedZeroKnowledgeService.generateEnhancedProof(
        TEST_VAULT_ID,
        BlockchainType.ETHEREUM,
        TEST_USER_ADDRESS,
        ZkProofType.ASSET_OWNERSHIP,
        sensitiveData
      );

      // Verify proof structure doesn't contain sensitive info
      expect(proof.proof).to.be.a('string');
      expect(proof.publicInputs).to.be.an('array');
      
      // Convert all proof data to string for easy searching
      const proofStr = JSON.stringify(proof);
      
      // Make sure sensitive data is not present in the proof
      expect(proofStr).not.to.include('this_should_never_appear_in_proof');
      expect(proofStr).not.to.include('secret_user_info');
    });
  });
});