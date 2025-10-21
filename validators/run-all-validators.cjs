/**
 * Run All Trinity Protocol Validators
 * 
 * Starts Ethereum, Solana, and TON validators simultaneously
 * to monitor and validate cross-chain operations.
 */

const fs = require('fs');
const { CrossChainValidator } = require('./cross-chain-validator.cjs');

// Load validator configuration
const validatorConfig = JSON.parse(fs.readFileSync('../config/validators.json', 'utf8'));

// Bridge configuration
const BRIDGE_ADDRESS = '0x8A21355C1c7b9Bef83c7f0C09a79b1d3eB266d24';
const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Trinity Protocol - Multi-Chain Validator System   ║');
  console.log('║   2-of-3 Consensus Across ETH, SOL, TON              ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  // Initialize validators for all three chains
  const validators = [
    {
      name: 'Ethereum Validator',
      validator: new CrossChainValidator({
        chainId: 1,
        validatorPrivateKey: validatorConfig.validators.ethereum[0].privateKey,
        bridgeAddress: BRIDGE_ADDRESS,
        rpcUrl: RPC_URL
      })
    },
    {
      name: 'Solana Validator',
      validator: new CrossChainValidator({
        chainId: 2,
        validatorPrivateKey: validatorConfig.validators.ethereum[1].privateKey, // Uses ETH address for Arbitrum
        bridgeAddress: BRIDGE_ADDRESS,
        rpcUrl: RPC_URL
      })
    },
    {
      name: 'TON Validator',
      validator: new CrossChainValidator({
        chainId: 3,
        validatorPrivateKey: validatorConfig.validators.ethereum[2].privateKey, // Uses ETH address for Arbitrum
        bridgeAddress: BRIDGE_ADDRESS,
        rpcUrl: RPC_URL
      })
    }
  ];
  
  console.log('🚀 Starting all validators...\n');
  console.log('═'.repeat(60));
  
  // Start all validators
  for (const { name, validator } of validators) {
    console.log(`\n▶️  ${name}`);
    await validator.startMonitoring();
  }
  
  console.log('═'.repeat(60));
  console.log('\n✅ All 3 validators are now monitoring for operations');
  console.log('⏳ Waiting for cross-chain operations...');
  console.log('\n💡 To test: Run test-real-consensus.cjs in another terminal\n');
  
  // Keep running
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down validators...');
    validators.forEach(({ validator }) => validator.stop());
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
