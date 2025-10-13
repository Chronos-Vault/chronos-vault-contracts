# ChronosToken (CVT) - Solana SPL Token

## Overview

CVT is the native utility token of the Chronos Vault platform, deployed across three blockchains as part of the Trinity Protocol security architecture.

**Token Specifications:**
- **Name**: ChronosToken
- **Symbol**: CVT
- **Standard**: SPL Token (Solana Program Library)
- **Total Supply**: 21,000,000 CVT (fixed, immutable)
- **Decimals**: 9
- **Network**: Solana (Devnet/Mainnet)

## Tokenomics

### Supply Distribution

**Initial Circulation (30% - 6.3M CVT)**:
- Private Sale: 1,050,000 CVT (5%)
- Ecosystem Fund: 3,150,000 CVT (15%)
- Team & Advisors: 2,100,000 CVT (10%)

**Time-Locked Vaults (70% - 14.7M CVT)**:
| Year | Amount | % of Locked Supply |
|------|--------|-------------------|
| 4 | 7,350,000 CVT | 50% |
| 8 | 3,675,000 CVT | 25% |
| 12 | 1,837,500 CVT | 12.5% |
| 16 | 918,750 CVT | 6.25% |
| 21 | 918,750 CVT | 6.25% |

### Deflationary Mechanism

**Burn System:**
- **60% of platform fees** → Automated CVT buyback & burn
- **40% of platform fees** → Platform development
- **Target**: 2% annual burn rate (conservative)

**Supply Projection:**
```
Year 0:  21,000,000 CVT (100%)
Year 4:  13,153,000 CVT (62.6% remaining)
Year 21: 15,279,375 CVT (72.8% remaining)
Year 50: 7,742,000 CVT  (36.9% remaining)
Year 100: 2,143,000 CVT (10.2% remaining)
```

## Deployment

### Prerequisites

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install dependencies
npm install @solana/web3.js @solana/spl-token
```

### Deploy CVT Token

```bash
# Set network (devnet or mainnet-beta)
export SOLANA_NETWORK=devnet
export SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional: Use existing keypair
export SOLANA_KEYPAIR_PATH=./deployer-keypair.json

# Deploy CVT
npm run deploy:cvt

# Or directly:
ts-node contracts/solana/cvt_token/deploy-cvt-spl.ts
```

### Deployment Output

The script will:
1. ✅ Create CVT mint with 9 decimals
2. ✅ Mint 6.3M CVT (30%) to treasury
3. ✅ Create 5 time-lock vaults with 14.7M CVT (70%)
4. ✅ Revoke mint authority (fixed supply forever)
5. ✅ Save deployment info to `cvt-deployment.json`

**Example Output:**
```
🎉 CVT SPL TOKEN DEPLOYED SUCCESSFULLY!
===================================================================

📊 Deployment Summary:
   Mint Address: [CVT_MINT_ADDRESS]
   Treasury: [TREASURY_ADDRESS]
   Initial Supply: 6,300,000 CVT (30%)
   Time-Locked: 14,700,000 CVT (70%)
   Total Supply: 21,000,000 CVT (FIXED)

   Network: devnet
   Explorer: https://explorer.solana.com/address/[MINT_ADDRESS]?cluster=devnet
===================================================================
```

## Burn Mechanism

### Automated Weekly Burns

```typescript
import { CVTBurnService } from './burn-mechanism';

const burnService = new CVTBurnService(
  connection,
  cvtMintAddress,
  treasuryAuthority
);

// Execute weekly burn (called by platform cron)
await burnService.weeklyAutomatedBurn(
  treasuryAccount,
  platformFeesCollected // In USD
);
```

### Manual Burn

```typescript
// Burn specific amount
await burnService.executeBuybackAndBurn(
  treasuryTokenAccount,
  amountToBurn // In CVT
);

// Get burn stats
const stats = burnService.getBurnStats();
console.log(`Total burned: ${stats.totalBurned} CVT`);
console.log(`Circulating: ${stats.circulatingSupply} CVT`);
```

## Multi-Chain Architecture

CVT operates on three blockchains via the Trinity Protocol:

| Chain | Role | Token Type | Address |
|-------|------|-----------|---------|
| **Arbitrum L2** | Primary | ERC-20 | `0xFb419D8E32c14F774279a4dEEf330dc893257147` |
| **Solana** | Fast Monitor | SPL Token | *[Deployed via script]* |
| **TON** | Quantum Backup | Jetton | `EQDJAnXDPT-NivritpEhQeP0XmG20NdeUtxgh4nUiWH-DF7M` |

### Cross-Chain Bridge

CVT uses a **lock-and-mint** mechanism:
1. Lock CVT on source chain
2. Mint equivalent on destination chain
3. Verify with 2-of-3 Trinity consensus

```typescript
// Bridge Arbitrum → Solana
await cvtBridge.bridgeOut(
  CHAIN_SOLANA, // Target: Solana
  solanaAddress, // Destination
  amount // CVT amount
);
```

## Token Utility

### 1. Platform Fees (50% Discount)
```typescript
// Pay vault creation fee in CVT
const fee = vaultValue * 0.003; // 0.3%
const cvtFee = fee * 0.5; // 50% discount!
```

### 2. Staking Tiers

| Tier | Stake | Fee Discount | Voting Power |
|------|-------|--------------|-------------|
| **Vault Guardian** | 1,000+ CVT | 15% off | 1x |
| **Vault Architect** | 10,000+ CVT | 30% off | 3x |
| **Vault Sovereign** | 100,000+ CVT | 50% off | 10x |

### 3. Governance
- Vote on protocol upgrades
- Propose new vault types
- Adjust fee structures

### 4. Cross-Chain Gas
- Pay all gas fees in CVT
- Auto-swap to native tokens
- Simplified UX

## Security Features

### Fixed Supply Guarantee
```typescript
// Mint authority is REVOKED after initial distribution
// No one can ever mint more CVT - mathematically guaranteed 21M cap
```

### Burn Transparency
```typescript
// All burns are on-chain and publicly verifiable
const burnStats = await burnService.getBurnStats();
// Total burned is provable via Solana explorer
```

### Time-Lock Vaults
```typescript
// 70% supply locked in vaults with predetermined unlock dates
// Vaults use VDF (Verifiable Delay Functions)
// Cannot be unlocked early - mathematically enforced
```

## Development Scripts

```bash
# Deploy CVT token
npm run deploy:cvt

# Execute burn
npm run burn:cvt

# Check burn stats
npm run stats:cvt

# View supply projections
ts-node contracts/solana/cvt_token/burn-mechanism.ts
```

## Integration Example

```typescript
import { PublicKey } from '@solana/web3.js';
import { CVT_CONFIG } from './deploy-cvt-spl';

// CVT Mint Address (replace after deployment)
const CVT_MINT = new PublicKey('[YOUR_CVT_MINT_ADDRESS]');

// Get user's CVT balance
const userCVT = await connection.getTokenAccountBalance(userTokenAccount);

// Pay platform fee with 50% discount
if (userCVT.value.uiAmount >= fee) {
  // User has CVT - apply discount
  const discountedFee = fee * 0.5;
  await transferCVT(userTokenAccount, platformAccount, discountedFee);
}
```

## Audits & Verification

- ✅ Formal verification: 35/35 theorems proven
- ✅ Quantum-resistant: ML-KEM-1024 + Dilithium-5
- ✅ Trinity Protocol: 2-of-3 multi-chain consensus
- ✅ Open source: All code on GitHub

## Resources

- **Whitepaper**: `/CVT_WHITEPAPER.md`
- **Tokenomics**: `/CVT_TOKENOMICS_SPECIFICATION.md`
- **Explorer**: https://explorer.solana.com
- **GitHub**: https://github.com/chronos-vault

## License

MIT License - Open Source

---

**Note**: This is the Solana SPL implementation. For Arbitrum (ERC-20) or TON (Jetton) versions, see respective contract directories.
