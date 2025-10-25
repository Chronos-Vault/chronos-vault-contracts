# Trinity Protocol Cross-Chain Relayer

## Overview

The Trinity Relayer is the critical off-chain service that enables 2-of-3 consensus across Ethereum/Arbitrum, Solana, and TON blockchains. It monitors vault operations on all three chains and relays cryptographic proofs to enforce mathematical consensus.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Ethereum   │     │   Solana    │     │     TON     │
│  (Arbitrum) │     │  (Devnet)   │     │  (Testnet)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ ProofGenerated    │ Instruction       │ Message
       │ Events            │ Logs              │ Events
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Trinity   │
                    │   Relayer   │
                    │   Service   │
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
submitChainVerification  submitProof    submitVerification
   (Ethereum)             (Solana)          (TON)
```

## How It Works

### 1. Event Monitoring

The relayer continuously polls all three blockchains:

**Ethereum/Arbitrum:**
- Monitors `ProofGenerated` events from ChronosVaultOptimized.sol
- Extracts Merkle proofs, operation details, and nonces

**Solana:**
- Queries transactions for the Chronos Vault program
- Parses Ed25519 signatures from instruction logs

**TON:**
- Fetches recent transactions for the Chronos Vault contract
- Extracts quantum-resistant Dilithium-5 signatures

### 2. Proof Transformation

Each blockchain generates proofs in its native format:
- **Ethereum**: Merkle tree proofs (Keccak256)
- **Solana**: Ed25519 signatures
- **TON**: Dilithium-5 quantum-resistant signatures

The relayer transforms these into a universal `CrossChainProof` format:

```typescript
interface CrossChainProof {
  proofVersion: number;
  sourceChainId: ChainId; // 1=ETH, 2=SOL, 3=TON
  destinationChainId: ChainId;
  operationType: OperationType;
  operationId: string;
  vaultId: string;
  timestamp: number;
  blockNumber: number;
  amount: string;
  proofType: number; // 1=Merkle, 2=Ed25519, 3=Quantum
  proofData: string;
  nonce: number;
}
```

### 3. Proof Submission

For each vault operation, the relayer submits proofs to the **other two chains**:

- **Ethereum operation** → Submit to Solana + TON
- **Solana operation** → Submit to Ethereum + TON
- **TON operation** → Submit to Ethereum + Solana

This ensures every chain receives cryptographic proof from the other two chains.

### 4. 2-of-3 Consensus Enforcement

Each blockchain validates incoming proofs and updates its consensus state:

```solidity
// On Ethereum
struct ConsensusState {
    bool ethereumVerified;
    bool solanaVerified;
    bool tonVerified;
    uint256 verificationCount;
}

// Require 2-of-3 consensus before allowing withdrawals
require(state.verificationCount >= 2, "Insufficient consensus");
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install ethers @solana/web3.js @ton/ton
```

### 2. Configure Environment Variables

Create a `.env` file:

```bash
# Ethereum/Arbitrum
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
VAULT_CONTRACT_ADDRESS=0xYourVaultAddress
BRIDGE_CONTRACT_ADDRESS=0x83DeAbA0de5252c74E1ac64EDEc25aDab3c50859
PRIVATE_KEY=your_ethereum_private_key

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_VAULT_PROGRAM=ChronoSVauLt11111111111111111111111111111111
SOLANA_BRIDGE_PROGRAM=6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK
USER_WALLET_PRIVATE_KEY=your_solana_private_key_base64

# TON
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC
TON_VAULT_ADDRESS=EQDJAnXDPT-NivritpEhQeP0XmG20NdeUtxgh4nUiWH-DF7M
TON_PRIVATE_KEY=your_ton_private_key
```

### 3. Run the Relayer

```bash
# Development mode
npm run relayer

# Production mode with PM2
pm2 start validators/trinity-relayer.ts --name trinity-relayer
pm2 logs trinity-relayer
```

## Monitoring

### View Relayer Status

The relayer provides real-time status:

```typescript
const relayer = new TrinityRelayer();
const status = relayer.getStatus();

console.log(status);
// {
//   isRunning: true,
//   processedProofs: 147,
//   nonces: {
//     ethereum: 52,
//     solana: 48,
//     ton: 47
//   },
//   lastProcessedBlocks: {
//     1: 1234567, // Ethereum
//     2: 8901234, // Solana
//     3: 4567890  // TON
//   }
// }
```

### Logs

The relayer outputs detailed logs:

```
🚀 Trinity Relayer Service Started
📡 Monitoring all 3 chains for vault operations...

🔷 [ETHEREUM] New proof detected: 0xabc123...
   Operation Type: 2 (Deposit)
   Amount: 10.5 ETH
   ➡️  Submitting to Solana...
   ✅ Submitted to Solana: signature_xyz
   ➡️  Submitting to TON...
   ✅ Submitted to TON: tx_hash_456

🟣 [SOLANA] Processing transaction: sig_789...
   ➡️  Submitting to Ethereum...
   ✅ Submitted to Ethereum: 0xdef456...
   ➡️  Submitting to TON...
   ✅ Submitted to TON: tx_hash_789
```

## Nonce Management

The relayer maintains sequential nonces for each chain to prevent replay attacks:

- Nonces are stored in `relayer-nonces.json`
- Each chain has an independent nonce sequence
- Nonces increment with each proof submission
- Nonces are persisted to disk to survive restarts

## Error Handling

The relayer implements robust error handling:

1. **Connection Failures**: Automatic retry with exponential backoff
2. **Invalid Proofs**: Skip and log error without crashing
3. **Transaction Failures**: Retry up to 3 times before marking as failed
4. **Chain Reorganizations**: Re-process blocks if detected

## Security Considerations

### 1. Private Key Management

**Critical**: The relayer holds private keys for all three chains. Production deployment should use:
- Hardware Security Modules (HSM)
- AWS KMS or Google Cloud KMS
- Multi-signature relayer setup (3-of-5 relayer nodes)

### 2. Proof Validation

The relayer validates proofs before submission:
- Signature verification
- Timestamp checks (reject proofs older than 1 hour)
- Nonce sequence validation
- Merkle root verification against trusted roots

### 3. Rate Limiting

To prevent DoS attacks:
- Max 100 proofs processed per minute
- Circuit breaker activates if error rate exceeds 20%
- Automatic pause if gas prices spike above threshold

## Performance Metrics

Expected performance on production hardware:

- **Polling Interval**: 5 seconds
- **Proof Latency**: 10-30 seconds (chain to chain)
- **Throughput**: 100 proofs/minute
- **Gas Cost**: ~0.01 ETH per proof submission
- **Memory Usage**: ~200 MB
- **CPU Usage**: ~5% (single core)

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Private keys stored in HSM/KMS
- [ ] Monitoring alerts configured
- [ ] Log aggregation setup (Datadog, CloudWatch)
- [ ] Health check endpoint exposed
- [ ] Automatic restart on failure (PM2, Kubernetes)
- [ ] Gas price monitoring
- [ ] Backup relayer nodes deployed

### High Availability Setup

For production, deploy multiple relayer instances:

```
┌─────────────┐
│  Relayer 1  │ (Primary)
│  (AWS US-E) │
└─────────────┘

┌─────────────┐
│  Relayer 2  │ (Backup)
│  (AWS EU-W) │
└─────────────┘

┌─────────────┐
│  Relayer 3  │ (Backup)
│  (GCP ASIA) │
└─────────────┘
```

Use leader election (Redis, Zookeeper) to ensure only one relayer processes each proof.

## Testing

### Local Testing

```bash
# Start local Ethereum node
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy-vault.ts --network localhost

# Start Solana test validator
solana-test-validator

# Run relayer in test mode
NODE_ENV=test npm run relayer
```

### Integration Tests

```bash
# Test Ethereum → Solana proof relay
npm run test:relayer:eth-sol

# Test Solana → TON proof relay
npm run test:relayer:sol-ton

# Test full 2-of-3 consensus
npm run test:relayer:consensus
```

## Troubleshooting

### Relayer Not Picking Up Events

1. Check RPC endpoints are accessible
2. Verify contract addresses are correct
3. Ensure polling interval isn't too high
4. Check gas prices aren't too low

### Proofs Failing Verification

1. Verify nonces are synchronized
2. Check Merkle root updates on destination chain
3. Ensure validators are authorized
4. Validate proof data format

### High Gas Costs

1. Reduce polling frequency
2. Batch proof submissions
3. Use EIP-1559 gas pricing
4. Deploy on Layer 2 (Arbitrum, Optimism)

## Future Enhancements

- **ZK Proof Aggregation**: Batch multiple proofs into single ZK proof
- **Optimistic Verification**: Assume proofs valid unless challenged
- **Cross-Chain MEV Protection**: Private relayer network
- **Decentralized Relayer Network**: Multiple independent relayers with consensus
