/**
 * Chronos Vault - Validator Orchestrator
 * Runs all 9 validators simultaneously (3 Ethereum, 3 Solana, 3 TON)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load validator configuration
const validatorsConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/validators.json'), 'utf8')
);

const validators = [];
let activeValidators = 0;

function startValidator(type, id, privateKey, extraAddress = null) {
  console.log(`\n🚀 Starting ${type.toUpperCase()} Validator ${id}...`);
  
  const scriptPath = path.join(__dirname, `${type}-validator.cjs`);
  
  const env = {
    ...process.env,
    VALIDATOR_ID: id.toString(),
    VALIDATOR_PRIVATE_KEY: privateKey,
  };
  
  if (type === 'solana' && extraAddress) {
    env.SOLANA_ADDRESS = extraAddress;
  } else if (type === 'ton' && extraAddress) {
    env.TON_ADDRESS = extraAddress;
  }
  
  const validator = spawn('node', [scriptPath], {
    env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  validator.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  validator.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  validator.on('exit', (code) => {
    console.log(`\n❌ ${type.toUpperCase()} Validator ${id} exited with code ${code}`);
    activeValidators--;
    if (activeValidators === 0) {
      console.log('\n⚠️  All validators stopped. Exiting...');
      process.exit(code);
    }
  });
  
  validators.push(validator);
  activeValidators++;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('     Chronos Vault - Trinity Protocol Validators      ');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('🔐 Initializing 9 Validators (2-of-3 Consensus)');
  console.log('   • 3 Ethereum Validators');
  console.log('   • 3 Solana Validators');
  console.log('   • 3 TON Validators\n');
  
  console.log('⚡ Starting all validators...\n');
  
  // Start Ethereum validators
  validatorsConfig.validators.ethereum.forEach((v) => {
    startValidator('ethereum', v.id, v.privateKey);
  });
  
  // Wait a bit before starting Solana validators
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start Solana validators  
  validatorsConfig.validators.solana.forEach((v, idx) => {
    const ethValidator = validatorsConfig.validators.ethereum[idx];
    startValidator('solana', v.id, ethValidator.privateKey, v.publicKey);
  });
  
  // Wait a bit before starting TON validators
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start TON validators
  validatorsConfig.validators.ton.forEach((v, idx) => {
    const ethValidator = validatorsConfig.validators.ethereum[idx];
    startValidator('ton', v.id, ethValidator.privateKey, v.publicKey);
  });
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ All 9 validators are now running!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📡 Validators are monitoring Arbitrum Sepolia for operations...');
  console.log('   Contract: 0xf24e41980ed48576Eb379D2116C1AaD075B342C4');
  console.log('   When an operation is created, validators will:');
  console.log('   1. Detect the operation');
  console.log('   2. Verify on their respective chains');
  console.log('   3. Submit cross-chain proofs');
  console.log('   4. Reach 2-of-3 consensus\n');
  
  console.log('💡 To test, run in another terminal:');
  console.log('   node validators/test-consensus.cjs\n');
  
  console.log('Press Ctrl+C to stop all validators\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Shutting down all validators...\n');
  validators.forEach((validator, idx) => {
    validator.kill('SIGINT');
  });
  setTimeout(() => process.exit(0), 2000);
});

main().catch(console.error);
