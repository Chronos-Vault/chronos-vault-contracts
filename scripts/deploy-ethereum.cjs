const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting Chronos Vault Ethereum Deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy TestERC20 token first (for testing with ERC20 assets)
  console.log("📝 Deploying TestERC20 token...");
  const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
  const testToken = await TestERC20.deploy("Test USDC", "USDC");
  await testToken.waitForDeployment();
  const testTokenAddress = await testToken.getAddress();
  console.log("✅ TestERC20 deployed to:", testTokenAddress);
  
  // Mint initial supply to deployer
  console.log("💰 Minting initial supply...");
  const initialSupply = hre.ethers.parseUnits("1000000", 18);
  await testToken.mint(deployer.address, initialSupply);
  console.log("✅ Minted", hre.ethers.formatUnits(initialSupply, 18), "tokens to deployer");

  // Deploy ChronosVault (main vault contract)
  console.log("\n📝 Deploying ChronosVault...");
  const ChronosVault = await hre.ethers.getContractFactory("ChronosVault");
  
  const unlockTime = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
  const securityLevel = 2; // Enhanced security
  const accessKey = "test-access-key-123"; // For security level 2
  const isPublic = true;
  
  const chronosVault = await ChronosVault.deploy(
    testTokenAddress,
    "Chronos Test Vault",
    "CTV",
    unlockTime,
    securityLevel,
    accessKey,
    isPublic
  );
  await chronosVault.waitForDeployment();
  const vaultAddress = await chronosVault.getAddress();
  console.log("✅ ChronosVault deployed to:", vaultAddress);

  // Deploy CrossChainBridgeV1
  console.log("\n📝 Deploying CrossChainBridgeV1...");
  const CrossChainBridge = await hre.ethers.getContractFactory("CrossChainBridgeV1");
  const bridge = await CrossChainBridge.deploy();
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("✅ CrossChainBridgeV1 deployed to:", bridgeAddress);

  // Deploy CVTBridge (if needed for token bridging)
  console.log("\n📝 Deploying CVTBridge...");
  const CVTBridge = await hre.ethers.getContractFactory("CVTBridge");
  
  // CVTBridge constructor needs: _cvtToken, _bridgeFee, _minAmount, _initialValidators, _threshold
  const bridgeFee = hre.ethers.parseUnits("0.001", 18); // 0.001 tokens
  const minAmount = hre.ethers.parseUnits("1", 18); // 1 token minimum
  const initialValidators = [deployer.address]; // Deployer as initial validator
  const threshold = 1; // 1 validator needed for testnet
  
  const cvtBridge = await CVTBridge.deploy(
    testTokenAddress,
    bridgeFee,
    minAmount,
    initialValidators,
    threshold
  );
  await cvtBridge.waitForDeployment();
  const cvtBridgeAddress = await cvtBridge.getAddress();
  console.log("✅ CVTBridge deployed to:", cvtBridgeAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", (await hre.ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("\n📍 CONTRACT ADDRESSES:");
  console.log("─".repeat(60));
  console.log("TestERC20 Token:     ", testTokenAddress);
  console.log("ChronosVault:        ", vaultAddress);
  console.log("CrossChainBridgeV1:  ", bridgeAddress);
  console.log("CVTBridge:           ", cvtBridgeAddress);
  console.log("─".repeat(60));
  
  console.log("\n💡 NEXT STEPS:");
  console.log("1. Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${testTokenAddress} "Test USDC" "USDC"`);
  console.log(`   npx hardhat verify --network sepolia ${vaultAddress} ${testTokenAddress} "Chronos Test Vault" "CTV" ${unlockTime} ${securityLevel} "${accessKey}" ${isPublic}`);
  console.log(`   npx hardhat verify --network sepolia ${bridgeAddress}`);
  console.log(`   npx hardhat verify --network sepolia ${cvtBridgeAddress} ${testTokenAddress} ${bridgeFee} ${minAmount} [${deployer.address}] ${threshold}`);
  
  console.log("\n2. Update server/config.ts with these addresses");
  console.log("\n3. Test Trinity Protocol with real blockchain data!");
  
  console.log("\n✅ Deployment Complete!\n");

  // Save deployment info to file
  const deploymentInfo = {
    network: (await hre.ethers.provider.getNetwork()).name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
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
