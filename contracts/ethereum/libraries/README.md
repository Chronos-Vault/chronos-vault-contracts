# Trinity Protocol™ v3.1 - Library Architecture

This directory contains modular libraries used by CrossChainBridgeOptimized v3.1 for improved maintainability and bytecode optimization.

## 📚 Libraries Overview

### 1. **Errors.sol** - Custom Error Library
**Purpose**: Gas-efficient error handling with semantic error types

**Features**:
- 61 custom errors across 6 categories
- Saves ~279 bytes vs string reverts
- Clear error semantics for debugging

**Categories**:
```solidity
// Access Control
error UnauthorizedValidator();
error UnauthorizedCaller();
error InvalidEmergencyController();

// Operation Errors
error OperationNotFound();
error OperationNotPending();
error OperationAlreadyCompleted();

// Proof Validation
error MerkleProofInvalid();
error ProofTooDeep();
error ChainAlreadyVerified();

// Vault Errors
error InvalidVaultType();
error VaultNotRegistered();

// Circuit Breaker
error SystemPaused();
error EmergencyShutdown();

// Consensus
error InsufficientConsensus();
error InsufficientValidators();
```

**Usage**:
```solidity
import "./libraries/Errors.sol";

if (!authorizedValidators[chainId][validator]) {
    revert Errors.UnauthorizedSolanaValidator();
}
```

---

### 2. **ProofValidation.sol** - Merkle Proof Verification
**Purpose**: Cryptographic verification of cross-chain proofs

**Features**:
- Merkle tree proof verification
- DoS protection (max depth limit)
- Gas-optimized hashing

**Functions**:
```solidity
function verifyMerkleProof(
    bytes32 leaf,
    bytes32[] memory proof,
    bytes32 root
) internal pure returns (bool)
```

**Usage**:
```solidity
import "./libraries/ProofValidation.sol";

bytes32 computedLeaf = keccak256(abi.encodePacked(operationId));
if (!ProofValidation.verifyMerkleProof(computedLeaf, proof, merkleRoot)) {
    revert MerkleProofInvalid();
}
```

**Security**:
- MAX_MERKLE_DEPTH enforced (prevents DoS)
- Sorted hashing (prevents collision attacks)
- Pure function (no state changes)

---

### 3. **FeeAccounting.sol** - Fee Calculation
**Purpose**: Standardized fee computation with priority multipliers

**Features**:
- Speed priority (1.5x multiplier)
- Security priority (2x multiplier)
- Max fee cap enforcement

**Functions**:
```solidity
function calculateOperationFee(
    uint256 baseFee,
    bool prioritizeSpeed,
    bool prioritizeSecurity
) internal pure returns (uint256)
```

**Usage**:
```solidity
import "./libraries/FeeAccounting.sol";

uint256 fee = FeeAccounting.calculateOperationFee(
    BASE_FEE,
    prioritizeSpeed,
    prioritizeSecurity
);
if (msg.value < fee) revert InsufficientFee();
```

**Fee Structure**:
- Base: 0.0001 ETH
- Speed Priority: 1.5x = 0.00015 ETH
- Security Priority: 2.0x = 0.0002 ETH
- Max Cap: 0.01 ETH

---

### 4. **CircuitBreakerLib.sol** - Anomaly Detection
**Purpose**: Framework for circuit breaker and rate limiting logic

**Status**: Created for future integration

**Planned Features**:
- Volume spike detection
- Failed proof rate monitoring
- Same-block operation limiting
- Auto-recovery mechanisms

**Future Usage**:
```solidity
// Example future implementation
if (CircuitBreakerLib.detectAnomaly(volumeChange, failureRate)) {
    triggerCircuitBreaker();
}
```

---

### 5. **OperationLifecycle.sol** - Operation Helpers
**Purpose**: Operation state management and validation

**Status**: Created for future integration

**Planned Features**:
- Operation creation helpers
- State transition validation
- Lifecycle event tracking

**Future Usage**:
```solidity
// Example future implementation
OperationLifecycle.validateTransition(
    currentStatus,
    newStatus
);
```

---

## 🎯 Optimization Results

| Metric | v3.0 | v3.1 | Improvement |
|--------|------|------|-------------|
| **Bytecode Size** | 23,535 bytes | 23,171 bytes | -364 bytes (-1.5%) |
| **Headroom** | 1,041 bytes | 1,405 bytes | +364 bytes (+35%) |
| **Libraries** | 0 | 5 | Modular architecture |
| **Custom Errors** | 56 | 61 | +5 new errors |

---

## 🔧 Integration Guide

### Adding New Errors

1. Add to `Errors.sol`:
```solidity
error MyNewError();
```

2. Use in main contract:
```solidity
import "./libraries/Errors.sol";

if (condition) revert Errors.MyNewError();
```

### Using Libraries

All libraries are `internal` and embedded in the main contract bytecode. No separate deployment needed.

```solidity
// Import at top of contract
import "./libraries/Errors.sol";
import "./libraries/FeeAccounting.sol";
import "./libraries/ProofValidation.sol";

// Use in functions
function myFunction() external {
    uint256 fee = FeeAccounting.calculateOperationFee(...);
    bool valid = ProofValidation.verifyMerkleProof(...);
    if (!valid) revert Errors.MerkleProofInvalid();
}
```

---

## 📖 Best Practices

### ✅ DO:
- Use custom errors for all reverts
- Extract pure logic to libraries
- Keep libraries stateless (no storage)
- Document error conditions

### ❌ DON'T:
- Use string parameters in libraries (inflates bytecode)
- Add storage to libraries (breaks contract)
- Duplicate code across libraries
- Skip error handling

---

## 🧪 Testing

All libraries are tested through the main contract's test suite:

```bash
# Run all tests
npx hardhat test

# Test specific functionality
npx hardhat test test/CrossChainBridge.test.js
```

---

## 📊 Gas Impact

| Operation | v3.0 | v3.1 | Savings |
|-----------|------|------|---------|
| Custom Error Revert | ~24,000 gas | ~22,000 gas | -2,000 gas |
| String Revert | ~50,000 gas | N/A | N/A |
| Fee Calculation | Same | Same | 0 (inlined) |
| Merkle Verification | Same | Same | 0 (inlined) |

**Note**: Gas savings from custom errors are per-revert, not deployment.

---

## 🔐 Security Considerations

### Custom Errors
- ✅ No sensitive data exposed
- ✅ Clear error semantics
- ✅ Gas-efficient

### Proof Validation
- ✅ DoS protection (max depth)
- ✅ No state changes (pure)
- ✅ Collision resistant

### Fee Calculation
- ✅ Overflow protection
- ✅ Max cap enforcement
- ✅ Deterministic results

---

## 📚 Further Reading

- [Trinity Protocol v3.1 Optimization Report](../../../TRINITY_V3.1_OPTIMIZATION_REPORT.md)
- [Contract Verification Report](../../../CONTRACT_VERIFICATION_REPORT.md)
- [Security Architecture](../../../docs/security/SECURITY_ARCHITECTURE.md)

---

**Trinity Protocol™ v3.1** - Trust Math, Not Humans  
**Status**: Production-Ready | **Bytecode**: 23,171 bytes | **Headroom**: 1.37 KB
