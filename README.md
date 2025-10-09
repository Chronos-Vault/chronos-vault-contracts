<div align="center">

# CHRONOS VAULT

### Smart Contracts Repository

![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![TON](https://img.shields.io/badge/TON-0088CC?style=for-the-badge&logo=telegram&logoColor=white)
![Hardhat](https://img.shields.io/badge/Hardhat-FFF100?style=for-the-badge&logo=hardhat&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

**Multi-Chain Smart Contracts for Trinity Protocol Security Architecture**

[Website](https://chronosvault.org) • [Documentation](https://github.com/Chronos-Vault/chronos-vault-docs) • [SDK](https://github.com/Chronos-Vault/chronos-vault-sdk)

</div>

---

## 🔐 Overview

Chronos Vault smart contracts implement the **Trinity Protocol** - a revolutionary 2-of-3 multi-chain consensus system providing mathematical security guarantees across Ethereum Layer 2, Solana, and TON blockchains.

## 🏗️ Architecture

### Supported Chains

- **Ethereum Layer 2 (Arbitrum)** - Primary security layer with V3 circuit breaker
- **Solana** - High-frequency monitoring and rapid validation
- **TON** - Emergency recovery and quantum-safe storage

### Core Contracts

#### Ethereum/Arbitrum (Solidity)
- `CrossChainBridgeV3.sol` - Latest HTLC atomic swap bridge with circuit breaker
- `CVTBridgeV3.sol` - CVT token bridge with volume monitoring
- `EmergencyMultiSig.sol` - 2-of-3 multi-signature emergency controller
- `ChronosVault.sol` - Main vault implementation

#### Solana (Rust)
- `chronos_vault.rs` - Vault program with Trinity Protocol integration
- `cross_chain_bridge.rs` - Cross-chain message verification
- `cvt_bridge/` - CVT SPL token bridge

#### TON (FunC)
- `ChronosVault.fc` - Vault smart contract with Byzantine fault tolerance
- `CVTBridge.fc` - Jetton-based CVT bridge
- `cvt-token/` - Complete CVT Jetton implementation

### Zero-Knowledge Circuits
- `circuits/multisig_verification.circom` - Multi-signature ZK proofs
- `circuits/vault_ownership.circom` - Privacy-preserving ownership verification

## 🚀 Deployed Contracts (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| CrossChainBridgeV3 | `0x39601883CD9A115Aba0228fe0620f468Dc710d54` |
| CVTBridgeV3 | `0x00d02550f2a8Fd2CeCa0d6b7882f05Beead1E5d0` |
| EmergencyMultiSig | `0xFafCA23a7c085A842E827f53A853141C8243F924` |

## 🛠️ Development

### Prerequisites
```bash
npm install
```

### Deploy V3 Contracts
```bash
node scripts/deploy-v3-with-multisig.cjs
```

### Verify on Arbitrum
```bash
node scripts/verify-arbitrum-contracts.cjs
```

## 📋 Features

- ✅ **Trinity Protocol** - 2-of-3 multi-chain consensus
- ✅ **Circuit Breaker** - 500% volume threshold protection
- ✅ **HTLC Atomic Swaps** - Trustless cross-chain exchanges
- ✅ **Zero-Knowledge Proofs** - Privacy-preserving verification
- ✅ **Quantum-Resistant** - Future-proof cryptography
- ✅ **Emergency Multi-Sig** - Decentralized emergency controls

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

<div align="center">

**Built with ❤️ by the Chronos Vault Team**

</div>
