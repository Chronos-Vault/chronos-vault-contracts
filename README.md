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
│   ├── CVTBridge.sol
│   ├── CrossChainBridgeV1.sol
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
- **CrossChainBridgeV1**: `0x13dc7df46c2e87E8B2010A28F13404580158Ed9A`

View on [Arbiscan](https://sepolia.arbiscan.io)

### TON Testnet

- **ChronosVault**: `EQDJAnXDPT-NivritpEhQeP0XmG20NdeUtxgh4nUiWH-DF7M`
- **CVTBridge**: `EQAOJxa1WDjGZ7f3n53JILojhZoDdTOKWl6h41_yOWX3v0tq`

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

- **Main Repository**: [chronos-vault-platform-](https://github.com/Chronos-Vault/chronos-vault-platform-)
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
