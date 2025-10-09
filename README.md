<div align="center">

![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![FunC](https://img.shields.io/badge/FunC-0088CC?style=for-the-badge&logo=ton&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

[Website](https://chronosvault.org) • [Documentation](https://github.com/Chronos-Vault/chronos-vault-docs) • [SDK](https://github.com/Chronos-Vault/chronos-vault-sdk)

</div>

---

# Chronos Vault Smart Contracts


## V3 Deployment (October 8, 2025)

Latest V3 contracts deployed to Arbitrum Sepolia:

| Contract | Address | Features |
|----------|---------|----------|
| CrossChainBridgeV3 | [`0x39601883CD9A115Aba0228fe0620f468Dc710d54`](https://sepolia.arbiscan.io/address/0x39601883CD9A115Aba0228fe0620f468Dc710d54) | Circuit breaker, 500% volume spike detection |
| CVTBridgeV3 | [`0x00d02550f2a8Fd2CeCa0d6b7882f05Beead1E5d0`](https://sepolia.arbiscan.io/address/0x00d02550f2a8Fd2CeCa0d6b7882f05Beead1E5d0) | Circuit breaker, 20% sig failure detection |
| EmergencyMultiSig | [`0xFafCA23a7c085A842E827f53A853141C8243F924`](https://sepolia.arbiscan.io/address/0xFafCA23a7c085A842E827f53A853141C8243F924) | 2-of-3 multi-sig, 48h time-lock |

### V3 Features
- **Circuit Breakers**: Auto-pause on anomaly detection
- **Emergency Controls**: 2-of-3 multi-sig with time-lock
- **Auto-Recovery**: 2-4 hour automatic system restoration

### Deploy V3
```bash
# Set environment
export PRIVATE_KEY=your_private_key
export ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Deploy
./deploy-v3.sh
```

See `v3-deployment.json` for complete deployment details.


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



## 🚀 Latest Deployments (Arbitrum Sepolia)

### Circuit Breaker V2 Contracts

| Contract | Address | Status |
|----------|---------|--------|
| **CrossChainBridgeV2** | `0xe331a4390C3a5E43BA646210b63e09B64E8289e7` | ✅ Deployed |
| **CVTBridgeV2** | `0xdB7F6cCf57D6c6AA90ccCC1a510589513f28cb83` | ✅ Deployed |

**Features:**
- 🛡️ 500% volume spike trigger
- 🔒 20% failure rate threshold
- ⏰ Auto-recovery after time-lock
- 🚫 100% trustless (no owner roles)

[View on Arbiscan](https://sepolia.arbiscan.io)



## 🚀 Latest V3 Deployments (Arbitrum Sepolia)

### Circuit Breaker V3 with Emergency MultiSig

| Contract | Address | Status |
|----------|---------|--------|
| **CrossChainBridgeV3** | `0x5bC40A7a47A2b767D948FEEc475b24c027B43867` | ✅ Deployed |
| **CVTBridgeV3** | `0x7693a841Eec79Da879241BC0eCcc80710F39f399` | ✅ Deployed |
| **EmergencyMultiSig** | `0xFafCA23a7c085A842E827f53A853141C8243F924` | ✅ Deployed |

**V3 Features:**
- 🛡️ All V2 circuit breaker features (500% volume spike, 20% failure rate)
- 🚨 **NEW:** Emergency pause/resume via 2-of-3 multi-sig
- 🔒 **NEW:** 48-hour time-lock on emergency proposals
- ⏰ Auto-recovery (4h for bridge, 2h for CVT bridge)
- 🚫 100% trustless (emergency controller is IMMUTABLE)

[View on Arbiscan](https://sepolia.arbiscan.io)

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
