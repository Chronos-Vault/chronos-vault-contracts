# Trinity Protocol v3.5.20 - TON Smart Contracts

[![Deployed](https://img.shields.io/badge/status-DEPLOYED-green.svg)](https://testnet.tonscan.org)
[![Network](https://img.shields.io/badge/network-TON%20Testnet-blue.svg)](https://testnet.tonscan.org)
[![Role](https://img.shields.io/badge/role-BACKUP-purple.svg)](https://testnet.tonscan.org)

> **Quantum-resistant emergency recovery layer** for Trinity Protocol's 2-of-3 multi-chain consensus system.

## Deployment Status: ✅ DEPLOYED

**Network:** TON Testnet  
**Deployed:** November 26, 2025  
**Explorer:** [https://testnet.tonscan.org](https://testnet.tonscan.org)

---

## Deployed Contract Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| **TrinityConsensus** | `EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8` | [View](https://testnet.tonscan.org/address/EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8) |
| **ChronosVault** | `EQjUVidQfn4m-Rougn0fol7ECCthba2HV0M6xz9zAfax4` | [View](https://testnet.tonscan.org/address/EQjUVidQfn4m-Rougn0fol7ECCthba2HV0M6xz9zAfax4) |
| **CrossChainBridge** | `EQgWobA9D4u6Xem3B8e6Sde_NEFZYicyy7_5_XvOT18mA` | [View](https://testnet.tonscan.org/address/EQgWobA9D4u6Xem3B8e6Sde_NEFZYicyy7_5_XvOT18mA) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TON BACKUP LAYER (Quantum-Safe)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    TrinityConsensus.fc                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │
│  │  │ 2-of-3      │  │ Quantum     │  │ Emergency   │          │   │
│  │  │ Consensus   │  │ Recovery    │  │ Operations  │          │   │
│  │  │ Voting      │  │ ML-KEM-1024 │  │ 48hr Delay  │          │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │   │
│  │         │                │                │                  │   │
│  └─────────┼────────────────┼────────────────┼──────────────────┘   │
│            │                │                │                      │
│            ▼                ▼                ▼                      │
│  ┌─────────────────┐  ┌─────────────────┐                          │
│  │  ChronosVault   │  │ CrossChainBridge│                          │
│  │  - Time-locks   │  │ - HTLC Swaps    │                          │
│  │  - Per-vault    │  │ - 0.5% Fee      │                          │
│  │  - 6 levels     │  │ - Min 1 TON     │                          │
│  └─────────────────┘  └─────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Contract Overview

### TrinityConsensus.fc
**Address:** `EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8`

2-of-3 multi-chain consensus verification with quantum-resistant recovery:

| Feature | Description |
|---------|-------------|
| **Consensus Threshold** | 2-of-3 validator votes |
| **Recovery Threshold** | 3-of-3 validator votes |
| **Recovery Delay** | 48 hours (172,800 seconds) |
| **Quantum Algorithm** | ML-KEM-1024 + CRYSTALS-Dilithium-5 |
| **Entropy** | 256-bit minimum |

### ChronosVault.fc
**Address:** `EQjUVidQfn4m-Rougn0fol7ECCthba2HV0M6xz9zAfax4`

Time-locked vault with 6 security levels:

| Level | Name | Features |
|-------|------|----------|
| 1 | PERSONAL_VAULT | Basic time lock |
| 2 | FAMILY_TRUST | Backup confirmation required |
| 3 | CORPORATE_TREASURY | Multi-sig required |
| 4 | INSTITUTIONAL_CUSTODY | Full Trinity consensus |
| 5 | SOVEREIGN_RESERVE | Maximum security |
| 6 | SOVEREIGN_FORTRESS | ERC-4626 compliant |

### CrossChainBridge.fc
**Address:** `EQgWobA9D4u6Xem3B8e6Sde_NEFZYicyy7_5_XvOT18mA`

HTLC atomic swaps between TON and other chains:

| Parameter | Value |
|-----------|-------|
| **Bridge Fee** | 0.5% (50 basis points) |
| **Minimum Amount** | 1 TON (1,000,000,000 nanoTON) |
| **Supported Routes** | TON ↔ Arbitrum, TON ↔ Solana |
| **Signature Scheme** | 2-of-3 Trinity consensus |

---

## Quantum Security

### Post-Quantum Cryptography
TON serves as the quantum-resistant backup layer using NIST-approved algorithms:

| Algorithm | Purpose | Security Level |
|-----------|---------|----------------|
| **ML-KEM-1024** | Key Encapsulation | NIST Level 5 (256-bit) |
| **CRYSTALS-Dilithium-5** | Digital Signatures | NIST Level 5 (256-bit) |

### Emergency Recovery Flow

```
1. Recovery Initiated (requires 3-of-3 consensus)
           │
           ▼
2. 48-Hour Timelock Starts
           │
           ▼
3. Quantum Key Verification (ML-KEM-1024)
           │
           ▼
4. Dilithium-5 Signature Validation
           │
           ▼
5. Recovery Executed
```

---

## Connected Contracts

### Arbitrum Sepolia (Chain ID: 1)
| Contract | Address |
|----------|---------|
| TrinityConsensusVerifier | `0x59396D58Fa856025bD5249E342729d5550Be151C` |
| CrossChainMessageRelay | `0xC6F4f855fc690CB52159eE3B13C9d9Fb8D403E59` |
| HTLCChronosBridge | `0xc0B9C6cfb6e39432977693d8f2EBd4F2B5f73824` |

### Solana Devnet (Chain ID: 2)
| Program | Address |
|---------|---------|
| ChronosVault Program | `CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2` |
| CVT Token Mint | `5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4` |

---

## Validators (On-Chain Registered)

| Chain | Validator Address | Chain ID |
|-------|-------------------|----------|
| Arbitrum (PRIMARY) | `0x3A92fD5b39Ec9598225DB5b9f15af0523445E3d8` | 1 |
| Solana (MONITOR) | `0x2554324ae222673F4C36D1Ae0E58C19fFFf69cd5` | 2 |
| TON (BACKUP) | `0x9662e22D1f037C7EB370DD0463c597C6cd69B4c4` | 3 |

---

## CVT Token Architecture

**Important:** CVT Token is Solana-native only.

- CVT exists exclusively as an SPL token on Solana
- Cross-chain CVT operations route through Solana bridge
- TON contracts handle native TON bridging only
- HTLC swaps enable cross-chain value transfer

---

## Development

### Prerequisites
- Node.js v16+
- TON development tools
- TON wallet with test tokens

### Environment Setup

```bash
# .env configuration
TON_API_KEY=your_ton_api_key_here
TON_MNEMONIC=your wallet mnemonic phrase
TON_NETWORK=testnet
```

### Deployment

```bash
# Deploy all TON contracts
npx tsx contracts/ton/deploy-all-contracts.ts
```

### Contract Compilation

```bash
# Compile FunC to bytecode
node scripts/ton/compile.js
```

---

## Contract Interface

### Get Methods

| Method | Returns |
|--------|---------|
| `get_vault_data()` | Stored content |
| `is_unlocked()` | Lock status |
| `get_unlock_time()` | Unlock timestamp |
| `get_security_level()` | Security level (1-6) |
| `get_verification_proof()` | Cross-chain proof |
| `get_cross_chain_locations()` | Mirror locations |

### External Methods

| Op Code | Operation | Access |
|---------|-----------|--------|
| 0x1 | Get vault data | Owner only |
| 0x2 | Update unlock time | Owner only |
| 0x3 | Update security level | Owner only |
| 0x4 | Update cross-chain data | Owner only |
| 0x5 | Retrieve content | Owner + unlock |

---

## Files

| File | Type | Description |
|------|------|-------------|
| `TrinityConsensus.fc` | FunC | Consensus verification |
| `ChronosVault.fc` | FunC | Time-locked vaults |
| `CVTBridge.fc` | FunC | Cross-chain bridge |
| `CrossChainHelper.fc` | FunC | Helper functions |
| `deploy-all-contracts.ts` | TypeScript | Deployment script |
| `deployment-ton-testnet.json` | JSON | Deployment addresses |

---

## Security Considerations

- Multi-level security system (6 levels)
- Higher levels require access keys
- Time-locks enforced at contract level
- Cross-chain verification for redundancy
- Quantum-resistant recovery for catastrophic scenarios

---

**Trinity Protocol - TON Backup Layer**  
*Quantum-Safe Recovery for Multi-Chain Security*
