# Trinity Protocol v3.5.20 - Deployment Guide

Complete deployment guide for Trinity Protocol across Arbitrum, Solana, and TON blockchains.

---

## Overview

Trinity Protocol consists of three independently deployed components:

1. **Arbitrum Sepolia** (PRIMARY) — 12 Solidity contracts
2. **Solana Devnet** (MONITOR) — 3 Rust programs + CVT token
3. **TON Testnet** (BACKUP) — 3 FunC smart contracts

Each deployment is independent but interconnected through cross-chain validators.

---

## Prerequisites

### Required Tools

```bash
# Ethereum/Arbitrum
npm install -g hardhat ethers

# Solana
npm install -g @solana/cli @anchor-lang/cli

# TON
npm install -g @ton/blueprint @ton-community/func-js

# General
npm install -g typescript dotenv
```

### Required Credentials

```bash
# Ethereum/Arbitrum
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_PRIVATE_KEY=your_ethereum_private_key

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=base64_encoded_keypair
SOLANA_NETWORK=devnet

# TON
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC
TON_MNEMONIC=your_ton_wallet_mnemonic
```

---

## Arbitrum Sepolia Deployment (PRIMARY)

### Step 1: Prepare Environment

```bash
cd contracts/ethereum
cp .env.example .env
```

**Configure `.env`:**
```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_PRIVATE_KEY=your_ethereum_private_key_without_0x
ETHERSCAN_API_KEY=your_arbiscan_api_key
NETWORK=arbitrum-sepolia
CHAIN_ID=421614
```

### Step 2: Compile Contracts

```bash
npx hardhat compile
```

**Expected Output:**
```
✓ Compiled successfully (XX files)
  - TrinityConsensusVerifier.sol
  - ChronosVaultOptimized.sol
  - HTLCChronosBridge.sol
  - [... 9 more contracts]
```

### Step 3: Deploy Contracts

```bash
npx hardhat run scripts/deploy-arbitrum-v3.5.20.ts --network arbitrum-sepolia
```

**Deployment Order:**
1. Core consensus contracts
2. Infrastructure contracts
3. Application contracts
4. Validator registration

**Expected Output:**
```
Deploying Trinity Protocol v3.5.20 to Arbitrum Sepolia...

✓ TrinityConsensusVerifier: 0x59396D58Fa856025bD5249E342729d5550Be151C
✓ EmergencyMultiSig: 0x066A39Af76b625c1074aE96ce9A111532950Fc41
✓ TrinityKeeperRegistry: 0xAe9bd988011583D87d6bbc206C19e4a9Bda04830
✓ TrinityGovernanceTimelock: 0xf6b9AB802b323f8Be35ca1C733e155D4BdcDb61b
✓ CrossChainMessageRelay: 0xC6F4f855fc690CB52159eE3B13C9d9Fb8D403E59
✓ TrinityRelayerCoordinator: 0x4023B7307BF9e1098e0c34F7E8653a435b20e635
✓ HTLCChronosBridge: 0xc0B9C6cfb6e39432977693d8f2EBd4F2B5f73824
✓ HTLCArbToL1: 0xaDDAC5670941416063551c996e169b0fa569B8e1
✓ TrinityExitGateway: 0xE6FeBd695e4b5681DCF274fDB47d786523796C04
✓ TrinityFeeSplitter: 0x4F777c8c7D3Ea270c7c6D9Db8250ceBe1648A058
✓ ChronosVaultOptimized: 0xAE408eC592f0f865bA0012C480E8867e12B4F32D
✓ TestERC20: 0x4567853BE0d5780099E3542Df2e00C5B633E0161

Deployment Summary:
- Chain: Arbitrum Sepolia (421614)
- Total Gas Used: XXX,XXX
- Total Cost: ~XX.XX ETH
```

### Step 4: Verify Contracts on Arbiscan

```bash
npx hardhat verify --network arbitrum-sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Step 5: Register Validator

```bash
npx hardhat run scripts/register-validator.ts --network arbitrum-sepolia
```

**Configuration for Validator #1:**
```typescript
const validator = {
  chainId: 1,
  address: "0x3A92fD5b39Ec9598225DB5b9f15af0523445E3d8",
  keyType: "secp256k1",
  endpoint: "https://validator1-arbitrum.your-domain.com"
};
```

---

## Solana Devnet Deployment (MONITOR)

### Step 1: Prepare Environment

```bash
cd contracts/solana
cp .env.example .env
```

**Configure `.env`:**
```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=base64_encoded_keypair
SOLANA_NETWORK=devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
```

### Step 2: Build Programs

```bash
anchor build
```

**Expected Output:**
```
Building programs...
✓ chronos_vault
✓ bridge_program
✓ vesting_program

Build Summary:
- Programs: 3 built successfully
- Total size: XXX KB
```

### Step 3: Deploy Programs

```bash
solana program deploy target/deploy/chronos_vault.so --url devnet --keypair ~/.config/solana/id.json
solana program deploy target/deploy/bridge_program.so --url devnet --keypair ~/.config/solana/id.json
solana program deploy target/deploy/vesting_program.so --url devnet --keypair ~/.config/solana/id.json
```

**Expected Output:**
```
Program deployed successfully.
Program Id: CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2
Transaction signature: <TX_HASH>
```

### Step 4: Create CVT Token (SPL)

```bash
spl-token create-token
# Output: Creating token <TOKEN_MINT>

spl-token create-account <TOKEN_MINT>
# Output: Creating account <ACCOUNT_ADDRESS>

spl-token mint <TOKEN_MINT> 1000000000 <ACCOUNT_ADDRESS>
# Minted 1B CVT tokens
```

**CVT Token Configuration:**
- Mint: `5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4`
- Decimals: 6
- Supply: 1,000,000,000 CVT
- Standard: SPL Token 2022

### Step 5: Register Validator

```bash
solana program invoke CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2 --keypair ~/.config/solana/id.json \
  --with-computed-unit-price 1000 \
  register-validator \
  --chain-id 2 \
  --validator-address 0x2554324ae222673F4C36D1Ae0E58C19fFFf69cd5
```

---

## TON Testnet Deployment (BACKUP)

### Step 1: Prepare Environment

```bash
cd contracts/ton
cp .env.example .env
```

**Configure `.env`:**
```bash
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC
TON_API_KEY=your_toncenter_api_key
TON_MNEMONIC=your_wallet_mnemonic_24_words
TON_NETWORK=testnet
```

### Step 2: Compile Contracts

```bash
blueprint compile TrinityConsensus
blueprint compile ChronosVault
blueprint compile CrossChainBridge
```

**Expected Output:**
```
✓ TrinityConsensus.fc → TrinityConsensus.compiled.json
✓ ChronosVault.fc → ChronosVault.compiled.json
✓ CrossChainBridge.fc → CrossChainBridge.compiled.json
```

### Step 3: Deploy Contracts

```bash
blueprint run deployTrinityConsensus --testnet
blueprint run deployChronosVault --testnet
blueprint run deployCrossChainBridge --testnet
```

**Expected Output:**
```
✓ TrinityConsensus deployed: EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8
✓ ChronosVault deployed: EQjUVidQfn4m-Rougn0fol7ECCthba2HV0M6xz9zAfax4
✓ CrossChainBridge deployed: EQgWobA9D4u6Xem3B8e6Sde_NEFZYicyy7_5_XvOT18mA
```

### Step 4: Register Validator

```bash
blueprint run registerValidator --testnet \
  --chain-id 3 \
  --validator-address 0x9662e22D1f037C7EB370DD0463c597C6cd69B4c4
```

---

## Cross-Chain Validator Setup

### Configure Validator Services

Each validator requires a service running to monitor all three chains:

**Validator Configuration (validator-config.json):**
```json
{
  "validators": [
    {
      "chainId": 1,
      "name": "Arbitrum Validator",
      "rpcUrl": "https://sepolia-rollup.arbitrum.io/rpc",
      "contractAddress": "0x59396D58Fa856025bD5249E342729d5550Be151C",
      "privateKey": "0x...",
      "endpoint": "https://validator-arbitrum.your-domain.com"
    },
    {
      "chainId": 2,
      "name": "Solana Validator",
      "rpcUrl": "https://api.devnet.solana.com",
      "programId": "CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2",
      "keypair": "base64_encoded_keypair",
      "endpoint": "https://validator-solana.your-domain.com"
    },
    {
      "chainId": 3,
      "name": "TON Validator",
      "rpcUrl": "https://testnet.toncenter.com/api/v2/jsonRPC",
      "contractAddress": "EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8",
      "mnemonic": "your wallet mnemonic",
      "endpoint": "https://validator-ton.your-domain.com"
    }
  ]
}
```

### Run Validator Service

```bash
npm run validator:start

# Output:
# ✅ Validator 1 (Arbitrum) started
#    Monitoring: 0x59396D58Fa856025bD5249E342729d5550Be151C
#    Endpoint: https://validator-arbitrum.your-domain.com
#
# ✅ Validator 2 (Solana) started
#    Monitoring: CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2
#    Endpoint: https://validator-solana.your-domain.com
#
# ✅ Validator 3 (TON) started
#    Monitoring: EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8
#    Endpoint: https://validator-ton.your-domain.com
```

---

## Trinity Relayer Service

### Setup Relayer

```bash
cd server
npm install
cp .env.example .env
```

**Configure `.env`:**
```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
SOLANA_RPC_URL=https://api.devnet.solana.com
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC

ARBITRUM_CONSENSUS_ADDRESS=0x59396D58Fa856025bD5249E342729d5550Be151C
SOLANA_CONSENSUS_PROGRAM=CYaDJYRqm35udQ8vkxoajSER8oaniQUcV8Vvw5BqJyo2
TON_CONSENSUS_ADDRESS=EQeGlYzwupSROVWGucOmKyUDbSaKmPfIpHHP5mV73odL8

RELAYER_PRIVATE_KEY=your_relayer_private_key
RELAYER_PORT=3000
ENABLE_TRINITY_RELAYER=true
```

### Start Relayer

```bash
npm run relayer:start

# Output:
# ✅ Trinity Relayer started
#    - Arbitrum RPC: https://sepolia-rollup.arbitrum.io/rpc
#    - Solana RPC: https://api.devnet.solana.com
#    - TON RPC: https://testnet.toncenter.com/api/v2/jsonRPC
#    - Listening on port 3000
#    - Consensus threshold: 2-of-3
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All contracts compiled without errors
- [ ] All contracts verified on block explorers
- [ ] Validators configured with correct RPC endpoints
- [ ] Private keys stored securely (not in git)
- [ ] Environment variables properly configured
- [ ] Rate limits configured for all RPC endpoints
- [ ] Monitoring and alerting set up

### Arbitrum

- [ ] Deploy all 12 contracts to Arbitrum One
- [ ] Verify contracts on Arbiscan
- [ ] Register Arbitrum validator
- [ ] Set gas limits and fee structures
- [ ] Configure emergency pause mechanisms

### Solana

- [ ] Deploy programs to Solana Mainnet
- [ ] Create CVT token on Mainnet
- [ ] Register Solana validator
- [ ] Configure RPC failover endpoints
- [ ] Set compute unit prices

### TON

- [ ] Deploy contracts to TON Mainnet
- [ ] Register TON validator
- [ ] Test quantum recovery mechanisms
- [ ] Configure 48-hour timelock parameters
- [ ] Set up monitoring dashboards

### Cross-Chain

- [ ] Verify 2-of-3 consensus works across all chains
- [ ] Test atomic swaps end-to-end
- [ ] Load test with high transaction volume
- [ ] Test emergency procedures
- [ ] Verify relay propagation latency

---

## Testing Deployment

### Test Arbitrum Consensus

```bash
npm run test:arbitrum

# Output:
# ✓ Consensus verification works
# ✓ Keeper registration works
# ✓ Fee splitting works
# ✓ Emergency multisig works
# ✓ Exit gateway works
```

### Test Solana Programs

```bash
npm run test:solana

# Output:
# ✓ ChronosVault program works
# ✓ Bridge program works
# ✓ CVT token minting works
# ✓ Validator voting works
```

### Test TON Contracts

```bash
npm run test:ton

# Output:
# ✓ TrinityConsensus works
# ✓ Quantum recovery path works
# ✓ Timelock mechanism works
```

### Test Cross-Chain Atomic Swap

```bash
npm run test:cross-chain

# Output:
# Step 1: Create HTLC on Arbitrum ✓
# Step 2: Register on Solana ✓
# Step 3: Validator 1 (Arbitrum) votes ✓
# Step 4: Validator 2 (Solana) votes ✓
# Step 5: 2-of-3 Consensus achieved ✓
# Step 6: Swap executed ✓
```

---

## Monitoring & Alerting

### Key Metrics

```bash
# Consensus uptime
- 2-of-3 consensus achieved: 99.9%+

# Validator latency
- Arbitrum: <2s per operation
- Solana: <5s per operation
- TON: <10s per operation

# Cross-chain propagation
- Proof relay latency: <30s average
- Double-spending prevention: 100%

# System health
- RPC endpoint availability: 99.95%+
- Smart contract reverts: <0.1%
- Gas price spikes: Alert if >2x average
```

### Setup Alerts

```bash
# Monitor via logs
tail -f logs/validator.log
tail -f logs/relayer.log
tail -f logs/consensus.log

# Setup monitoring service
npm run monitoring:start
```

---

## Troubleshooting

### Arbitrum Issues

**Problem:** Contract deployment fails  
**Solution:** Check gas prices, fund deployer wallet with testnet ETH

**Problem:** Validator voting not working  
**Solution:** Verify validator address registered in TrinityConsensusVerifier

### Solana Issues

**Problem:** Program deploy fails  
**Solution:** Ensure keypair has sufficient SOL (~5 SOL for deployment)

**Problem:** CVT token creation fails  
**Solution:** Use `spl-token` CLI to debug token creation

### TON Issues

**Problem:** Contract compilation fails  
**Solution:** Update FunC version: `blueprint --version`

**Problem:** Validator registration fails  
**Solution:** Check TON wallet has sufficient balance (>1 TON)

### Cross-Chain Issues

**Problem:** 2-of-3 consensus not achieved  
**Solution:** Check all 3 validators are running and RPC endpoints accessible

**Problem:** Atomic swap timeout  
**Solution:** Verify timelock period not expired, check HTLC contract balance

---

## Support & Documentation

- **GitHub Issues:** [github.com/Chronos-Vault/chronos-vault-contracts/issues](https://github.com/Chronos-Vault/chronos-vault-contracts/issues)
- **Technical Docs:** `ARCHITECTURE.md`, `SECURITY_ARCHITECTURE.md`
- **API Reference:** `API_REFERENCE.md`
- **Security:** `SECURITY.md`

---

*Trinity Protocol v3.5.20 — Deployment Guide*  
*Multi-Chain Consensus Verification System*
