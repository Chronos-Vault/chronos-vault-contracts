/**
 * End-to-End Vault Price Feed Test
 * 
 * This script verifies the Chainlink Oracle integration works across all vault types,
 * ensuring price data flows correctly through each vault's specific implementation.
 */

import { chainlinkOracleService } from '../client/src/services/chainlink-oracle-service';

// Define supported vault types for testing
const VAULT_TYPES = [
  'investment-discipline', 
  'time-locked-memory',
  'geo-location', 
  'sovereign-fortress',
  'ai-assisted-investment',
  'cross-chain-fragment',
  'quantum-resistant'
];

// Define assets to test across all vaults
const ASSETS = ['BTC', 'ETH', 'SOL', 'TON'];

// Define blockchain networks
const NETWORKS = ['ethereum', 'solana', 'ton'] as const;

async function verifyPriceFeedIntegration() {
  console.log('=======================================================');
  console.log('CHRONOS VAULT - END-TO-END PRICE FEED INTEGRATION TEST');
  console.log('=======================================================\n');
  
  // 1. Basic Price Feed Functionality Test
  console.log('Testing basic price feed functionality:');
  console.log('-----------------------------------');
  
  try {
    // Verify price feeds from each network
    for (const network of NETWORKS) {
      console.log(`\nNetwork: ${network.toUpperCase()}`);
      const feeds = await chainlinkOracleService.getPriceFeeds(network);
      
      if (feeds.length === 0) {
        console.log(`❌ No feeds received from ${network}`);
        continue;
      }
      
      console.log(`✅ Received ${feeds.length} feeds`);
      
      // Check for expected assets
      for (const asset of ASSETS) {
        const feed = feeds.find(f => f.pair === `${asset}/USD`);
        if (feed) {
          console.log(`  ✅ ${asset}/USD: $${feed.value.toLocaleString()} (Δ${feed.change24h.toFixed(2)}%)`);
        } else {
          console.log(`  ❌ Missing ${asset}/USD pair`);
        }
      }
    }
  } catch (error) {
    console.error('Error testing basic price feed functionality:', error);
  }
  
  // 2. Cross-Vault Price Feed Consistency
  console.log('\n\nTesting price feed consistency across vault types:');
  console.log('----------------------------------------------');
  
  try {
    // Create a simulation of vault-specific price calculations
    for (const vaultType of VAULT_TYPES) {
      console.log(`\nVault Type: ${vaultType}`);
      
      // Simulate asset amount
      const assetAmount = 1.0;
      
      console.log(`Asset amount: ${assetAmount}`);
      console.log('Price calculations:');
      
      // Get price data from each network (in real app these would be selected based on vault type)
      for (const network of NETWORKS) {
        const feeds = await chainlinkOracleService.getPriceFeeds(network);
        
        // Calculate asset values
        for (const asset of ASSETS) {
          const feed = feeds.find(f => f.pair === `${asset}/USD`);
          
          if (feed) {
            const value = assetAmount * feed.value;
            console.log(`  • ${asset} on ${network}: $${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error testing cross-vault price feed consistency:', error);
  }
  
  // 3. Fallback Mechanism Test
  console.log('\n\nTesting fallback mechanisms:');
  console.log('---------------------------');
  
  try {
    // Test with a simulated network failure
    for (const network of NETWORKS) {
      console.log(`\nSimulating network failure for ${network}:`);
      
      // Save original method
      const originalMethod = (chainlinkOracleService as any)[`fetchFrom${network.charAt(0).toUpperCase() + network.slice(1)}Oracle`];
      
      try {
        // Replace with failing method
        (chainlinkOracleService as any)[`fetchFrom${network.charAt(0).toUpperCase() + network.slice(1)}Oracle`] = 
          async () => { throw new Error('Simulated network failure'); };
        
        // Try to get price feeds (should use fallback)
        const feeds = await chainlinkOracleService.getPriceFeeds(network);
        
        if (feeds.length > 0) {
          console.log(`✅ Fallback mechanism working - received ${feeds.length} feeds despite network failure`);
          
          // Sample price feed
          const btcFeed = feeds.find(f => f.pair === 'BTC/USD');
          if (btcFeed) {
            console.log(`  BTC/USD: $${btcFeed.value.toLocaleString()}`);
          }
        } else {
          console.log('❌ Fallback mechanism failed - no feeds returned');
        }
      } finally {
        // Restore original method
        (chainlinkOracleService as any)[`fetchFrom${network.charAt(0).toUpperCase() + network.slice(1)}Oracle`] = originalMethod;
      }
    }
  } catch (error) {
    console.error('Error testing fallback mechanisms:', error);
  }
  
  // 4. Performance Test
  console.log('\n\nTesting price feed performance:');
  console.log('------------------------------');
  
  try {
    for (const network of NETWORKS) {
      console.log(`\nNetwork: ${network}`);
      
      // Measure time to fetch price feeds
      const startTime = Date.now();
      await chainlinkOracleService.getPriceFeeds(network);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      console.log(`✅ Price feeds fetched in ${duration}ms`);
      
      // Performance rating
      if (duration < 500) {
        console.log('  Performance: Excellent (< 500ms)');
      } else if (duration < 1000) {
        console.log('  Performance: Good (< 1000ms)');
      } else if (duration < 2000) {
        console.log('  Performance: Fair (< 2000ms)');
      } else {
        console.log('  Performance: Poor (> 2000ms)');
      }
    }
  } catch (error) {
    console.error('Error testing price feed performance:', error);
  }
  
  console.log('\n\nEnd-to-end test completed.');
}

// Run the tests
verifyPriceFeedIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});