/**
 * Chainlink Oracle Integration Test Script
 * 
 * This script tests the integration between Chainlink oracles and our vaults
 * by verifying price data flows correctly across all supported networks.
 */

import { chainlinkOracleService } from '../client/src/services/chainlink-oracle-service';

async function main() {
  console.log('Starting Chainlink Oracle Integration Test...');
  console.log('============================================');
  
  // Test all supported networks
  const networks = ['ethereum', 'solana', 'ton'] as const;
  
  for (const network of networks) {
    console.log(`\nTesting ${network.toUpperCase()} network:`);
    console.log('----------------------------');
    
    try {
      // 1. Test price feed fetching
      console.log(`Fetching price feeds from ${network}...`);
      const priceFeeds = await chainlinkOracleService.getPriceFeeds(network);
      
      // Verify we received data
      if (priceFeeds.length === 0) {
        console.error(`❌ No price feeds received from ${network}`);
        continue;
      }
      
      console.log(`✅ Received ${priceFeeds.length} price feeds from ${network}`);
      
      // 2. Verify expected feed pairs are present
      const btcFeed = priceFeeds.find(feed => feed.pair === 'BTC/USD');
      const ethFeed = priceFeeds.find(feed => feed.pair === 'ETH/USD');
      
      if (btcFeed) {
        console.log(`✅ BTC/USD feed: $${btcFeed.value}`);
      } else {
        console.error('❌ Missing BTC/USD feed');
      }
      
      if (ethFeed) {
        console.log(`✅ ETH/USD feed: $${ethFeed.value}`);
      } else {
        console.error('❌ Missing ETH/USD feed');
      }
      
      // 3. Verify feed data structure
      const sampleFeed = priceFeeds[0];
      console.log('\nVerifying feed data structure:');
      console.log(`Feed pair: ${sampleFeed.pair}`);
      console.log(`Price: $${sampleFeed.value}`);
      console.log(`24h Change: ${sampleFeed.change24h}%`);
      console.log(`Last updated: ${new Date(sampleFeed.lastUpdate).toLocaleString()}`);
      console.log(`Network: ${sampleFeed.network}`);
      
      // 4. Test error handling (simulated network failure)
      console.log('\nTesting error handling (simulated network failure)...');
      
      // Create a backup of the original method
      const originalMethod = (chainlinkOracleService as any)[`fetchFrom${network.charAt(0).toUpperCase() + network.slice(1)}Oracle`];
      
      try {
        // Replace with a failing method
        (chainlinkOracleService as any)[`fetchFrom${network.charAt(0).toUpperCase() + network.slice(1)}Oracle`] = 
          async () => { throw new Error('Simulated network failure'); };
        
        // Should still work with fallback/cached data
        const fallbackFeeds = await chainlinkOracleService.getPriceFeeds(network);
        
        if (fallbackFeeds.length > 0) {
          console.log('✅ Fallback mechanism returned data despite network failure');
        } else {
          console.error('❌ Fallback mechanism failed');
        }
      } finally {
        // Restore original method
        (chainlinkOracleService as any)[`fetchFrom${network.charAt(0).toUpperCase() + network.slice(1)}Oracle`] = originalMethod;
      }
    } catch (error) {
      console.error(`❌ Test failed for ${network}:`, error);
    }
  }
  
  // Test cross-chain verification (prices should be similar across networks)
  console.log('\n\nTesting Cross-Chain Verification:');
  console.log('================================');
  
  try {
    const ethFeeds = await chainlinkOracleService.getPriceFeeds('ethereum');
    const solFeeds = await chainlinkOracleService.getPriceFeeds('solana');
    const tonFeeds = await chainlinkOracleService.getPriceFeeds('ton');
    
    const ethBtc = ethFeeds.find(feed => feed.pair === 'BTC/USD');
    const solBtc = solFeeds.find(feed => feed.pair === 'BTC/USD');
    const tonBtc = tonFeeds.find(feed => feed.pair === 'BTC/USD');
    
    if (ethBtc && solBtc) {
      const priceDiffPercent = Math.abs(ethBtc.value - solBtc.value) / ethBtc.value * 100;
      console.log(`ETH vs SOL BTC price difference: ${priceDiffPercent.toFixed(2)}%`);
      
      if (priceDiffPercent < 5) {
        console.log('✅ ETH and SOL prices are consistent (within 5% tolerance)');
      } else {
        console.error('❌ ETH and SOL prices differ significantly');
      }
    }
    
    if (ethBtc && tonBtc) {
      const priceDiffPercent = Math.abs(ethBtc.value - tonBtc.value) / ethBtc.value * 100;
      console.log(`ETH vs TON BTC price difference: ${priceDiffPercent.toFixed(2)}%`);
      
      if (priceDiffPercent < 5) {
        console.log('✅ ETH and TON prices are consistent (within 5% tolerance)');
      } else {
        console.error('❌ ETH and TON prices differ significantly');
      }
    }
    
    console.log('\nPrice feed integration test completed.');
  } catch (error) {
    console.error('❌ Cross-chain verification failed:', error);
  }
}

main().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});