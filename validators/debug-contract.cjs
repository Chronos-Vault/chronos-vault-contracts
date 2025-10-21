/**
 * Debug contract state on Arbitrum Sepolia
 */

const ethers = require('ethers');

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const BRIDGE_ADDRESS = '0xf24e41980ed48576Eb379D2116C1AaD075B342C4';

const BRIDGE_ABI = [
  'function baseFee() view returns (uint256)',
  'function maxFee() view returns (uint256)',
  'function minimumBlockConfirmations() view returns (uint256)',
  'function emergencyController() view returns (address)',
  'function circuitBreakerActive() view returns (bool)',
  'function emergencyPaused() view returns (bool)',
  'function calculateFee(uint256 amount, bool prioritizeSpeed, bool prioritizeSecurity) view returns (uint256)',
];

async function main() {
  console.log('\n🔍 Debugging CrossChainBridge Contract State\n');
  console.log('═'.repeat(60));
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const bridge = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, provider);
  
  try {
    // Check basic parameters
    console.log('\n📊 Contract Parameters:');
    const baseFee = await bridge.baseFee();
    console.log(`   Base Fee: ${ethers.formatEther(baseFee)} ETH`);
    
    const maxFee = await bridge.maxFee();
    console.log(`   Max Fee: ${ethers.formatEther(maxFee)} ETH`);
    
    const minConfirmations = await bridge.minimumBlockConfirmations();
    console.log(`   Min Confirmations: ${minConfirmations.toString()}`);
    
    // Check circuit breaker status
    console.log('\n🔐 Security Status:');
    try {
      const circuitBreakerActive = await bridge.circuitBreakerActive();
      console.log(`   Circuit Breaker: ${circuitBreakerActive ? '❌ ACTIVE (blocking txs)' : '✅ Inactive'}`);
    } catch (e) {
      console.log(`   Circuit Breaker: Unable to check (${e.message})`);
    }
    
    try {
      const emergencyPaused = await bridge.emergencyPaused();
      console.log(`   Emergency Pause: ${emergencyPaused ? '❌ ACTIVE (contract paused)' : '✅ Inactive'}`);
    } catch (e) {
      console.log(`   Emergency Pause: Unable to check (${e.message})`);
    }
    
    const emergencyController = await bridge.emergencyController();
    console.log(`   Emergency Controller: ${emergencyController}`);
    
    // Calculate expected fee
    console.log('\n💰 Fee Calculation:');
    const testAmount = ethers.parseEther('0.0001');
    try {
      const fee = await bridge.calculateFee(testAmount, false, true);
      console.log(`   Expected Fee for 0.0001 ETH: ${ethers.formatEther(fee)} ETH`);
      console.log(`   Total Required: ${ethers.formatEther(testAmount + fee)} ETH`);
    } catch (e) {
      console.log(`   Fee Calculation Error: ${e.message}`);
    }
    
    // Check contract balance
    const contractBalance = await provider.getBalance(BRIDGE_ADDRESS);
    console.log(`\n💎 Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
    
    console.log('\n═'.repeat(60));
    console.log('\n✅ Contract state check complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main().catch(console.error);
