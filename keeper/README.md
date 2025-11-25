# Trinity Exit-Batch Keeper Service

Production keeper service for Trinity Protocol that monitors Arbitrum for exit requests and batches them for L1 submission.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│              Trinity Exit-Batch Keeper                      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                          │
│  │ EventMonitor │ ← Arbitrum WebSocket                     │
│  │  (L2 Events) │   (ExitRequested events)                 │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ BatchManager │ ← Accumulates exits                      │
│  │ (Merkle Tree)│   Builds Merkle trees                    │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ L1Submitter  │ → Ethereum L1                            │
│  │ (Gnosis Safe)│   (Submit batch roots)                   │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────┐                                        │
│  │ChallengeMonitor│ ← Watches for challenges               │
│  │ (Auto-respond) │   Auto-responds with proofs            │
│  └────────────────┘                                        │
│                                                             │
│  ┌──────────────┐                                          │
│  │  Analytics   │ ← Performance metrics                    │
│  │  (Metrics)   │   Gas savings tracking                   │
│  └──────────────┘                                          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Services

- **EventMonitor**: Listens for ExitRequested events on Arbitrum
- **BatchManager**: Accumulates exits and builds Merkle trees
- **L1Submitter**: Submits batches to Ethereum L1 via Gnosis Safe
- **ChallengeMonitor**: Watches for challenges and auto-responds
- **Analytics**: Tracks performance metrics and gas savings

## Environment Variables

```bash
# Required
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_WS_URL=wss://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key

# Contract Addresses
HTLC_ARB_TO_L1_ADDRESS=0x...
EXIT_GATEWAY_ADDRESS=0x...
GNOSIS_SAFE_ADDRESS=0x...

# Optional
ENABLE_HEALTH_CHECK=true
HEALTH_CHECK_PORT=8080
BATCH_SIZE=50
BATCH_INTERVAL_MS=300000
```

## Usage

```bash
# Install dependencies
npm install

# Start keeper service
npm start

# Or with ts-node
npx ts-node src/index.ts
```

## Health Check

When enabled, the keeper exposes a health endpoint:

```bash
curl http://localhost:8080/health
```

Returns:
```json
{
  "status": "ok",
  "uptime": 3600,
  "pendingExits": 12,
  "lastBatch": 1699999999,
  "metrics": { ... }
}
```

## License

MIT License
