/**
 * Price Feed Integration Test
 * 
 * This test suite verifies that our price feed integration with Chainlink oracles is
 * working correctly across all supported networks (Ethereum, Solana, TON).
 * It also tests the fallback mechanisms for when the testnet oracles are unavailable.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chainlinkOracleService } from '../../client/src/services/chainlink-oracle-service';

describe('Chainlink Oracle Price Feed Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Ethereum Price Feeds', () => {
    it('should get price feeds from Ethereum Sepolia testnet', async () => {
      const feeds = await chainlinkOracleService.getPriceFeeds('ethereum');
      
      // Verify response structure
      expect(feeds).toBeInstanceOf(Array);
      expect(feeds.length).toBeGreaterThan(0);
      
      // Verify each feed has required properties
      const feed = feeds[0];
      expect(feed).toHaveProperty('pair');
      expect(feed).toHaveProperty('value');
      expect(feed).toHaveProperty('change24h');
      expect(feed).toHaveProperty('lastUpdate');
      expect(feed).toHaveProperty('network', 'ethereum');
      
      // Specific feed checks
      const btcFeed = feeds.find(f => f.pair === 'BTC/USD');
      expect(btcFeed).toBeDefined();
      expect(typeof btcFeed?.value).toBe('number');
      expect(btcFeed?.value).toBeGreaterThan(0);
    });
    
    it('should handle Ethereum network errors gracefully', async () => {
      // Mock a network failure
      vi.spyOn(chainlinkOracleService, 'fetchFromEthereumOracle').mockRejectedValueOnce(new Error('Network error'));
      
      // Service should fall back to cached or estimated data
      const feeds = await chainlinkOracleService.getPriceFeeds('ethereum');
      
      expect(feeds).toBeInstanceOf(Array);
      expect(feeds.length).toBeGreaterThan(0);
    });
  });
  
  describe('Solana Price Feeds', () => {
    it('should get price feeds from Solana Devnet', async () => {
      const feeds = await chainlinkOracleService.getPriceFeeds('solana');
      
      // Verify response structure
      expect(feeds).toBeInstanceOf(Array);
      expect(feeds.length).toBeGreaterThan(0);
      
      // Verify each feed has required properties
      const feed = feeds[0];
      expect(feed).toHaveProperty('pair');
      expect(feed).toHaveProperty('value');
      expect(feed).toHaveProperty('change24h');
      expect(feed).toHaveProperty('lastUpdate');
      expect(feed).toHaveProperty('network', 'solana');
      
      // Specific feed checks for Solana
      const solFeed = feeds.find(f => f.pair === 'SOL/USD');
      expect(solFeed).toBeDefined();
      expect(typeof solFeed?.value).toBe('number');
      expect(solFeed?.value).toBeGreaterThan(0);
    });
    
    it('should handle Solana network errors gracefully', async () => {
      // Mock a network failure
      vi.spyOn(chainlinkOracleService, 'fetchFromSolanaOracle').mockRejectedValueOnce(new Error('Network error'));
      
      // Service should fall back to cached or estimated data
      const feeds = await chainlinkOracleService.getPriceFeeds('solana');
      
      expect(feeds).toBeInstanceOf(Array);
      expect(feeds.length).toBeGreaterThan(0);
    });
  });
  
  describe('TON Price Feeds', () => {
    it('should get price feeds from TON Testnet', async () => {
      const feeds = await chainlinkOracleService.getPriceFeeds('ton');
      
      // Verify response structure
      expect(feeds).toBeInstanceOf(Array);
      expect(feeds.length).toBeGreaterThan(0);
      
      // Verify each feed has required properties
      const feed = feeds[0];
      expect(feed).toHaveProperty('pair');
      expect(feed).toHaveProperty('value');
      expect(feed).toHaveProperty('change24h');
      expect(feed).toHaveProperty('lastUpdate');
      expect(feed).toHaveProperty('network', 'ton');
      
      // Specific feed checks for TON
      const tonFeed = feeds.find(f => f.pair === 'TON/USD');
      expect(tonFeed).toBeDefined();
      expect(typeof tonFeed?.value).toBe('number');
      expect(tonFeed?.value).toBeGreaterThan(0);
    });
    
    it('should handle TON network errors gracefully', async () => {
      // Mock a network failure
      vi.spyOn(chainlinkOracleService, 'fetchFromTonOracle').mockRejectedValueOnce(new Error('Network error'));
      
      // Service should fall back to cached or estimated data
      const feeds = await chainlinkOracleService.getPriceFeeds('ton');
      
      expect(feeds).toBeInstanceOf(Array);
      expect(feeds.length).toBeGreaterThan(0);
    });
  });
  
  describe('Cross-Chain Price Verification', () => {
    it('should verify prices across multiple chains have similar values', async () => {
      // Fetch price feeds from all networks
      const ethFeeds = await chainlinkOracleService.getPriceFeeds('ethereum');
      const solFeeds = await chainlinkOracleService.getPriceFeeds('solana');
      const tonFeeds = await chainlinkOracleService.getPriceFeeds('ton');
      
      // Find common trading pairs (BTC/USD is likely on all chains)
      const ethBtcFeed = ethFeeds.find(f => f.pair === 'BTC/USD');
      const solBtcFeed = solFeeds.find(f => f.pair === 'BTC/USD');
      const tonBtcFeed = tonFeeds.find(f => f.pair === 'BTC/USD');
      
      // Verify prices are within reasonable range of each other (5% tolerance)
      if (ethBtcFeed && solBtcFeed) {
        const priceDiffPercentage = Math.abs(ethBtcFeed.value - solBtcFeed.value) / ethBtcFeed.value * 100;
        expect(priceDiffPercentage).toBeLessThan(5);
      }
      
      if (ethBtcFeed && tonBtcFeed) {
        const priceDiffPercentage = Math.abs(ethBtcFeed.value - tonBtcFeed.value) / ethBtcFeed.value * 100;
        expect(priceDiffPercentage).toBeLessThan(5);
      }
      
      if (solBtcFeed && tonBtcFeed) {
        const priceDiffPercentage = Math.abs(solBtcFeed.value - tonBtcFeed.value) / solBtcFeed.value * 100;
        expect(priceDiffPercentage).toBeLessThan(5);
      }
    });
  });
});