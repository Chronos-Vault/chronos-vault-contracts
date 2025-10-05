import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  console.log("🚀 Starting Chronos Vault Ethereum Deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy TestERC20 token first (for testing with ERC20 assets)
  console.log("📝 Deploying TestERC20 token...");
  const TestERC20 = await ethers.getContractFactory("TestERC20");
  const testToken = await TestERC20.deploy("Test USDC", "USDC", ethers.parseUnits("1000000", 18));
  await testToken.waitForDeployment();
  const testTokenAddress = await testToken.getAddress();
  console.log("✅ TestERC20 deployed to:", testTokenAddress);

  // Deploy ChronosVault (main vault contract)
  console.log("\n📝 Deploying ChronosVault...");
  const ChronosVault = await ethers.getContractFactory("ChronosVault");
  
  const unlockTime = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
  const securityLevel = 2; // Enhanced security
  
  const chronosVault = await ChronosVault.deploy(
    testTokenAddress,
    "Chronos Test Vault",
    "CTV",
    unlockTime,
    securityLevel
  );
  await chronosVault.waitForDeployment();
  const vaultAddress = await chronosVault.getAddress();
  console.log("✅ ChronosVault deployed to:", vaultAddress);

  // Deploy CrossChainBridgeV1
  console.log("\n📝 Deploying CrossChainBridgeV1...");
  const CrossChainBridge = await ethers.getContractFactory("CrossChainBridgeV1");
  const bridge = await CrossChainBridge.deploy();
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("✅ CrossChainBridgeV1 deployed to:", bridgeAddress);

  // Deploy CVTBridge (if needed for token bridging)
  console.log("\n📝 Deploying CVTBridge...");
  const CVTBridge = await ethers.getContractFactory("CVTBridge");
  const cvtBridge = await CVTBridge.deploy();
  await cvtBridge.waitForDeployment();
  const cvtBridgeAddress = await cvtBridge.getAddress();
  console.log("✅ CVTBridge deployed to:", cvtBridgeAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("\n📍 CONTRACT ADDRESSES:");
  console.log("─".repeat(60));
  console.log("TestERC20 Token:     ", testTokenAddress);
  console.log("ChronosVault:        ", vaultAddress);
  console.log("CrossChainBridgeV1:  ", bridgeAddress);
  console.log("CVTBridge:           ", cvtBridgeAddress);
  console.log("─".repeat(60));
  
  console.log("\n💡 NEXT STEPS:");
  console.log("1. Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${testTokenAddress} "Test USDC" "USDC" "1000000000000000000000000"`);
  console.log(`   npx hardhat verify --network sepolia ${vaultAddress} ${testTokenAddress} "Chronos Test Vault" "CTV" ${unlockTime} ${securityLevel}`);
  console.log(`   npx hardhat verify --network sepolia ${bridgeAddress}`);
  console.log(`   npx hardhat verify --network sepolia ${cvtBridgeAddress}`);
  
  console.log("\n2. Update server/config.ts with these addresses");
  console.log("\n3. Fund the deployer address with Sepolia ETH from faucet:");
  console.log("   https://sepoliafaucet.com");
  
  console.log("\n✅ Deployment Complete!\n");

  // Save deployment info to file
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      testToken: testTokenAddress,
      chronosVault: vaultAddress,
      crossChainBridge: bridgeAddress,
      cvtBridge: cvtBridgeAddress
    }
  };

  fs.writeFileSync(
    'deployment-ethereum.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("📄 Deployment info saved to: deployment-ethereum.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
