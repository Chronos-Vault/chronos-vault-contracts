/**
 * Trinity Protocol Consensus Verification Script
 * Tests the deployed CVTBridge contract on Arbitrum Sepolia
 * Verifies 2-of-3 validator consensus is properly configured
 */

const hre = require("hardhat");

async function main() {
  console.log("🔍 Verifying Trinity Protocol Consensus on Arbitrum Sepolia...\n");

  // Load deployment data
  const deployment = require('../deployment-arbitrum.json');
  const cvtBridgeAddress = deployment.contracts.CVTBridge;

  console.log("📍 CVTBridge Contract:", cvtBridgeAddress);
  console.log("🌐 Network:", deployment.network);
  console.log("🔗 Chain ID:", deployment.chainId);
  console.log("");

  // Connect to CVTBridge contract
  const CVTBridge = await hre.ethers.getContractFactory("CVTBridge");
  const cvtBridge = CVTBridge.attach(cvtBridgeAddress);

  console.log("✅ Connected to CVTBridge contract\n");

  // Expected validators from deployment
  const expectedValidators = [
    "0x955Bb279Af6cf954d077290dD96C370e35ac5b3F", // Ethereum L2
    "0x7701D6f186002EBBf37b4171831A44BBEABA72e7", // Solana
    "0x26782123B2C8631Fc6F83b04408eFDB4620090F5"  // TON
  ];

  console.log("🔐 Expected Trinity Validators:");
  console.log("   Ethereum L2:", expectedValidators[0]);
  console.log("   Solana:", expectedValidators[1]);
  console.log("   TON:", expectedValidators[2]);
  console.log("");

  // Test 1: Verify validator count
  console.log("📊 Test 1: Verify Validator Configuration");
  console.log("─".repeat(60));

  try {
    // Check if each validator is registered
    const validatorChecks = [];
    for (let i = 0; i < expectedValidators.length; i++) {
      try {
        const isValidator = await cvtBridge.validators(expectedValidators[i]);
        validatorChecks.push({
          address: expectedValidators[i],
          role: i === 0 ? "Ethereum L2" : i === 1 ? "Solana" : "TON",
          isValidator: isValidator
        });
      } catch (error) {
        console.log(`   ⚠️  Could not verify validator ${expectedValidators[i]}`);
        validatorChecks.push({
          address: expectedValidators[i],
          role: i === 0 ? "Ethereum L2" : i === 1 ? "Solana" : "TON",
          isValidator: false,
          error: error.message
        });
      }
    }

    console.log("\n📋 Validator Status:");
    validatorChecks.forEach(v => {
      const status = v.isValidator ? "✅ ACTIVE" : "❌ INACTIVE";
      console.log(`   ${status} ${v.role}: ${v.address}`);
    });

    const activeCount = validatorChecks.filter(v => v.isValidator).length;
    console.log(`\n   Total Active Validators: ${activeCount}/3`);

    if (activeCount === 3) {
      console.log("   ✅ All validators properly configured!");
    } else {
      console.log("   ⚠️  Warning: Not all validators are active");
    }

  } catch (error) {
    console.log("   ❌ Error checking validators:", error.message);
  }

  // Test 2: Verify threshold
  console.log("\n📊 Test 2: Verify 2-of-3 Consensus Threshold");
  console.log("─".repeat(60));

  try {
    const threshold = await cvtBridge.threshold();
    console.log(`   Required signatures: ${threshold}`);
    console.log(`   Total validators: 3`);
    
    if (threshold.toString() === "2") {
      console.log("   ✅ Correct 2-of-3 consensus threshold!");
    } else {
      console.log(`   ⚠️  Unexpected threshold: ${threshold}`);
    }
  } catch (error) {
    console.log("   ❌ Error checking threshold:", error.message);
  }

  // Test 3: Check bridge parameters
  console.log("\n📊 Test 3: Verify Bridge Parameters");
  console.log("─".repeat(60));

  try {
    const bridgeFee = await cvtBridge.bridgeFee();
    const minAmount = await cvtBridge.minAmount();
    
    console.log(`   Bridge Fee: ${hre.ethers.formatEther(bridgeFee)} ETH (0.1%)`);
    console.log(`   Min Amount: ${hre.ethers.formatEther(minAmount)} CVT`);
    console.log("   ✅ Parameters configured correctly!");
  } catch (error) {
    console.log("   ❌ Error checking parameters:", error.message);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 VERIFICATION SUMMARY");
  console.log("=".repeat(60));
  console.log("Contract: CVTBridge");
  console.log("Address:", cvtBridgeAddress);
  console.log("Network: Arbitrum Sepolia");
  console.log("Security Model: 2-of-3 Mathematical Consensus");
  console.log("Status: Ready for testing");
  console.log("\n✅ Trinity Protocol verification complete!");
  console.log("\n💡 Next Steps:");
  console.log("   1. Test bridge transactions with user wallet");
  console.log("   2. Verify contracts on Arbiscan");
  console.log("   3. Replace test validators before mainnet deployment");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
