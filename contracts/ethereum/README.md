# Trinity Protocol v3.5.20 - Ethereum/Arbitrum Smart Contracts

[![Deployed](https://img.shields.io/badge/status-DEPLOYED-green.svg)](https://sepolia.arbiscan.io)
[![Network](https://img.shields.io/badge/network-Arbitrum%20Sepolia-blue.svg)](https://sepolia.arbiscan.io)
[![Role](https://img.shields.io/badge/role-PRIMARY-purple.svg)](https://sepolia.arbiscan.io)

> **Primary security layer** for Trinity Protocol's 2-of-3 multi-chain consensus verification system.

## Deployment Status: ✅ DEPLOYED

**Network:** Arbitrum Sepolia (Chain ID: 421614)  
**Deployed:** November 25-26, 2025  
**Explorer:** [https://sepolia.arbiscan.io](https://sepolia.arbiscan.io)

---

## Deployed Contract Addresses

### Core Consensus Layer

| Contract | Address | Purpose |
|----------|---------|---------|
| **TrinityConsensusVerifier** | [`0x59396D58Fa856025bD5249E342729d5550Be151C`](https://sepolia.arbiscan.io/address/0x59396D58Fa856025bD5249E342729d5550Be151C) | Core 2-of-3 consensus verification |
| **EmergencyMultiSig** | [`0x066A39Af76b625c1074aE96ce9A111532950Fc41`](https://sepolia.arbiscan.io/address/0x066A39Af76b625c1074aE96ce9A111532950Fc41) | Emergency 3-of-3 multisig |

### Infrastructure Layer

| Contract | Address | Purpose |
|----------|---------|---------|
| **TrinityKeeperRegistry** | [`0xAe9bd988011583D87d6bbc206C19e4a9Bda04830`](https://sepolia.arbiscan.io/address/0xAe9bd988011583D87d6bbc206C19e4a9Bda04830) | Keeper registration & management |
| **TrinityGovernanceTimelock** | [`0xf6b9AB802b323f8Be35ca1C733e155D4BdcDb61b`](https://sepolia.arbiscan.io/address/0xf6b9AB802b323f8Be35ca1C733e155D4BdcDb61b) | Governance with time-delay |
| **CrossChainMessageRelay** | [`0xC6F4f855fc690CB52159eE3B13C9d9Fb8D403E59`](https://sepolia.arbiscan.io/address/0xC6F4f855fc690CB52159eE3B13C9d9Fb8D403E59) | Cross-chain message verification |
| **TrinityRelayerCoordinator** | [`0x4023B7307BF9e1098e0c34F7E8653a435b20e635`](https://sepolia.arbiscan.io/address/0x4023B7307BF9e1098e0c34F7E8653a435b20e635) | Relayer coordination |

### Fee & Exit Layer

| Contract | Address | Purpose |
|----------|---------|---------|
| **TrinityExitGateway** | [`0xE6FeBd695e4b5681DCF274fDB47d786523796C04`](https://sepolia.arbiscan.io/address/0xE6FeBd695e4b5681DCF274fDB47d786523796C04) | L1 exit and settlement |
| **TrinityFeeSplitter** | [`0x4F777c8c7D3Ea270c7c6D9Db8250ceBe1648A058`](https://sepolia.arbiscan.io/address/0x4F777c8c7D3Ea270c7c6D9Db8250ceBe1648A058) | Fee distribution (40/30/20/10) |

### HTLC Bridge Layer

| Contract | Address | Purpose |
|----------|---------|---------|
| **HTLCChronosBridge** | [`0xc0B9C6cfb6e39432977693d8f2EBd4F2B5f73824`](https://sepolia.arbiscan.io/address/0xc0B9C6cfb6e39432977693d8f2EBd4F2B5f73824) | HTLC atomic swap bridge |
| **HTLCArbToL1** | [`0xaDDAC5670941416063551c996e169b0fa569B8e1`](https://sepolia.arbiscan.io/address/0xaDDAC5670941416063551c996e169b0fa569B8e1) | Arbitrum to L1 exits |

### Vault Layer

| Contract | Address | Purpose |
|----------|---------|---------|
| **ChronosVaultOptimized** | [`0xAE408eC592f0f865bA0012C480E8867e12B4F32D`](https://sepolia.arbiscan.io/address/0xAE408eC592f0f865bA0012C480E8867e12B4F32D) | ERC-4626 optimized vault |
| **TestERC20** | [`0x4567853BE0d5780099E3542Df2e00C5B633E0161`](https://sepolia.arbiscan.io/address/0x4567853BE0d5780099E3542Df2e00C5B633E0161) | Test token |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ARBITRUM PRIMARY LAYER (L2 Security)                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        CORE CONSENSUS LAYER                              │   │
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────┐       │   │
│  │  │   TrinityConsensusVerifier  │  │     EmergencyMultiSig       │       │   │
│  │  │   0x59396D58...             │  │     0x066A39Af...           │       │   │
│  │  │   - 2-of-3 validation       │  │     - 3-of-3 emergency      │       │   │
│  │  │   - Merkle proofs           │  │     - Time-locked actions   │       │   │
│  │  │   - Signature verification  │◄─┤     - Guardian recovery     │       │   │
│  │  └──────────────┬──────────────┘  └─────────────────────────────┘       │   │
│  │                 │                                                        │   │
│  └─────────────────┼────────────────────────────────────────────────────────┘   │
│                    │                                                            │
│                    ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      INFRASTRUCTURE LAYER                                │   │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │   │
│  │  │ KeeperRegistry   │ │ GovernanceTime-  │ │ RelayerCoord-    │         │   │
│  │  │ 0xAe9bd988...    │ │ lock 0xf6b9AB...│ │ inator 0x4023B7..│         │   │
│  │  │ - Registration   │ │ - Proposals      │ │ - Proof relay    │         │   │
│  │  │ - Heartbeats     │ │ - Voting         │ │ - Nonce mgmt     │         │   │
│  │  │ - Slashing       │ │ - Execution      │ │ - Batching       │         │   │
│  │  └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘         │   │
│  └───────────┼────────────────────┼────────────────────┼────────────────────┘   │
│              │                    │                    │                        │
│              ▼                    ▼                    ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       APPLICATION LAYER                                  │   │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │   │
│  │  │ ChronosVault     │ │ HTLCChronos      │ │ TrinityExit      │         │   │
│  │  │ Optimized        │ │ Bridge           │ │ Gateway          │         │   │
│  │  │ 0xAE408eC5...    │ │ 0xc0B9C6cf...    │ │ 0xE6FeBd69...    │         │   │
│  │  │ - ERC-4626       │ │ - Atomic swaps   │ │ - L1 exits       │         │   │
│  │  │ - Yield vaults   │ │ - Hash locks     │ │ - Batch claims   │         │   │
│  │  │ - Trinity req    │ │ - Time locks     │ │ - Priority       │         │   │
│  │  └──────────────────┘ └──────────────────┘ └──────────────────┘         │   │
│  │                                                                          │   │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │   │
│  │  │ CrossChain       │ │ FeeSplitter      │ │ HTLCArbToL1      │         │   │
│  │  │ MessageRelay     │ │ 0x4F777c8c...    │ │ 0xaDDAC567...    │         │   │
│  │  │ 0xC6F4f855...    │ │ - 40/30/20/10    │ │ - ArbSys bridge  │         │   │
│  │  │ - Verification   │ │ - Accounting     │ │ - Priority exits │         │   │
│  │  └──────────────────┘ └──────────────────┘ └──────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Contract Dependencies

```
                    ┌───────────────────────────────┐
                    │    TrinityConsensusVerifier   │
                    │    (Core 2-of-3 Consensus)    │
                    └───────────────┬───────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  TrinityKeeper      │  │  CrossChainMessage  │  │  EmergencyMultiSig  │
│  Registry           │  │  Relay              │  │                     │
└─────────┬───────────┘  └─────────┬───────────┘  └─────────────────────┘
          │                        │
          ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐
│  TrinityRelayer     │  │  HTLCChronosBridge  │
│  Coordinator        │  │                     │
└─────────────────────┘  └─────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
         ┌─────────────────────┐       ┌─────────────────────┐
         │  ChronosVault       │       │  TrinityExitGateway │
         │  Optimized          │       │                     │
         └─────────────────────┘       └─────────────────────┘
```

---

## Libraries

Located in `contracts/ethereum/libraries/`:

| Library | File | Purpose | Version |
|---------|------|---------|---------|
| **ProofValidation** | `ProofValidation.sol` | Merkle proof verification, DoS protection | v3.5.6 |
| **CircuitBreakerLib** | `CircuitBreakerLib.sol` | Rate limiting, emergency stops | v3.1 |
| **FeeAccounting** | `FeeAccounting.sol` | Fee tracking, priority multipliers | v3.1 |
| **OperationLifecycle** | `OperationLifecycle.sol` | State machine, timeouts | v3.1 |
| **ConsensusProposalLib** | `ConsensusProposalLib.sol` | Proposals, voting, chainId validation | v3.5.6 |
| **Errors** | `Errors.sol` | 70+ custom errors | v3.5.6 |

### Library Usage

```solidity
import "./libraries/Errors.sol";
import "./libraries/ProofValidation.sol";
import "./libraries/ConsensusProposalLib.sol";

contract MyContract {
    // ProofValidation enforces 32-depth limit automatically
    function verifyProof(bytes32[] calldata proof) external {
        bool valid = ProofValidation.verifyMerkleProofWithNonce(
            leaf, proof, root, nonce
        );
        if (!valid) revert Errors.InvalidMerkleProof(opId, chainId);
    }
}
```

---

## Interfaces

| Interface | File | Purpose |
|-----------|------|---------|
| **ITrinityConsensusVerifier** | `ITrinityConsensusVerifier.sol` | Consensus verification |
| **ITrinityBatchVerifier** | `ITrinityBatchVerifier.sol` | Batch operations |
| **IChronosVault** | `IChronosVault.sol` | Vault operations |
| **IHTLC** | `IHTLC.sol` | Hash Time-Locked Contracts |

---

## Validators (On-Chain Registered)

| Chain | Validator Address | Chain ID |
|-------|-------------------|----------|
| **Arbitrum (PRIMARY)** | `0x3A92fD5b39Ec9598225DB5b9f15af0523445E3d8` | 1 |
| **Solana (MONITOR)** | `0x2554324ae222673F4C36D1Ae0E58C19fFFf69cd5` | 2 |
| **TON (BACKUP)** | `0x9662e22D1f037C7EB370DD0463c597C6cd69B4c4` | 3 |

---

## Connected Chains

### Solana Devnet (Chain ID: 2)
| Program | Address |
|---------|---------|
| ChronosVault Program | `CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2` |
| CVT Token Mint | `5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4` |

### TON Testnet (Chain ID: 3)
| Contract | Address |
|----------|---------|
| TrinityConsensus | `EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8` |
| CrossChainBridge | `EQgWobA9D4u6Xem3B8e6Sde_NEFZYicyy7_5_XvOT18mA` |

---

## Security Features

### Consensus Requirements

| Operation | Votes Required | Timelock |
|-----------|----------------|----------|
| Standard Operations | 2-of-3 | None |
| Emergency Operations | 3-of-3 | None |
| Recovery Operations | 3-of-3 | 48 hours |

### v3.5.20 Security Hardening

| Fix ID | Severity | Description | Status |
|--------|----------|-------------|--------|
| C-1 | CRITICAL | Merkle proof depth limit (≤32) | ✅ Fixed |
| C-2 | CRITICAL | Balance invariant enforcement | ✅ Fixed |
| C-3 | CRITICAL | CEI pattern strict enforcement | ✅ Fixed |
| H-1 | HIGH | Vault ETH reception validation | ✅ Fixed |
| H-3 | HIGH | ChainId in MerkleRootProposal | ✅ Fixed |
| M-1 | MEDIUM | Fee beneficiary rotation | ✅ Fixed |

### Fee Structure

| Component | Allocation |
|-----------|------------|
| Protocol Treasury | 40% |
| Validators | 30% |
| Keepers | 20% |
| Emergency Fund | 10% |

---

## Development

### Prerequisites
- Node.js v16+
- Hardhat
- Ethers.js v6

### Installation

```bash
cd contracts/ethereum
npm install
```

### Compilation

```bash
npx hardhat compile
```

### Testing

```bash
npx hardhat test
npx hardhat test --grep "Trinity"
```

### Deployment

```bash
# Deploy to Arbitrum Sepolia
npx hardhat run scripts/deploy-arbitrum-trinity.ts --network arbitrum-sepolia
```

### Verification

```bash
npx hardhat verify --network arbitrum-sepolia 0x59396D58Fa856025bD5249E342729d5550Be151C
```

---

## Environment Variables

```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_private_key
ARBISCAN_API_KEY=your_arbiscan_api_key
```

---

## Files

### Core Contracts

| File | Description |
|------|-------------|
| `TrinityConsensusVerifier.sol` | Core 2-of-3 consensus |
| `EmergencyMultiSig.sol` | Emergency operations |
| `ChronosVault.sol` | Base vault contract |
| `ChronosVaultOptimized.sol` | ERC-4626 vault |

### Infrastructure Contracts

| File | Description |
|------|-------------|
| `TrinityKeeperRegistry.sol` | Keeper management |
| `TrinityGovernanceTimelock.sol` | Governance |
| `CrossChainMessageRelay.sol` | Message relay |
| `TrinityRelayerCoordinator.sol` | Relayer coordination |

### Bridge Contracts

| File | Description |
|------|-------------|
| `HTLCChronosBridge.sol` | HTLC atomic swaps |
| `HTLCArbToL1.sol` | Arbitrum to L1 exits |
| `TrinityExitGateway.sol` | Exit settlement |
| `TrinityFeeSplitter.sol` | Fee distribution |

---

## Gas Optimization

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Create Operation | ~150,000 | With Trinity consensus |
| Verify Proof | ~45,000 | Depth-dependent |
| Execute Swap | ~200,000 | HTLC with 2-of-3 |
| Exit Batch | ~80,000 | Per exit in batch |

---

**Trinity Protocol - Arbitrum Primary Layer**  
*Secure Consensus for Multi-Chain DeFi*
