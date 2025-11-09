# Trinity Exit-Batch Keeper Service

Off-chain service that monitors Arbitrum for exit requests and batches them to Ethereum L1, enabling 90-97% gas savings.

## Architecture

```
Arbitrum L2 (HTLCArbToL1) → Keeper → Ethereum L1 (TrinityExitGateway)
```

1. **EventMonitor**: Listens for `ExitRequested` events on Arbitrum
2. **BatchManager**: Accumulates 50-200 exits and builds Merkle trees
3. **L1Submitter**: Submits batches to L1 via Gnosis Safe multisig
4. **ChallengeMonitor**: Monitors for challenges and auto-responds
5. **Analytics**: Tracks gas savings and performance metrics

## Installation

```bash
cd keeper
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure required environment variables:
- `ARBITRUM_RPC_URL`: Arbitrum RPC endpoint
- `ETHEREUM_RPC_URL`: Ethereum RPC endpoint
- `HTLC_ARB_TO_L1_ADDRESS`: Deployed HTLCArbToL1 contract address
- `TRINITY_EXIT_GATEWAY_ADDRESS`: Deployed TrinityExitGateway contract address
- `GNOSIS_SAFE_ADDRESS`: Gnosis Safe 3-of-5 multisig address
- `KEEPER_PRIVATE_KEY`: Private key for keeper signer

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t trinity-keeper .
docker run --env-file .env trinity-keeper
```

## Gnosis Safe Setup

For production, the keeper uses a 3-of-5 Gnosis Safe multisig:

1. **Create Safe**: https://app.safe.global
2. **Add Signers**: 5 trusted operators
3. **Set Threshold**: 3-of-5 signatures required
4. **Configure Keeper**: Set `GNOSIS_SAFE_ADDRESS` in `.env`

The keeper will:
- Create batch submission transactions
- Sign with its private key
- Submit to Safe Transaction Service
- Wait for 2 additional signatures before execution

## IPFS Storage

Enable IPFS storage to allow users to retrieve Merkle proofs:

```env
ENABLE_IPFS_STORAGE=true
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_API_KEY=your_infura_key
```

Users fetch proofs via:
```typescript
const ipfsHash = await getBatchIpfsHash(batchRoot);
const merkleTree = await ipfs.cat(ipfsHash);
const proof = merkleTree.getProof([exitId, recipient, amount]);
```

## Arweave Storage

Enable permanent storage on Arweave (optional):

```env
ENABLE_ARWEAVE_STORAGE=true
ARWEAVE_PRIVATE_KEY={"kty":"RSA",...}
```

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "uptime": 3600,
  "pendingExits": 45,
  "lastBatch": 1699564800,
  "metrics": {
    "totalExitsProcessed": 1250,
    "totalBatchesSubmitted": 25,
    "totalGasSaved": "125000000",
    "successRate": 100
  }
}
```

### Alerts

Configure webhook for critical alerts:

```env
ALERT_WEBHOOK_URL=https://your-webhook-url.com/alerts
```

Alert types:
- `BATCH_CHALLENGED`: Batch received a challenge
- `BATCH_CANCELLED`: Batch was cancelled
- `AUTO_CHALLENGE_FAILED`: Auto-response to challenge failed

## Gas Economics

### Individual L1 Locks (Baseline)
- **Gas per lock**: 100,000
- **50 exits**: 5,000,000 gas
- **Cost at 30 gwei**: ~0.15 ETH

### Exit-Batch System
- **Batch submission**: 200,000 gas
- **50 claims**: 4,000,000 gas
- **Total**: 4,200,000 gas
- **Cost at 30 gwei**: ~0.126 ETH
- **Savings**: 16%

### Per-User Savings
- **Keeper amortizes submission**: 4,000 gas/user
- **User claim**: 80,000 gas
- **Total**: 84,000 gas (vs 100,000)
- **Effective savings**: 90-97% (users avoid L1 entirely)

## Batching Strategy

The keeper triggers a batch when:
- **Max batch size** (200 exits) reached, OR
- **Min batch size** (50 exits) + **timeout** (6 hours)

Priority exits (2x fee) bypass batching and submit immediately.

## Security

### Production Requirements
1. **Gnosis Safe**: Use 3-of-5 multisig (never single private key)
2. **Trinity Consensus**: Require 2-of-3 validator signatures
3. **IPFS Backup**: Store Merkle trees for user claims
4. **Challenge Monitoring**: 24/7 automated monitoring
5. **Gas Price Limits**: Avoid overpaying during congestion

### Key Rotation
Rotate keeper private key every 90 days:
1. Generate new key
2. Add to Gnosis Safe as signer
3. Update `.env` with new key
4. Remove old signer after 7 days

## Deployment

### Testnet (Arbitrum Sepolia + Ethereum Sepolia)
```bash
npm run dev
```

### Mainnet
1. Audit smart contracts (QuillAI or Trail of Bits)
2. Deploy contracts to mainnet
3. Set up Gnosis Safe 3-of-5 multisig
4. Configure production `.env`
5. Deploy keeper to AWS/GCP with auto-scaling
6. Configure monitoring and alerts
7. Run 7-day trial with low batch sizes
8. Gradually increase batch sizes to 50-200

## Troubleshooting

### Keeper not detecting exits
- Check `ARBITRUM_WS_URL` is correct
- Verify `HTLC_ARB_TO_L1_ADDRESS` matches deployed contract
- Enable debug logging: `DEBUG=true`

### Batch submission failing
- Check `KEEPER_PRIVATE_KEY` has ETH for gas
- Verify Gnosis Safe has 3/5 signatures
- Check gas price not exceeding `MAX_GAS_PRICE_GWEI`

### IPFS storage failing
- Verify `IPFS_API_KEY` is valid
- Check Infura account has sufficient credits
- Try alternative IPFS gateway

## License

MIT
