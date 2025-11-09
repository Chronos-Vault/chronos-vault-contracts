import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { config } from "../config";
import { Analytics } from "./Analytics";
import { ExitRequest, Batch, BatchStatus } from "../types";
import { logger } from "../utils/logger";
import { StorageService } from "./StorageService";

/**
 * @title BatchManager
 * @notice Manages exit accumulation and Merkle tree construction
 */
export class BatchManager {
  private pendingExits: ExitRequest[] = [];
  private currentBatch: Batch | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private analytics: Analytics;
  private storage: StorageService;
  private l1Submitter: any = null; // Will be set after initialization
  private batchInFlight: boolean = false; // Prevents concurrent batch submissions

  constructor(analytics: Analytics) {
    this.analytics = analytics;
    this.storage = new StorageService();
  }

  setL1Submitter(l1Submitter: any): void {
    this.l1Submitter = l1Submitter;
    logger.info("L1Submitter wired to BatchManager");
  }

  async addExit(exit: ExitRequest): Promise<void> {
    this.pendingExits.push(exit);
    logger.debug(`Exit added. Pending: ${this.pendingExits.length}/${config.maxBatchSize}`);

    // Check if batch should be triggered
    if (this.shouldTriggerBatch()) {
      await this.createBatch();
    }
  }

  private shouldTriggerBatch(): boolean {
    if (this.pendingExits.length === 0) {
      return false;
    }

    // Trigger if max batch size reached
    if (this.pendingExits.length >= config.maxBatchSize) {
      logger.info(`Max batch size reached (${config.maxBatchSize})`);
      return true;
    }

    // Check timeout (works regardless of exit count)
    const oldestExit = this.pendingExits[0];
    const hoursWaiting = (Date.now() - oldestExit.timestamp * 1000) / (1000 * 60 * 60);

    if (hoursWaiting >= config.batchTimeoutHours) {
      // LIVENESS FIX: Trigger batch after timeout even if < minBatchSize
      // Low-volume users shouldn't wait forever
      logger.info(`Batch timeout reached (${config.batchTimeoutHours}h with ${this.pendingExits.length} exits)`);
      return true;
    }

    // Trigger if min batch size reached (economical batching)
    if (this.pendingExits.length >= config.minBatchSize) {
      logger.info(`Min batch size reached (${this.pendingExits.length}/${config.minBatchSize})`);
      return true;
    }

    return false;
  }

  async createBatch(): Promise<Batch | null> {
    // CRITICAL: Prevent concurrent batch creation
    if (this.batchInFlight) {
      logger.warn("Batch already in flight, skipping duplicate creation");
      return null;
    }

    if (this.pendingExits.length === 0) {
      logger.warn("No pending exits to batch");
      return null;
    }

    // LIVENESS FIX: Allow batches < minBatchSize after timeout
    // This ensures low-volume users aren't stuck forever
    if (this.pendingExits.length < config.minBatchSize) {
      const oldestExit = this.pendingExits[0];
      const hoursWaiting = (Date.now() - oldestExit.timestamp * 1000) / (1000 * 60 * 60);
      
      if (hoursWaiting < config.batchTimeoutHours) {
        logger.warn(`Insufficient exits for batch (${this.pendingExits.length}/${config.minBatchSize}, ${hoursWaiting.toFixed(1)}h/${config.batchTimeoutHours}h)`);
        return null;
      }
      
      logger.info(`Creating timeout batch with ${this.pendingExits.length} exits (waited ${hoursWaiting.toFixed(1)}h)`);
    }

    // Set in-flight flag to prevent concurrent batches
    this.batchInFlight = true;

    try {
      // CRITICAL: Take snapshot of exits BEFORE building batch
      // Don't clear pendingExits until submission succeeds
      const exitsSnapshot = [...this.pendingExits];
      const snapshotExitIds = new Set(exitsSnapshot.map(e => e.exitId));
      
      const batch = await this.buildBatch(exitsSnapshot, false); // false = don't clear pending
      
      // Automatically submit regular batch to L1 with retry logic
      if (batch && this.l1Submitter) {
        logger.info(`Auto-submitting batch ${batch.batchRoot.slice(0, 10)}... to L1`);
        
        const success = await this.submitWithRetry(batch);
        
        if (success) {
          // CONCURRENCY FIX: Remove ONLY the exits that were in the submitted batch
          // Keep any exits that arrived while the batch was being submitted
          const newExits = this.pendingExits.filter(exit => !snapshotExitIds.has(exit.exitId));
          this.pendingExits = newExits;
          
          logger.info(`Batch submitted. Removed ${exitsSnapshot.length} exits, ${newExits.length} new exits remain in queue`);
        } else {
          logger.error(`Failed to submit batch after retries - exits remain in queue`);
          this.analytics.recordError("batch_submission_failed", new Error("Max retries exceeded"));
        }
      } else if (batch && !this.l1Submitter) {
        logger.error("L1Submitter not initialized - batch created but not submitted!");
      }

      return batch;
    } finally {
      // Always clear in-flight flag, even if batch creation fails
      this.batchInFlight = false;
    }
  }

  private async submitWithRetry(batch: Batch, maxRetries: number = 3): Promise<boolean> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const txHash = await this.l1Submitter.submitBatch(batch);
        
        if (txHash) {
          logger.info(`Batch submitted successfully on attempt ${attempt + 1}`);
          return true;
        }
        
        logger.warn(`Batch submission returned null (attempt ${attempt + 1}/${maxRetries})`);
      } catch (error) {
        logger.error(`Batch submission failed (attempt ${attempt + 1}/${maxRetries}):`, error);
        this.analytics.recordError("batch_submission_attempt", error);
      }
      
      attempt++;
      
      if (attempt < maxRetries) {
        // Exponential backoff: 5s, 10s, 20s
        const backoffMs = 5000 * Math.pow(2, attempt - 1);
        logger.info(`Retrying in ${backoffMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    return false;
  }

  async createPriorityBatch(priorityExit: ExitRequest): Promise<Batch | null> {
    logger.info(`Creating priority batch for exit ${priorityExit.exitId.slice(0, 10)}...`);
    return await this.buildBatch([priorityExit]);
  }

  private async buildBatch(exits: ExitRequest[], clearPending: boolean = true): Promise<Batch | null> {
    try {
      logger.info(`Building batch from ${exits.length} exit(s)...`);

      // Build Merkle tree
      const leaves: [string, string, string][] = exits.map((exit) => [
        exit.exitId,
        exit.l1Recipient,
        exit.amount.toString(),
      ]);

      const merkleTree = StandardMerkleTree.of(leaves, ["bytes32", "address", "uint256"]);
      const batchRoot = merkleTree.root;

      // Calculate total value
      const totalValue = exits.reduce((sum, exit) => sum + exit.amount, 0n);

      // Create batch
      const batch: Batch = {
        batchRoot,
        exits: [...exits],
        merkleTree,
        totalValue,
        status: BatchStatus.PENDING,
      };

      logger.info(`Batch created:`);
      logger.info(`  Root: ${batchRoot.slice(0, 10)}...`);
      logger.info(`  Exits: ${batch.exits.length}`);
      logger.info(`  Total value: ${(Number(totalValue) / 1e18).toFixed(4)} ETH`);

      // Store Merkle tree in IPFS/Arweave
      if (config.enableIpfsStorage || config.enableArweaveStorage) {
        await this.storage.storeMerkleTree(batch);
        logger.info(`  IPFS hash: ${batch.ipfsHash || "N/A"}`);
        logger.info(`  Arweave ID: ${batch.arweaveId || "N/A"}`);
      }

      // SECURITY: Only clear pendingExits if explicitly told (after successful submission)
      // For priority exits, always clear since single-exit batch
      if (clearPending && exits.length === 1) {
        // Priority exit - safe to clear immediately (single exit, immediate submission)
        logger.debug("Priority exit batch - no pending queue to clear");
      }

      this.currentBatch = batch;

      // Update analytics
      this.analytics.recordBatchCreated(batch);

      return batch;
    } catch (error) {
      logger.error("Error building batch:", error);
      this.analytics.recordError("batch_creation", error);
      return null;
    }
  }

  async startBatchTimer(): Promise<void> {
    // Check every 30 minutes if batch should be triggered
    this.batchTimer = setInterval(async () => {
      if (this.shouldTriggerBatch()) {
        await this.createBatch();
      }
    }, 30 * 60 * 1000); // 30 minutes

    logger.info("Batch timer started (checking every 30 minutes)");
  }

  async stop(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  getCurrentBatch(): Batch | null {
    return this.currentBatch;
  }

  getPendingExitCount(): number {
    return this.pendingExits.length;
  }

  getLastBatchTimestamp(): number {
    return this.currentBatch?.submittedAt || 0;
  }

  clearCurrentBatch(): void {
    this.currentBatch = null;
  }
}
