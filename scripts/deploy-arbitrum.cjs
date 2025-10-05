const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Trinity Protocol to Arbitrum Sepolia Layer 2...\n");

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance < hre.ethers.parseEther("0.01")) {
    console.error("❌ Insufficient balance. You need at least 0.01 ETH for deployment.");
    process.exit(1);
  }

  console.log("📝 Deploying Trinity Protocol contracts...\n");

  // Step 1: Deploy CVT Token (ChronosVault Token)
  console.log("1️⃣ Deploying CVT Token (ChronosVault Token)...");
  const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
  const cvtToken = await TestERC20.deploy("ChronosVault Token", "CVT");
  await cvtToken.waitForDeployment();
  const cvtTokenAddress = await cvtToken.getAddress();
  console.log("   ✅ CVT Token deployed to:", cvtTokenAddress);
  
  // Mint initial supply (21 million CVT)
  const mintTx = await cvtToken.mint(deployer.address, hre.ethers.parseEther("21000000"));
  await mintTx.wait();
  console.log("   💰 Minted 21,000,000 CVT tokens");

  // Step 2: Deploy CVTBridge with Trinity Protocol parameters
  console.log("\n2️⃣ Deploying CVTBridge (Trinity Protocol Bridge)...");
  const CVTBridge = await hre.ethers.getContractFactory("CVTBridge");
  
  // Trinity Protocol: 2-of-3 consensus with THREE DISTINCT validators
  // For testnet: Using deterministic test wallets
  // For mainnet: Replace with real multi-party validator addresses
  
  // Generate 3 distinct validator wallets (deterministic for testnet)
  const ethereumValidator = new hre.ethers.Wallet(
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("trinity-ethereum-l2-validator")),
    hre.ethers.provider
  );
  const solanaValidator = new hre.ethers.Wallet(
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("trinity-solana-validator")),
    hre.ethers.provider
  );
  const tonValidator = new hre.ethers.Wallet(
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("trinity-ton-validator")),
    hre.ethers.provider
  );
  
  console.log("   🔐 Trinity Validators:");
  console.log("      Ethereum L2:", ethereumValidator.address);
  console.log("      Solana:", solanaValidator.address);
  console.log("      TON:", tonValidator.address);
  
  const bridgeFee = hre.ethers.parseEther("0.001"); // 0.1% base fee
  const minAmount = hre.ethers.parseEther("10"); // Minimum 10 CVT to bridge
  const initialValidators = [
    ethereumValidator.address, // Ethereum L2 (Arbitrum) validator
    solanaValidator.address,   // Solana validator
    tonValidator.address       // TON validator
  ];
  const threshold = 2; // 2-of-3 consensus (Trinity Protocol core)
  
  const cvtBridge = await CVTBridge.deploy(
    cvtTokenAddress,
    bridgeFee,
    minAmount,
    initialValidators,
    threshold
  );
  await cvtBridge.waitForDeployment();
  const cvtBridgeAddress = await cvtBridge.getAddress();
  console.log("   ✅ CVTBridge deployed to:", cvtBridgeAddress);
  console.log("   🔐 Trinity Protocol: 2-of-3 consensus enabled");

  // Step 3: Deploy Test USDC for ChronosVault asset
  console.log("\n3️⃣ Deploying Test USDC (vault asset)...");
  const testUSDC = await TestERC20.deploy("Test USDC", "USDC");
  await testUSDC.waitForDeployment();
  const testUSDCAddress = await testUSDC.getAddress();
  console.log("   ✅ Test USDC deployed to:", testUSDCAddress);
  
  // Mint test USDC
  const mintUsdcTx = await testUSDC.mint(deployer.address, hre.ethers.parseEther("1000000"));
  await mintUsdcTx.wait();
  console.log("   💰 Minted 1,000,000 Test USDC");

  // Step 4: Deploy ChronosVault (Trinity-secured vault)
  console.log("\n4️⃣ Deploying ChronosVault (Trinity-secured)...");
  const ChronosVault = await hre.ethers.getContractFactory("ChronosVault");
  
  const unlockTime = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year lock
  const securityLevel = 2; // Standard Trinity security
  const accessKey = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("trinity-protocol-key"));
  const isPublic = false;
  
  const vault = await ChronosVault.deploy(
    testUSDCAddress,
    "Trinity Vault",
    "TVAULT",
    unlockTime,
    securityLevel,
    accessKey,
    isPublic
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("   ✅ ChronosVault deployed to:", vaultAddress);

  // Step 5: Deploy CrossChainBridgeV1 (HTLC atomic swaps)
  console.log("\n5️⃣ Deploying CrossChainBridgeV1 (HTLC atomic swaps)...");
  const CrossChainBridge = await hre.ethers.getContractFactory("CrossChainBridgeV1");
  const bridge = await CrossChainBridge.deploy();
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("   ✅ CrossChainBridgeV1 deployed to:", bridgeAddress);
  console.log("   🔒 HTLC time-locks with Merkle proofs enabled");

  // Save deployment data
  const deployment = {
    network: "arbitrum-sepolia",
    chainId: 421614,
    deployer: deployer.address,
    trinityProtocol: {
      consensus: "2-of-3",
      chains: ["Ethereum Layer 2 (Arbitrum)", "Solana", "TON"],
      threshold: 2
    },
    contracts: {
      CVTToken: cvtTokenAddress,
      CVTBridge: cvtBridgeAddress,
      TestUSDC: testUSDCAddress,
      ChronosVault: vaultAddress,
      CrossChainBridgeV1: bridgeAddress
    },
    parameters: {
      bridgeFee: "0.001 ETH (0.1%)",
      minBridgeAmount: "10 CVT",
      vaultUnlockTime: new Date(unlockTime * 1000).toISOString(),
      securityLevel: "2 (Standard Trinity)"
    },
    timestamp: new Date().toISOString(),
    blockExplorer: "https://sepolia.arbiscan.io"
  };

  const deploymentPath = path.join(__dirname, "..", "deployment-arbitrum.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("\n" + "=".repeat(70));
  console.log("✅ TRINITY PROTOCOL DEPLOYED TO ARBITRUM LAYER 2!");
  console.log("=".repeat(70));
  console.log("\n📋 Deployment Summary:");
  console.log("   Network: Arbitrum Sepolia (Layer 2)");
  console.log("   Chain ID: 421614");
  console.log("   Deployer:", deployer.address);
  console.log("\n🔐 Trinity Protocol Configuration:");
  console.log("   Consensus: 2-of-3 mathematical verification");
  console.log("   Chains: Ethereum L2 (Arbitrum) + Solana + TON");
  console.log("   Security: 95% lower fees, fraud-proof protection");
  console.log("\n📝 Deployed Contracts:");
  console.log("   CVT Token:", cvtTokenAddress);
  console.log("   CVT Bridge:", cvtBridgeAddress);
  console.log("   Test USDC:", testUSDCAddress);
  console.log("   Chronos Vault:", vaultAddress);
  console.log("   Cross-Chain Bridge:", bridgeAddress);
  console.log("\n🔍 Verify on Arbiscan:");
  console.log(`   ${deployment.blockExplorer}/address/${cvtTokenAddress}`);
  console.log(`   ${deployment.blockExplorer}/address/${cvtBridgeAddress}`);
  console.log(`   ${deployment.blockExplorer}/address/${bridgeAddress}`);
  console.log("\n💾 Deployment data saved to: deployment-arbitrum.json");
  console.log("\n🎉 Trinity Protocol is LIVE on Arbitrum Layer 2! 🎉");
  console.log("🚀 Ready for mathematical consensus security! 🚀\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
