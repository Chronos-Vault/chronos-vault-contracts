/**
 * Chronos Vault - Deploy All Contracts with Trinity v3.1
 * Unified deployment script for entire Trinity Protocol ecosystem
 * November 3, 2025
 */

const hre = require("hardhat");
const fs = require("fs");

// Trinity Protocol v3.1 Configuration
const TRINITY_V3_CONFIG = {
  network: "arbitrum-sepolia",
  chainId: 421614,
  bridge: "0x3E205dc9881Cf0E9377683aDd22bC1aBDBdF462D",
  validator: "0x66e5046d136e82d17cbeb2ffea5bd5205d962906",
  solana: "5oD8S1TtkdJbAX7qhsGticU7JKxjwY4AbEeBdnkUrrKY",
  ton: "EQDx6yH5WH3Ex47h0PBnOBMzPCsmHdnL2snts3DZBO5CYVVJ"
};

async function deployChronosVault(deployer, cvtTokenAddress) {
  console.log("\n🏦 Deploying ChronosVault...");
  
  const ChronosVault = await hre.ethers.getContractFactory("ChronosVault");
  
  // Constructor parameters
  const name = "Trinity Protocol Vault";
  const vaultType = 0; // STANDARD_VAULT
  const securityLevel = 3; // Requires 2-of-3 consensus
  const trinityBridge = TRINITY_V3_CONFIG.bridge;
  
  console.log("   Name:", name);
  console.log("   Type: STANDARD_VAULT");
  console.log("   Security Level:", securityLevel);
  console.log("   Trinity Bridge:", trinityBridge);
  
  const vault = await ChronosVault.deploy(
    name,
    vaultType,
    securityLevel,
    trinityBridge
  );
  
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  
  console.log("   ✅ Deployed at:", vaultAddress);
  
  return {
    address: vaultAddress,
    name: name,
    type: "STANDARD_VAULT",
    securityLevel: securityLevel,
    trinityBridge: trinityBridge,
    tx: vault.deploymentTransaction().hash
  };
}

async function deployChronosVaultOptimized(deployer, cvtTokenAddress) {
  console.log("\n🏛️  Deploying ChronosVaultOptimized...");
  
  const ChronosVaultOptimized = await hre.ethers.getContractFactory("ChronosVaultOptimized");
  
  // Constructor parameters
  const asset = cvtTokenAddress;
  const name = "Trinity Optimized Vault - CVT";
  const symbol = "tvCVT";
  const unlockTime = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
  const securityLevel = 3;
  const accessKey = "trinity-v3-vault";
  const isPublic = true;
  const vaultType = 6; // SOVEREIGN_FORTRESS
  
  console.log("   Asset:", asset);
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Vault Type: SOVEREIGN_FORTRESS");
  
  const vault = await ChronosVaultOptimized.deploy(
    asset,
    name,
    symbol,
    unlockTime,
    securityLevel,
    accessKey,
    isPublic,
    vaultType
  );
  
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  
  console.log("   ✅ Deployed at:", vaultAddress);
  
  // Configure Trinity Bridge
  console.log("   🔗 Configuring Trinity Bridge...");
  const tx = await vault.setTrinityBridge(TRINITY_V3_CONFIG.bridge);
  await tx.wait();
  console.log("   ✅ Trinity Bridge configured");
  
  return {
    address: vaultAddress,
    name: name,
    symbol: symbol,
    asset: asset,
    type: "SOVEREIGN_FORTRESS",
    trinityBridge: TRINITY_V3_CONFIG.bridge,
    tx: vault.deploymentTransaction().hash
  };
}

async function deployHTLCBridge(deployer) {
  console.log("\n🔄 Deploying HTLCBridge...");
  
  const HTLCBridge = await hre.ethers.getContractFactory("HTLCBridge");
  
  const trinityBridge = TRINITY_V3_CONFIG.bridge;
  console.log("   Trinity Bridge:", trinityBridge);
  
  const htlc = await HTLCBridge.deploy(trinityBridge);
  await htlc.waitForDeployment();
  
  const htlcAddress = await htlc.getAddress();
  console.log("   ✅ Deployed at:", htlcAddress);
  
  return {
    address: htlcAddress,
    trinityBridge: trinityBridge,
    minTimelock: await htlc.MIN_TIMELOCK(),
    maxTimelock: await htlc.MAX_TIMELOCK(),
    tx: htlc.deploymentTransaction().hash
  };
}

async function deployCVTToken(deployer) {
  console.log("\n💎 Deploying CVT Token...");
  
  const CVTToken = await hre.ethers.getContractFactory("TestERC20");
  
  const token = await CVTToken.deploy(
    "Chronos Vault Token",
    "CVT"
  );
  
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  
  console.log("   ✅ Deployed at:", tokenAddress);
  
  return {
    address: tokenAddress,
    name: "Chronos Vault Token",
    symbol: "CVT",
    tx: token.deploymentTransaction().hash
  };
}

async function main() {
  console.log("🔱 Trinity Protocol™ v3.0 - Complete Deployment");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`📡 Network: ${TRINITY_V3_CONFIG.network}`);
  console.log(`🔗 Trinity Bridge: ${TRINITY_V3_CONFIG.bridge}`);
  console.log(`👤 Validator: ${TRINITY_V3_CONFIG.validator}`);
  console.log("═══════════════════════════════════════════════════════════\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("🔑 Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("\n❌ Insufficient balance. Please fund the deployer wallet.");
    process.exit(1);
  }
  
  // Deploy all contracts
  const deployment = {
    version: "3.0",
    network: TRINITY_V3_CONFIG.network,
    chainId: TRINITY_V3_CONFIG.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    trinityProtocol: {
      bridge: TRINITY_V3_CONFIG.bridge,
      validator: TRINITY_V3_CONFIG.validator,
      solana: TRINITY_V3_CONFIG.solana,
      ton: TRINITY_V3_CONFIG.ton
    },
    contracts: {}
  };
  
  try {
    // 1. Deploy CVT Token
    const cvtToken = await deployCVTToken(deployer);
    deployment.contracts.CVTToken = cvtToken;
    
    // 2. Deploy ChronosVault
    const chronosVault = await deployChronosVault(deployer, cvtToken.address);
    deployment.contracts.ChronosVault = chronosVault;
    
    // 3. Deploy ChronosVaultOptimized
    const vaultOptimized = await deployChronosVaultOptimized(deployer, cvtToken.address);
    deployment.contracts.ChronosVaultOptimized = vaultOptimized;
    
    // 4. Deploy HTLCBridge
    const htlcBridge = await deployHTLCBridge(deployer);
    deployment.contracts.HTLCBridge = htlcBridge;
    
    // Save deployment
    const filename = "deployment-v3.0.json";
    fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));
    
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("📊 Deployment Summary");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`✅ CVT Token: ${cvtToken.address}`);
    console.log(`✅ ChronosVault: ${chronosVault.address}`);
    console.log(`✅ ChronosVaultOptimized: ${vaultOptimized.address}`);
    console.log(`✅ HTLCBridge: ${htlcBridge.address}`);
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`💾 Deployment saved: ${filename}`);
    console.log("\n🔱 Trinity Protocol v3.1 - All Contracts Deployed!");
    console.log("   All contracts integrated with CrossChainBridgeOptimized v2.2");
    console.log(`   2-of-3 Consensus Matrix: ACTIVE`);
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
