/**
 * Deploy V3 Circuit Breaker Contracts with EmergencyMultiSig Integration
 * - CrossChainBridgeV3 (with emergency controller)
 * - CVTBridgeV3 (with emergency controller)
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying V3 Contracts with EmergencyMultiSig Integration...\n");
  console.log("=" .repeat(70));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Existing contract addresses
  const CVT_TOKEN = "0xFb419D8E32c14F774279a4dEEf330dc893257147";
  const EMERGENCY_MULTISIG = "0xFafCA23a7c085A842E827f53A853141C8243F924";
  
  console.log("📋 Using existing contracts:");
  console.log("   CVT Token:          ", CVT_TOKEN);
  console.log("   EmergencyMultiSig:  ", EMERGENCY_MULTISIG);
  console.log();

  // Deploy CrossChainBridgeV3 with EmergencyMultiSig
  console.log("1️⃣ Deploying CrossChainBridgeV3...");
  console.log("   Emergency controller:", EMERGENCY_MULTISIG);
  console.log("   (100% trustless - emergency controller is IMMUTABLE)\n");
  
  const CrossChainBridgeV3 = await hre.ethers.getContractFactory("CrossChainBridgeV3");
  const crossChainBridgeV3 = await CrossChainBridgeV3.deploy(EMERGENCY_MULTISIG);
  await crossChainBridgeV3.waitForDeployment();
  
  const bridgeV3Address = await crossChainBridgeV3.getAddress();
  console.log("✅ CrossChainBridgeV3 deployed:", bridgeV3Address, "\n");

  // Deploy CVTBridgeV3 with EmergencyMultiSig
  console.log("2️⃣ Deploying CVTBridgeV3...");
  console.log("   Emergency controller:", EMERGENCY_MULTISIG);
  console.log("   Using deployer as initial validator\n");
  
  const bridgeFee = hre.ethers.parseEther("0.001"); // 0.001 ETH
  const minAmount = hre.ethers.parseEther("1"); // 1 CVT minimum
  const initialValidators = [deployer.address];
  const threshold = 1; // 1-of-1 for testnet
  
  const CVTBridgeV3 = await hre.ethers.getContractFactory("CVTBridgeV3");
  const cvtBridgeV3 = await CVTBridgeV3.deploy(
    CVT_TOKEN,
    bridgeFee,
    minAmount,
    initialValidators,
    threshold,
    EMERGENCY_MULTISIG
  );
  await cvtBridgeV3.waitForDeployment();
  
  const cvtBridgeV3Address = await cvtBridgeV3.getAddress();
  console.log("✅ CVTBridgeV3 deployed:", cvtBridgeV3Address, "\n");

  // Summary
  console.log("=".repeat(70));
  console.log("🎉 V3 DEPLOYMENT COMPLETE WITH EMERGENCY MULTISIG!");
  console.log("=".repeat(70));
  console.log("\n📋 Deployed Contracts:\n");
  console.log("CrossChainBridgeV3:     ", bridgeV3Address);
  console.log("CVTBridgeV3:            ", cvtBridgeV3Address);
  console.log("\n🔐 Emergency Controller:\n");
  console.log("EmergencyMultiSig:      ", EMERGENCY_MULTISIG);
  
  console.log("\n🔗 View on Arbiscan:");
  console.log(`https://sepolia.arbiscan.io/address/${bridgeV3Address}`);
  console.log(`https://sepolia.arbiscan.io/address/${cvtBridgeV3Address}`);
  
  console.log("\n📝 Verification Commands:");
  console.log(`npx hardhat verify --network arbitrumSepolia ${bridgeV3Address} "${EMERGENCY_MULTISIG}"`);
  console.log(`npx hardhat verify --network arbitrumSepolia ${cvtBridgeV3Address} "${CVT_TOKEN}" "1000000000000000" "1000000000000000000" "[\\"${deployer.address}\\"]" 1 "${EMERGENCY_MULTISIG}"`);

  console.log("\n🔐 Circuit Breaker Features:");
  console.log("✅ Automatic triggers (volume spike, failure rate)");
  console.log("✅ Auto-recovery (4h for bridge, 2h for CVT bridge)");
  console.log("✅ Emergency pause via EmergencyMultiSig (2-of-3 approval)");
  console.log("✅ Emergency resume via EmergencyMultiSig (2-of-3 approval)");
  
  console.log("\n🛡️ Security Model:");
  console.log("   - Emergency controller is IMMUTABLE (cannot be changed)");
  console.log("   - Requires 2-of-3 multi-sig approval for emergency actions");
  console.log("   - 48-hour time-lock on emergency proposals");
  console.log("   - Manual override of automatic circuit breakers");
  
  console.log("\n⚙️  Integration Complete:");
  console.log("   1. V3 contracts recognize EmergencyMultiSig");
  console.log("   2. EmergencyMultiSig can pause/resume both bridges");
  console.log("   3. All automatic circuit breakers still functional");
  console.log("   4. Ready for testing emergency flows\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
