import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { expect } from 'chai';
import { Cell, beginCell, toNano } from 'ton-core';
import { describe, it } from 'mocha';

// Import TON contract bindings (these would be created separately)
import { ChronosVault } from '../../contracts/ton/wrappers/ChronosVault';

describe('ChronosVault Contract (TON)', () => {
  let blockchain: Blockchain;
  let chronosVault: SandboxContract<ChronosVault>;
  
  // Set up a fresh blockchain and contract before each test
  beforeEach(async () => {
    // Initialize a sandbox blockchain
    blockchain = await Blockchain.create();
    
    // Prepare contract initial data
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const securityLevel = 1; // Standard level
    const owner = beginCell().storeAddress(blockchain.sender.address).endCell();
    
    // Deploy Chronos Vault contract
    chronosVault = blockchain.openContract(
      ChronosVault.createFromConfig({
        owner: owner,
        unlockTime: unlockTime,
        securityLevel: securityLevel,
        isUnlocked: false,
      })
    );
    
    // Send a deploy transaction
    const deployResult = await chronosVault.sendDeploy(
      blockchain.sender,
      toNano('1') // Initial balance
    );
    
    expect(deployResult.transactions).to.have.length(2);
  });
  
  describe('Deployment', () => {
    it('should deploy with correct initial state', async () => {
      // Check that the contract deployed with correct initial state
      const state = await chronosVault.getVaultState();
      
      expect(state.isUnlocked).to.equal(false);
      expect(state.securityLevel).to.equal(1);
      
      // Unlock time should be in the future
      const currentTime = Math.floor(Date.now() / 1000);
      expect(state.unlockTime).to.be.greaterThan(currentTime);
    });
    
    it('should set the correct owner', async () => {
      const ownerAddress = await chronosVault.getOwner();
      expect(ownerAddress.equals(blockchain.sender.address)).to.be.true;
    });
  });
  
  describe('Deposit and Withdrawal', () => {
    it('should accept deposits', async () => {
      // Send some TON to the contract
      const depositAmount = toNano('0.5');
      const depositResult = await chronosVault.sendDeposit(
        blockchain.sender,
        depositAmount
      );
      
      // Check that deposit transaction was successful
      expect(depositResult.transactions).to.have.length.greaterThan(1);
      
      // Check contract balance increased
      const balance = await blockchain.getContract(await chronosVault.getAddress());
      expect(balance.balance).to.be.greaterThan(toNano('0.5'));
    });
    
    it('should reject withdrawals before unlock time', async () => {
      // First deposit some funds
      await chronosVault.sendDeposit(blockchain.sender, toNano('0.5'));
      
      // Try to withdraw, should fail
      const withdrawResult = await chronosVault.sendWithdraw(
        blockchain.sender,
        {
          amount: toNano('0.2'),
          destination: blockchain.sender.address
        }
      );
      
      // Expect failure message in transaction
      const messages = withdrawResult.transactions[1].outMessages;
      expect(messages.length).to.equal(1);
      expect(messages[0].body.beginParse().loadUint(32)).to.equal(102); // Error code
    });
    
    it('should allow withdrawals after unlock time', async () => {
      // First deposit some funds
      await chronosVault.sendDeposit(blockchain.sender, toNano('0.5'));
      
      // Advance blockchain time past unlock time
      await blockchain.setShardTime(blockchain.now + 3700); // 1 hour + 100 seconds
      
      // Update lock status
      await chronosVault.sendUpdateLockStatus(blockchain.sender);
      
      // Now withdrawal should succeed
      const withdrawResult = await chronosVault.sendWithdraw(
        blockchain.sender,
        {
          amount: toNano('0.2'),
          destination: blockchain.sender.address
        }
      );
      
      // Verify successful withdrawal
      const messages = withdrawResult.transactions[1].outMessages;
      expect(messages.length).to.equal(1);
      
      // Check destination is receiver address
      const msgCell = messages[0].body.beginParse();
      msgCell.loadUint(32); // Skip op code
      const destination = msgCell.loadAddress();
      expect(destination.equals(blockchain.sender.address)).to.be.true;
    });
  });
  
  describe('Cross-Chain Integration', () => {
    it('should set and verify external addresses', async () => {
      // Add Ethereum address
      const ethAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      await chronosVault.sendAddExternalAddress(
        blockchain.sender,
        {
          chain: 'ethereum',
          address: ethAddress
        }
      );
      
      // Add Solana address
      const solAddress = '9XDUt3RbRRzrQnNeYqjbtRVwEMGDFRdMjKH7vLaSVssh';
      await chronosVault.sendAddExternalAddress(
        blockchain.sender,
        {
          chain: 'solana',
          address: solAddress
        }
      );
      
      // Verify addresses were set correctly
      const externalAddresses = await chronosVault.getExternalAddresses();
      expect(externalAddresses.ethereum).to.equal(ethAddress);
      expect(externalAddresses.solana).to.equal(solAddress);
    });
    
    it('should verify cross-chain proofs', async () => {
      // Create proper ethereum proof structure
      const ethBlockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const ethTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const vaultId = 12345678; // Match the vault ID in the contract
      const unlockTime = await chronosVault.getVaultUnlockTime();
      
      // Build proper ethereum proof according to contract verification logic
      const ethProofCell = beginCell()
        .storeUint(BigInt('0x' + ethBlockHash.slice(2)), 256) // Store block hash as uint256
        .storeUint(BigInt('0x' + ethTxHash.slice(2)), 256) // Store tx hash as uint256
        .storeUint(vaultId, 64) // vault_id as uint64
        .storeUint(unlockTime, 64) // unlock_time as uint64
        .endCell();
      
      // Create proper ethereum signature structure
      const ethSignature = beginCell()
        .storeBuffer(Buffer.from('valid-ethereum-signature-data'))
        .endCell();
      
      // Submit the ethereum proof
      const verifyEthResult = await chronosVault.sendVerifyExternalProof(
        blockchain.sender,
        {
          chain: 'ethereum',
          proof: ethProofCell,
          signature: ethSignature
        }
      );
      
      // Verify the transaction was processed
      expect(verifyEthResult.transactions).to.have.length.greaterThan(1);
      
      // Now create a Solana proof with similar structure
      const solanaSlot = 123456789;
      const solanaTxId = '0x8888888890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      // Build Solana proof
      const solProofCell = beginCell()
        .storeUint(solanaSlot, 64) // Solana slot number
        .storeUint(BigInt('0x' + solanaTxId.slice(2)), 256) // Store tx id as uint256
        .storeUint(vaultId, 64) // vault_id as uint64
        .storeUint(unlockTime, 64) // unlock_time as uint64
        .endCell();
      
      // Create Solana signature
      const solSignature = beginCell()
        .storeBuffer(Buffer.from('valid-solana-signature-data'))
        .endCell();
      
      // Submit the Solana proof
      const verifySolResult = await chronosVault.sendVerifyExternalProof(
        blockchain.sender,
        {
          chain: 'solana',
          proof: solProofCell,
          signature: solSignature
        }
      );
      
      // Verify the transaction was processed
      expect(verifySolResult.transactions).to.have.length.greaterThan(1);
      
      // Verify both chains are now marked as verified
      const crossChainStatus = await chronosVault.getCrossChainStatus();
      expect(crossChainStatus.ethereumVerified).to.be.true;
      expect(crossChainStatus.solanaVerified).to.be.true;
    });
    
    it('should enforce verification threshold based on security level', async () => {
      // First set security level to maximum (requires all chains)
      await chronosVault.sendSetSecurityLevel(
        blockchain.sender,
        5 // Maximum security level
      );
      
      // Verify the security level was set correctly
      const state = await chronosVault.getVaultState();
      expect(state.securityLevel).to.equal(5);
      
      // Verify the verification threshold is now 3 (all chains)
      const crossChainStatus = await chronosVault.getCrossChainStatus();
      expect(crossChainStatus.verificationThreshold).to.equal(3);
      
      // Try enhanced unlock without all verifications (should fail)
      const mockCoordinates = beginCell().storeBuffer(Buffer.from('37.7749:-122.4194')).endCell();
      
      // This should fail because we need all three chains verified
      const unlockResult = await chronosVault.sendEnhancedUnlock(
        blockchain.sender,
        {
          ethProof: beginCell().storeBuffer(Buffer.from('eth-proof')).endCell(),
          solProof: beginCell().storeBuffer(Buffer.from('sol-proof')).endCell(),
          geoCoordinates: mockCoordinates
        }
      );
      
      // Check that the vault is still locked due to insufficient verifications
      const updatedState = await chronosVault.getVaultState();
      expect(updatedState.isUnlocked).to.equal(false);
    });
  });
  
  describe('Metadata', () => {
    it('should set and retrieve metadata', async () => {
      // Set metadata
      const metadata = {
        name: 'Personal TON Vault',
        description: 'Secure time-locked TON assets',
        contentUri: 'ipfs://QmWmyoMoctfbAaiEs2G46gpeUmhqFRDW6KWo64y5r581Vz',
        isPublic: true
      };
      
      await chronosVault.sendSetMetadata(
        blockchain.sender,
        metadata
      );
      
      // Retrieve and verify metadata
      const storedMetadata = await chronosVault.getMetadata();
      
      expect(storedMetadata.name).to.equal(metadata.name);
      expect(storedMetadata.description).to.equal(metadata.description);
      expect(storedMetadata.contentUri).to.equal(metadata.contentUri);
      expect(storedMetadata.isPublic).to.equal(metadata.isPublic);
    });
  });
  
  describe('Multi-Signature Security', () => {
    beforeEach(async () => {
      // Create multiple signatures for testing
      const signers = await blockchain.createWallets(3);
      
      // Register emergency contacts (for multi-sig recovery)
      for (const signer of signers) {
        await chronosVault.sendRegisterEmergencyContact(
          blockchain.sender,
          { contactAddress: signer.address }
        );
      }
    });
    
    it('should set up multi-signature threshold', async () => {
      // Set threshold to 2 out of the registered contacts
      await chronosVault.sendSetupMultiSig(
        blockchain.sender,
        { threshold: 2 }
      );
      
      // Verify the threshold was set correctly
      const vaultState = await chronosVault.getVaultState();
      expect(vaultState.multiSigThreshold).to.equal(2);
    });
    
    it('should unlock vault with sufficient signatures', async () => {
      // Set a multi-sig threshold of 2
      await chronosVault.sendSetupMultiSig(
        blockchain.sender,
        { threshold: 2 }
      );
      
      // Prepare emergency signatures
      const emergencyContacts = await chronosVault.getEmergencyContacts();
      expect(emergencyContacts.length).to.equal(3);
      
      // Create emergency signatures from 2 contacts
      const signatures = [
        beginCell().storeBuffer(Buffer.from('emergency-signature-1')).endCell(),
        beginCell().storeBuffer(Buffer.from('emergency-signature-2')).endCell()
      ];
      
      // Perform multi-signature unlock
      await chronosVault.sendMultiSigEmergencyUnlock(
        blockchain.sender,
        { signatures }
      );
      
      // Verify the vault is now unlocked
      const vaultState = await chronosVault.getVaultState();
      expect(vaultState.isUnlocked).to.equal(true);
    });
    
    it('should reject unlock with insufficient signatures', async () => {
      // Set a multi-sig threshold of 3
      await chronosVault.sendSetupMultiSig(
        blockchain.sender,
        { threshold: 3 }
      );
      
      // Create emergency signatures from only 2 contacts (insufficient)
      const signatures = [
        beginCell().storeBuffer(Buffer.from('emergency-signature-1')).endCell(),
        beginCell().storeBuffer(Buffer.from('emergency-signature-2')).endCell()
      ];
      
      // Attempt multi-signature unlock (should fail)
      const unlockResult = await chronosVault.sendMultiSigEmergencyUnlock(
        blockchain.sender,
        { signatures }
      );
      
      // Check for error message in transaction
      expect(unlockResult.transactions[1].exitCode).to.not.equal(0);
      
      // Verify the vault is still locked
      const vaultState = await chronosVault.getVaultState();
      expect(vaultState.isUnlocked).to.equal(false);
    });
  });
  
  describe('Geolocation Restrictions', () => {
    it('should set geolocation restrictions', async () => {
      // Create geolocation data with allowed regions
      const geoData = beginCell()
        // Region 1: San Francisco area
        .storeInt(37774900, 32) // lat: 37.7749 * 1,000,000
        .storeInt(-122419400, 32) // long: -122.4194 * 1,000,000
        .storeUint(5000000, 32) // radius: 5km * 1,000,000
        
        // Region 2: New York area
        .storeInt(40712800, 32) // lat: 40.7128 * 1,000,000
        .storeInt(-74006000, 32) // long: -74.0060 * 1,000,000
        .storeUint(8000000, 32) // radius: 8km * 1,000,000
        
        .endCell();
        
      // Set the geolocation restrictions
      await chronosVault.sendSetGeolocationRestrictions(
        blockchain.sender,
        { geoData }
      );
      
      // Verify restrictions were set
      const hasGeoRestrictions = await chronosVault.hasGeolocationRestrictions();
      expect(hasGeoRestrictions).to.equal(true);
    });
    
    it('should verify access from allowed location', async () => {
      // Set up geo restrictions first
      const geoData = beginCell()
        .storeInt(37774900, 32) // San Francisco latitude
        .storeInt(-122419400, 32) // San Francisco longitude
        .storeUint(10000000, 32) // 10km radius
        .endCell();
        
      await chronosVault.sendSetGeolocationRestrictions(
        blockchain.sender,
        { geoData }
      );
      
      // Test coordinates inside allowed region
      const validCoordinates = beginCell()
        .storeInt(37764900, 32) // Very close to San Francisco
        .storeInt(-122409400, 32)
        .endCell();
        
      // Check access with valid coordinates
      const hasAccess = await chronosVault.checkGeographicAccess({
        coordinates: validCoordinates
      });
      
      expect(hasAccess).to.equal(true);
    });
    
    it('should deny access from restricted location', async () => {
      // Set up geo restrictions first
      const geoData = beginCell()
        .storeInt(37774900, 32) // San Francisco latitude
        .storeInt(-122419400, 32) // San Francisco longitude
        .storeUint(10000000, 32) // 10km radius
        .endCell();
        
      await chronosVault.sendSetGeolocationRestrictions(
        blockchain.sender,
        { geoData }
      );
      
      // Test coordinates far outside allowed region
      const invalidCoordinates = beginCell()
        .storeInt(51507200, 32) // London coordinates
        .storeInt(-0127800, 32)
        .endCell();
        
      // Check access with invalid coordinates
      const hasAccess = await chronosVault.checkGeographicAccess({
        coordinates: invalidCoordinates
      });
      
      expect(hasAccess).to.equal(false);
    });
  });
});