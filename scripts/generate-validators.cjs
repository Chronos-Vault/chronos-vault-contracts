/**
 * Chronos Vault - Multi-Validator Key Generation
 * Generates validator keys for Trinity Protocol (Ethereum, Solana, TON)
 */

const { ethers } = require('ethers');
const { Keypair } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const fs = require('fs').promises;

// Fix bs58 default export handling
const bs58Encode = bs58.encode || bs58.default?.encode || bs58;

async function generateValidators() {
  console.log('🔐 Chronos Vault - Multi-Validator Key Generation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const validators = {
    ethereum: [],
    solana: [],
    ton: []
  };
  
  // Generate 3 validators per chain
  const VALIDATOR_COUNT = 3;
  
  // ═══════════════════════════════════════════════════════════
  // ETHEREUM/ARBITRUM VALIDATORS
  // ═══════════════════════════════════════════════════════════
  console.log('📍 Generating Ethereum/Arbitrum Validators');
  console.log('─'.repeat(60));
  
  for (let i = 1; i <= VALIDATOR_COUNT; i++) {
    const wallet = ethers.Wallet.createRandom();
    validators.ethereum.push({
      id: i,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase
    });
    console.log(`✅ Validator ${i}:`);
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Private Key: ${wallet.privateKey.substring(0, 20)}...`);
  }
  
  // ═══════════════════════════════════════════════════════════
  // SOLANA VALIDATORS
  // ═══════════════════════════════════════════════════════════
  console.log('\n📍 Generating Solana Validators');
  console.log('─'.repeat(60));
  
  for (let i = 1; i <= VALIDATOR_COUNT; i++) {
    const keypair = Keypair.generate();
    const secretKeyBase58 = typeof bs58Encode === 'function' 
      ? bs58Encode(keypair.secretKey)
      : bs58.encode(keypair.secretKey);
    
    validators.solana.push({
      id: i,
      publicKey: keypair.publicKey.toBase58(),
      secretKey: secretKeyBase58,
      secretKeyArray: Array.from(keypair.secretKey)
    });
    console.log(`✅ Validator ${i}:`);
    console.log(`   Public Key: ${keypair.publicKey.toBase58()}`);
    console.log(`   Secret Key: ${secretKeyBase58.substring(0, 20)}...`);
  }
  
  // ═══════════════════════════════════════════════════════════
  // TON VALIDATORS
  // ═══════════════════════════════════════════════════════════
  console.log('\n📍 Generating TON Validators');
  console.log('─'.repeat(60));
  
  for (let i = 1; i <= VALIDATOR_COUNT; i++) {
    const keypair = nacl.sign.keyPair();
    const publicKeyHex = Buffer.from(keypair.publicKey).toString('hex');
    const secretKeyHex = Buffer.from(keypair.secretKey).toString('hex');
    
    validators.ton.push({
      id: i,
      publicKey: publicKeyHex,
      secretKey: secretKeyHex,
      publicKeyBase64: Buffer.from(keypair.publicKey).toString('base64'),
      secretKeyBase64: Buffer.from(keypair.secretKey).toString('base64')
    });
    console.log(`✅ Validator ${i}:`);
    console.log(`   Public Key: ${publicKeyHex.substring(0, 40)}...`);
    console.log(`   Secret Key: ${secretKeyHex.substring(0, 40)}...`);
  }
  
  // ═══════════════════════════════════════════════════════════
  // SAVE VALIDATOR CONFIGURATION
  // ═══════════════════════════════════════════════════════════
  console.log('\n💾 Saving Validator Configuration');
  console.log('─'.repeat(60));
  
  const config = {
    generated: new Date().toISOString(),
    network: 'testnet',
    validators: validators,
    deployment: {
      contract: '0x4300AbD703dae7641ec096d8ac03684fB4103CDe',
      network: 'arbitrum-sepolia',
      emergencyController: validators.ethereum[0].address
    }
  };
  
  await fs.writeFile(
    'config/validators.json',
    JSON.stringify(config, null, 2)
  );
  console.log('✅ Saved to: config/validators.json');
  
  // Generate deployment script
  const deployScript = `/**
 * Trinity Protocol - Multi-Validator Deployment
 * Deploy with 3 validators per chain for 2-of-3 consensus
 */

const VALIDATORS = {
  ethereum: [
    '${validators.ethereum[0].address}',
    '${validators.ethereum[1].address}',
    '${validators.ethereum[2].address}'
  ],
  solana: [
    '${validators.solana[0].publicKey}',
    '${validators.solana[1].publicKey}',
    '${validators.solana[2].publicKey}'
  ],
  ton: [
    '0x${validators.ton[0].publicKey}',
    '0x${validators.ton[1].publicKey}',
    '0x${validators.ton[2].publicKey}'
  ]
};

module.exports = { VALIDATORS };
`;
  
  await fs.writeFile('config/validators.config.cjs', deployScript);
  console.log('✅ Saved to: config/validators.config.cjs');
  
  // ═══════════════════════════════════════════════════════════
  // GENERATE .ENV TEMPLATE
  // ═══════════════════════════════════════════════════════════
  const envTemplate = `# Chronos Vault - Validator Environment Variables
# Generated: ${new Date().toISOString()}
# WARNING: Never commit this file to version control!

# Ethereum/Arbitrum Validators
ETHEREUM_VALIDATOR_1_PRIVATE_KEY=${validators.ethereum[0].privateKey}
ETHEREUM_VALIDATOR_2_PRIVATE_KEY=${validators.ethereum[1].privateKey}
ETHEREUM_VALIDATOR_3_PRIVATE_KEY=${validators.ethereum[2].privateKey}

# Solana Validators (Base58 Secret Keys)
SOLANA_VALIDATOR_1_SECRET_KEY=${validators.solana[0].secretKey}
SOLANA_VALIDATOR_2_SECRET_KEY=${validators.solana[1].secretKey}
SOLANA_VALIDATOR_3_SECRET_KEY=${validators.solana[2].secretKey}

# TON Validators (Hex Secret Keys)
TON_VALIDATOR_1_SECRET_KEY=${validators.ton[0].secretKey}
TON_VALIDATOR_2_SECRET_KEY=${validators.ton[1].secretKey}
TON_VALIDATOR_3_SECRET_KEY=${validators.ton[2].secretKey}

# Emergency Controller (uses Ethereum Validator 1)
EMERGENCY_CONTROLLER_ADDRESS=${validators.ethereum[0].address}
EMERGENCY_CONTROLLER_PRIVATE_KEY=${validators.ethereum[0].privateKey}
`;
  
  await fs.writeFile('config/.env.validators', envTemplate);
  console.log('✅ Saved to: config/.env.validators');
  
  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ VALIDATOR GENERATION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📊 Summary:');
  console.log(`   Ethereum Validators: ${validators.ethereum.length}`);
  console.log(`   Solana Validators: ${validators.solana.length}`);
  console.log(`   TON Validators: ${validators.ton.length}`);
  console.log(`   Total: ${validators.ethereum.length + validators.solana.length + validators.ton.length} validators\n`);
  
  console.log('📍 Ethereum Validator Addresses:');
  validators.ethereum.forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.address}`);
  });
  
  console.log('\n📍 Solana Validator Public Keys:');
  validators.solana.forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.publicKey}`);
  });
  
  console.log('\n📍 TON Validator Public Keys:');
  validators.ton.forEach((v, i) => {
    console.log(`   ${i + 1}. 0x${v.publicKey.substring(0, 40)}...`);
  });
  
  console.log('\n🔐 Security Notes:');
  console.log('   • All private keys saved to config/.env.validators');
  console.log('   • NEVER commit .env.validators to version control');
  console.log('   • Use environment variables in production');
  console.log('   • Implement key rotation every 90 days');
  console.log('   • Store production keys in secure vault (AWS KMS, HashiCorp Vault)');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Fund validator addresses with testnet tokens');
  console.log('   2. Run: node scripts/deploy-multi-validator.cjs');
  console.log('   3. Test cross-chain proof submission');
  console.log('   4. Validate 2-of-3 consensus execution');
  
  return validators;
}

// Run if called directly
if (require.main === module) {
  generateValidators().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { generateValidators };
