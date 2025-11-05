/**
 * Deploy TrinityConsensusVerifier v3.4 to Arbitrum Sepolia
 * 
 * CRITICAL SECURITY FIXES in v3.4:
 * - Merkle nonce replay protection (prevents replay attacks with old proofs)
 * - Vault authorization check (prevents malicious contracts as vault addresses)
 * - Emergency controller transfer (allows safe key rotation)
 * 
 * All v3.3 features maintained:
 * - Validator rotation with 2-of-3 consensus
 * - Merkle root updates require 2-of-3 consensus
 */

const hre = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('\n🔱 Deploying Trinity Protocol v3.4 - TrinityConsensusVerifier');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n📍 Deployer address: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`   Balance: ${hre.ethers.formatEther(balance)} ETH`);
  
  if (balance < hre.ethers.parseEther('0.01')) {
    console.log('\n⚠️  WARNING: Low balance! Deployment may fail.');
    console.log('   Please fund your wallet with Arbitrum Sepolia ETH');
    console.log(`   Faucet: https://faucet.quicknode.com/arbitrum/sepolia`);
  }
  
  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log(`\n🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  if (network.chainId !== 421614n) {
    console.log('\n❌ ERROR: This script is for Arbitrum Sepolia (Chain ID: 421614)');
    console.log(`   Current network: ${network.name} (${network.chainId})`);
    process.exit(1);
  }
  
  // Deploy TrinityConsensusVerifier
  console.log('\n🚀 Deploying TrinityConsensusVerifier v3.4 (Security Hardened)...');
  
  const TrinityConsensusVerifier = await hre.ethers.getContractFactory('TrinityConsensusVerifier');
  
  // Constructor parameters (v3.4 - same as v3.3):
  // address _arbitrumValidator
  // address _solanaValidator
  // address _tonValidator
  // address _emergencyController
  
  // Use known validator address from replit.md
  const arbitrumValidator = '0x66e5046d136e82d17cbeb2ffea5bd5205d962906';
  const solanaValidator = deployer.address; // Can rotate later via 2-of-3 consensus
  const tonValidator = deployer.address; // Can rotate later via 2-of-3 consensus
  const emergencyController = deployer.address;
  
  console.log('\n📋 Deployment Parameters (v3.4 Security Hardened):');
  console.log(`   Arbitrum Validator: ${arbitrumValidator}`);
  console.log(`   Solana Validator: ${solanaValidator}`);
  console.log(`   TON Validator: ${tonValidator}`);
  console.log(`   Emergency Controller: ${emergencyController}`);
  
  console.log('\n🔐 v3.4 Security Fixes:');
  console.log('   ✅ Merkle nonce used in proof verification (prevents replay)');
  console.log('   ✅ Vault authorization check (validates IChronosVault interface)');
  console.log('   ✅ Emergency controller transfer function (key rotation)');
  
  const trinityVerifier = await TrinityConsensusVerifier.deploy(
    arbitrumValidator,
    solanaValidator,
    tonValidator,
    emergencyController
  );
  
  await trinityVerifier.waitForDeployment();
  
  const contractAddress = await trinityVerifier.getAddress();
  
  console.log('\n✅ TrinityConsensusVerifier v3.4 deployed successfully!');
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   Transaction Hash: ${trinityVerifier.deploymentTransaction()?.hash}`);
  console.log(`   Block Number: ${trinityVerifier.deploymentTransaction()?.blockNumber}`);
  
  // Verify deployment
  console.log('\n🔍 Verifying deployment...');
  
  const contractCode = await hre.ethers.provider.getCode(contractAddress);
  console.log(`   Bytecode size: ${contractCode.length / 2 - 1} bytes`);
  
  const contractSize = contractCode.length / 2 - 1;
  const sizeLimit = 24576;
  const headroom = sizeLimit - contractSize;
  
  console.log(`   Size limit: ${sizeLimit} bytes`);
  console.log(`   Headroom: ${headroom} bytes (${((headroom / sizeLimit) * 100).toFixed(2)}%)`);
  
  if (contractSize > sizeLimit) {
    console.log('\n⚠️  WARNING: Contract exceeds 24KB limit!');
  } else {
    console.log('\n✅ Contract size within 24KB limit');
  }
  
  // Test basic functionality
  console.log('\n🧪 Testing basic functionality...');
  
  try {
    const controller = await trinityVerifier.emergencyController();
    console.log(`   Emergency Controller: ${controller}`);
    
    if (controller.toLowerCase() !== emergencyController.toLowerCase()) {
      throw new Error('Emergency controller mismatch!');
    }
    
    const arbValidator = await trinityVerifier.validators(1); // ARBITRUM_CHAIN_ID = 1
    console.log(`   Arbitrum validator: ${arbValidator}`);
    
    const solValidator = await trinityVerifier.validators(2); // SOLANA_CHAIN_ID = 2
    console.log(`   Solana validator: ${solValidator}`);
    
    const tonValidatorAddr = await trinityVerifier.validators(3); // TON_CHAIN_ID = 3
    console.log(`   TON validator: ${tonValidatorAddr}`);
    
    console.log('\n✅ Basic functionality tests passed!');
    
  } catch (error) {
    console.log('\n❌ Basic functionality tests failed:');
    console.log(error);
  }
  
  // Print deployment summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 DEPLOYMENT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📍 Network: Arbitrum Sepolia (${network.chainId})`);
  console.log(`📍 Contract: TrinityConsensusVerifier v3.4`);
  console.log(`📍 Address: ${contractAddress}`);
  console.log(`📍 Deployer: ${deployer.address}`);
  
  console.log('\n🔗 Explorer Links:');
  console.log(`   Arbiscan: https://sepolia.arbiscan.io/address/${contractAddress}`);
  console.log(`   Verify: https://sepolia.arbiscan.io/verifyContract?a=${contractAddress}`);
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Verify contract on Arbiscan (optional)');
  console.log('   2. Add validators for each chain (Arbitrum, Solana, TON)');
  console.log('   3. Configure coordinator service with this address');
  console.log('   4. Update replit.md with deployment address');
  console.log('   5. Test 2-of-3 consensus flow end-to-end');
  console.log('   6. Test new v3.4 security features (nonce replay, vault validation, controller transfer)');
  
  console.log('\n🔱 Trinity Protocol v3.4 deployment complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Save deployment info
  const deploymentInfo = {
    network: 'arbitrum-sepolia',
    chainId: Number(network.chainId),
    contractName: 'TrinityConsensusVerifier',
    version: 'v3.4',
    address: contractAddress,
    deployer: deployer.address,
    deploymentBlock: trinityVerifier.deploymentTransaction()?.blockNumber,
    deploymentTx: trinityVerifier.deploymentTransaction()?.hash,
    timestamp: new Date().toISOString(),
    constructorArgs: {
      arbitrumValidator,
      solanaValidator,
      tonValidator,
      emergencyController
    },
    securityFixes: [
      'Merkle nonce replay protection',
      'Vault authorization check',
      'Emergency controller transfer function'
    ]
  };
  
  const deploymentPath = './deployment-trinity-v3.4.json';
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentPath}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:');
    console.error(error);
    process.exit(1);
  });
