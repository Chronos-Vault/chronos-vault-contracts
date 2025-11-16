# Trinity Protocol - Smart Contract Quick Reference

**Version:** 3.5.10 | **Last Updated:** November 16, 2025

---

## 📊 Contract Summary

| # | Contract | Lines | Purpose | Status |
|---|----------|-------|---------|--------|
| **CORE TRINITY** |
| 1 | TrinityConsensusVerifier.sol | 1,229 | 2-of-3 multi-chain consensus validation | ✅ Production |
| 2 | HTLCChronosBridge.sol | 708 | Atomic swaps with Trinity integration | ✅ Production |
| 3 | CrossChainBridge.sol | ~500 | Legacy bridge (pre-v3.5) | ⚠️ Deprecated |
| **EXIT-BATCH SYSTEM** |
| 4 | HTLCArbToL1.sol | 585 | L2 exit request layer (Arbitrum) | ✅ Production |
| 5 | TrinityExitGateway.sol | 515 | L1 settlement layer (Ethereum) | ✅ Production |
| **VAULTS** |
| 6 | ChronosVault.sol | 1,293 | 15 standard security vault types | ✅ Production |
| 7 | ChronosVaultOptimized.sol | ~800 | 7 investment vault types | ✅ Production |
| **BRIDGES** |
| 8 | CVTBridge.sol | 384 | CVT token cross-chain bridge | ✅ Production |
| **UTILITIES** |
| 9 | EmergencyMultiSig.sol | ~200 | Emergency recovery wallet | ✅ Production |
| 10 | TestERC20.sol | ~100 | Mock token for testing | 🧪 Testing |
| **INTERFACES** |
| 11 | ITrinityConsensusVerifier.sol | ~50 | Trinity Protocol interface | ✅ Standard |
| 12 | ITrinityBatchVerifier.sol | ~40 | Exit-Batch interface (NEW v3.5.10) | ✅ Standard |
| 13 | IHTLC.sol | ~60 | HTLC interface | ✅ Standard |
| 14 | IChronosVault.sol | ~100 | Vault interface (22 types) | ✅ Standard |
| **LIBRARIES** |
| 15 | Errors.sol | ~50 | Custom error definitions | ✅ Library |
| 16 | FeeAccounting.sol | ~100 | Fee calculation logic | ✅ Library |
| 17 | ProofValidation.sol | ~150 | Merkle/signature verification | ✅ Library |
| 18 | ConsensusProposalLib.sol | ~120 | 2-of-3 consensus logic | ✅ Library |
| 19 | OperationLifecycle.sol | ~130 | State transition logic | ✅ Library |
| 20 | CircuitBreakerLib.sol | ~80 | Pause/unpause functionality | ✅ Library |

**Total:** ~8,000 lines of production Solidity

---

## 🎯 Core Functions by Contract

### TrinityConsensusVerifier.sol
```solidity
// Operation Management
createOperation(vault, type, amount, token) → operationId
createBatchOperation(batchRoot, expectedTotal) → operationId  // NEW v3.5.10

// Consensus Validation
confirmOperation(operationId, chainId, proof) → bool
executeOperation(operationId) → bool
verifyBatch(batchRoot, expectedTotal, proof, trinityOpId) → bool  // NEW v3.5.10

// User Actions
cancelOperation(operationId) → bool
claimFailedFee() → uint256

// Admin Functions
emergencyCancelOperation(operationId)
withdrawFees(amount)
pause() / unpause()
```

---

### HTLCChronosBridge.sol
```solidity
// Swap Creation
createHTLC(recipient, secretHash, timelock) → swapId

// Claim & Refund
claim(swapId, secret) → bool
refund(swapId) → bool

// Exit-Batch Integration (NEW)
releaseForExit(swapId) → bool

// View Functions
getSwap(swapId) → Swap
isClaimable(swapId) → bool
isRefundable(swapId) → bool
```

---

### HTLCArbToL1.sol (NEW v3.5.10)
```solidity
// Exit Requests
requestExit(swapId) payable → exitId
requestPriorityExit(swapId) payable → exitId  // 2x fee, instant L1

// Batch Management (Keeper)
createBatch(exitIds[]) → batchRoot
finalizeBatch(batchRoot, trinityOpId)
challengeBatch(batchRoot, reason)

// View Functions
getExit(exitId) → ExitRequest
getBatchExits(batchRoot) → bytes32[]
```

---

### TrinityExitGateway.sol (NEW v3.5.10)
```solidity
// Batch Submission (Keeper)
submitBatch(batchRoot, exitCount, trinityOpId) payable

// User Claims
claimExit(batchRoot, exitId, recipient, amount, secretHash, merkleProof)
claimPriorityExit(exitId, recipient, amount, secretHash) payable

// Challenge System
challengeBatch(batchRoot, reason)
resolveBatchChallenge(batchRoot, approved)  // Owner only

// View Functions
getBatch(batchRoot) → Batch
isExitClaimed(batchRoot, exitId) → bool
```

---

### ChronosVault.sol
```solidity
// Vault Creation
createVault(vaultType, securityLevel, unlockTime, accessKey)

// Deposits & Withdrawals
deposit(vaultId, amount)
requestWithdrawal(vaultId, amount)
executeWithdrawal(requestId, trinityOpId)

// Multi-Sig (if enabled)
approveWithdrawal(requestId)

// Emergency Functions
emergencyWithdrawal(vaultId)  // Requires Trinity consensus
```

---

### CVTBridge.sol
```solidity
// Bridge Operations
initiateBridge(targetChain, targetAddress, amount) payable
completeBridge(sourceChain, sourceAddress, amount, nonce, signatures)

// Admin Functions
addValidator(validator)
removeValidator(validator)
updateThreshold(newThreshold)
setFee(newFee)
```

---

## 📦 Deployment Networks

| Network | Contracts | Status |
|---------|-----------|--------|
| **Ethereum Mainnet** | TrinityConsensusVerifier, TrinityExitGateway | 🔄 Pending |
| **Ethereum Sepolia** | TrinityConsensusVerifier, TrinityExitGateway | 🔄 Ready |
| **Arbitrum One** | Trinity, HTLC, HTLCArbToL1, Vaults | 🔄 Pending |
| **Arbitrum Sepolia** | Trinity, HTLC, HTLCArbToL1 | ✅ HTLC Deployed |
| **Solana Mainnet** | Validators (Rust) | 🔄 Pending |
| **Solana Devnet** | Validators (Rust) | 🔄 Pending |
| **TON Mainnet** | Validators (FunC) | 🔄 Pending |
| **TON Testnet** | Validators (FunC) | 🔄 Pending |

---

## 🔗 Dependencies

### External Libraries (OpenZeppelin v5.4.0)
```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
```

### Internal Dependencies
```
TrinityExitGateway → ITrinityBatchVerifier → TrinityConsensusVerifier
HTLCArbToL1 → IHTLC → HTLCChronosBridge → ITrinityConsensusVerifier
ChronosVault → ICrossChainBridge → TrinityConsensusVerifier
All → Libraries (Errors, FeeAccounting, ProofValidation, etc.)
```

---

## 💰 Fee Structure

| Action | Fee | Recipient |
|--------|-----|-----------|
| Trinity Operation | 0.001 ETH | Trinity Protocol |
| Standard Exit | 0.0001 ETH | Keeper |
| Priority Exit | 0.0002 ETH (2×) | L1 Gateway |
| HTLC Creation | 0.001 ETH | Trinity Protocol |
| CVT Bridge | Variable (basis points) | Bridge Treasury |
| Vault Creation | Variable | Vault Contract |

---

## ⛽ Gas Costs (Arbitrum Sepolia)

| Operation | Gas Used | Cost @ 9 gwei |
|-----------|----------|---------------|
| createHTLC() | ~300,000 | $0.81 |
| claim() | ~100,000 | $0.27 |
| requestExit() | ~80,000 | $0.22 |
| requestPriorityExit() | ~120,000 | $0.32 |
| submitBatch(200) | ~500,000 | $1.35 |
| claimExit() | ~80,000 | $0.22 |
| claimPriorityExit() | ~100,000 | $0.27 |

**Note:** L1 costs are ~10× higher. Exit-Batch saves 89-97% vs individual L1 locks.

---

## 🎯 Common Use Cases

### **1. Standard Atomic Swap**
```
User A (Chain 1) ↔ User B (Chain 2)
1. A → HTLCChronosBridge.createHTLC() on Chain 1 (48h)
2. B → HTLCChronosBridge.createHTLC() on Chain 2 (24h, same secretHash)
3. A → HTLCChronosBridge.claim() on Chain 2 (reveals secret)
4. B → HTLCChronosBridge.claim() on Chain 1 (uses secret)
```

### **2. Exit-Batch Withdrawal (90% savings)**
```
User → Arbitrum L2
1. User → HTLCArbToL1.requestExit() (pays 0.0001 ETH)
2. Keeper collects 50-200 exits → createBatch()
3. Keeper → TrinityConsensusVerifier.createBatchOperation()
4. Validators confirm (2-of-3)
5. Keeper → TrinityExitGateway.submitBatch() on L1
6. After 6 hours → User → claimExit() with Merkle proof
```

### **3. Priority Exit (Emergency)**
```
User needs instant L1 exit (no batching)
1. User → HTLCArbToL1.requestPriorityExit() (pays 0.0002 ETH, 2×)
2. ArbSys.sendTxToL1() bridges message to L1
3. L1 → TrinityExitGateway.claimPriorityExit() called
4. User receives funds immediately (no challenge period)
```

### **4. Time-Locked Vault**
```
User → ChronosVault
1. User → createVault(TIME_LOCK, securityLevel=3, unlockTime=2030)
2. User → deposit(vaultId, 100 ETH)
3. Wait until 2030...
4. User → requestWithdrawal(vaultId, 100 ETH)
5. Trinity validators confirm (2-of-3)
6. User → executeWithdrawal() (receives 100 ETH)
```

---

## 📈 Gas Economics Comparison

### **Scenario: 200 Users Exiting Arbitrum → Ethereum**

**Traditional Method (Individual L1 Locks):**
```
200 × createHTLC on L1
= 200 × 100,000 gas × 9 gwei × $3,000/ETH
= 200 × $2.70
= $540 total
```

**Exit-Batch Method:**
```
1 × submitBatch(200) on L1:     500,000 gas = $13.50
200 × claimExit() on L1:        200 × 80k gas = $43.20
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: $56.70 (89.5% savings!)
```

### **Scenario: 50-Exit Batch (Higher Savings)**
```
Traditional: 50 × $2.70 = $135
Exit-Batch:  $13.50 + (50 × $0.216) = $24.30
Savings: 82%
```

---

## 🔒 Security Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **requiredChainConfirmations** | 2 | 2-of-3 consensus |
| **MIN_OPERATION_DURATION** | 1 hour | Minimum timelock |
| **MAX_OPERATION_DURATION** | 30 days | Maximum timelock |
| **MAX_MERKLE_PROOF_DEPTH** | 32 levels | Gas griefing prevention |
| **MAX_OPERATION_AMOUNT** | 1,000,000 ETH | DoS prevention |
| **CHALLENGE_PERIOD** | 6 hours | Fraud detection window |
| **MIN_BATCH_SIZE** | 10 exits | Cost efficiency |
| **MAX_BATCH_SIZE** | 200 exits | Gas limit safety |
| **MIN_HTLC_AMOUNT** | 0.01 ETH | Dust attack prevention |

---

## 🎓 Further Reading

- **Architecture:** [TRINITY_ARCHITECTURE.md](./TRINITY_ARCHITECTURE.md)
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Security:** [SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md)
- **HTLC Details:** [README_HTLC.md](./README_HTLC.md)
- **Blog Post:** [TRINITY_DEVTO_BLOG_POST.md](../../TRINITY_DEVTO_BLOG_POST.md)

---

## 📞 Quick Links

- **GitHub:** https://github.com/Chronos-Vault/chronos-vault-contracts
- **Latest Commit:** aa21019c1fe573bc75a34d7760365ea66cebdf49
- **Issues:** https://github.com/Chronos-Vault/chronos-vault-contracts/issues
- **Discussions:** https://github.com/Chronos-Vault/chronos-vault-contracts/discussions

---

**Last Updated:** November 16, 2025 - Trinity Protocol v3.5.10
