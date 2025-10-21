/**
 * Chronos Vault - Multi-Validator Deployment Script
 * Deploys CrossChainBridge with Trinity Protocol 2-of-3 consensus
 */

const hre = require('hardhat');
const { VALIDATORS } = require('../config/validators.config.cjs');
const fs = require('fs').promises;

async function main() {
  console.log('🚀 Chronos Vault - Multi-Validator Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const [deployer] = await hre.ethers.getSigners();
  console.log('📍 Deploying with account:', deployer.address);
  console.log('💰 Account balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), 'ETH\n');
  
  // ═══════════════════════════════════════════════════════════
  // VALIDATOR CONFIGURATION
  // ═══════════════════════════════════════════════════════════
  console.log('🔐 Validator Configuration:');
  console.log('─'.repeat(60));
  console.log(`Ethereum Validators: ${VALIDATORS.ethereum.length}`);
  VALIDATORS.ethereum.forEach((addr, i) => console.log(`  ${i + 1}. ${addr}`));
  
  console.log(`\nSolana Validators: ${VALIDATORS.solana.length}`);
  VALIDATORS.solana.forEach((addr, i) => console.log(`  ${i + 1}. ${addr}`));
  
  console.log(`\nTON Validators: ${VALIDATORS.ton.length}`);
  VALIDATORS.ton.forEach((addr, i) => console.log(`  ${i + 1}. ${addr}`));
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // ═══════════════════════════════════════════════════════════
  // CONVERT SOLANA/TON VALIDATORS TO ETHEREUM ADDRESSES
  // ═══════════════════════════════════════════════════════════
  // For testnet, we'll map Solana/TON public keys to Ethereum addresses
  // In production, validators would run actual nodes on each chain
  
  // Convert Solana public keys to checksummed addresses (deterministic mapping)
  const solanaValidatorsEth = VALIDATORS.solana.map(pubkey => {
    // Hash the public key and take first 20 bytes for Ethereum address
    const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(pubkey));
    return hre.ethers.getAddress('0x' + hash.slice(26)); // Last 20 bytes (40 chars)
  });
  
  // Convert TON public keys to checksummed addresses
  const tonValidatorsEth = VALIDATORS.ton.map(pubkey => {
    // Remove 0x prefix if present and convert to address
    const cleanKey = pubkey.startsWith('0x') ? pubkey : '0x' + pubkey;
    const hash = hre.ethers.keccak256(cleanKey);
    return hre.ethers.getAddress('0x' + hash.slice(26));
  });
  
  console.log('🔄 Mapped Validator Addresses for Contract:');
  console.log('─'.repeat(60));
  console.log('Ethereum (native):', VALIDATORS.ethereum);
  console.log('Solana (mapped):', solanaValidatorsEth);
  console.log('TON (mapped):', tonValidatorsEth);
  console.log('');
  
  // ═══════════════════════════════════════════════════════════
  // DEPLOY CONTRACT
  // ═══════════════════════════════════════════════════════════
  console.log('📦 Deploying CrossChainBridgeOptimized...\n');
  
  const CrossChainBridge = await hre.ethers.getContractFactory('CrossChainBridgeOptimized');
  const bridge = await CrossChainBridge.deploy(
    deployer.address, // Emergency controller
    VALIDATORS.ethereum,
    solanaValidatorsEth,
    tonValidatorsEth
  );
  
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  
  console.log('✅ CrossChainBridgeOptimized deployed!');
  console.log('   Address:', bridgeAddress);
  console.log('   Emergency Controller:', deployer.address);
  console.log('   Transaction:', bridge.deploymentTransaction().hash);
  console.log('');
  
  // ═══════════════════════════════════════════════════════════
  // VERIFY DEPLOYMENT
  // ═══════════════════════════════════════════════════════════
  console.log('🔍 Verifying Deployment...\n');
  
  // Check validator counts
  const ethValidators = await bridge.getValidatorList(1); // ETHEREUM_CHAIN_ID
  const solValidators = await bridge.getValidatorList(2); // SOLANA_CHAIN_ID
  const tonValidators = await bridge.getValidatorList(3); // TON_CHAIN_ID
  
  console.log('Registered Validators:');
  console.log(`  Ethereum: ${ethValidators.length} validators`);
  console.log(`  Solana: ${solValidators.length} validators`);
  console.log(`  TON: ${tonValidators.length} validators\n`);
  
  // Check circuit breaker
  const [cbActive, cbPause] = await bridge.getCircuitBreakerStatus();
  console.log('Circuit Breaker:');
  console.log(`  Active: ${cbActive}`);
  console.log(`  Emergency Pause: ${cbPause}\n`);
  
  // ═══════════════════════════════════════════════════════════
  // SAVE DEPLOYMENT INFO
  // ═══════════════════════════════════════════════════════════
  const deployment = {
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    contract: {
      address: bridgeAddress,
      deployer: deployer.address,
      transactionHash: bridge.deploymentTransaction().hash,
    },
    validators: {
      ethereum: {
        addresses: VALIDATORS.ethereum,
        count: ethValidators.length
      },
      solana: {
        publicKeys: VALIDATORS.solana,
        mappedAddresses: solanaValidatorsEth,
        count: solValidators.length
      },
      ton: {
        publicKeys: VALIDATORS.ton,
        mappedAddresses: tonValidatorsEth,
        count: tonValidators.length
      }
    },
    trinityProtocol: {
      requiredConfirmations: 2,
      totalChains: 3,
      consensusModel: '2-of-3'
    }
  };
  
  await fs.writeFile(
    `deployments/${hre.network.name}-multi-validator.json`,
    JSON.stringify(deployment, null, 2)
  );
  
  console.log(`💾 Deployment info saved to: deployments/${hre.network.name}-multi-validator.json\n`);
  
  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ MULTI-VALIDATOR DEPLOYMENT COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📍 Contract Address:', bridgeAddress);
  console.log('🌐 Network:', hre.network.name);
  console.log('🔐 Total Validators:', VALIDATORS.ethereum.length + VALIDATORS.solana.length + VALIDATORS.ton.length);
  console.log('✨ Trinity Protocol:', deployment.trinityProtocol.consensusModel, 'consensus');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Fund validator addresses with testnet tokens');
  console.log('   2. Run integration tests: node scripts/testnet-integration.cjs');
  console.log('   3. Test cross-chain proof submission');
  console.log('   4. Validate 2-of-3 consensus execution');
  console.log('   5. Monitor circuit breaker and anomaly detection\n');
  
  console.log('📚 Documentation:');
  console.log('   https://github.com/Chronos-Vault/chronos-vault-contracts');
  console.log('   https://github.com/Chronos-Vault/chronos-vault-docs');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
