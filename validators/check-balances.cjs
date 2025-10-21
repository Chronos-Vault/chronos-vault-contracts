const ethers = require('ethers');

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const VALIDATOR_ADDRESSES = [
  '0x0be8788807DA1E4f95057F564562594D65a0C4f9',
  '0x0A19B76c3C8FE9C88f910C3212e2B44b5b263E26',
  '0xCf2847d3c872998F5FbFFD7eCb23e8932E890c2d'
];

async function checkBalances() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  console.log('🔍 Checking Validator Balances on Arbitrum Sepolia\n');
  console.log('═'.repeat(60));
  
  for (let i = 0; i < VALIDATOR_ADDRESSES.length; i++) {
    const address = VALIDATOR_ADDRESSES[i];
    try {
      const balance = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balance);
      console.log(`\nValidator ${i + 1}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Balance: ${balanceEth} ETH`);
      console.log(`  Status: ${parseFloat(balanceEth) > 0 ? '✅ FUNDED' : '❌ NOT FUNDED'}`);
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '═'.repeat(60));
}

checkBalances().catch(console.error);
