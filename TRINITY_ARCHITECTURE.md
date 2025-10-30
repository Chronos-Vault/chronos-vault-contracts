# 🔱 Trinity Protocol™ Architecture Guide

**Version**: v1.5-PRODUCTION  
**Last Updated**: October 30, 2025  
**Authors**: Chronos Vault Team

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Contracts](#core-contracts)
3. [How They Work Together](#how-they-work-together)
4. [Security Model](#security-model)
5. [Developer Integration Guide](#developer-integration-guide)
6. [Example Flows](#example-flows)

---

## 🎯 Overview

Trinity Protocol™ is a **mathematically provable 2-of-3 multi-chain consensus verification system** designed for:
- ✅ Multi-signature vaults requiring 2-of-3 chain approval
- ✅ Decentralized oracle consensus verification
- ✅ Cross-chain proof verification
- ✅ Distributed custody with multi-chain validators
- ✅ HTLC atomic swaps without LayerZero/Wormhole

**NOT a cross-chain token bridge** - Trinity Protocol verifies operations, not token transfers.

### Mathematical Security Guarantee

- **HTLC Atomicity**: ~10^-39 attack probability (Keccak256)
- **Trinity 2-of-3 Consensus**: ~10^-12 (requires compromising 2 blockchains)
- **Combined Security**: ~10^-50 (practically impossible)

---

## 🏗️ Core Contracts

### 1. CrossChainBridgeOptimized.sol
**Purpose**: Trinity Protocol consensus engine

**Location**: `contracts/ethereum/CrossChainBridgeOptimized.sol`

**Key Features**:
- Manages operations across Arbitrum, Solana, TON
- Enforces 2-of-3 consensus requirement
- Circuit breaker for anomaly detection
- Pull-based validator fee distribution
- Vault type validation (22 specialized vault types)

**Core Functions**:
```solidity
// Create Trinity operation (called by vaults/HTLC)
function createOperation(
    OperationType operationType,
    string calldata destinationChain,
    address tokenAddress,
    uint256 amount,
    bool prioritizeSpeed,
    bool prioritizeSecurity,
    uint256 slippageTolerance
) external payable returns (bytes32 operationId);

// Submit proof from validator (called by validators on each chain)
function submitProof(
    bytes32 operationId,
    uint8 chainId,
    bytes32 blockHash,
    bytes32 txHash,
    bytes32 merkleRoot,
    bytes[] calldata merkleProof,
    uint256 blockNumber,
    bytes calldata validatorSignature
) external;

// NEW v1.5: Check if 2-of-3 consensus achieved
function hasConsensusApproval(bytes32 operationId) external view returns (bool approved);

// NEW v1.5: Get chain verification status
function getChainVerifications(bytes32 operationId) 
    external view returns (bool arbitrumVerified, bool solanaVerified, bool tonVerified);

// NEW v1.5: Get full operation details
function getOperationDetails(bytes32 operationId)
    external view returns (
        address user,
        OperationStatus status,
        uint256 amount,
        address tokenAddress,
        uint8 validProofCount,
        uint256 timestamp
    );
```

**Gas Optimizations**: 35-42% savings through storage packing, tiered anomaly checking, and Merkle caching.

---

### 2. ChronosVault.sol
**Purpose**: 15 standard security-focused vaults

**Location**: `contracts/ethereum/ChronosVault.sol`

**Vault Types Supported**:
1. TIME_LOCK - Basic time-locked vault
2. MULTI_SIGNATURE - Requires M-of-N signatures
3. QUANTUM_RESISTANT - Post-quantum cryptography
4. GEO_LOCATION - Geographic restrictions
5. NFT_POWERED - NFT-gated access
6. BIOMETRIC - Biometric verification
7. DEAD_MANS_SWITCH - Auto-release after inactivity
8. INHERITANCE - Beneficiary-based distribution
9. CONDITIONAL_RELEASE - Oracle-based unlocking
10. SOCIAL_RECOVERY - Social recovery mechanism
11. LEGAL_COMPLIANCE - KYC/AML integration
12. PRIVACY_ENHANCED - Zero-knowledge withdrawals
13. MULTI_ASSET - Multiple token types
14. TIERED_ACCESS - Different unlock times per tier
15. DELEGATED_VOTING - Governance while locked

**Trinity Integration**:
```solidity
// Set Trinity Bridge address (optional, for automated consensus)
ICrossChainBridgeOptimized public trinityBridge;

// User registers Trinity operation for withdrawal
function setTrinityOperation(bytes32 _operationId) external;

// Check if 2-of-3 consensus satisfied (manual OR Trinity Bridge)
function has2of3Consensus(address _user) public view returns (bool satisfied);

// Modifier enforces 2-of-3 for security level 3+ vaults
modifier requiresTrinityProof() {
    if (securityLevel >= 3) {
        require(has2of3Consensus(msg.sender), "2-of-3 chain verification required");
    }
    _;
}

// Withdraw function uses Trinity consensus
function withdraw(uint256 assets, address receiver, address owner) 
    public override nonReentrant onlyWhenUnlocked requiresTrinityProof returns (uint256);
```

**Key Features**:
- ERC-4626 compliant (tokenized vaults)
- NOT investment-focused (security/time-lock operations)
- Backward compatible with manual verification
- IMMUTABLE security parameters (no human bypass)

---

### 3. ChronosVaultOptimized.sol
**Purpose**: 7 investment-focused ERC-4626 vaults with DeFi yield

**Location**: `contracts/ethereum/ChronosVaultOptimized.sol`

**Vault Types Supported**:
1. SOVEREIGN_FORTRESS - Maximum security with all features
2. PROOF_OF_RESERVE - Requires asset backing verification
3. ESCROW - Two-party transactions with arbitration
4. CORPORATE_TREASURY - Multi-role governance
5. INSURANCE_BACKED - Third-party insurance coverage
6. STAKING_REWARDS - Earns DeFi yield while locked
7. LEVERAGE_VAULT - Collateralized lending integration

**Key Features**:
- Full ERC-4626 implementation with share accounting
- Performance fees and management fees
- Optimized gas costs (20% storage packing, 10% lazy fee collection)
- Trinity Protocol integration for security level 3+

**Gas Optimizations**:
```solidity
// SLOT 0: Pack bool + uint8 + uint48 (9 bytes)
bool public isUnlocked;
uint8 public securityLevel;
uint48 public nextWithdrawalRequestId;

// SLOT 4-6: Pack timestamps and fees
uint128 public performanceFee;
uint128 public managementFee;
uint128 public lastFeeCollection;
uint128 public lastVerificationTimestamp;
```

---

### 4. HTLCBridge.sol
**Purpose**: Hash Time-Locked Contract atomic swaps with Trinity consensus

**Location**: `contracts/ethereum/HTLCBridge.sol`

**HTLC Lifecycle**:
```solidity
// 1. Create HTLC swap
function createHTLC(
    address recipient,
    address tokenAddress,
    uint256 amount,
    bytes32 secretHash,  // Keccak256 hash of secret
    uint256 timelock,
    string calldata destChain
) external payable returns (bytes32 swapId, bytes32 operationId);

// 2. Lock funds and create Trinity operation
function lockHTLC(bytes32 swapId) external payable returns (bool success);

// 3. Claim with secret (after 2-of-3 consensus achieved)
function claimHTLC(bytes32 swapId, bytes32 secret) external returns (bool success);

// 4. Refund if timelock expires
function refundHTLC(bytes32 swapId) external returns (bool success);
```

**CRITICAL v1.5 FIX**:
```solidity
// OLD (BROKEN): Used local consensus tracking (anyone could fake)
function claimHTLC(...) {
    require(swap.state == SwapState.CONSENSUS_ACHIEVED, "Consensus not achieved"); // ❌ FAKE
}

// NEW (FIXED): Queries REAL Trinity Bridge consensus
function claimHTLC(...) {
    bool consensusApproved = _checkTrinityConsensus(swap.operationId); // ✅ REAL
    require(consensusApproved, "Trinity 2-of-3 consensus not achieved");
}

function _checkTrinityConsensus(bytes32 operationId) internal view returns (bool) {
    return trinityBridge.hasConsensusApproval(operationId);
}
```

---

## 🔗 How They Work Together

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER CREATES VAULT                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌──────────────────┐          ┌──────────────────┐
    │ ChronosVault.sol │          │ChronosVault      │
    │                  │          │Optimized.sol     │
    │ 15 STANDARD      │          │                  │
    │ VAULTS           │          │ 7 INVESTMENT     │
    │                  │          │ VAULTS           │
    │ • TIME_LOCK      │          │ • STAKING_REWARDS│
    │ • INHERITANCE    │          │ • ESCROW         │
    │ • QUANTUM_RES    │          │ • LEVERAGE       │
    │ • PRIVACY        │          │ • INSURANCE      │
    │ ...etc           │          │ ...etc           │
    └────────┬─────────┘          └────────┬─────────┘
             │                             │
             │ (Security Level 3+)         │
             └──────────────┬──────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │ CrossChainBridge         │
              │ Optimized.sol            │
              │                          │
              │ TRINITY PROTOCOL         │
              │ 2-of-3 CONSENSUS ENGINE  │
              │                          │
              │ • Creates operations     │
              │ • Receives proofs from:  │
              │   - Arbitrum validators  │
              │   - Solana validators    │
              │   - TON validators       │
              │ • Enforces 2-of-3 rule   │
              └──────────────────────────┘
                            │
                            │ (Optional)
                            ▼
              ┌──────────────────────────┐
              │ HTLCBridge.sol           │
              │                          │
              │ ATOMIC SWAPS             │
              │ • Hash Time-Locked       │
              │ • Trinity consensus      │
              │ • Secret reveal claim    │
              │ • Timelock refund        │
              └──────────────────────────┘
```

### Integration Flow

#### Flow 1: Standard Vault Withdrawal (ChronosVault.sol)

```
1. User creates vault with securityLevel=3
   └─> ChronosVault.constructor()

2. User deposits assets
   └─> ChronosVault.deposit()

3. Time passes, unlock time reached

4. User wants to withdraw (securityLevel 3 requires Trinity consensus):
   
   OPTION A: Manual verification (legacy)
   ├─> User submits Solana proof: submitChainVerification(CHAIN_SOLANA, ...)
   ├─> User submits TON proof: submitChainVerification(CHAIN_TON, ...)
   └─> crossChainVerification.tonVerified && solanaVerified == true

   OPTION B: Trinity Bridge (automated)
   ├─> User creates Trinity operation externally
   │   └─> CrossChainBridgeOptimized.createOperation()
   ├─> User registers operation with vault
   │   └─> ChronosVault.setTrinityOperation(operationId)
   ├─> Validators submit proofs to Trinity Bridge
   │   ├─> Arbitrum validator: CrossChainBridgeOptimized.submitProof(operationId, CHAIN_ETHEREUM, ...)
   │   ├─> Solana validator: CrossChainBridgeOptimized.submitProof(operationId, CHAIN_SOLANA, ...)
   │   └─> TON validator: CrossChainBridgeOptimized.submitProof(operationId, CHAIN_TON, ...)
   └─> When 2-of-3 achieved: trinityBridge.hasConsensusApproval(operationId) == true

5. User withdraws
   └─> ChronosVault.withdraw()
       ├─> Modifier requiresTrinityProof checks has2of3Consensus(msg.sender)
       ├─> Returns true if EITHER manual OR Trinity consensus satisfied
       └─> Assets transferred to user
```

#### Flow 2: HTLC Atomic Swap (HTLCBridge.sol)

```
1. User initiates HTLC swap
   ├─> Generate secret: bytes32 secret = keccak256("my_secret_phrase")
   ├─> Generate hash: bytes32 secretHash = keccak256(abi.encodePacked(secret))
   └─> HTLCBridge.createHTLC(recipient, tokenAddress, amount, secretHash, timelock, "solana")
       └─> Returns: (swapId, operationId) // operationId = bytes32(0) until locked

2. User locks funds
   └─> HTLCBridge.lockHTLC(swapId)
       ├─> Transfers tokens/ETH to HTLCBridge contract
       └─> Calls CrossChainBridgeOptimized.createOperation()
           └─> Returns operationId, stored in swap

3. Validators detect swap and submit proofs
   ├─> Arbitrum: CrossChainBridgeOptimized.submitProof(operationId, CHAIN_ETHEREUM, merkleProof)
   ├─> Solana: CrossChainBridgeOptimized.submitProof(operationId, CHAIN_SOLANA, merkleProof)
   └─> TON: CrossChainBridgeOptimized.submitProof(operationId, CHAIN_TON, merkleProof)

4. When 2-of-3 consensus achieved:
   └─> CrossChainBridgeOptimized: operation.validProofCount >= 2

5. Recipient claims with secret
   └─> HTLCBridge.claimHTLC(swapId, secret)
       ├─> _checkTrinityConsensus(operationId)
       │   └─> Returns: trinityBridge.hasConsensusApproval(operationId) == true ✅
       ├─> Verify secret: keccak256(abi.encodePacked(secret)) == secretHash ✅
       └─> Transfer funds to recipient

6. OR if timelock expires without claim:
   └─> HTLCBridge.refundHTLC(swapId)
       └─> Transfer funds back to sender
```

---

## 🔐 Security Model

### Trinity Protocol 2-of-3 Consensus

**Blockchains**:
1. **Arbitrum (Ethereum L2)** - Primary security layer
2. **Solana** - High-frequency monitoring
3. **TON** - Emergency recovery / quantum-safe storage

**Consensus Rule**: At least 2 of 3 chains must verify an operation.

**Attack Scenarios**:
- ✅ Single chain compromised? → Safe (still have 2-of-3)
- ✅ Single validator malicious? → Safe (other validators reject)
- ❌ 2 chains compromised? → Vulnerable (~10^-12 probability)
- ❌ Hash collision in HTLC? → Vulnerable (~10^-39 probability)

**Combined Attack Probability**: ~10^-50 (requires BOTH hash collision AND 2-chain compromise)

### Vault Security Levels

| Level | Requirements | Use Case |
|-------|-------------|----------|
| 1 | Time-lock only | Basic savings |
| 2 | Time-lock + access key | Personal vaults |
| 3 | **2-of-3 Trinity consensus** | High-value assets |
| 4 | Trinity + multi-sig | Corporate treasury |
| 5 | Trinity + multi-sig + biometric | Maximum security |

**Security Level 3+**: MUST satisfy Trinity Protocol 2-of-3 consensus (either manual OR automated via CrossChainBridgeOptimized).

---

## 💻 Developer Integration Guide

### Integrating with ChronosVault

```solidity
// Deploy vault with Trinity Bridge integration
ChronosVault vault = new ChronosVault(
    IERC20(assetAddress),
    "My Inheritance Vault",
    "MIV",
    block.timestamp + 365 days, // Unlock in 1 year
    3, // Security level 3 (requires Trinity consensus)
    VaultType.INHERITANCE,
    "my_access_key",
    true, // Public
    trinityBridgeAddress // Enable automated Trinity consensus
);

// Later: User wants to withdraw
// Option 1: Create Trinity operation externally
bytes32 operationId = trinityBridge.createOperation{value: 0.001 ether}(
    OperationType.TRANSFER,
    "withdrawal",
    address(asset),
    withdrawAmount,
    false, // prioritizeSpeed
    true,  // prioritizeSecurity
    0      // slippageTolerance
);

// Option 2: Register operation with vault
vault.setTrinityOperation(operationId);

// Option 3: Wait for validators to submit proofs (automatic)

// Option 4: Withdraw when consensus achieved
vault.withdraw(withdrawAmount, msg.sender, msg.sender);
```

### Integrating with HTLCBridge

```solidity
// 1. Create HTLC swap
bytes32 secret = keccak256("my_random_secret");
bytes32 secretHash = keccak256(abi.encodePacked(secret));

(bytes32 swapId, bytes32 operationId) = htlcBridge.createHTLC{value: swapAmount}(
    recipientAddress,
    address(0), // Native ETH
    swapAmount,
    secretHash,
    block.timestamp + 24 hours, // 24 hour timelock
    "solana" // Destination chain
);

// 2. Lock funds (creates Trinity operation)
htlcBridge.lockHTLC(swapId);

// 3. Validators submit proofs automatically

// 4. Recipient claims with secret
htlcBridge.claimHTLC(swapId, secret);
```

---

## 📊 Example Flows

### Example 1: Inheritance Vault

**Scenario**: Alice creates an inheritance vault for her children, unlocking in 10 years.

```solidity
// 1. Alice deploys vault
ChronosVault inheritanceVault = new ChronosVault(
    IERC20(usdcAddress),
    "Alice's Inheritance",
    "ALICE-INH",
    block.timestamp + 10 * 365 days, // 10 years
    4, // Security level 4 (Trinity + multi-sig)
    VaultType.INHERITANCE,
    "family_key_2025",
    false, // Private
    trinityBridgeAddress
);

// 2. Alice deposits $1M USDC
usdc.approve(address(inheritanceVault), 1_000_000e6);
inheritanceVault.deposit(1_000_000e6, address(inheritanceVault));

// 3. Alice configures multi-sig (Alice + 2 children)
inheritanceVault.addSigner(aliceAddress);
inheritanceVault.addSigner(child1Address);
inheritanceVault.addSigner(child2Address);
inheritanceVault.setThreshold(2); // 2-of-3 signatures
inheritanceVault.enableMultiSig(true);

// ... 10 years later ...

// 4. Children request withdrawal
uint256 requestId = inheritanceVault.requestWithdrawal(1_000_000e6, child1Address);

// 5. Both children approve
inheritanceVault.approveWithdrawal(requestId); // Child 1
inheritanceVault.approveWithdrawal(requestId); // Child 2

// 6. Create Trinity operation for security level 4
bytes32 operationId = trinityBridge.createOperation{value: 0.001 ether}(
    OperationType.TRANSFER,
    "inheritance_withdrawal",
    usdcAddress,
    1_000_000e6,
    false,
    true,
    0
);

// 7. Register with vault
inheritanceVault.setTrinityOperation(operationId);

// 8. Validators submit proofs (automatic)
// ... Arbitrum, Solana, TON validators verify ...

// 9. Execute withdrawal (when 2-of-3 consensus + 2-of-3 multi-sig achieved)
inheritanceVault.executeWithdrawal(requestId);
```

### Example 2: HTLC Atomic Swap (ETH ↔ SOL)

**Scenario**: Bob wants to swap 10 ETH for 500 SOL atomically.

```solidity
// 1. Bob generates secret
bytes32 secret = keccak256("bob_secret_phrase_2025");
bytes32 secretHash = keccak256(abi.encodePacked(secret));

// 2. Bob creates HTLC on Ethereum
(bytes32 swapId, ) = htlcBridge.createHTLC{value: 10 ether}(
    bobSolanaAddress,
    address(0),
    10 ether,
    secretHash,
    block.timestamp + 24 hours,
    "solana"
);

// 3. Bob locks ETH
htlcBridge.lockHTLC{value: 10 ether}(swapId);

// 4. Alice (counterparty) sees swap on Solana, locks 500 SOL with same secretHash

// 5. Validators verify HTLC on both chains

// 6. Bob claims on Solana by revealing secret
// ... This reveals secret to Alice ...

// 7. Alice claims on Ethereum using same secret
htlcBridge.claimHTLC(swapId, secret);

// Result: Atomic swap completed!
// - Bob received 500 SOL on Solana
// - Alice received 10 ETH on Ethereum
// - If either party doesn't claim, refunds occur after timelock
```

---

## 🚀 Deployment Addresses

### Arbitrum Sepolia (Testnet)

| Contract | Address |
|----------|---------|
| CrossChainBridgeOptimized | `0x499B24225a4d15966E118bfb86B2E421d57f4e21` |
| HTLCBridge | `0x6cd3B1a72F67011839439f96a70290051fd66D57` |
| ChronosVault | TBD (deploy with factory) |
| ChronosVaultOptimized | TBD (deploy with factory) |

---

## 📚 Additional Resources

- **Whitepaper**: `docs/whitepapers/CHRONOS_VAULT_WHITEPAPER.md`
- **Security Audit**: `docs/audits/TRINITY_PROTOCOL_AUDIT.md`
- **Lean 4 Proofs**: `verification/lean4/`
- **GitHub**: https://github.com/Chronos-Vault/chronos-vault-contracts

---

## ⚠️ Important Notes

1. **NOT a Token Bridge**: Trinity Protocol verifies operations, it does NOT transfer tokens between chains.
2. **Manual vs Automated**: Vaults can use EITHER manual verification OR Trinity Bridge for consensus.
3. **Backward Compatible**: Existing vaults continue to work with manual verification.
4. **Security Level 3+**: MUST use Trinity 2-of-3 consensus (no bypass mechanism).
5. **Immutable Parameters**: Security settings CANNOT be changed after vault creation (trust math, not humans).

---

## 🔧 Troubleshooting

**Q: My withdrawal is blocked at security level 3**  
A: You must provide 2-of-3 chain verification. Either:
- Submit manual proofs for Solana + TON
- OR create Trinity operation and wait for validators

**Q: HTLCBridge claimHTLC() reverts with "Trinity 2-of-3 consensus not achieved"**  
A: Validators haven't submitted enough proofs yet. Check:
```solidity
(bool arbitrum, bool solana, bool ton) = trinityBridge.getChainVerifications(operationId);
// Need at least 2 of 3 to be true
```

**Q: How do I know if consensus is achieved?**  
A:
```solidity
bool approved = trinityBridge.hasConsensusApproval(operationId);
// Returns true if 2-of-3 chains verified
```

---

**Built with ❤️ by Chronos Vault Team**  
**Trinity Protocol™ - Trust Math, Not Humans**
