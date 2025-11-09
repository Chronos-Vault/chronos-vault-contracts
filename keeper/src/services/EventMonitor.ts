import { ethers } from "ethers";
import { config } from "../config";
import { BatchManager } from "./BatchManager";
import { Analytics } from "./Analytics";
import { L1Submitter } from "./L1Submitter";
import { ExitRequest } from "../types";
import { logger } from "../utils/logger";

/**
 * @title EventMonitor
 * @notice Monitors Arbitrum for ExitRequested events from HTLCArbToL1 contract
 */
export class EventMonitor {
  private provider: ethers.WebSocketProvider;
  private contract: ethers.Contract;
  private batchManager: BatchManager;
  private analytics: Analytics;
  private l1Submitter: L1Submitter;
  private listening: boolean = false;

  // Event and Function ABI
  private readonly EVENT_ABI = [
    "event ExitRequested(bytes32 indexed exitId, bytes32 indexed swapId, address indexed sender, address l1Recipient, uint256 amount, uint256 timestamp)",
    "event PriorityExitProcessed(bytes32 indexed exitId, address indexed sender, uint256 fee)",
    "function getExitRequest(bytes32 exitId) external view returns (tuple(bytes32 swapId, address sender, address l1Recipient, uint256 amount, uint256 timestamp, uint8 state, bool isPriority))",
  ];

  constructor(
    provider: ethers.WebSocketProvider,
    batchManager: BatchManager,
    analytics: Analytics,
    l1Submitter: L1Submitter
  ) {
    this.provider = provider;
    this.batchManager = batchManager;
    this.analytics = analytics;
    this.l1Submitter = l1Submitter;

    this.contract = new ethers.Contract(
      config.htlcArbToL1Address,
      this.EVENT_ABI,
      provider
    );
  }

  async start(): Promise<void> {
    if (this.listening) {
      logger.warn("EventMonitor already running");
      return;
    }

    logger.info("Starting EventMonitor...");

    // Listen for ExitRequested events
    this.contract.on("ExitRequested", this.handleExitRequested.bind(this));

    // Listen for PriorityExitProcessed events
    this.contract.on("PriorityExitProcessed", this.handlePriorityExit.bind(this));

    // Monitor connection
    this.provider.on("error", (error) => {
      logger.error("WebSocket error:", error);
      this.reconnect();
    });

    this.listening = true;
    logger.info("✅ EventMonitor started");
  }

  async stop(): Promise<void> {
    if (!this.listening) return;

    logger.info("Stopping EventMonitor...");
    this.contract.removeAllListeners();
    await this.provider.destroy();
    this.listening = false;
    logger.info("EventMonitor stopped");
  }

  private async handleExitRequested(
    exitId: string,
    swapId: string,
    sender: string,
    l1Recipient: string,
    amount: bigint,
    timestamp: bigint,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      logger.info(`New exit request: ${exitId.slice(0, 10)}...`);
      logger.debug(`  Sender: ${sender}`);
      logger.debug(`  L1 Recipient: ${l1Recipient}`);
      logger.debug(`  Amount: ${ethers.formatEther(amount)} ETH`);

      const exitRequest: ExitRequest = {
        exitId,
        swapId,
        sender,
        l1Recipient,
        amount,
        timestamp: Number(timestamp),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        isPriority: false,
      };

      // Add to batch manager
      await this.batchManager.addExit(exitRequest);

      // Update analytics
      this.analytics.recordExitRequested(exitRequest);

      logger.info(`Exit ${exitId.slice(0, 10)}... added to pending batch`);
    } catch (error) {
      logger.error("Error handling ExitRequested event:", error);
      this.analytics.recordError("exit_requested_handler", error);
    }
  }

  private async handlePriorityExit(
    exitId: string,
    sender: string,
    fee: bigint,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      logger.info(`Priority exit detected: ${exitId.slice(0, 10)}...`);
      logger.debug(`  Sender: ${sender}`);
      logger.debug(`  Fee: ${ethers.formatEther(fee)} ETH (2x normal)`);

      // Fetch exit details from contract
      const htlcContract = this.contract as any;
      const exit = await htlcContract.getExitRequest(exitId);

      const priorityExit: ExitRequest = {
        exitId,
        swapId: exit.swapId,
        sender: exit.sender,
        l1Recipient: exit.l1Recipient,
        amount: exit.amount,
        timestamp: Number(exit.timestamp),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        isPriority: true,
      };

      // Priority exits bypass batching - create single-exit batch and submit immediately
      const priorityBatch = await this.batchManager.createPriorityBatch(priorityExit);
      
      if (priorityBatch) {
        logger.info(`Submitting priority exit ${exitId.slice(0, 10)}... to L1 immediately`);
        await this.l1Submitter.submitBatch(priorityBatch);
      }

      this.analytics.recordPriorityExit(exitId, fee);

      logger.info(`Priority exit ${exitId.slice(0, 10)}... submitted to L1`);
    } catch (error) {
      logger.error("Error handling PriorityExitProcessed event:", error);
      this.analytics.recordError("priority_exit_handler", error);
    }
  }

  private async reconnect(): Promise<void> {
    logger.warn("Attempting to reconnect WebSocket...");
    this.listening = false;

    try {
      await this.stop();
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s
      await this.start();
      logger.info("WebSocket reconnected successfully");
    } catch (error) {
      logger.error("Failed to reconnect:", error);
      // Retry after 30s
      setTimeout(() => this.reconnect(), 30000);
    }
  }
}
