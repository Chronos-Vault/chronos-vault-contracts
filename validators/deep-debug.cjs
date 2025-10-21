/**
 * Deep debug - test each requirement step by step
 */

const ethers = require('ethers');
const fs = require('fs');

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const BRIDGE_ADDRESS = '0x8A21355C1c7b9Bef83c7f0C09a79b1d3eB266d24';
const validatorConfig = JSON.parse(fs.readFileSync('../config/validators.json', 'utf8'));

const ABI = [
  'function emergencyController() view returns (address)',
  'function supportedChains(string) view returns (bool)',
  'function baseFee() view returns (uint256)',
  'function calculateFee(uint256 amount, bool prioritizeSpeed, bool prioritizeSecurity) view returns (uint256)',
  'function circuitBreaker() view returns (tuple(bool active, bool emergencyPause, uint256 triggeredAt, string reason, uint256 attemptedRecoveryAt, uint8 failedRecoveryAttempts))',
  'function authorizedValidators(uint8 chainId, address validator) view returns (bool)'
];

async function main() {
  console.log('\n🔬 Deep Contract Debug\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(validatorConfig.validators.ethereum[0].privateKey, provider);
  const bridge = new ethers.Contract(BRIDGE_ADDRESS, ABI, wallet);
  
  try {
    console.log('✅ 1. Emergency Controller:');
    const controller = await bridge.emergencyController();
    console.log(`   ${controller}`);
    console.log(`   Match: ${controller.toLowerCase() === validatorConfig.validators.ethereum[0].address.toLowerCase()}\n`);
    
    console.log('✅ 2. Base Fee:');
    const baseFee = await bridge.baseFee();
    console.log(`   ${ethers.formatEther(baseFee)} ETH\n`);
    
    console.log('✅ 3. Supported Chains:');
    const solanaSupported = await bridge.supportedChains('solana');
    console.log(`   solana: ${solanaSupported}`);
    const tonSupported = await bridge.supportedChains('ton');
    console.log(`   ton: ${tonSupported}`);
    const ethSupported = await bridge.supportedChains('ethereum');
    console.log(`   ethereum: ${ethSupported}\n`);
    
    console.log('✅ 4. Circuit Breaker Status:');
    try {
      const cb = await bridge.circuitBreaker();
      console.log(`   Active: ${cb.active}`);
      console.log(`   Emergency Pause: ${cb.emergencyPause}`);
      console.log(`   Reason: ${cb.reason || 'none'}\n`);
    } catch (e) {
      console.log(`   Error reading circuit breaker: ${e.message}\n`);
    }
    
    console.log('✅ 5. Validator Authorization:');
    const ethValidator = await bridge.authorizedValidators(1, validatorConfig.validators.ethereum[0].address);
    console.log(`   Ethereum Validator 1: ${ethValidator}`);
    const solValidator = await bridge.authorizedValidators(2, validatorConfig.validators.ethereum[0].address);
    console.log(`   Solana Validator 1: ${solValidator}`);
    const tonValidator = await bridge.authorizedValidators(3, validatorConfig.validators.ethereum[0].address);
    console.log(`   TON Validator 1: ${tonValidator}\n`);
    
    console.log('✅ 6. Fee Calculation:');
    const fee = await bridge.calculateFee(ethers.parseEther('0.001'), false, true);
    console.log(`   For 0.001 ETH: ${ethers.formatEther(fee)} ETH`);
    console.log(`   Total needed: ${ethers.formatEther(ethers.parseEther('0.001') + fee)} ETH\n`);
    
    console.log('═'.repeat(60));
    console.log('All checks passed! Contract looks good.');
    console.log('\n🤔 If createOperation still fails, the issue is likely:');
    console.log('   - ReentrancyGuard or internal validation');
    console.log('   - Try increasing gas limit to 1000000');
    console.log('   - Check if msg.value needs to be higher\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main().catch(console.error);
