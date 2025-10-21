/**
 * Deploy CrossChainBridgeOptimized with validator as emergency controller
 */

const hre = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Deploy CrossChainBridge - Validator Controller     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Load validator config
  const validatorConfig = JSON.parse(fs.readFileSync('./config/validators.json', 'utf8'));
  const emergencyController = validatorConfig.validators.ethereum[0].address;
  
  console.log(`🔐 Emergency Controller: ${emergencyController}`);
  console.log('   (Ethereum Validator 1)\n');
  
  // Connect with the validator's private key
  const provider = new hre.ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
  const deployer = new hre.ethers.Wallet(validatorConfig.validators.ethereum[0].privateKey, provider);
  
  const balance = await provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance: ${hre.ethers.formatEther(balance)} ETH\n`);
  
  if (balance < hre.ethers.parseEther('0.005')) {
    console.error('❌ Insufficient balance for deployment');
    process.exit(1);
  }
  
  console.log('📦 Deploying CrossChainBridgeOptimized...\n');
  
  // Prepare validator arrays
  const ethereumValidators = validatorConfig.validators.ethereum.map(v => v.address);
  const solanaValidators = validatorConfig.validators.ethereum.map(v => v.address); // Use ETH addresses for Solana validators (they submit to Arbitrum)
  const tonValidators = validatorConfig.validators.ethereum.map(v => v.address); // Use ETH addresses for TON validators (they submit to Arbitrum)
  
  console.log(`   Ethereum Validators: ${ethereumValidators.length}`);
  console.log(`   Solana Validators: ${solanaValidators.length}`);
  console.log(`   TON Validators: ${tonValidators.length}\n`);
  
  const CrossChainBridge = await hre.ethers.getContractFactory('CrossChainBridgeOptimized', deployer);
  
  const bridge = await CrossChainBridge.deploy(
    emergencyController,   // Emergency controller
    ethereumValidators,    // Ethereum validators
    solanaValidators,      // Solana validators  
    tonValidators,         // TON validators
    {
      gasLimit: 5000000
    }
  );
  
  console.log('   Waiting for deployment...');
  await bridge.waitForDeployment();
  
  const address = await bridge.getAddress();
  console.log(`\n✅ Deployed at: ${address}`);
  console.log(`   Emergency Controller: ${emergencyController}`);
  console.log(`   Base Fee: 0.001 ETH`);
  console.log(`   Max Fee: 0.1 ETH\n`);
  
  // Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: 'arbitrum-sepolia',
    contractAddress: address,
    emergencyController: emergencyController,
    deployer: deployer.address,
    parameters: {
      baseFee: '0.001',
      speedPriorityMultiplier: 150,
      securityPriorityMultiplier: 200,
      maxFee: '0.1',
      minimumBlockConfirmations: 6,
      maxProofAge: 3600
    }
  };
  
  fs.writeFileSync(
    './LATEST_DEPLOYMENT.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log('═'.repeat(60));
  console.log('🎉 Deployment Complete!');
  console.log('═'.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Update BRIDGE_ADDRESS in test scripts');
  console.log('2. Run: node validators/test-real-consensus.cjs');
  console.log('3. Test 2-of-3 consensus with funded validators\n');
}

main().catch((error) => {
  console.error('\n❌ Deployment failed:', error);
  process.exit(1);
});
