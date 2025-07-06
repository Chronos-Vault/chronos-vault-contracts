import { expect } from "chai";
// Adjust the imports to use directly what we have available
import * as ethers from "ethers";
// For time functions we'll use a direct implementation
const time = {
  increaseTo: async (target: number) => {
    // This is a simplified version for our testing purposes
    console.log(`[Test] Simulating time increase to ${target}`);
    return Promise.resolve();
  }
};

/**
 * Comprehensive tests for the multi-signature functionality of ChronosVault
 * Testing recovery scenarios and multi-user authentication
 */
describe("ChronosVault Multi-Signature Features", function () {
  // Fixture to deploy the contract before each test
  async function deployMultiSigVaultFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy a test ERC20 token
    const ERC20Token = await ethers.getContractFactory("TestERC20");
    const assetToken = await ERC20Token.deploy("Test Token", "TST");
    
    // Deploy the ChronosVault with multi-signature support
    const ChronosVaultFactory = await ethers.getContractFactory("ChronosVault");
    const vault = await ChronosVaultFactory.deploy(
      await assetToken.getAddress(),
      "Chronos Multi-Sig Vault Shares",
      "CMSV",
      2, // securityLevel = 2 (Advanced)
      Math.floor(Date.now() / 1000) + 3600 // unlockTime = 1 hour from now
    );
    
    // Setup multi-signature configuration
    await vault.setupMultiSignature(
      [owner.address, user1.address, user2.address],
      2 // requiredSignatures = 2 (requires 2 out of 3 signatures)
    );
    
    // Mint tokens for testing
    const mintAmount = ethers.parseEther("1000");
    await assetToken.mint(owner.address, mintAmount);
    await assetToken.mint(user1.address, mintAmount);
    await assetToken.mint(user2.address, mintAmount);
    
    // Approve tokens for vault
    await assetToken.connect(owner).approve(await vault.getAddress(), mintAmount);
    await assetToken.connect(user1).approve(await vault.getAddress(), mintAmount);
    await assetToken.connect(user2).approve(await vault.getAddress(), mintAmount);
    
    return { vault, assetToken, owner, user1, user2, user3 };
  }
  
  describe("Multi-Signature Setup", function () {
    it("Should correctly set up multi-signature configuration", async function () {
      const { vault, owner, user1, user2 } = await loadFixture(deployMultiSigVaultFixture);
      
      const signers = await vault.getAuthorizedSigners();
      expect(signers.length).to.equal(3);
      expect(signers).to.include(owner.address);
      expect(signers).to.include(user1.address);
      expect(signers).to.include(user2.address);
      
      const requiredSigs = await vault.getRequiredSignatures();
      expect(requiredSigs).to.equal(2);
    });
    
    it("Should reject operations without enough signatures", async function () {
      const { vault, assetToken, owner } = await loadFixture(deployMultiSigVaultFixture);
      
      // Try to perform a secured operation with only one signature
      const depositAmount = ethers.parseEther("100");
      
      // Direct operation should fail due to multi-sig requirement
      await expect(
        vault.connect(owner).deposit(depositAmount)
      ).to.be.revertedWith("ChronosVault: Operation requires multiple signatures");
    });
  });
  
  describe("Multi-Signature Operations", function () {
    it("Should allow operations with sufficient signatures", async function () {
      const { vault, assetToken, owner, user1 } = await loadFixture(deployMultiSigVaultFixture);
      
      const depositAmount = ethers.parseEther("100");
      
      // Create a transaction proposal
      const txId = await vault.connect(owner).proposeTransaction(
        vault.interface.encodeFunctionData("deposit", [depositAmount]),
        "Deposit 100 tokens"
      );
      
      // First signature from owner
      await vault.connect(owner).approveTransaction(txId);
      
      // Second signature from user1
      await vault.connect(user1).approveTransaction(txId);
      
      // Execute the transaction after collecting required signatures
      await vault.connect(owner).executeTransaction(txId);
      
      // Verify that the deposit was successful
      const balance = await vault.balanceOf(owner.address);
      expect(balance).to.equal(depositAmount);
    });
    
    it("Should allow cancellation of proposed transactions", async function () {
      const { vault, owner, user1 } = await loadFixture(deployMultiSigVaultFixture);
      
      // Create a transaction proposal
      const txId = await vault.connect(owner).proposeTransaction(
        vault.interface.encodeFunctionData("updateSecurityLevel", [3]),
        "Increase security level"
      );
      
      // Get transaction status
      let txStatus = await vault.getTransactionStatus(txId);
      expect(txStatus.isExecuted).to.equal(false);
      expect(txStatus.isCancelled).to.equal(false);
      
      // Cancel the transaction
      await vault.connect(owner).cancelTransaction(txId);
      
      // Verify it's cancelled
      txStatus = await vault.getTransactionStatus(txId);
      expect(txStatus.isCancelled).to.equal(true);
      
      // Try to approve a cancelled transaction - should fail
      await expect(
        vault.connect(user1).approveTransaction(txId)
      ).to.be.revertedWith("ChronosVault: Transaction is cancelled");
    });
  });
  
  describe("Multi-Signature Recovery", function () {
    it("Should allow vault recovery using multi-sig", async function () {
      const { vault, owner, user1, user2, user3 } = await loadFixture(deployMultiSigVaultFixture);
      
      // Simulate a situation where the primary owner has lost access
      // Create a recovery proposal to add a new signer and remove an old one
      const txId = await vault.connect(user1).proposeTransaction(
        vault.interface.encodeFunctionData("recoverAccess", [user3.address, owner.address]),
        "Recover access - add user3, remove owner"
      );
      
      // First signature from user1
      await vault.connect(user1).approveTransaction(txId);
      
      // Second signature from user2
      await vault.connect(user2).approveTransaction(txId);
      
      // Execute the recovery
      await vault.connect(user1).executeTransaction(txId);
      
      // Check that the signers list has been updated
      const signers = await vault.getAuthorizedSigners();
      expect(signers).to.include(user3.address);
      expect(signers).to.not.include(owner.address);
      
      // The old owner should not be able to propose transactions anymore
      await expect(
        vault.connect(owner).proposeTransaction(
          vault.interface.encodeFunctionData("updateSecurityLevel", [1]),
          "Reduce security level"
        )
      ).to.be.revertedWith("ChronosVault: Not an authorized signer");
    });
    
    it("Should enforce time-locks even with multi-sig", async function () {
      const { vault, owner, user1 } = await loadFixture(deployMultiSigVaultFixture);
      
      const withdrawAmount = ethers.parseEther("50");
      
      // First, make a deposit so we have something to withdraw
      const depositTxId = await vault.connect(owner).proposeTransaction(
        vault.interface.encodeFunctionData("deposit", [withdrawAmount]),
        "Deposit to test withdrawal"
      );
      
      await vault.connect(owner).approveTransaction(depositTxId);
      await vault.connect(user1).approveTransaction(depositTxId);
      await vault.connect(owner).executeTransaction(depositTxId);
      
      // Now try to withdraw before the time lock expires
      const withdrawTxId = await vault.connect(owner).proposeTransaction(
        vault.interface.encodeFunctionData("withdraw", [withdrawAmount]),
        "Withdraw before timelock expires"
      );
      
      await vault.connect(owner).approveTransaction(withdrawTxId);
      await vault.connect(user1).approveTransaction(withdrawTxId);
      
      // Try to execute the withdrawal - should fail due to time lock
      await expect(
        vault.connect(owner).executeTransaction(withdrawTxId)
      ).to.be.revertedWith("ChronosVault: Vault is time-locked");
      
      // Fast forward time to after the time lock expires
      const unlockTime = await vault.getUnlockTime();
      await time.increaseTo(unlockTime.toString());
      
      // Now the withdrawal should succeed
      await vault.connect(owner).executeTransaction(withdrawTxId);
      
      // Check that the balance decreased
      const balance = await vault.balanceOf(owner.address);
      expect(balance).to.equal(0);
    });
  });
  
  describe("Cross-Chain Multi-Signature Verification", function() {
    it("Should generate valid cross-chain verification proofs", async function() {
      const { vault, owner, user1 } = await loadFixture(deployMultiSigVaultFixture);
      
      // Propose a cross-chain verification operation
      const chainId = 999; // Represent another chain's ID
      const remoteVaultAddress = "0x1234567890123456789012345678901234567890";
      const verificationData = ethers.solidityPacked(
        ["address", "uint256", "bytes32"],
        [remoteVaultAddress, chainId, ethers.keccak256(ethers.toUtf8Bytes("VERIFICATION_DATA"))]
      );
      
      // Create a verification proof
      const verifyTxId = await vault.connect(owner).proposeTransaction(
        vault.interface.encodeFunctionData("generateCrossChainVerification", [chainId, verificationData]),
        "Generate cross-chain verification"
      );
      
      await vault.connect(owner).approveTransaction(verifyTxId);
      await vault.connect(user1).approveTransaction(verifyTxId);
      
      // Execute to generate the verification
      await vault.connect(owner).executeTransaction(verifyTxId);
      
      // Check that the verification was recorded
      const hasVerification = await vault.hasCrossChainVerification(chainId, verificationData);
      expect(hasVerification).to.equal(true);
      
      // Get the verification data
      const verification = await vault.getCrossChainVerification(chainId, verificationData);
      expect(verification.isVerified).to.equal(true);
      expect(verification.signerCount).to.be.at.least(2);
    });
  });
});