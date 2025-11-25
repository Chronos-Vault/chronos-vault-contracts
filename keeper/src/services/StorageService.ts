// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:28:13.530Z
import { create as ipfsCreate } from "ipfs-http-client";
import Arweave from "arweave";
import { config } from "../config";
import { Batch } from "../types";
import { logger } from "../utils/logger";

/**
 * @title StorageService
 * @notice Handles IPFS and Arweave storage for Merkle trees
 */
export class StorageService {
  private ipfsClient: any = null;
  private arweaveClient: Arweave | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize IPFS client
    if (config.enableIpfsStorage && config.ipfsApiUrl) {
      try {
        this.ipfsClient = ipfsCreate({
          url: config.ipfsApiUrl,
          headers: config.ipfsApiKey
            ? { authorization: `Bearer ${config.ipfsApiKey}` }
            : undefined,
        });
        logger.info("IPFS client initialized");
      } catch (error) {
        logger.error("Failed to initialize IPFS client:", error);
      }
    }

    // Initialize Arweave client
    if (config.enableArweaveStorage) {
      try {
        this.arweaveClient = Arweave.init({
          host: new URL(config.arweaveApiUrl).hostname,
          port: 443,
          protocol: "https",
        });
        logger.info("Arweave client initialized");
      } catch (error) {
        logger.error("Failed to initialize Arweave client:", error);
      }
    }
  }

  async storeMerkleTree(batch: Batch): Promise<void> {
    const treeData = JSON.stringify(batch.merkleTree.dump());

    // Store in IPFS
    if (this.ipfsClient) {
      try {
        const result = await this.ipfsClient.add(treeData);
        batch.ipfsHash = result.cid.toString();
        logger.info(`Merkle tree stored in IPFS: ${batch.ipfsHash}`);
      } catch (error) {
        logger.error("IPFS storage failed:", error);
      }
    }

    // Store in Arweave
    if (this.arweaveClient && config.arweavePrivateKey) {
      try {
        const key = JSON.parse(config.arweavePrivateKey);
        const transaction = await this.arweaveClient.createTransaction(
          { data: treeData },
          key
        );

        // Add tags
        transaction.addTag("App-Name", "Trinity-Exit-Batch");
        transaction.addTag("Content-Type", "application/json");
        transaction.addTag("Batch-Root", batch.batchRoot);

        await this.arweaveClient.transactions.sign(transaction, key);
        await this.arweaveClient.transactions.post(transaction);

        batch.arweaveId = transaction.id;
        logger.info(`Merkle tree stored in Arweave: ${batch.arweaveId}`);
      } catch (error) {
        logger.error("Arweave storage failed:", error);
      }
    }
  }

  async retrieveMerkleTree(ipfsHash?: string, arweaveId?: string): Promise<any> {
    // Try IPFS first
    if (ipfsHash && this.ipfsClient) {
      try {
        const chunks = [];
        for await (const chunk of this.ipfsClient.cat(ipfsHash)) {
          chunks.push(chunk);
        }
        const data = Buffer.concat(chunks).toString();
        return JSON.parse(data);
      } catch (error) {
        logger.error("IPFS retrieval failed:", error);
      }
    }

    // Fallback to Arweave
    if (arweaveId && this.arweaveClient) {
      try {
        const data = await this.arweaveClient.transactions.getData(arweaveId, {
          decode: true,
          string: true,
        });
        return JSON.parse(data as string);
      } catch (error) {
        logger.error("Arweave retrieval failed:", error);
      }
    }

    throw new Error("Failed to retrieve Merkle tree from storage");
  }
}
