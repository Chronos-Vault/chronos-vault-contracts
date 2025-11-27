# Trinity Protocol v3.5.20  Multi-Chain Smart Contracts

[![Version](https://img.shields.io/badge/version-3.5.20-blue.svg)](https://github.com/Chronos-Vault)
[![Chains](https://img.shields.io/badge/chains-Arbitrum%20|%20Solana%20|%20TON-green.svg)](https://github.com/Chronos-Vault)
[![Consensus](https://img.shields.io/badge/consensus-2%20of%203-purple.svg)](https://github.com/Chronos-Vault)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

> **Enterprise-grade 2-of-3 multi-chain consensus verification system** for secure cross-chain vault management and atomic swaps.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         TRINITY PROTOCOL v3.5.20                                │
│                    2-of-3 Multi-Chain Consensus System                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│  │   ARBITRUM L2    │    │  SOLANA DEVNET   │    │   TON TESTNET    │          │
│  │   (PRIMARY)      │◄──►│    (MONITOR)     │◄──►│    (BACKUP)      │          │
│  │                  │    │                  │    │                  │          │
│  │ Security Layer   │    │ High-Frequency   │    │ Quantum-Safe     │          │
│  │ Consensus Core   │    │ Validation <5s   │    │ Recovery Layer   │          │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘          │
│           │                       │                       │                     │
│           └───────────────────────┼───────────────────────┘                     │
│                                   │                                             │
│                    ┌──────────────▼──────────────┐                              │
│                    │   TRINITY CONSENSUS ENGINE   │                              │
│                    │   Threshold: 2-of-3 Votes    │                              │
│                    │   Emergency: 3-of-3 Votes    │                              │
│                    └──────────────┬──────────────┘                              │
│                                   │                                             │
│  ┌────────────────────────────────┼────────────────────────────────┐            │
│  │                                │                                │            │
│  ▼                                ▼                                ▼            │
│ ┌────────────┐              ┌────────────┐              ┌────────────┐          │
│ │ ChronosVault│              │ HTLC Bridge│              │ Exit Gateway│          │
│ │ Optimized  │              │ Atomic Swap│              │ L1 Settlement│          │
│ └────────────┘              └────────────┘              └────────────┘          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Status

| Chain | Network | Status | Role |
|-------|---------|--------|------|
| Arbitrum | Sepolia Testnet | ✅ DEPLOYED | PRIMARY |
| Solana | Devnet | ✅ DEPLOYED | MONITOR |
| TON | Testnet | ✅ DEPLOYED | BACKUP |

**Deployed:** November 26, 2025 | **Version:** v3.5.20

---

## Deployed Contract Addresses

### Arbitrum Sepolia (Chain ID: 421614) - PRIMARY

**Explorer:** [https://sepolia.arbiscan.io](https://sepolia.arbiscan.io)

#### Core Consensus Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| **TrinityConsensusVerifier** | [`0x59396D58Fa856025bD5249E342729d5550Be151C`](https://sepolia.arbiscan.io/address/0x59396D58Fa856025bD5249E342729d5550Be151C) | Core 2-of-3 consensus verification |
| **EmergencyMultiSig** | [`0x066A39Af76b625c1074aE96ce9A111532950Fc41`](https://sepolia.arbiscan.io/address/0x066A39Af76b625c1074aE96ce9A111532950Fc41) | Emergency 3-of-3 multisig operations |

#### Infrastructure Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| **TrinityKeeperRegistry** | [`0xAe9bd988011583D87d6bbc206C19e4a9Bda04830`](https://sepolia.arbiscan.io/address/0xAe9bd988011583D87d6bbc206C19e4a9Bda04830) | Keeper management and registration |
| **TrinityGovernanceTimelock** | [`0xf6b9AB802b323f8Be35ca1C733e155D4BdcDb61b`](https://sepolia.arbiscan.io/address/0xf6b9AB802b323f8Be35ca1C733e155D4BdcDb61b) | Governance with time-delay |
| **CrossChainMessageRelay** | [`0xC6F4f855fc690CB52159eE3B13C9d9Fb8D403E59`](https://sepolia.arbiscan.io/address/0xC6F4f855fc690CB52159eE3B13C9d9Fb8D403E59) | Cross-chain message verification |
| **TrinityRelayerCoordinator** | [`0x4023B7307BF9e1098e0c34F7E8653a435b20e635`](https://sepolia.arbiscan.io/address/0x4023B7307BF9e1098e0c34F7E8653a435b20e635) | Relayer coordination |

#### Fee & Exit Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| **TrinityExitGateway** | [`0xE6FeBd695e4b5681DCF274fDB47d786523796C04`](https://sepolia.arbiscan.io/address/0xE6FeBd695e4b5681DCF274fDB47d786523796C04) | L1 exit and settlement |
| **TrinityFeeSplitter** | [`0x4F777c8c7D3Ea270c7c6D9Db8250ceBe1648A058`](https://sepolia.arbiscan.io/address/0x4F777c8c7D3Ea270c7c6D9Db8250ceBe1648A058) | Protocol fee distribution (40/30/20/10) |

#### HTLC Bridge Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| **HTLCChronosBridge** | [`0xc0B9C6cfb6e39432977693d8f2EBd4F2B5f73824`](https://sepolia.arbiscan.io/address/0xc0B9C6cfb6e39432977693d8f2EBd4F2B5f73824) | HTLC atomic swap bridge |
| **HTLCArbToL1** | [`0xaDDAC5670941416063551c996e169b0fa569B8e1`](https://sepolia.arbiscan.io/address/0xaDDAC5670941416063551c996e169b0fa569B8e1) | Arbitrum to L1 bridge |

#### Vault Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| **ChronosVaultOptimized** | [`0xAE408eC592f0f865bA0012C480E8867e12B4F32D`](https://sepolia.arbiscan.io/address/0xAE408eC592f0f865bA0012C480E8867e12B4F32D) | ERC-4626 compliant vault |
| **TestERC20** | [`0x4567853BE0d5780099E3542Df2e00C5B633E0161`](https://sepolia.arbiscan.io/address/0x4567853BE0d5780099E3542Df2e00C5B633E0161) | Test token for vault |

---

### Solana Devnet - MONITOR

**Explorer:** [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)

#### Programs

| Program | Address | Description |
|---------|---------|-------------|
| **ChronosVault Program** | [`CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2`](https://explorer.solana.com/address/CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2?cluster=devnet) | Main vault program |
| **Bridge Program** | [`6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK`](https://explorer.solana.com/address/6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK?cluster=devnet) | Cross-chain bridge program |
| **Vesting Program** | [`3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB`](https://explorer.solana.com/address/3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB?cluster=devnet) | Token vesting schedules |

#### CVT Token (Solana-Only SPL Token)

| Token | Address | Description |
|-------|---------|-------------|
| **CVT Mint** | [`5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4`](https://explorer.solana.com/address/5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4?cluster=devnet) | CVT SPL token mint |
| **CVT Metadata** | [`D5qLqXpJnWDrfpZoePauQv8g22DbM8CbeVZcjeBhdDgF`](https://explorer.solana.com/address/D5qLqXpJnWDrfpZoePauQv8g22DbM8CbeVZcjeBhdDgF?cluster=devnet) | Token metadata account |

#### Wallets

| Wallet | Address | Purpose |
|--------|---------|---------|
| **Deployment Wallet** | [`AjWeKXXgLpb2Cy3LfmqPjms3UkN1nAi596qBi8fRdLLQ`](https://explorer.solana.com/address/AjWeKXXgLpb2Cy3LfmqPjms3UkN1nAi596qBi8fRdLLQ?cluster=devnet) | Deployment authority |

---

### TON Testnet - BACKUP (Quantum-Safe)

**Explorer:** [https://testnet.tonscan.org](https://testnet.tonscan.org)

| Contract | Address | Description |
|----------|---------|-------------|
| **TrinityConsensus** | [`EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8`](https://testnet.tonscan.org/address/EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8) | Consensus with quantum recovery |
| **ChronosVault** | [`EQjUVidQfn4m-Rougn0fol7ECCthba2HV0M6xz9zAfax4`](https://testnet.tonscan.org/address/EQjUVidQfn4m-Rougn0fol7ECCthba2HV0M6xz9zAfax4) | Time-locked vault operations |
| **CrossChainBridge** | [`EQgWobA9D4u6Xem3B8e6Sde_NEFZYicyy7_5_XvOT18mA`](https://testnet.tonscan.org/address/EQgWobA9D4u6Xem3B8e6Sde_NEFZYicyy7_5_XvOT18mA) | HTLC atomic swaps |

**Quantum Security:** ML-KEM-1024 + CRYSTALS-Dilithium-5 (256-bit entropy)

---

## Validators (On-Chain Registered)

| Chain Role | Validator Address | Chain ID |
|------------|-------------------|----------|
| **Arbitrum (PRIMARY)** | `0x3A92fD5b39Ec9598225DB5b9f15af0523445E3d8` | 1 |
| **Solana (MONITOR)** | `0x2554324ae222673F4C36D1Ae0E58C19fFFf69cd5` | 2 |
| **TON (BACKUP)** | `0x9662e22D1f037C7EB370DD0463c597C6cd69B4c4` | 3 |

---

## Cross-Chain Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ATOMIC SWAP FLOW (HTLC)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  User                  Arbitrum                Solana                 TON       │
│   │                        │                      │                    │        │
│   │  1. Create Swap        │                      │                    │        │
│   ├───────────────────────►│                      │                    │        │
│   │                        │                      │                    │        │
│   │  2. Register HTLC      │                      │                    │        │
│   │                        ├─────────────────────►│                    │        │
│   │                        │   Hash Lock          │                    │        │
│   │                        │                      │                    │        │
│   │  3. Validator Vote #1  │                      │                    │        │
│   │                        │◄─────────────────────│                    │        │
│   │                        │                      │                    │        │
│   │  4. Validator Vote #2  │                      │                    │        │
│   │                        │◄───────────────────────────────────────────│        │
│   │                        │                      │                    │        │
│   │  5. 2-of-3 Achieved    │                      │                    │        │
│   │                        ├──────────────────────┼────────────────────►        │
│   │                        │   Execute Swap       │                    │        │
│   │                        │                      │                    │        │
│   │  6. Swap Complete      │                      │                    │        │
│   │◄───────────────────────│                      │                    │        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Contract Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CONTRACT DEPENDENCY GRAPH                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     CORE CONSENSUS LAYER                                 │   │
│  │  ┌───────────────────────┐     ┌───────────────────────┐                │   │
│  │  │ TrinityConsensusVerifier│◄───│ EmergencyMultiSig     │                │   │
│  │  │ (2-of-3 validation)    │     │ (3-of-3 emergency)    │                │   │
│  │  └───────────┬───────────┘     └───────────────────────┘                │   │
│  └──────────────┼───────────────────────────────────────────────────────────┘   │
│                 │                                                               │
│                 ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     INFRASTRUCTURE LAYER                                 │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │   │
│  │  │ KeeperRegistry │  │ Governance     │  │ RelayerCoord   │             │   │
│  │  │ - Registration │  │ Timelock       │  │ - Proof relay  │             │   │
│  │  │ - Heartbeats   │  │ - Proposals    │  │ - Nonce mgmt   │             │   │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘             │   │
│  └──────────┼───────────────────┼───────────────────┼───────────────────────┘   │
│             │                   │                   │                           │
│             ▼                   ▼                   ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     APPLICATION LAYER                                    │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │   │
│  │  │ ChronosVault   │  │ HTLCChronos    │  │ TrinityExit    │             │   │
│  │  │ Optimized      │  │ Bridge         │  │ Gateway        │             │   │
│  │  │ - ERC-4626     │  │ - Atomic swaps │  │ - L1 exits     │             │   │
│  │  │ - Yield vaults │  │ - Hash locks   │  │ - Batch claims │             │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘             │   │
│  │                                                                          │   │
│  │  ┌────────────────┐  ┌────────────────┐                                 │   │
│  │  │ CrossChain     │  │ FeeSplitter    │                                 │   │
│  │  │ MessageRelay   │  │ - Distribution │                                 │   │
│  │  │ - Verification │  │ - Accounting   │                                 │   │
│  │  └────────────────┘  └────────────────┘                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     LIBRARIES (contracts/ethereum/libraries/)            │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │ProofValidation│ │CircuitBreaker│ │FeeAccounting │ │OperationLife│    │   │
│  │  │ - ZK proofs   │ │ - Rate limits │ │ - Tracking   │ │ - States    │    │   │
│  │  │ - Signatures  │ │ - Cooldowns   │ │ - Splits     │ │ - Timeouts  │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  │  ┌──────────────┐ ┌──────────────┐                                      │   │
│  │  │ConsensusLib  │ │ Errors.sol   │                                      │   │
│  │  │ - Proposals  │ │ - 70+ errors │                                      │   │
│  │  │ - Voting     │ │ - Gas-eff.   │                                      │   │
│  │  └──────────────┘ └──────────────┘                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Libraries (contracts/ethereum/libraries/)

| Library | File | Purpose |
|---------|------|---------|
| **ProofValidation** | `ProofValidation.sol` | ZK proof and Merkle signature verification |
| **CircuitBreakerLib** | `CircuitBreakerLib.sol` | Rate limiting and emergency stops |
| **FeeAccounting** | `FeeAccounting.sol` | Fee tracking and distribution logic |
| **OperationLifecycle** | `OperationLifecycle.sol` | State machine for operations |
| **ConsensusProposalLib** | `ConsensusProposalLib.sol` | Proposal creation and voting |
| **Errors** | `Errors.sol` | 70+ custom error definitions |

---

## Interfaces (contracts/ethereum/)

| Interface | File | Purpose |
|-----------|------|---------|
| **ITrinityConsensusVerifier** | `ITrinityConsensusVerifier.sol` | Consensus verification interface |
| **ITrinityBatchVerifier** | `ITrinityBatchVerifier.sol` | Batch operation verification |
| **IChronosVault** | `IChronosVault.sol` | Vault operations interface |
| **IHTLC** | `IHTLC.sol` | Hash Time-Locked Contract interface |

---

## Chain Roles Explained

### Arbitrum (PRIMARY) - Chain ID: 1
- **Primary security layer** for consensus verification
- Hosts all core Solidity contracts
- Processes 2-of-3 validator votes
- Manages vault deposits/withdrawals
- Executes HTLC atomic swaps

### Solana (MONITOR) - Chain ID: 2
- **High-frequency validation** with <5 second SLA
- Monitors all cross-chain operations
- Provides second validator vote
- Hosts CVT token (SPL - Solana Program Library)
- Handles high-throughput transaction validation (2000+ TPS)

### TON (BACKUP) - Chain ID: 3
- **Quantum-resistant emergency recovery**
- Uses ML-KEM-1024 and CRYSTALS-Dilithium-5
- 48-hour delay for emergency recovery operations
- Provides third validator vote
- Fallback for catastrophic scenarios

---

## Security Features

### Consensus Requirements
| Operation Type | Required Votes | Timelock |
|----------------|----------------|----------|
| Standard Operations | 2-of-3 | None |
| Emergency Operations | 3-of-3 | None |
| Recovery Operations | 3-of-3 | 48 hours |

### Cryptographic Standards
| Chain | Algorithm | Standard |
|-------|-----------|----------|
| Ethereum/Arbitrum | ECDSA secp256k1 | EIP-712 |
| Solana | Ed25519 | SPL |
| TON | ML-KEM-1024 + Dilithium-5 | NIST Post-Quantum |

### 7-Layer Mathematical Defense
1. **Zero-Knowledge Proof Engine** (Groth16)
2. **Formal Verification Pipeline** (Lean 4)
3. **MPC Key Management** (Shamir + CRYSTALS-Kyber)
4. **VDF Time-Locks** (Wesolowski VDF)
5. **AI + Cryptographic Governance**
6. **Quantum-Resistant Cryptography** (ML-KEM-1024, CRYSTALS-Dilithium-5)
7. **Trinity Protocol 2-of-3 Multi-Chain Consensus**

---

## Developer Quick Start

### Installation

```bash
git clone https://github.com/Chronos-Vault/chronos-vault-contracts.git
cd chronos-vault-contracts
npm install
npx hardhat compile
```

### Deploy to Testnet

```bash
# Arbitrum Sepolia
npx hardhat run scripts/deploy-arbitrum-trinity.ts --network arbitrum-sepolia

# Solana Devnet
solana program deploy target/deploy/chronos_vault.so

# TON Testnet
npx tsx contracts/ton/deploy-all-contracts.ts
```

### Verify Contracts

```bash
npx hardhat verify --network arbitrum-sepolia 0x59396D58Fa856025bD5249E342729d5550Be151C
```

---

## Directory Structure

```
contracts/
├── ethereum/              # Arbitrum/Ethereum Solidity contracts
│   ├── libraries/         # Shared Solidity libraries
│   ├── interfaces/        # Contract interfaces
│   ├── mocks/             # Mock contracts for testing
│   └── test/              # Contract tests
├── solana/                # Solana Rust programs
│   ├── cvt_token/         # CVT SPL token program
│   ├── trinity/           # Trinity validator program
│   └── vesting_program/   # Token vesting
├── ton/                   # TON FunC contracts
│   └── deploy scripts     # TON deployment utilities
├── deployments/           # Deployment addresses by network
└── README.md              # This file
```

---

## Environment Variables

```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
SOLANA_RPC_URL=https://api.devnet.solana.com
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC
PRIVATE_KEY=your_private_key  # Never commit!
```

---

## Testing

```bash
npx hardhat test                    # Hardhat tests
cargo test-bpf                      # Solana tests
npm run test:integration            # Integration tests
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v3.5.20 | Nov 26, 2025 | Full 3-chain deployment (Arbitrum, Solana, TON) |
| v3.5.19 | Nov 2025 | Merkle expiry, bootstrap deadline |
| v3.5.10 | Nov 2025 | Exit-Batch system, L1 bridging |
| v3.5.6 | Nov 2025 | Security hardening, audit fixes |

---

**Trinity Protocol** - Secure. Decentralized. Quantum-Ready.

Built with security in mind for the future of multi-chain DeFi.
