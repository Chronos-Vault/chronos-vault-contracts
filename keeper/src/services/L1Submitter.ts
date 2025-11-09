import { ethers } from "ethers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import { MetaTransactionData } from "@safe-global/safe-core-sdk-types";
import { config } from "../config";
import { BatchManager } from "./BatchManager";
import { Analytics } from "./Analytics";
import { Batch, BatchStatus } from "../types";
import { logger } from "../utils/logger";

/**
 * @title L1Submitter
 * @notice Submits batches to Ethereum L1 via Gnosis Safe multisig
 */
export class L1Submitter {
  private provider: ethers.JsonRpcProvider;
  private batchManager: BatchManager;
  private analytics: Analytics;
  private safeSDK: Safe | null = null;

  // TrinityExitGateway ABI
  private readonly GATEWAY_ABI = [
    "function submitBatch(bytes32 batchRoot, uint256 exitCount, bytes32[] calldata trinityProof, bytes32 trinityOperationId) external payable",
    "function finalizeBatch(bytes32 batchRoot) external",
    "function getBatch(bytes32 batchRoot) external view returns (tuple(uint8 state, uint256 exitCount, uint256 totalValue, uint256 finalizedAt, bytes32 trinityOperationId, string challengeReason))",
  ];

  constructor(
    provider: ethers.JsonRpcProvider,
    batchManager: BatchManager,
    analytics: Analytics
  ) {
    this.provider = provider;
    this.batchManager = batchManager;
    this.analytics = analytics;
  }

  async initialize(): Promise<void> {
    if (config.gnosisSafeAddress) {
      try {
        logger.info("Initializing Gnosis Safe SDK...");
        
        const signer = new ethers.Wallet(config.keeperPrivateKey, this.provider);
        const ethAdapter = new EthersAdapter({
          ethers,
          signerOrProvider: signer,
        });

        this.safeSDK = await Safe.create({
          ethAdapter,
          safeAddress: config.gnosisSafeAddress,
        });

        logger.info(`✅ Gnosis Safe initialized: ${config.gnosisSafeAddress}`);
      } catch (error) {
        logger.error("Failed to initialize Gnosis Safe:", error);
        throw error;
      }
    } else {
      logger.warn("No Gnosis Safe address - using direct wallet submission (UNSAFE for production)");
    }
  }

  async submitBatch(batch: Batch): Promise<string | null> {
    try {
      logger.info(`Submitting batch ${batch.batchRoot.slice(0, 10)}... to L1`);

      // Generate Trinity consensus proof (MVP: placeholder)
      const trinityProof = this.generateTrinityProof(batch);
      const trinityOpId = ethers.keccak256(
        ethers.toUtf8Bytes(`trinity_batch_${Date.now()}`)
      );

      // Check gas price
      const feeData = await this.provider.getFeeData();
      const gasPriceGwei = Number(feeData.gasPrice || 0n) / 1e9;

      if (gasPriceGwei > config.maxGasPriceGwei) {
        logger.warn(`Gas price too high (${gasPriceGwei} gwei > ${config.maxGasPriceGwei} gwei max). Waiting...`);
        return null;
      }

      logger.info(`Gas price: ${gasPriceGwei.toFixed(2)} gwei`);

      // Encode submitBatch call
      const gateway = new ethers.Interface(this.GATEWAY_ABI);
      const callData = gateway.encodeFunctionData("submitBatch", [
        batch.batchRoot,
        batch.exits.length,
        trinityProof,
        trinityOpId,
      ]);

      let txHash: string;

      if (this.safeSDK) {
        // Submit via Gnosis Safe multisig
        txHash = await this.submitViaGnosisSafe(callData, batch.totalValue);
      } else {
        // Direct wallet submission (DEV ONLY)
        txHash = await this.submitDirectly(callData, batch.totalValue);
      }

      // Update batch status
      batch.status = BatchStatus.SUBMITTED;
      batch.trinityOperationId = trinityOpId;
      batch.submittedAt = Date.now();

      logger.info(`✅ Batch submitted to L1`);
      logger.info(`  Transaction: ${txHash}`);
      logger.info(`  Trinity Op ID: ${trinityOpId.slice(0, 10)}...`);

      // Update analytics
      this.analytics.recordBatchSubmitted(batch, txHash);

      // Clear current batch
      this.batchManager.clearCurrentBatch();

      return txHash;
    } catch (error) {
      logger.error("Error submitting batch:", error);
      this.analytics.recordError("batch_submission", error);
      return null;
    }
  }

  private async submitViaGnosisSafe(
    callData: string,
    value: bigint
  ): Promise<string> {
    if (!this.safeSDK) {
      throw new Error("Gnosis Safe SDK not initialized");
    }

    logger.info("Creating Gnosis Safe transaction...");

    const safeTransaction: MetaTransactionData = {
      to: config.trinityExitGatewayAddress,
      value: value.toString(),
      data: callData,
    };

    const safeTx = await this.safeSDK.createTransaction({
      transactions: [safeTransaction],
    });

    // Sign transaction
    const signedTx = await this.safeSDK.signTransaction(safeTx);

    logger.info("Gnosis Safe transaction signed. Awaiting additional signatures...");
    logger.info(`Safe TX hash: ${await this.safeSDK.getTransactionHash(safeTx)}`);

    // NOTE: In production, other signers must approve via Gnosis Safe UI
    // For MVP/testing, we can execute immediately if threshold is 1
    const threshold = await this.safeSDK.getThreshold();

    if (threshold === 1) {
      logger.info("Threshold is 1, executing immediately...");
      const executeTxResponse = await this.safeSDK.executeTransaction(signedTx);
      const receipt = await executeTxResponse.transactionResponse?.wait();
      return receipt?.hash || "";
    }

    // Return Safe TX hash for multi-sig tracking
    return await this.safeSDK.getTransactionHash(safeTx);
  }

  private async submitDirectly(callData: string, value: bigint): Promise<string> {
    logger.warn("⚠️  Using direct wallet submission (NOT SAFE for production)");

    const signer = new ethers.Wallet(config.keeperPrivateKey, this.provider);
    const gateway = new ethers.Contract(
      config.trinityExitGatewayAddress,
      this.GATEWAY_ABI,
      signer
    );

    // Decode callData to extract parameters
    const iface = new ethers.Interface(this.GATEWAY_ABI);
    const decoded = iface.parseTransaction({ data: callData });
    
    if (!decoded) {
      throw new Error("Failed to decode callData");
    }

    const [batchRoot, exitCount, trinityProof, trinityOpId] = decoded.args;

    const tx = await gateway.submitBatch(
      batchRoot,
      exitCount,
      trinityProof,
      trinityOpId,
      {
        value,
        gasLimit: Math.floor(500000 * config.gasLimitBuffer),
      }
    );

    const receipt = await tx.wait();
    return receipt!.hash;
  }

  private generateTrinityProof(batch: Batch): string[] {
    // MVP: Placeholder proof (trusted keeper)
    // PRODUCTION: Get 2-of-3 signatures from Trinity validators
    logger.debug("Generating Trinity consensus proof (MVP: trusted keeper)");
    return ["0x" + "00".repeat(32)];
  }

  async finalizeBatch(batchRoot: string): Promise<void> {
    try {
      logger.info(`Finalizing batch ${batchRoot.slice(0, 10)}...`);

      const signer = new ethers.Wallet(config.keeperPrivateKey, this.provider);
      const gateway = new ethers.Contract(
        config.trinityExitGatewayAddress,
        this.GATEWAY_ABI,
        signer
      );

      const tx = await gateway.finalizeBatch(batchRoot);
      await tx.wait();

      logger.info(`✅ Batch ${batchRoot.slice(0, 10)}... finalized`);
      this.analytics.recordBatchFinalized(batchRoot);
    } catch (error) {
      logger.error("Error finalizing batch:", error);
      this.analytics.recordError("batch_finalization", error);
    }
  }
}
