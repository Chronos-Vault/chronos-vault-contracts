# Trinity Protocol v3.5.20 - Solana Programs

[![Deployed](https://img.shields.io/badge/status-DEPLOYED-green.svg)](https://explorer.solana.com/?cluster=devnet)
[![Network](https://img.shields.io/badge/network-Solana%20Devnet-blue.svg)](https://explorer.solana.com/?cluster=devnet)
[![Role](https://img.shields.io/badge/role-MONITOR-purple.svg)](https://explorer.solana.com/?cluster=devnet)

> **High-frequency validation layer** for Trinity Protocol's 2-of-3 multi-chain consensus system with <5 second SLA.

## Deployment Status: ✅ DEPLOYED

**Network:** Solana Devnet  
**Deployed:** November 26, 2025  
**Explorer:** [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)

---

## Deployed Programs & Addresses

### Programs

| Program | Address | Explorer |
|---------|---------|----------|
| **ChronosVault** | `CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2` | [View](https://explorer.solana.com/address/CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2?cluster=devnet) |
| **Bridge Program** | `6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK` | [View](https://explorer.solana.com/address/6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK?cluster=devnet) |
| **Vesting Program** | `3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB` | [View](https://explorer.solana.com/address/3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB?cluster=devnet) |

### CVT Token (Solana-Native SPL Token)

| Token | Address | Explorer |
|-------|---------|----------|
| **CVT Mint** | `5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4` | [View](https://explorer.solana.com/address/5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4?cluster=devnet) |
| **CVT Metadata** | `D5qLqXpJnWDrfpZoePauQv8g22DbM8CbeVZcjeBhdDgF` | [View](https://explorer.solana.com/address/D5qLqXpJnWDrfpZoePauQv8g22DbM8CbeVZcjeBhdDgF?cluster=devnet) |

### Wallets

| Wallet | Address | Purpose |
|--------|---------|---------|
| **Deployment Wallet** | `AjWeKXXgLpb2Cy3LfmqPjms3UkN1nAi596qBi8fRdLLQ` | Deployment authority |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SOLANA MONITOR LAYER (<5s SLA)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               High-Frequency Validation Engine               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │
│  │  │ 2000+ TPS   │  │ <5s SLA     │  │ RPC         │          │   │
│  │  │ Throughput  │  │ Monitoring  │  │ Failover    │          │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │   │
│  │         │                │                │                  │   │
│  └─────────┼────────────────┼────────────────┼──────────────────┘   │
│            │                │                │                      │
│            ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      CVT TOKEN (SPL)                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │
│  │  │ Mint        │  │ Metadata    │  │ Vesting     │          │   │
│  │  │ 5g3Tkq...   │  │ D5qLqX...   │  │ Schedules   │          │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ ChronosVault    │  │ Bridge Program  │  │ Trinity         │     │
│  │ CYaDJY...       │  │ 6wo8Gs...       │  │ Validator       │     │
│  │ - Time locks    │  │ - HTLC swaps    │  │ - Consensus     │     │
│  │ - Multi-sig     │  │ - Cross-chain   │  │ - Signatures    │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## CVT Token Architecture

### Important: CVT is Solana-Native

**CVT Token exists ONLY on Solana as an SPL token.**

| Property | Value |
|----------|-------|
| **Token Standard** | SPL (Solana Program Library) |
| **Mint Address** | `5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4` |
| **Decimals** | 9 |
| **Total Supply** | 1,000,000,000 CVT |

### Cross-Chain CVT Operations

```
┌──────────────┐     HTLC      ┌──────────────┐
│   Arbitrum   │◄─────────────►│    Solana    │
│  (No native  │               │  (CVT Mint)  │
│   CVT token) │               │              │
└──────────────┘               └──────────────┘
                                      │
                                      │ HTLC
                                      ▼
                               ┌──────────────┐
                               │     TON      │
                               │  (No native  │
                               │   CVT token) │
                               └──────────────┘
```

- All CVT operations originate from Solana
- Cross-chain transfers use HTLC atomic swaps
- Arbitrum and TON do NOT have native CVT tokens
- Value transfer via locked/unlocked mechanisms

---

## Program Overview

### ChronosVault Program
**Address:** `CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2`

Time-locked vault functionality:

| Instruction | Description |
|-------------|-------------|
| `CreateVault` | Creates a new time-locked vault |
| `Deposit` | Deposits funds into a vault |
| `Withdraw` | Withdraws funds from unlocked vault |
| `AddCrossChainLink` | Links vault to other chains |
| `AddAuthorizedWithdrawer` | Adds collaborative withdrawer |
| `UpdateMetadata` | Updates vault metadata |
| `UnlockEarly` | Early unlock with authorization |
| `GenerateVerificationProof` | Creates cross-chain proof |

### Bridge Program
**Address:** `6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK`

Cross-chain HTLC operations:

| Feature | Description |
|---------|-------------|
| **HTLC Support** | Hash Time-Locked Contracts |
| **Routes** | Solana ↔ Arbitrum, Solana ↔ TON |
| **Signatures** | 2-of-3 Trinity consensus |

### Vesting Program
**Address:** `3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB`

Token vesting schedules for CVT distribution.

---

## Connected Contracts

### Arbitrum Sepolia (Chain ID: 1)
| Contract | Address |
|----------|---------|
| TrinityConsensusVerifier | `0x59396D58Fa856025bD5249E342729d5550Be151C` |
| HTLCChronosBridge | `0xc0B9C6cfb6e39432977693d8f2EBd4F2B5f73824` |
| CrossChainMessageRelay | `0xC6F4f855fc690CB52159eE3B13C9d9Fb8D403E59` |

### TON Testnet (Chain ID: 3)
| Contract | Address |
|----------|---------|
| TrinityConsensus | `EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8` |
| CrossChainBridge | `EQgWobA9D4u6Xem3B8e6Sde_NEFZYicyy7_5_XvOT18mA` |

---

## Validators (On-Chain Registered)

| Chain | Validator Address | Chain ID |
|-------|-------------------|----------|
| Arbitrum (PRIMARY) | `0x3A92fD5b39Ec9598225DB5b9f15af0523445E3d8` | 1 |
| Solana (MONITOR) | `0x2554324ae222673F4C36D1Ae0E58C19fFFf69cd5` | 2 |
| TON (BACKUP) | `0x9662e22D1f037C7EB370DD0463c597C6cd69B4c4` | 3 |

---

## Development

### Prerequisites
- Rust and Cargo
- Solana CLI tools
- Anchor framework (optional)

### Environment Setup

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Configure for Devnet
solana config set --url https://api.devnet.solana.com

# Set wallet
solana config set --keypair ~/.config/solana/id.json
```

### Build Programs

```bash
# Build with cargo
cargo build-bpf

# Or with Anchor
anchor build
```

### Deploy

```bash
# Deploy to Devnet
solana program deploy target/deploy/chronos_vault.so

# Deploy with specific program ID
solana program deploy target/deploy/chronos_vault.so --program-id CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2
```

---

## Files

| File | Type | Description |
|------|------|-------------|
| `chronos_vault.rs` | Rust | Main vault program |
| `cross_chain_bridge.rs` | Rust | Bridge program |
| `trinity_validator.rs` | Rust | Validator program |
| `cvt_bridge_FIXED.rs` | Rust | Fixed CVT bridge |
| `cvt_token/` | Directory | CVT SPL token program |
| `vesting_program/` | Directory | Vesting schedules |
| `deploy-trinity-validator.ts` | TypeScript | Deployment script |

---

## Vault Security Levels

| Level | Name | Features |
|-------|------|----------|
| 1 | Basic | Time lock only |
| 2 | Enhanced | + Access key required |
| 3 | Multi-sig | + Multiple authorizers |
| 4 | Institutional | + Full Trinity consensus |
| 5 | Maximum | + All security features |

---

## Cross-Chain Verification

The program generates verification proofs that can be validated on other chains:

```rust
pub struct VerificationProof {
    pub vault_id: Pubkey,
    pub timestamp: i64,
    pub merkle_root: [u8; 32],
    pub signature: [u8; 64],
    pub chain_id: u8,
}
```

---

## Performance

| Metric | Value |
|--------|-------|
| **Throughput** | 2000+ TPS |
| **Latency** | <5 seconds |
| **Finality** | ~400ms |
| **RPC Failover** | Automatic |

---

**Trinity Protocol - Solana Monitor Layer**  
*High-Frequency Validation for Multi-Chain Security*
