// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:28:05.384Z
import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Environment
  environment: process.env.NODE_ENV || "development",

  // RPC Endpoints
  arbitrumRpcUrl: process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
  arbitrumWsUrl: process.env.ARBITRUM_WS_URL || "wss://sepolia-rollup.arbitrum.io/ws",
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL || "https://sepolia.infura.io/v3/YOUR_KEY",

  // Contract Addresses
  htlcArbToL1Address: process.env.HTLC_ARB_TO_L1_ADDRESS || "",
  trinityExitGatewayAddress: process.env.TRINITY_EXIT_GATEWAY_ADDRESS || "",

  // Gnosis Safe Configuration
  gnosisSafeAddress: process.env.GNOSIS_SAFE_ADDRESS || "",
  gnosisSafeApiUrl: process.env.GNOSIS_SAFE_API_URL || "https://safe-transaction-sepolia.safe.global",
  keeperPrivateKey: process.env.KEEPER_PRIVATE_KEY || "",

  // Batching Configuration
  minBatchSize: parseInt(process.env.MIN_BATCH_SIZE || "50"),
  maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || "200"),
  batchTimeoutHours: parseInt(process.env.BATCH_TIMEOUT_HOURS || "6"),

  // Storage Configuration
  ipfsApiUrl: process.env.IPFS_API_URL || "https://ipfs.infura.io:5001",
  ipfsApiKey: process.env.IPFS_API_KEY || "",
  arweaveApiUrl: process.env.ARWEAVE_API_URL || "https://arweave.net",
  arweavePrivateKey: process.env.ARWEAVE_PRIVATE_KEY || "",

  // Monitoring
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
  healthCheckPort: parseInt(process.env.HEALTH_CHECK_PORT || "3001"),
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL || "",

  // Gas Configuration
  maxGasPriceGwei: parseInt(process.env.MAX_GAS_PRICE_GWEI || "50"),
  gasLimitBuffer: parseFloat(process.env.GAS_LIMIT_BUFFER || "1.2"),

  // Database (optional - for persistent storage)
  databaseUrl: process.env.DATABASE_URL || "",

  // Feature Flags
  enableIpfsStorage: process.env.ENABLE_IPFS_STORAGE === "true",
  enableArweaveStorage: process.env.ENABLE_ARWEAVE_STORAGE === "true",
  enableAutoChallenge: process.env.ENABLE_AUTO_CHALLENGE === "true",
};

// Validate critical config
if (!config.htlcArbToL1Address) {
  throw new Error("HTLC_ARB_TO_L1_ADDRESS is required");
}

if (!config.trinityExitGatewayAddress) {
  throw new Error("TRINITY_EXIT_GATEWAY_ADDRESS is required");
}

if (!config.gnosisSafeAddress && config.environment === "production") {
  throw new Error("GNOSIS_SAFE_ADDRESS is required for production");
}

if (!config.keeperPrivateKey) {
  throw new Error("KEEPER_PRIVATE_KEY is required");
}
