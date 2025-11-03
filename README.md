# Chronos Vault Smart Contracts

Smart contract implementations for the Chronos Vault multi-chain digital asset vault platform.

## Overview

This repository contains the core smart contracts powering Chronos Vault across three blockchain networks:
- **Ethereum Layer 2 (Arbitrum)** - Primary security layer
- **Solana** - High-frequency validation
- **TON** - Quantum-resistant backup

## Repository Structure

```
contracts/
├── ethereum/           # Solidity contracts for Ethereum/Arbitrum
│   ├── ChronosVault.sol
│   ├── ChronosVaultOptimized.sol
│   ├── CrossChainBridgeOptimized.sol
│   ├── HTLCBridge.sol
│   ├── CVTBridge.sol
│   ├── EmergencyMultiSig.sol
│   └── TestERC20.sol
├── solana/            # Rust/Anchor programs for Solana
│   ├── chronos_vault.rs
│   ├── cross_chain_bridge.rs
│   └── cvt_bridge/
├── ton/               # FunC contracts for TON
│   ├── ChronosVault.fc
│   ├── CVTBridge.fc
│   └── cvt-token/
scripts/
├── deploy-arbitrum.cjs
├── deploy-ethereum.ts
├── verify-arbitrum-contracts.cjs
└── ton/
```

## Deployed Contracts

### Arbitrum Sepolia (Testnet)

- **CVT Token**: `0xFb419D8E32c14F774279a4dEEf330dc893257147`
- **CVTBridge**: `0x21De95EbA01E31173Efe1b9c4D57E58bb840bA86`
- **ChronosVault**: `0x99444B0B1d6F7b21e9234229a2AC2bC0150B9d91`
- **ChronosVaultOptimized v3.0**: `0x99444B0B1d6F7b21e9234229a2AC2bC0150B9d91`
- **CrossChainBridgeOptimized v2.2**: `0x4a8Bc58f441Ae7E7eC2879e434D9D7e31CF80e30`
- **HTLCBridge v2.0**: `0x6cd3B1a72F67011839439f96a70290051fd66D57`
- **EmergencyMultiSig**: `0xecc00bbE268Fa4D0330180e0fB445f64d824d818`

View on [Arbiscan](https://sepolia.arbiscan.io)

### Solana Devnet

- **CVT Token (Official)**: `5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4`
- **CVT Bridge**: `6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK`
- **CVT Vesting (70% Locked)**: `3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB`

View on [Solana Explorer](https://explorer.solana.com/?cluster=devnet)

### TON Testnet

- **ChronosVault**: `EQDJAnXDPT-NivritpEhQeP0XmG20NdeUtxgh4nUiWH-DF7M`
- **CVTBridge**: `EQAOJxa1WDjGZ7f3n53JILojhZoDdTOKWl6h41_yOWX3v0tq`

## CVT Token Architecture

### Official Token Supply

**Solana SPL Token** is the official CVT token with **21,000,000 CVT total supply**:

| Chain | CVT Type | Purpose | Address |
|-------|----------|---------|---------|
| **Solana** | SPL Token (Official) | Primary token, vesting (21M total) | `5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4` |
| **Arbitrum** | ERC-20 (Utility) | L2 transaction fees, staking | `0xFb419D8E32c14F774279a4dEEf330dc893257147` |
| **TON** | Bridge Only | Emergency recovery consensus | `EQAOJxa1WDjGZ7f3n53JILojhZoDdTOKWl6h41_yOWX3v0tq` |

**Distribution**:
- 30% Initial Circulation: 6.3M CVT (available now)
- 70% Time-Locked: 14.7M CVT (vesting over 21 years)

**Important**: Trinity Protocol verifies **vault operations** across chains, not token transfers. Each chain's CVT serves its specific ecosystem role.

## Key Features

### Trinity Protocol
- 2-of-3 consensus verification across Ethereum, Solana, and TON
- Mathematical security through cryptographic proofs
- Automated failover and emergency recovery

### Cross-Chain Bridge
- HTLC (Hash Time-Locked Contracts) for atomic swaps
- Trustless asset transfers using Merkle proofs
- No human validators - pure mathematical consensus

### Vault Security
- Time-locked asset releases
- Multi-signature requirements
- Quantum-resistant encryption (TON layer)

## Development

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
npm install
```

### Compile Contracts

**Ethereum/Arbitrum:**
```bash
npx hardhat compile
```

**TON:**
```bash
npm run build:ton
```

### Deploy to Arbitrum Sepolia

```bash
npx hardhat run scripts/deploy-arbitrum.cjs --network arbitrum-sepolia
```

### Verify Contracts

```bash
npx hardhat run scripts/verify-arbitrum-contracts.cjs --network arbitrum-sepolia
```

## Testing

Run the test suite:
```bash
npx hardhat test
```

## Security

- All contracts have been designed with security-first principles
- Multi-chain architecture prevents single points of failure
- Emergency recovery mechanisms on TON blockchain
- Testnet deployment for thorough testing before mainnet

## License

MIT License - see [LICENSE](LICENSE) file for details

## Links

- **Main Repository**: [chronos-vault-platform](https://github.com/Chronos-Vault/chronos-vault-platform)
- **Organization**: [Chronos-Vault](https://github.com/Chronos-Vault)

## Contract Details

See [ARBITRUM_DEPLOYMENT.md](ARBITRUM_DEPLOYMENT.md) for detailed deployment information and contract addresses.

---

## 🌐 Community & Social Media

Join the Chronos Vault community and stay updated on the latest developments:

- **Medium**: [https://medium.com/@chronosvault](https://medium.com/@chronosvault) - Technical articles and project updates
- **Dev.to**: [https://dev.to/chronosvault](https://dev.to/chronosvault) - Developer tutorials and guides
- **Discord**: [https://discord.gg/WHuexYSV](https://discord.gg/WHuexYSV) - Community discussions and support
- **X (Twitter)**: [https://x.com/chronosvaultx](https://x.com/chronosvaultx?s=21) - Latest news and announcements
- **Email**: chronosvault@chronosvault.org

---

**Built with ❤️ for the future of decentralized asset security**
