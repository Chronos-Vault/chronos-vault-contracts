/**
 * Type definitions for Exit-Batch Keeper
 */
// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:28:14.829Z


export interface ExitRequest {
  exitId: string;
  swapId: string;
  sender: string;
  l1Recipient: string;
  amount: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  isPriority: boolean;
}

export interface Batch {
  batchRoot: string;
  exits: ExitRequest[];
  merkleTree: any; // StandardMerkleTree type
  totalValue: bigint;
  submittedAt?: number;
  finalizedAt?: number;
  trinityOperationId?: string;
  ipfsHash?: string;
  arweaveId?: string;
  status: BatchStatus;
}

export enum BatchStatus {
  PENDING = "PENDING",
  SUBMITTED = "SUBMITTED",
  CHALLENGED = "CHALLENGED",
  FINALIZED = "FINALIZED",
  CANCELLED = "CANCELLED",
}

export interface KeeperMetrics {
  totalExitsProcessed: number;
  totalBatchesSubmitted: number;
  totalGasSaved: bigint;
  totalFeesCollected: bigint;
  averageBatchSize: number;
  successRate: number;
  challengesReceived: number;
  challengesResolved: number;
  uptime: number;
}

export interface Challenge {
  batchRoot: string;
  challenger: string;
  reason: string;
  timestamp: number;
  resolved: boolean;
  resolution?: "APPROVED" | "REJECTED";
}
