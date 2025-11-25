# Trinity Protocol Validator & Relayer Services

Production-ready validator and relayer implementations for Trinity Protocol's 2-of-3 consensus verification across Arbitrum, Solana, and TON.

## Components

### Trinity Relayer Service (`trinity-relayer.ts`)
Cross-chain proof relayer that monitors all three blockchains and submits cryptographic proofs to achieve consensus.

**Features:**
- Monitors Ethereum/Arbitrum for ProofGenerated events
- Monitors Solana for vault state changes
- Monitors TON for consensus verification
- Automatic nonce management to prevent replay attacks
- Graceful shutdown handling

### Trinity Relayer Service (`contracts/validators/trinity-relayer-service.ts`)
Alternative implementation with WebSocket support and enhanced proof generation.

**Features:**
- WebSocket-based event monitoring
- Merkle proof generation for each chain
- Validator signature verification
- Testnet and Mainnet configuration support

## Environment Variables

```bash
# Ethereum/Arbitrum
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_ethereum_private_key

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
USER_WALLET_PRIVATE_KEY=your_solana_private_key_base64

# TON
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC
TON_PRIVATE_KEY=your_ton_private_key
```

## Usage

```bash
# Install dependencies
npm install

# Run relayer (testnet)
npx ts-node validators/trinity-relayer.ts

# Run relayer (mainnet)
npx ts-node contracts/validators/trinity-relayer-service.ts -- --network mainnet
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Trinity Relayer Service                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │  Ethereum   │   │   Solana    │   │     TON     │        │
│  │  Monitor    │   │   Monitor   │   │   Monitor   │        │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘        │
│         │                 │                  │               │
│         └────────────┬────┴─────────────────┘               │
│                      │                                       │
│              ┌───────▼───────┐                              │
│              │ Proof Manager │                              │
│              │  & Submitter  │                              │
│              └───────┬───────┘                              │
│                      │                                       │
│              ┌───────▼───────┐                              │
│              │ Nonce Manager │                              │
│              │ (Replay Prot.)│                              │
│              └───────────────┘                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Security Notes

- Never commit private keys to the repository
- Use environment variables for all sensitive data
- The relayer requires signing privileges on all three chains
- Ensure sufficient gas/SOL/TON balance for transaction fees

## License

MIT License - See LICENSE file for details.
