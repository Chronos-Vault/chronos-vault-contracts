import { ethers } from "ethers";
import { config } from "./config";
import { EventMonitor } from "./services/EventMonitor";
import { BatchManager } from "./services/BatchManager";
import { L1Submitter } from "./services/L1Submitter";
import { ChallengeMonitor } from "./services/ChallengeMonitor";
import { Analytics } from "./services/Analytics";
import { logger } from "./utils/logger";

/**
 * @title Trinity Exit-Batch Keeper Service
 * @notice Main entry point for the keeper service
 * 
 * Architecture:
 * 1. EventMonitor: Listens for ExitRequested events on Arbitrum
 * 2. BatchManager: Accumulates exits and builds Merkle trees
 * 3. L1Submitter: Submits batches to Ethereum L1 via Gnosis Safe
 * 4. ChallengeMonitor: Watches for challenges and auto-responds
 * 5. Analytics: Tracks performance metrics and gas savings
 */

async function main() {
  logger.info("🚀 Trinity Exit-Batch Keeper starting...");
  logger.info(`Environment: ${config.environment}`);
  logger.info(`Arbitrum RPC: ${config.arbitrumRpcUrl.slice(0, 30)}...`);
  logger.info(`Ethereum RPC: ${config.ethereumRpcUrl.slice(0, 30)}...`);

  // Initialize providers
  const arbitrumProvider = new ethers.WebSocketProvider(config.arbitrumWsUrl);
  const ethereumProvider = new ethers.JsonRpcProvider(config.ethereumRpcUrl);

  // Initialize services (order matters - circular dependency resolution)
  const analytics = new Analytics();
  const batchManager = new BatchManager(analytics);
  const l1Submitter = new L1Submitter(ethereumProvider, batchManager, analytics);
  
  // Wire BatchManager to L1Submitter for automatic batch submission
  batchManager.setL1Submitter(l1Submitter);
  
  const challengeMonitor = new ChallengeMonitor(ethereumProvider, l1Submitter, analytics);
  const eventMonitor = new EventMonitor(arbitrumProvider, batchManager, analytics, l1Submitter);

  // Initialize L1 Submitter (Gnosis Safe SDK)
  logger.info("Initializing L1 submitter...");
  await l1Submitter.initialize();

  // Start services
  logger.info("Starting event monitor on Arbitrum...");
  await eventMonitor.start();

  logger.info("Starting challenge monitor on Ethereum L1...");
  await challengeMonitor.start();

  logger.info("Starting batch processor...");
  await batchManager.startBatchTimer();

  logger.info("✅ Keeper service running");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Shutting down keeper service...");
    await eventMonitor.stop();
    await challengeMonitor.stop();
    await batchManager.stop();
    process.exit(0);
  });

  // Health check endpoint (optional)
  if (config.enableHealthCheck) {
    const express = await import("express");
    const app = express.default();
    
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        uptime: process.uptime(),
        pendingExits: batchManager.getPendingExitCount(),
        lastBatch: batchManager.getLastBatchTimestamp(),
        metrics: analytics.getMetrics()
      });
    });

    app.listen(config.healthCheckPort, () => {
      logger.info(`Health check endpoint: http://localhost:${config.healthCheckPort}/health`);
    });
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
