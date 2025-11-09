import { ExitRequest, Batch, Challenge, KeeperMetrics } from "../types";
import { logger } from "../utils/logger";

/**
 * @title Analytics
 * @notice Tracks keeper performance metrics and gas savings
 */
export class Analytics {
  private metrics: KeeperMetrics = {
    totalExitsProcessed: 0,
    totalBatchesSubmitted: 0,
    totalGasSaved: 0n,
    totalFeesCollected: 0n,
    averageBatchSize: 0,
    successRate: 100,
    challengesReceived: 0,
    challengesResolved: 0,
    uptime: 0,
  };

  private startTime: number = Date.now();
  private batchSizes: number[] = [];
  private errors: Map<string, number> = new Map();

  recordExitRequested(exit: ExitRequest): void {
    this.metrics.totalExitsProcessed++;
    logger.debug(`Total exits processed: ${this.metrics.totalExitsProcessed}`);
  }

  recordPriorityExit(exitId: string, fee: bigint): void {
    this.metrics.totalFeesCollected += fee;
    logger.debug(`Priority exit ${exitId.slice(0, 10)}... - Fee: ${fee.toString()}`);
  }

  recordBatchCreated(batch: Batch): void {
    this.batchSizes.push(batch.exits.length);
    this.metrics.averageBatchSize = this.calculateAverage(this.batchSizes);

    logger.debug(`Batch created with ${batch.exits.length} exits`);
  }

  recordBatchSubmitted(batch: Batch, txHash: string): void {
    this.metrics.totalBatchesSubmitted++;

    // Calculate gas savings
    // Individual L1 locks: 100,000 gas each
    // Batch submission: ~200,000 gas (amortized across users)
    const individualGas = BigInt(batch.exits.length * 100000);
    const batchGas = BigInt(200000 + batch.exits.length * 80000); // submission + claims
    const gasSaved = individualGas - batchGas;

    this.metrics.totalGasSaved += gasSaved;

    logger.info(`Batch submitted. Gas saved: ${gasSaved.toString()}`);
  }

  recordBatchFinalized(batchRoot: string): void {
    logger.debug(`Batch ${batchRoot.slice(0, 10)}... finalized`);
  }

  recordBatchCancelled(batchRoot: string, refundAmount: bigint): void {
    // Decrease success rate
    const total = this.metrics.totalBatchesSubmitted;
    const failed = total - Math.floor(total * (this.metrics.successRate / 100));
    this.metrics.successRate = ((total - failed - 1) / total) * 100;

    logger.warn(`Batch cancelled. Success rate: ${this.metrics.successRate.toFixed(2)}%`);
  }

  recordChallenge(challenge: Challenge): void {
    this.metrics.challengesReceived++;
    logger.warn(`Challenge received. Total challenges: ${this.metrics.challengesReceived}`);
  }

  recordChallengeResolved(batchRoot: string, approved: boolean, resolution: string): void {
    this.metrics.challengesResolved++;
    logger.info(`Challenge resolved (${approved ? "APPROVED" : "REJECTED"}). Total resolved: ${this.metrics.challengesResolved}`);
  }

  recordError(context: string, error: any): void {
    const count = this.errors.get(context) || 0;
    this.errors.set(context, count + 1);
    logger.error(`Error in ${context} (count: ${count + 1}):`, error);
  }

  getMetrics(): KeeperMetrics {
    this.metrics.uptime = (Date.now() - this.startTime) / 1000; // seconds
    return { ...this.metrics };
  }

  printMetrics(): void {
    const metrics = this.getMetrics();

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 KEEPER METRICS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Exits Processed:    ${metrics.totalExitsProcessed}`);
    console.log(`Total Batches Submitted:  ${metrics.totalBatchesSubmitted}`);
    console.log(`Average Batch Size:       ${metrics.averageBatchSize.toFixed(1)}`);
    console.log(`Total Gas Saved:          ${metrics.totalGasSaved.toString()}`);
    console.log(`Total Fees Collected:     ${metrics.totalFeesCollected.toString()}`);
    console.log(`Success Rate:             ${metrics.successRate.toFixed(2)}%`);
    console.log(`Challenges Received:      ${metrics.challengesReceived}`);
    console.log(`Challenges Resolved:      ${metrics.challengesResolved}`);
    console.log(`Uptime:                   ${(metrics.uptime / 3600).toFixed(2)} hours`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (this.errors.size > 0) {
      console.log("⚠️  ERRORS:");
      this.errors.forEach((count, context) => {
        console.log(`  ${context}: ${count}`);
      });
      console.log();
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}
