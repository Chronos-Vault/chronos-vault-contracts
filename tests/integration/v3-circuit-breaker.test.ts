/**
 * V3 Circuit Breaker Integration Tests
 * 
 * Tests the V3 circuit breaker functionality including:
 * - Auto-pause on volume spike
 * - Auto-pause on failure rate threshold
 * - Auto-recovery mechanism
 * - Emergency multi-sig controls
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { time } from '@nomicfoundation/hardhat-network-helpers';

// V3 Contract Addresses (Arbitrum Sepolia)
const CROSSCHAIN_BRIDGE_V3 = '0x39601883CD9A115Aba0228fe0620f468Dc710d54';
const CVT_BRIDGE_V3 = '0x00d02550f2a8Fd2CeCa0d6b7882f05Beead1E5d0';
const EMERGENCY_MULTISIG = '0xFafCA23a7c085A842E827f53A853141C8243F924';

describe('V3 Circuit Breaker Integration', function () {
  async function deployV3Fixture() {
    const [owner, signer1, signer2, signer3, user] = await ethers.getSigners();
    
    // Deploy mock V3 contracts for testing
    const CrossChainBridgeV3 = await ethers.getContractFactory('CrossChainBridgeV3');
    const bridge = await CrossChainBridgeV3.deploy();
    
    const CVTBridgeV3 = await ethers.getContractFactory('CVTBridgeV3');
    const cvtBridge = await CVTBridgeV3.deploy();
    
    const EmergencyMultiSig = await ethers.getContractFactory('EmergencyMultiSig');
    const multiSig = await EmergencyMultiSig.deploy(
      [signer1.address, signer2.address, signer3.address],
      2 // 2-of-3
    );
    
    return { bridge, cvtBridge, multiSig, owner, signer1, signer2, signer3, user };
  }

  describe('CrossChainBridgeV3 Circuit Breaker', function () {
    it('Should auto-pause on 500% volume spike', async function () {
      const { bridge, user } = await loadFixture(deployV3Fixture);
      
      // Get baseline volume
      const baselineVolume = await bridge.get24hVolume();
      
      // Simulate 500% volume spike
      const spikeAmount = baselineVolume * 6n; // 600% = 6x baseline
      
      // This should trigger circuit breaker
      await expect(
        bridge.connect(user).transfer(spikeAmount)
      ).to.be.revertedWith('Circuit breaker: Volume spike detected');
      
      // Verify bridge is paused
      expect(await bridge.isPaused()).to.equal(true);
    });

    it('Should auto-pause on 20% proof failure rate', async function () {
      const { bridge } = await loadFixture(deployV3Fixture);
      
      // Simulate 20% proof failures
      for (let i = 0; i < 10; i++) {
        if (i < 2) {
          await bridge.submitProof(ethers.randomBytes(32), false); // Failed proof
        } else {
          await bridge.submitProof(ethers.randomBytes(32), true); // Valid proof
        }
      }
      
      // Check failure rate and pause status
      const failureRate = await bridge.getFailedProofRate();
      expect(failureRate).to.be.greaterThanOrEqual(20);
      expect(await bridge.isPaused()).to.equal(true);
    });

    it('Should auto-recover after 4 hours', async function () {
      const { bridge, user } = await loadFixture(deployV3Fixture);
      
      // Trigger circuit breaker
      const baselineVolume = await bridge.get24hVolume();
      const spikeAmount = baselineVolume * 6n;
      await expect(
        bridge.connect(user).transfer(spikeAmount)
      ).to.be.revertedWith('Circuit breaker: Volume spike detected');
      
      expect(await bridge.isPaused()).to.equal(true);
      
      // Fast forward 4 hours
      await time.increase(4 * 60 * 60);
      
      // Should auto-recover
      await bridge.checkAutoRecovery();
      expect(await bridge.isPaused()).to.equal(false);
    });
  });

  describe('CVTBridgeV3 Circuit Breaker', function () {
    it('Should auto-pause on 20% signature failure rate', async function () {
      const { cvtBridge } = await loadFixture(deployV3Fixture);
      
      // Simulate 20% signature failures
      for (let i = 0; i < 10; i++) {
        if (i < 2) {
          await cvtBridge.verifySignature(ethers.randomBytes(65), false); // Failed sig
        } else {
          await cvtBridge.verifySignature(ethers.randomBytes(65), true); // Valid sig
        }
      }
      
      const failureRate = await cvtBridge.getFailedSigRate();
      expect(failureRate).to.be.greaterThanOrEqual(20);
      expect(await cvtBridge.isPaused()).to.equal(true);
    });

    it('Should auto-recover after 2 hours', async function () {
      const { cvtBridge } = await loadFixture(deployV3Fixture);
      
      // Trigger pause
      for (let i = 0; i < 10; i++) {
        if (i < 2) {
          await cvtBridge.verifySignature(ethers.randomBytes(65), false);
        } else {
          await cvtBridge.verifySignature(ethers.randomBytes(65), true);
        }
      }
      
      expect(await cvtBridge.isPaused()).to.equal(true);
      
      // Fast forward 2 hours
      await time.increase(2 * 60 * 60);
      
      // Auto-recovery
      await cvtBridge.checkAutoRecovery();
      expect(await cvtBridge.isPaused()).to.equal(false);
    });
  });

  describe('Emergency MultiSig Controls', function () {
    it('Should require 2-of-3 signatures for emergency pause', async function () {
      const { multiSig, bridge, signer1, signer2 } = await loadFixture(deployV3Fixture);
      
      const pauseData = bridge.interface.encodeFunctionData('emergencyPause');
      
      // Submit proposal
      const tx = await multiSig.connect(signer1).submitTransaction(
        await bridge.getAddress(),
        pauseData
      );
      const receipt = await tx.wait();
      const txId = 0; // First transaction
      
      // First signature
      await multiSig.connect(signer1).confirmTransaction(txId);
      
      // Should not execute yet (need 2 signatures)
      expect(await bridge.isPaused()).to.equal(false);
      
      // Second signature
      await multiSig.connect(signer2).confirmTransaction(txId);
      
      // After 48h time-lock, should execute
      await time.increase(48 * 60 * 60);
      await multiSig.executeTransaction(txId);
      
      expect(await bridge.isPaused()).to.equal(true);
    });

    it('Should enforce 48-hour time-lock', async function () {
      const { multiSig, bridge, signer1, signer2 } = await loadFixture(deployV3Fixture);
      
      const pauseData = bridge.interface.encodeFunctionData('emergencyPause');
      
      const tx = await multiSig.connect(signer1).submitTransaction(
        await bridge.getAddress(),
        pauseData
      );
      const txId = 0;
      
      await multiSig.connect(signer1).confirmTransaction(txId);
      await multiSig.connect(signer2).confirmTransaction(txId);
      
      // Try to execute immediately (should fail)
      await expect(
        multiSig.executeTransaction(txId)
      ).to.be.revertedWith('Time-lock period not elapsed');
      
      // Fast forward 47 hours (still before time-lock)
      await time.increase(47 * 60 * 60);
      await expect(
        multiSig.executeTransaction(txId)
      ).to.be.revertedWith('Time-lock period not elapsed');
      
      // Fast forward 1 more hour (48h total)
      await time.increase(1 * 60 * 60);
      
      // Should succeed now
      await expect(multiSig.executeTransaction(txId)).to.not.be.reverted;
    });
  });

  describe('Trinity Protocol Integration', function () {
    it('Should verify 2-of-3 consensus', async function () {
      const { bridge } = await loadFixture(deployV3Fixture);
      
      // Simulate consensus from 2 of 3 chains
      await bridge.submitChainConsensus('arbitrum', true);
      await bridge.submitChainConsensus('solana', true);
      await bridge.submitChainConsensus('ton', false);
      
      const consensusReached = await bridge.checkTrinityConsensus();
      expect(consensusReached).to.equal(true);
    });

    it('Should reject if only 1-of-3 chains agree', async function () {
      const { bridge } = await loadFixture(deployV3Fixture);
      
      await bridge.submitChainConsensus('arbitrum', true);
      await bridge.submitChainConsensus('solana', false);
      await bridge.submitChainConsensus('ton', false);
      
      const consensusReached = await bridge.checkTrinityConsensus();
      expect(consensusReached).to.equal(false);
    });
  });
});
