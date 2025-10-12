# Chronos Vault Smart Contracts

![version](https://img.shields.io/badge/version-1.0.0-blue)
![Trinity](https://img.shields.io/badge/Trinity-2/3_Consensus-green)
![Quantum](https://img.shields.io/badge/Quantum-Resistant-purple)
![Lean 4](https://img.shields.io/badge/Lean_4-35/35_Proven-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

**Multi-chain smart contracts for Trinity Protocol across Ethereum, Solana, and TON**

![Security](https://img.shields.io/badge/Security-Mathematically_Proven-success)
![Trinity](https://img.shields.io/badge/Trinity-2/3_Consensus-informational)
![Quantum](https://img.shields.io/badge/Quantum-Resistant-blueviolet)

---

## 🔗 Overview

This repository contains the complete smart contract implementation for Chronos Vault's Trinity Protocol - a mathematically provable multi-chain security system.

## Contract Architecture

### Ethereum/Arbitrum (Solidity)
- **ChronosVault.sol** - Core vault logic with time-locks and multi-sig
- **CVTBridge.sol** - Cross-chain token bridge with HTLC
- **CrossChainBridgeV1.sol** - Atomic swaps and cross-chain verification
- **CVTToken.sol** - ChronosToken (CVT) ERC-20 implementation

### Solana (Rust/Anchor)
- **chronos_vault.rs** - Vault state management and validation
- **cross_chain_bridge.rs** - Cross-chain message verification
- **cvt_token.rs** - SPL token implementation for CVT

### TON (FunC)
- **ChronosVault.fc** - Vault implementation with quantum-resistant features
- **CVTBridge.fc** - CVT Jetton bridge for cross-chain transfers
- **CrossChainVerifier.fc** - Multi-chain consensus verification

## Deployed Contracts

### Arbitrum Sepolia (Testnet)
- **CVT Token**: `0xFb419D8E32c14F774279a4dEEf330dc893257147`
- **CVT Bridge**: `0x21De95EbA01E31173Efe1b9c4D57E58bb840bA86`
- **ChronosVault**: `0x99444B0B1d6F7b21e9234229a2AC2bC0150B9d91`
- **CrossChainBridge**: `0x13dc7df46c2e87E8B2010A28F13404580158Ed9A`

### TON Testnet
- **ChronosVault**: `EQDJAnXDPT-NivritpEhQeP0XmG20NdeUtxgh4nUiWH-DF7M`
- **CVTBridge**: `EQAOJxa1WDjGZ7f3n53JILojhZoDdTOKWl6h41_yOWX3v0tq`

## Development

### Prerequisites
- **Ethereum**: Hardhat, Ethers.js v6+
- **Solana**: Anchor Framework, Rust
- **TON**: Blueprint, FunC compiler

### Installation
```bash
# Install dependencies
npm install

# Compile Ethereum contracts
npx hardhat compile

# Build Solana programs
cd solana && anchor build

# Build TON contracts
cd ton && npx blueprint build
```

### Testing
```bash
# Test Ethereum contracts
npx hardhat test

# Test Solana programs
cd solana && anchor test

# Test TON contracts
cd ton && npx blueprint test
```

## Security Features

- **Formal Verification**: 35/35 theorems proven with Lean 4
- **Multi-Chain Consensus**: 2-of-3 validation across blockchains
- **Quantum-Resistant**: ML-KEM-1024 and CRYSTALS-Dilithium-5
- **Zero-Knowledge Proofs**: Privacy-preserving verification
- **Time-Lock Security**: VDF-based time-locks

## Related Repositories

- **[Main Platform](https://github.com/Chronos-Vault/chronos-vault-platform-)** - Platform application
- **[Documentation](https://github.com/Chronos-Vault/chronos-vault-docs)** - Technical documentation
- **[Security](https://github.com/Chronos-Vault/chronos-vault-security)** - Security audits and protocols
- **[SDK](https://github.com/Chronos-Vault/chronos-vault-sdk)** - Official SDK

## 🤝 Contributing

We welcome contributions! Please read our contribution guidelines before submitting PRs.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

Copyright (c) 2025 Chronos Vault

---

## 🌐 Community & Social Media

- **Medium**: [https://medium.com/@chronosvault](https://medium.com/@chronosvault) - Technical articles and updates
- **Dev.to**: [https://dev.to/chronosvault](https://dev.to/chronosvault) - Developer tutorials and guides
- **Discord**: [https://discord.gg/WHuexYSV](https://discord.gg/WHuexYSV) - Community discussions and support
- **X (Twitter)**: [https://x.com/chronosvaultx?s=21](https://x.com/chronosvaultx?s=21) - Latest news and announcements
- **Email**: chronosvault@chronosvault.org

---

**Built with ❤️ for the future of mathematically provable blockchain security**
