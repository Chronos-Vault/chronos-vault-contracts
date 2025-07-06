/**
 * Cross-Chain Failover Mechanism Integration Tests
 * 
 * Tests the cross-chain failover mechanism's ability to recover from chain outages
 * and maintain vault security across the Triple-Chain Security architecture.
 */

import { crossChainFailover } from '../../server/security/cross-chain-failover-mechanism';
import { RecoveryStrategy, SecurityLevel, BlockchainType } from '../../shared/types';
import { expect } from 'chai';

describe('Cross-Chain Failover Mechanism', () => {
  before(async () => {
    // Ensure the failover mechanism is initialized
    if (!crossChainFailover['initialized']) {
      await crossChainFailover.initialize();
    }
  });

  describe('Chain Health Monitoring', () => {
    it('should check the health of all supported blockchains', async () => {
      const health = await crossChainFailover.checkAllChainsHealth();
      
      // Verify all chains have a health status
      expect(health).to.have.property('ETH');
      expect(health).to.have.property('SOL');
      expect(health).to.have.property('TON');
      expect(health).to.have.property('BTC');
      
      // Each chain status should have the required properties
      Object.values(health).forEach(chainStatus => {
        expect(chainStatus).to.have.property('isAvailable');
        expect(chainStatus).to.have.property('latency');
        expect(chainStatus).to.have.property('lastSyncTimestamp');
      });
    });
  });

  describe('Failover Strategy Determination', () => {
    it('should determine no failover needed when primary chain is available for basic security', async () => {
      // We'll mock a scenario where Ethereum is available
      const mockVaultId = 'test-vault-1';
      const primaryChain: BlockchainType = 'ETH';
      
      // Force the chain health to be available for this test
      const chainHealth = crossChainFailover.getChainHealthStatus();
      chainHealth[primaryChain].isAvailable = true;
      
      const result = await crossChainFailover.determineFailoverStrategy(
        mockVaultId,
        primaryChain,
        SecurityLevel.BASIC
      );
      
      expect(result.needsFailover).to.be.false;
      expect(result.primaryChainAvailable).to.be.true;
      expect(result.strategy).to.equal(RecoveryStrategy.NONE);
    });

    it('should determine primary chain switch when primary chain is unavailable', async () => {
      const mockVaultId = 'test-vault-2';
      const primaryChain: BlockchainType = 'ETH';
      
      // Force the chain health to simulate Ethereum being down but TON being up
      const chainHealth = crossChainFailover.getChainHealthStatus();
      chainHealth[primaryChain].isAvailable = false;
      chainHealth['TON'].isAvailable = true;
      
      const result = await crossChainFailover.determineFailoverStrategy(
        mockVaultId,
        primaryChain,
        SecurityLevel.BASIC
      );
      
      expect(result.needsFailover).to.be.true;
      expect(result.primaryChainAvailable).to.be.false;
      expect(result.strategy).to.equal(RecoveryStrategy.SWITCH_PRIMARY);
      expect(result.fallbackChain).to.equal('TON');
    });

    it('should handle advanced security level requiring multiple chains', async () => {
      const mockVaultId = 'test-vault-3';
      const primaryChain: BlockchainType = 'ETH';
      
      // Force the chain health to simulate Ethereum being up but Solana being down
      const chainHealth = crossChainFailover.getChainHealthStatus();
      chainHealth[primaryChain].isAvailable = true;
      chainHealth['SOL'].isAvailable = false;
      chainHealth['TON'].isAvailable = true;
      
      const result = await crossChainFailover.determineFailoverStrategy(
        mockVaultId,
        primaryChain,
        SecurityLevel.ADVANCED
      );
      
      expect(result.needsFailover).to.be.true;
      expect(result.primaryChainAvailable).to.be.true;
      expect(result.strategy).to.equal(RecoveryStrategy.PARTIAL_VERIFICATION);
    });
  });

  describe('Failover Execution', () => {
    it('should execute primary chain switch when strategy is SWITCH_PRIMARY', async () => {
      const mockVaultId = 'test-vault-4';
      const primaryChain: BlockchainType = 'ETH';
      
      // Force the chain health to simulate Ethereum being down but TON being up
      const chainHealth = crossChainFailover.getChainHealthStatus();
      chainHealth[primaryChain].isAvailable = false;
      chainHealth['TON'].isAvailable = true;
      
      const result = await crossChainFailover.executeFailover(
        mockVaultId,
        primaryChain
      );
      
      expect(result.success).to.be.true;
      expect(result.newPrimaryChain).to.equal('TON');
      expect(result.recoveryTxHash).to.be.a('string');
    });

    it('should execute partial verification when not all chains are available', async () => {
      const mockVaultId = 'test-vault-5';
      const primaryChain: BlockchainType = 'ETH';
      
      // Force the chain health to simulate Ethereum being up but Solana being down
      const chainHealth = crossChainFailover.getChainHealthStatus();
      chainHealth[primaryChain].isAvailable = true;
      chainHealth['SOL'].isAvailable = false;
      chainHealth['TON'].isAvailable = true;
      
      // First determine the strategy
      await crossChainFailover.determineFailoverStrategy(
        mockVaultId,
        primaryChain,
        SecurityLevel.ADVANCED
      );
      
      // Then execute the failover
      const result = await crossChainFailover.executeFailover(
        mockVaultId,
        primaryChain,
        {
          securityLevel: SecurityLevel.ADVANCED
        }
      );
      
      expect(result.success).to.be.true;
      expect(result.recoveryTxHash).to.be.a('string');
      expect(result.message).to.include('verification');
    });

    it('should handle emergency protocol when multiple critical chains are down', async () => {
      const mockVaultId = 'test-vault-6';
      const primaryChain: BlockchainType = 'ETH';
      
      // Force the chain health to simulate multiple chains being down
      const chainHealth = crossChainFailover.getChainHealthStatus();
      chainHealth['ETH'].isAvailable = false;
      chainHealth['SOL'].isAvailable = false;
      chainHealth['TON'].isAvailable = true;
      chainHealth['BTC'].isAvailable = true;
      
      // First determine the strategy
      await crossChainFailover.determineFailoverStrategy(
        mockVaultId,
        primaryChain,
        SecurityLevel.MAXIMUM
      );
      
      // Then execute the failover
      const result = await crossChainFailover.executeFailover(
        mockVaultId,
        primaryChain,
        {
          securityLevel: SecurityLevel.MAXIMUM
        }
      );
      
      expect(result.success).to.be.true;
      expect(result.recoveryTxHash).to.be.a('string');
      expect(result.message).to.include('protocol');
    });
  });

  describe('Chain Role Management', () => {
    it('should identify the primary chain correctly', () => {
      const primaryChain = crossChainFailover.getPrimaryChain();
      expect(primaryChain).to.equal('ETH');
    });
    
    it('should get chain by role correctly', () => {
      const primaryChain = crossChainFailover.getChainByRole('PRIMARY');
      const monitoringChain = crossChainFailover.getChainByRole('MONITORING');
      const recoveryChain = crossChainFailover.getChainByRole('RECOVERY');
      
      expect(primaryChain).to.equal('ETH');
      expect(monitoringChain).to.equal('SOL');
      expect(recoveryChain).to.equal('TON');
    });
  });
});