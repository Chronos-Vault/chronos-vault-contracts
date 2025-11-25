// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:28:09.702Z
import { ethers } from "ethers";
import { config } from "../config";
import { L1Submitter } from "./L1Submitter";
import { Analytics } from "./Analytics";
import { Challenge } from "../types";
import { logger } from "../utils/logger";

/**
 * @title ChallengeMonitor
 * @notice Monitors L1 for batch challenges and auto-responds
 */
export class ChallengeMonitor {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private l1Submitter: L1Submitter;
  private analytics: Analytics;
  private listening: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  // Event ABI
  private readonly EVENT_ABI = [
    "event BatchChallenged(bytes32 indexed batchRoot, address indexed challenger, string reason, uint256 timestamp)",
    "event ChallengeResolved(bytes32 indexed batchRoot, bool approved, string resolution, uint256 timestamp)",
    "event BatchFinalized(bytes32 indexed batchRoot, uint256 timestamp)",
    "event BatchCancelled(bytes32 indexed batchRoot, uint256 refundAmount, uint256 timestamp)",
  ];

  constructor(
    provider: ethers.JsonRpcProvider,
    l1Submitter: L1Submitter,
    analytics: Analytics
  ) {
    this.provider = provider;
    this.l1Submitter = l1Submitter;
    this.analytics = analytics;

    this.contract = new ethers.Contract(
      config.trinityExitGatewayAddress,
      this.EVENT_ABI,
      provider
    );
  }

  async start(): Promise<void> {
    if (this.listening) {
      logger.warn("ChallengeMonitor already running");
      return;
    }

    logger.info("Starting ChallengeMonitor...");

    // Listen for challenge events
    this.contract.on("BatchChallenged", this.handleBatchChallenged.bind(this));
    this.contract.on("ChallengeResolved", this.handleChallengeResolved.bind(this));
    this.contract.on("BatchFinalized", this.handleBatchFinalized.bind(this));
    this.contract.on("BatchCancelled", this.handleBatchCancelled.bind(this));

    // Poll for pending batches to finalize
    this.startFinalizationPoller();

    this.listening = true;
    logger.info("✅ ChallengeMonitor started");
  }

  async stop(): Promise<void> {
    if (!this.listening) return;

    logger.info("Stopping ChallengeMonitor...");
    this.contract.removeAllListeners();

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.listening = false;
    logger.info("ChallengeMonitor stopped");
  }

  private async handleBatchChallenged(
    batchRoot: string,
    challenger: string,
    reason: string,
    timestamp: bigint,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      logger.warn(`⚠️  Batch challenged: ${batchRoot.slice(0, 10)}...`);
      logger.warn(`  Challenger: ${challenger}`);
      logger.warn(`  Reason: ${reason}`);

      const challenge: Challenge = {
        batchRoot,
        challenger,
        reason,
        timestamp: Number(timestamp),
        resolved: false,
      };

      // Record in analytics
      this.analytics.recordChallenge(challenge);

      // Alert keeper operators
      await this.sendAlert({
        type: "BATCH_CHALLENGED",
        batchRoot,
        challenger,
        reason,
        timestamp: Number(timestamp),
      });

      // Auto-respond if enabled
      if (config.enableAutoChallenge) {
        await this.autoRespondToChallenge(challenge);
      } else {
        logger.info("Auto-challenge disabled. Manual review required.");
      }
    } catch (error) {
      logger.error("Error handling BatchChallenged event:", error);
      this.analytics.recordError("challenge_handler", error);
    }
  }

  private async autoRespondToChallenge(challenge: Challenge): Promise<void> {
    try {
      logger.info(`Auto-responding to challenge on ${challenge.batchRoot.slice(0, 10)}...`);

      // Validate batch data (check Merkle tree, exit data)
      const isValid = await this.validateBatchData(challenge.batchRoot);

      if (isValid) {
        logger.info("Batch data is valid. Rejecting challenge...");
        // TODO: Call TrinityExitGateway.resolveChallenge(batchRoot, false, "Challenge invalid")
      } else {
        logger.warn("Batch data is INVALID. Accepting challenge and cancelling batch...");
        // TODO: Call TrinityExitGateway.resolveChallenge(batchRoot, true, "Challenge valid")
      }
    } catch (error) {
      logger.error("Error auto-responding to challenge:", error);
      await this.sendAlert({
        type: "AUTO_CHALLENGE_FAILED",
        batchRoot: challenge.batchRoot,
        error: String(error),
      });
    }
  }

  private async validateBatchData(batchRoot: string): Promise<boolean> {
    // TODO: Implement batch validation
    // - Fetch Merkle tree from IPFS
    // - Verify exit data matches on-chain HTLC records
    // - Check Trinity consensus proofs
    logger.debug(`Validating batch ${batchRoot.slice(0, 10)}...`);
    return true; // MVP: Assume valid
  }

  private async handleChallengeResolved(
    batchRoot: string,
    approved: boolean,
    resolution: string,
    timestamp: bigint
  ): Promise<void> {
    logger.info(`Challenge resolved for ${batchRoot.slice(0, 10)}...`);
    logger.info(`  Approved: ${approved}`);
    logger.info(`  Resolution: ${resolution}`);

    this.analytics.recordChallengeResolved(batchRoot, approved, resolution);
  }

  private async handleBatchFinalized(
    batchRoot: string,
    timestamp: bigint
  ): Promise<void> {
    logger.info(`✅ Batch finalized: ${batchRoot.slice(0, 10)}...`);
    this.analytics.recordBatchFinalized(batchRoot);
  }

  private async handleBatchCancelled(
    batchRoot: string,
    refundAmount: bigint,
    timestamp: bigint
  ): Promise<void> {
    logger.warn(`Batch cancelled: ${batchRoot.slice(0, 10)}...`);
    logger.warn(`  Refund amount: ${ethers.formatEther(refundAmount)} ETH`);

    this.analytics.recordBatchCancelled(batchRoot, refundAmount);

    await this.sendAlert({
      type: "BATCH_CANCELLED",
      batchRoot,
      refundAmount: ethers.formatEther(refundAmount),
    });
  }

  private startFinalizationPoller(): void {
    // Poll every 10 minutes to check for batches ready to finalize
    this.pollingInterval = setInterval(async () => {
      // TODO: Fetch pending batches and finalize if challenge period passed
      logger.debug("Checking for batches ready to finalize...");
    }, 10 * 60 * 1000); // 10 minutes

    logger.info("Finalization poller started (checking every 10 minutes)");
  }

  private async sendAlert(data: any): Promise<void> {
    if (!config.alertWebhookUrl) return;

    try {
      await fetch(config.alertWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          service: "exit-batch-keeper",
          ...data,
        }),
      });

      logger.debug("Alert sent:", data.type);
    } catch (error) {
      logger.error("Failed to send alert:", error);
    }
  }
}
