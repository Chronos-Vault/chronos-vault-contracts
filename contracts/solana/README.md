# Chronos Vault - Solana Program

This directory contains the implementation of the Chronos Vault program for the Solana blockchain.

## Overview

The Chronos Vault Solana program provides time-locked vault functionality compatible with the multi-chain Chronos Vault platform. It allows users to create secure digital time capsules on Solana that can unlock at predetermined future dates, with cross-chain integration capabilities.

## Features

- **Time-locked Vaults**: Create vaults that unlock at specific future dates
- **Security Levels**: Multi-tier security system with optional access keys
- **Cross-chain Links**: Connect vaults to other blockchain networks
- **Multi-signature Support**: Add authorized withdrawers for collaborative access
- **Metadata Management**: Add tags and descriptions to organize vaults

## Key Instructions

| Instruction | Description |
|-------------|-------------|
| `CreateVault` | Creates a new time-locked vault |
| `Deposit` | Deposits funds into a vault |
| `Withdraw` | Withdraws funds from an unlocked vault |
| `AddCrossChainLink` | Links vault to contracts on other blockchains |
| `AddAuthorizedWithdrawer` | Adds a collaborative withdrawer |
| `UpdateMetadata` | Updates vault metadata and settings |
| `UnlockEarly` | Allows early unlocking with appropriate authorization |
| `GenerateVerificationProof` | Creates proof for cross-chain validation |

## Development Environment

The program is written in Rust using the Solana SDK and the Borsh serialization framework. For development and testing purposes, the project includes scripts that can simulate deployment without needing access to a live Solana cluster.

## Deployment

### Development Mode

To deploy in development mode (simulation):

```bash
./scripts/solana/run.sh --dev
```

This will:
1. Create placeholder compiled program files
2. Simulate deployment
3. Generate a mock program ID and deployment metadata

### Production Mode

For production deployment to the Solana mainnet or devnet:

```bash
export SOLANA_PRIVATE_KEY=your_private_key
export SOLANA_NETWORK=mainnet-beta # or devnet
./scripts/solana/run.sh
```

This will:
1. Compile the program with the Solana BPF toolchain
2. Deploy to the specified network
3. Generate deployment metadata

## Program State

The main vault state includes:

- Authority (creator) public key
- Unlock time settings
- Security level and access key hash
- Vault metadata (name, description, tags)
- Cross-chain links to other blockchain contracts
- Authorized withdrawers list
- Verification proof data

## Cross-Chain Compatibility

The program is designed to interoperate with the other blockchain contracts in the Chronos Vault ecosystem:

- TON (The Open Network)
- Ethereum (via ERC-4626 Tokenized Vault Standard)
- Other EVM-compatible chains

Integration is achieved through cross-chain links and verification proofs that can be validated across different blockchains.

## Security Considerations

- Security levels from 1 to 5 provide different protection mechanisms
- Higher security levels require access keys for any operation
- Early unlocking functionality requires both authority signature and access key
- Verification proofs can be used to validate the vault's existence and state from other blockchains

---

## 🎉 DEPLOYMENT STATUS - LIVE ON SOLANA DEVNET

**Deployed:** October 13, 2025

All Chronos Vault Solana contracts are now **operational on Solana Devnet**.

### Deployed Components

| Component | Program ID / Address | Status |
|-----------|---------------------|--------|
| **CVT Token** | `2yoF4qEN9unigg9Q79dMqnjXqfiQMk3votm68k1TuVjd` | ✅ Live |
| **Bridge Program** | `6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK` | ✅ Live |
| **Vesting Program** | `3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB` | ✅ Live |

### CVT Token Details
- **Name:** Chronos Vault Token
- **Symbol:** CVT
- **Total Supply:** 21,000,000 (Fixed)
- **Decimals:** 9
- **Metadata:** `CHr4fbo1gGbumCzp4gTVs49rc2oeyoxSeLHCGcRBHGwS`

**Explorer:** [View on Solana Explorer](https://explorer.solana.com/address/2yoF4qEN9unigg9Q79dMqnjXqfiQMk3votm68k1TuVjd?cluster=devnet)

### Quick Links
- 📋 [Full Deployment Details](./DEPLOYMENT_STATUS.md)
- 🚀 [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- 🪙 [CVT Token Info](./cvt_token/README.md)

### Trinity Protocol Integration

All three chains are now operational:
- ✅ **Arbitrum:** ChronosVault.sol, CVTBridge.sol
- ✅ **Solana:** CVT Token, Bridge, Vesting (this deployment)
- ✅ **TON:** CVT Jetton, Bridge

**Security:** 2-of-3 multi-chain consensus with mathematical proofs
