# Trinity Protocol™ v3.5.20 Operational Runbook

## Executive Summary

This document outlines the operational procedures and SLAs for Trinity Protocol v3.5.20, including critical security policies implemented in the latest security audit.

---

## 1. Bootstrap Initialization SLA (HIGH-1 Fix)

### Policy
All ChronosVaultOptimized contracts MUST complete bootstrap initialization within **1 hour** of deployment.

### Technical Details
- **BOOTSTRAP_DEADLINE**: 1 hour (3600 seconds)
- **MIN_BOOTSTRAP_DEPOSIT**: 100,000,000 wei (1e8)
- **Deployment Timestamp**: Automatically captured at contract creation

### Operational Procedure

#### Step 1: Deploy Vault
```solidity
ChronosVaultOptimized vault = new ChronosVaultOptimized(
    assetAddress,
    "Vault Name",
    "SYMBOL",
    unlockTime,
    securityLevel,
    accessKey,
    isPublic,
    vaultType
);
```

#### Step 2: Initialize Bootstrap (WITHIN 1 HOUR)
```solidity
// Must be called within BOOTSTRAP_DEADLINE
vault.initializeBootstrap{ value: MIN_BOOTSTRAP_DEPOSIT }();
```

### Failure Consequences
- If bootstrap is not initialized within 1 hour, the vault will be permanently locked
- No deposits or operations will be possible
- This prevents centralization risk from indefinitely delayed initialization

### Monitoring
- **Alert Trigger**: Bootstrap not initialized within 45 minutes
- **Critical Alert**: Bootstrap deadline approaching (50+ minutes elapsed)
- **Failure Alert**: Bootstrap deadline exceeded

---

## 2. Merkle Root Expiration Policy (MEDIUM-1 Fix)

### Policy
All Merkle roots for cross-chain verification expire after **24 hours** and must be refreshed.

### Technical Details
- **MERKLE_ROOT_EXPIRY**: 24 hours (86400 seconds)
- **merkleRootTimestamps**: Tracks when each root was stored
- Expired roots are automatically rejected in verification

### Operational Procedure

#### Regular Refresh Cycle
```javascript
// Recommended: Refresh Merkle roots every 12 hours
const REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

async function refreshMerkleRoots() {
    const arbitrumRoot = await computeMerkleRoot(ARBITRUM_CHAIN_ID);
    const solanaRoot = await computeMerkleRoot(SOLANA_CHAIN_ID);
    const tonRoot = await computeMerkleRoot(TON_CHAIN_ID);
    
    // Submit through 2-of-3 consensus
    await proposeMerkleRootUpdate(arbitrumRoot, ARBITRUM_CHAIN_ID);
    // ... repeat for other chains
}
```

### Expiration Timeline
| Time Elapsed | Status | Action Required |
|--------------|--------|-----------------|
| 0-12 hours | Valid | Normal operations |
| 12-18 hours | Valid | Schedule refresh |
| 18-23 hours | Valid | Refresh urgently |
| 23-24 hours | Critical | Immediate refresh |
| 24+ hours | EXPIRED | Cannot verify, must refresh |

### Failure Consequences
- Expired Merkle roots will reject all proof verifications
- Cross-chain operations will fail validation
- User funds remain safe (operations simply won't execute)

### Monitoring
- **Warning Alert**: Merkle root age > 12 hours
- **Critical Alert**: Merkle root age > 20 hours
- **Failure Alert**: Merkle root expired

---

## 3. Trinity 2-of-3 Consensus Requirements

### Validator Configuration
| Chain | Chain ID | Role |
|-------|----------|------|
| Arbitrum | 1 | Primary security validator |
| Solana | 2 | High-frequency monitoring |
| TON | 3 | Emergency recovery / quantum-safe |

### Consensus Rules
- **Required Confirmations**: 2 of 3 validators must agree
- **Attack Probability**: ~10^-18 (mathematical security)
- **Unique Validators**: All three validators must be unique addresses

### Operation Flow
1. User creates operation with fee
2. Validator 1 confirms (1/3)
3. Validator 2 confirms (2/3) - **CONSENSUS ACHIEVED**
4. Operation executed automatically

---

## 4. Deployment Chain Validation (LOGIC-2 Fix)

### Supported Networks
| Network | Chain ID | Status |
|---------|----------|--------|
| Arbitrum Sepolia | 421614 | Production Testnet |
| Ethereum Sepolia | 11155111 | Production Testnet |
| Arbitrum One | 42161 | Mainnet Ready |
| Hardhat Local | 1337 | Development Only |
| Hardhat Default | 31337 | Development Only |

### Deployment Checklist
- [ ] Verify target chain is in supported list
- [ ] Confirm RPC endpoint connectivity
- [ ] Verify gas price settings
- [ ] Confirm validator addresses for target network
- [ ] Test deployment on Sepolia before mainnet

---

## 5. Emergency Procedures

### Emergency Multi-Sig (2-of-3)
Three designated signers can:
- Pause contract operations
- Execute emergency withdrawals
- Update critical parameters

### Emergency Pause Procedure
1. Signer 1 initiates pause proposal
2. Signer 2 approves
3. Contract pauses automatically (2-of-3 achieved)

### Recovery Procedure
1. Identify and document the incident
2. Obtain 2-of-3 signer approval for unpause
3. Submit unpause transaction
4. Monitor for 24 hours post-recovery

---

## 6. Keeper Registry Operations

### Keeper Requirements
- **MIN_KEEPER_BOND**: 1.0 ETH
- **ACTIVATION_DELAY**: After registration, keepers enter pending state
- **MAX_ACTIVE_KEEPERS**: Limited pool for network security

### Keeper Lifecycle
1. Register with bond deposit
2. Wait for activation delay
3. Begin keeper operations
4. Maintain bond above minimum
5. Exit with bond return (after cooldown)

---

## 7. Security Audit Fixes Summary (v3.5.20)

### HIGH Priority
- **HIGH-1**: Bootstrap initialization deadline (1 hour)
- **HIGH-2**: Strengthened Trinity operation validation

### MEDIUM Priority
- **MEDIUM-1**: Merkle root expiration (24 hours)

### LOGIC Fixes
- **LOGIC-1**: Increased MIN_BOOTSTRAP_DEPOSIT to 1e8
- **LOGIC-2**: Deployment chain validation

### Pre-Existing Security
- ReentrancyGuard on all external functions
- CEI (Checks-Effects-Interactions) pattern
- Signature replay prevention with nonces
- Double-spend prevention in HTLCs

---

## 8. Monitoring Dashboard Recommendations

### Key Metrics
1. Bootstrap initialization status per vault
2. Merkle root age per chain
3. Pending operations count
4. Validator confirmation latency
5. Keeper health and bond levels

### Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Bootstrap Age | 45 min | 55 min |
| Merkle Root Age | 12 hours | 20 hours |
| Pending Operations | 100 | 500 |
| Validator Latency | 5 min | 15 min |
| Keeper Bond | < 1.5 ETH | < 1.1 ETH |

---

## 9. Contact Information

### Emergency Contacts
- **Security Hotline**: security@chronosvault.org
- **Operations Team**: ops@chronosvault.org
- **GitHub Issues**: github.com/Chronos-Vault/chronos-vault-contracts/issues

### Escalation Path
1. Level 1: Operations Team (15 min response)
2. Level 2: Security Team (30 min response)
3. Level 3: Emergency Multi-Sig Signers (1 hour response)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v3.5.20 | November 25, 2025 | Trinity Protocol Team | Initial operational runbook |

---

*This document is part of the Trinity Protocol™ security and operations documentation suite.*
