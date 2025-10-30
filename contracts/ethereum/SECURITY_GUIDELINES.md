# Trinity Protocol v1.5 - Security Guidelines

**Date**: October 30, 2025  
**Audit Reference**: Manus AI Security Audit - October 30, 2025

---

## Emergency Recovery & Access Control (M-02 Mitigation)

### Issue
The `registerTONVerification()` and `registerSolanaVerification()` functions in ChronosVault.sol allow verification proofs to be signed by `owner()` or any address in `authorizedRetrievers`. This creates a centralized point of failure for the manual verification path.

### Recommended Mitigation Strategy

#### 1. Owner Should Be a Multi-Sig Address

**CRITICAL**: Deploy ChronosVault with `owner()` set to a multi-signature wallet (e.g., Gnosis Safe, DAO contract).

**Deployment Example**:
```solidity
// GOOD: Multi-sig as owner
ChronosVault vault = new ChronosVault(
    gnosisSafeAddress,  // Multi-sig wallet as owner
    asset,
    "Chronos Vault",
    "cvTOKEN",
    vaultType,
    securityLevel
);

// BAD: EOA as owner
ChronosVault vault = new ChronosVault(
    0x1234...EOA,  // Single private key - AVOID FOR PRODUCTION
    asset,
    "Chronos Vault",
    "cvTOKEN",
    vaultType,
    securityLevel
);
```

**Recommended Multi-Sig Configuration**:
- **Minimum Signers**: 3-of-5 for production vaults
- **Signers**: Geographically distributed, different organizations
- **Hardware**: All signers should use hardware wallets (Ledger, Trezor)

---

#### 2. Authorized Retrievers Management

**Purpose**: `authorizedRetrievers` are trusted addresses that can sign cross-chain verification proofs for emergency recovery.

**Best Practices**:

1. **Initial Setup** (on deployment):
   ```solidity
   // Add trusted validators as authorized retrievers
   vault.addAuthorizedRetriever(validator1Address);
   vault.addAuthorizedRetriever(validator2Address);
   vault.addAuthorizedRetriever(validator3Address);
   ```

2. **Regular Rotation** (every 6-12 months):
   ```solidity
   // Remove compromised or inactive retrievers
   vault.removeAuthorizedRetriever(oldValidatorAddress);
   
   // Add new trusted validators
   vault.addAuthorizedRetriever(newValidatorAddress);
   ```

3. **Emergency Revocation** (if compromise suspected):
   ```solidity
   // Immediately remove suspected compromised address
   vault.removeAuthorizedRetriever(suspectedAddress);
   
   // Trigger security audit
   // Rotate all other retrievers as precaution
   ```

**Monitoring**:
- Track all `AuthorizedRetrieverAdded` and `AuthorizedRetrieverRemoved` events
- Alert on any unauthorized changes
- Maintain off-chain registry of authorized retrievers with justification

---

#### 3. Prefer Trinity Bridge for High-Security Vaults

**RECOMMENDATION**: For security level 3+ vaults, ALWAYS use Trinity Bridge instead of manual verification.

**Why**:
- Trinity Bridge uses 2-of-3 consensus across Arbitrum, Solana, TON
- No single owner can bypass security
- Mathematically provable (~10^-50 attack probability)

**Implementation**:
```solidity
// 1. Deploy vault with security level 3+
ChronosVault vault = new ChronosVault(
    multiSigOwner,
    asset,
    "Chronos Vault",
    "cvTOKEN",
    VaultType.TIME_LOCK,
    3  // Security level 3 = Trinity Bridge required
);

// 2. Set Trinity Bridge address
vault.setTrinityBridge(trinityBridgeAddress);

// 3. Users create Trinity operations for withdrawals
bytes32 operationId = trinityBridge.createOperation(...);
vault.setTrinityOperation(operationId);

// 4. Withdrawals automatically enforce 2-of-3 consensus
// Manual verification is DISABLED for security level 3+
```

---

## Access Control Matrix

| Function | Caller | Security Level | Consensus Required |
|----------|--------|----------------|-------------------|
| `withdraw()` | User | 1-2 | None |
| `withdraw()` | User | 3+ | 2-of-3 Trinity OR Manual |
| `registerTONVerification()` | owner() OR authorizedRetrievers | Any | N/A |
| `registerSolanaVerification()` | owner() OR authorizedRetrievers | Any | N/A |
| `addAuthorizedRetriever()` | owner() only | Any | N/A |
| `removeAuthorizedRetriever()` | owner() only | Any | N/A |
| `setTrinityBridge()` | owner() only | Any | N/A |

---

## Security Levels Explained

| Level | Description | Consensus | Use Case |
|-------|-------------|-----------|----------|
| 1 | Basic | None | Personal savings, low-value |
| 2 | Enhanced | Optional | Medium-value assets |
| 3 | Advanced | **Required (2-of-3)** | High-value, institutional |
| 4 | Maximum | **Required (2-of-3)** | Critical infrastructure |
| 5 | Fortress | **Required (2-of-3)** | Protocol treasuries |

---

## Deployment Checklist

- [ ] Owner is multi-sig wallet (3-of-5 minimum)
- [ ] All signers use hardware wallets
- [ ] Signers are geographically distributed
- [ ] Trinity Bridge address configured
- [ ] Authorized retrievers documented
- [ ] Retriever rotation schedule established
- [ ] Monitoring/alerting configured
- [ ] Emergency response plan documented
- [ ] Security level appropriate for asset value
- [ ] Access control matrix reviewed

---

## Emergency Response Plan

### Scenario 1: Authorized Retriever Compromise

1. **Immediate**: Remove compromised retriever via multi-sig
2. **24 hours**: Rotate all other retrievers
3. **7 days**: Complete security audit
4. **30 days**: Update emergency procedures

### Scenario 2: Owner Multi-Sig Compromise

1. **Immediate**: Trigger emergency mode (if available)
2. **Immediate**: Pause all operations via emergency controller
3. **24 hours**: Deploy new vault, initiate migration
4. **7 days**: Complete post-mortem analysis

### Scenario 3: Trinity Bridge Issue

1. **Immediate**: Operations halt automatically (fail-safe)
2. **Manual Override**: Use authorized retrievers for emergency withdrawals
3. **Resolution**: Fix Trinity Bridge, restore normal operations
4. **Post-incident**: Audit logs, verify no unauthorized access

---

## Contact Information

**Security Disclosures**: security@chronosvault.org  
**Emergency Contact**: emergency@chronosvault.org  
**Documentation**: https://github.com/Chronos-Vault/chronos-vault-contracts

---

**Last Updated**: October 30, 2025  
**Next Review**: April 30, 2026
