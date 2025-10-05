/**
 * Verify all Trinity Protocol contracts on Arbiscan
 * Arbitrum Sepolia Layer 2 deployment
 */

const hre = require("hardhat");
const deployment = require("../deployment-arbitrum.json");

async function main() {
  console.log("🔍 Verifying Trinity Protocol contracts on Arbiscan...\n");
  console.log("Network:", deployment.network);
  console.log("Chain ID:", deployment.chainId);
  console.log("");

  // Generate validator addresses (same deterministic generation as deployment)
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

  const validatorAddresses = [
    ethereumValidator.address,
    solanaValidator.address,
    tonValidator.address
  ];

  const contracts = [
    {
      name: "CVT Token",
      address: deployment.contracts.CVTToken,
      constructorArguments: ["ChronosVault Token", "CVT"]
    },
    {
      name: "CVTBridge (Trinity Protocol)",
      address: deployment.contracts.CVTBridge,
      constructorArguments: [
        deployment.contracts.CVTToken, // cvtToken address
        hre.ethers.parseEther("0.001"), // bridgeFee
        hre.ethers.parseEther("10"), // minAmount
        validatorAddresses, // initialValidators
        2 // threshold
      ]
    },
    {
      name: "Test USDC",
      address: deployment.contracts.TestUSDC,
      constructorArguments: ["Test USDC", "USDC"]
    },
    {
      name: "ChronosVault",
      address: deployment.contracts.ChronosVault,
      constructorArguments: [
        deployment.contracts.TestUSDC, // asset address
        "Trinity Vault", // name
        "TVAULT", // symbol
        Math.floor(new Date(deployment.parameters.vaultUnlockTime).getTime() / 1000), // unlockTime
        2, // securityLevel
        hre.ethers.keccak256(hre.ethers.toUtf8Bytes("trinity-protocol-key")), // accessKey
        false // isPublic
      ]
    },
    {
      name: "CrossChainBridgeV1",
      address: deployment.contracts.CrossChainBridgeV1,
      constructorArguments: [] // No constructor arguments
    }
  ];

  console.log("📝 Contracts to verify:");
  contracts.forEach((contract, i) => {
    console.log(`   ${i + 1}. ${contract.name}: ${contract.address}`);
  });
  console.log("");

  let successCount = 0;
  let failureCount = 0;

  for (const contract of contracts) {
    try {
      console.log(`\n🔍 Verifying ${contract.name}...`);
      console.log(`   Address: ${contract.address}`);
      console.log(`   Constructor args: ${contract.constructorArguments.length > 0 ? JSON.stringify(contract.constructorArguments, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2) : 'None'}`);

      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
      });

      console.log(`   ✅ ${contract.name} verified successfully!`);
      successCount++;
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`   ℹ️  ${contract.name} is already verified`);
        successCount++;
      } else {
        console.error(`   ❌ Failed to verify ${contract.name}:`, error.message);
        failureCount++;
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successfully verified: ${successCount}/${contracts.length}`);
  console.log(`❌ Failed: ${failureCount}/${contracts.length}`);
  console.log("\n🔍 View on Arbiscan:");
  console.log(`   ${deployment.blockExplorer}/address/${deployment.contracts.CVTToken}`);
  console.log(`   ${deployment.blockExplorer}/address/${deployment.contracts.CVTBridge}`);
  console.log(`   ${deployment.blockExplorer}/address/${deployment.contracts.CrossChainBridgeV1}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification script failed:", error);
    process.exit(1);
  });
