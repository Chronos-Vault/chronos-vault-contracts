import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ChronosVault } from "../../artifacts/contracts/ethereum/ChronosVault.sol/ChronosVault";

describe("ChronosVault Contract", function () {
  // Fixture to deploy the contract before each test
  async function deployChronosVaultFixture() {
    // Get signers (accounts)
    const [owner, user1, user2, user3] = await ethers.getSigners();
    
    // We'll need an ERC20 token to serve as the asset token for our vault
    // For testing purposes, we'll deploy a simple ERC20 token
    const ERC20Token = await ethers.getContractFactory("TestERC20");
    const assetToken = await ERC20Token.deploy("Test Token", "TST");
    
    // Deploy the ChronosVault
    const ChronosVaultFactory = await ethers.getContractFactory("ChronosVault");
    const vault = await ChronosVaultFactory.deploy(
      await assetToken.getAddress(),
      "Chronos Vault Shares",
      "CVS",
      1, // securityLevel = 1 (Standard)
      Math.floor(Date.now() / 1000) + 3600 // unlockTime = 1 hour from now
    );
    
    // Mint some tokens for testing
    const mintAmount = ethers.parseEther("1000");
    await assetToken.mint(owner.address, mintAmount);
    await assetToken.mint(user1.address, mintAmount);
    await assetToken.mint(user2.address, mintAmount);
    
    return { vault, assetToken, owner, user1, user2, user3 };
  }
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { vault, owner } = await loadFixture(deployChronosVaultFixture);
      expect(await vault.owner()).to.equal(owner.address);
    });
    
    it("Should set the correct security level", async function () {
      const { vault } = await loadFixture(deployChronosVaultFixture);
      expect(await vault.securityLevel()).to.equal(1);
    });
    
    it("Should set the correct unlock time", async function () {
      const { vault } = await loadFixture(deployChronosVaultFixture);
      const currentTime = Math.floor(Date.now() / 1000);
      const unlockTime = await vault.unlockTime();
      
      // Unlock time should be approximately 1 hour in the future
      expect(unlockTime).to.be.greaterThan(currentTime);
      expect(unlockTime).to.be.lessThan(currentTime + 3700); // Allow some buffer
    });
    
    it("Should initialize as locked", async function () {
      const { vault } = await loadFixture(deployChronosVaultFixture);
      expect(await vault.isUnlocked()).to.equal(false);
    });
  });
  
  describe("Deposit and Withdrawal", function () {
    it("Should allow deposits", async function () {
      const { vault, assetToken, user1 } = await loadFixture(deployChronosVaultFixture);
      const depositAmount = ethers.parseEther("100");
      
      // Approve vault to spend tokens
      await assetToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      
      // Deposit tokens into vault
      await vault.connect(user1).deposit(depositAmount, user1.address);
      
      // Check user1's balance of shares
      expect(await vault.balanceOf(user1.address)).to.equal(depositAmount);
    });
    
    it("Should not allow withdrawals before unlock time", async function () {
      const { vault, assetToken, user1 } = await loadFixture(deployChronosVaultFixture);
      const depositAmount = ethers.parseEther("100");
      
      // Approve and deposit
      await assetToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
      
      // Try to withdraw (should fail)
      await expect(
        vault.connect(user1).withdraw(depositAmount, user1.address, user1.address)
      ).to.be.revertedWith("Vault is still locked");
    });
    
    it("Should allow withdrawals after unlock time", async function () {
      const { vault, assetToken, user1 } = await loadFixture(deployChronosVaultFixture);
      const depositAmount = ethers.parseEther("100");
      
      // Approve and deposit
      await assetToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
      
      // Fast forward time past unlock time
      await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
      await ethers.provider.send("evm_mine", []);
      
      // Manually unlock the vault (in a real scenario, this would happen automatically)
      await vault.connect(user1).checkAndUpdateLockStatus();
      
      // Now withdrawal should succeed
      await vault.connect(user1).withdraw(depositAmount, user1.address, user1.address);
      
      // Check user1's balance of shares is now 0
      expect(await vault.balanceOf(user1.address)).to.equal(0);
    });
  });
  
  describe("Cross-Chain Functionality", function () {
    it("Should allow adding cross-chain addresses", async function () {
      const { vault, owner } = await loadFixture(deployChronosVaultFixture);
      
      // Add a TON address
      await vault.connect(owner).addCrossChainAddress(
        "TON", 
        "EQAvDfYmkVV2zFXzC0Hs2e2RGWJyMXHpnMTXH4jnI2W3AwLb"
      );
      
      // Add a Solana address
      await vault.connect(owner).addCrossChainAddress(
        "Solana", 
        "9XDUt3RbRRzrQnNeYqjbtRVwEMGDFRdMjKH7vLaSVssh"
      );
      
      // Verify addresses were added correctly
      expect(await vault.crossChainAddresses("TON")).to.equal("EQAvDfYmkVV2zFXzC0Hs2e2RGWJyMXHpnMTXH4jnI2W3AwLb");
      expect(await vault.crossChainAddresses("Solana")).to.equal("9XDUt3RbRRzrQnNeYqjbtRVwEMGDFRdMjKH7vLaSVssh");
      
      // Check that blockchains were added to supported list
      expect(await vault.supportedBlockchains(0)).to.equal("TON");
      expect(await vault.supportedBlockchains(1)).to.equal("Solana");
    });
    
    it("Should verify cross-chain proofs", async function () {
      const { vault, owner } = await loadFixture(deployChronosVaultFixture);
      
      // Add a TON address
      await vault.connect(owner).addCrossChainAddress(
        "TON", 
        "EQAvDfYmkVV2zFXzC0Hs2e2RGWJyMXHpnMTXH4jnI2W3AwLb"
      );
      
      // Create a mock proof (in a real scenario, this would come from the other chain)
      const mockProof = ethers.keccak256(ethers.toUtf8Bytes("This is a mock proof"));
      const mockSignature = await owner.signMessage(ethers.getBytes(mockProof));
      
      // Verify the proof (this is a simplified test - real verification would be more complex)
      const result = await vault.connect(owner).verifyExternalProof(
        "TON",
        mockProof,
        mockSignature
      );
      
      // The verification should return true for this test
      expect(result).to.equal(true);
    });
  });
  
  describe("Metadata Management", function () {
    it("Should set and retrieve vault metadata", async function () {
      const { vault, owner } = await loadFixture(deployChronosVaultFixture);
      
      // Set metadata
      await vault.connect(owner).setMetadata(
        "Personal Savings Vault",
        "A secure vault for my long-term savings",
        ["savings", "long-term", "secure"],
        "QmWmyoMoctfbAaiEs2G46gpeUmhqFRDW6KWo64y5r581Vz", // IPFS hash
        true // isPublic
      );
      
      // Retrieve metadata
      const metadata = await vault.metadata();
      
      // Verify metadata was set correctly
      expect(metadata.name).to.equal("Personal Savings Vault");
      expect(metadata.description).to.equal("A secure vault for my long-term savings");
      expect(metadata.tags.length).to.equal(3);
      expect(metadata.tags[0]).to.equal("savings");
      expect(metadata.contentHash).to.equal("QmWmyoMoctfbAaiEs2G46gpeUmhqFRDW6KWo64y5r581Vz");
      expect(metadata.isPublic).to.equal(true);
    });
  });
});