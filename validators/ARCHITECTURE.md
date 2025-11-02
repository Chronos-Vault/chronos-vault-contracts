# Trinity Protocol - Technical Architecture

## Overview

Trinity Protocol implements a 2-of-3 multi-chain consensus mechanism using Merkle tree cryptographic verification across Ethereum (Arbitrum L2), Solana, and TON blockchains.

## System Components

```
┌──────────────────────────────────────────────────────────┐
│                    User Application                       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│         Ethereum Bridge (Arbitrum Sepolia)               │
│  - Aggregates cross-chain proofs                         │
│  - Verifies Merkle proofs cryptographically              │
│  - Enforces 2-of-3 consensus                             │
│  - Executes operations when consensus reached            │
└────────────┬─────────────────────┬────────────────────────┘
             │                     │
     ┌───────▼──────┐      ┌──────▼───────┐
     │   Solana     │      │     TON      │
     │  Validator   │      │  Validator   │
     │              │      │              │
     │ - Generates  │      │ - Generates  │
     │   proofs     │      │   proofs     │
     │ - Stores     │      │ - Stores     │
     │   on-chain   │      │   on-chain   │
     └──────────────┘      └──────────────┘
             ▲                     ▲
             │                     │
             └─────────┬───────────┘
                       │
                ┌──────▼──────┐
                │   Trinity   │
                │   Relayer   │
                │             │
                │ - Monitors  │
                │   chains    │
                │ - Fetches   │
                │   proofs    │
                │ - Submits   │
                │   to bridge │
                └─────────────┘
```

## Consensus Mechanism

### 2-of-3 Trinity Protocol

Operations require verification from **at least 2 out of 3** validator chains:

| Combination | Status |
|-------------|--------|
| Arbitrum + Solana | ✅ Consensus |
| Arbitrum + TON | ✅ Consensus |
| Solana + TON | ✅ Consensus |
| Arbitrum only | ❌ No consensus |
| Solana only | ❌ No consensus |
| TON only | ❌ No consensus |

### Operation Lifecycle

1. **Initiation**: User creates operation on Ethereum
   ```
   Status: PENDING
   validProofCount: 0
   ```

2. **Proof Submission**: Validators submit proofs
   ```
   Solana proof → validProofCount: 1
   TON proof → validProofCount: 2 → CONSENSUS REACHED
   ```

3. **Execution**: Operation auto-executes when 2-of-3 consensus reached
   ```
   Status: COMPLETED
   ```

## Merkle Tree Implementation

### Tree Structure

```
            Root (stored on Ethereum)
           /                        \
        H(L,R)                    H(L,R)
       /      \                  /      \
   H(A,B)   H(C,D)          H(E,F)   H(G,H)
    / \      / \             / \      / \
   A   B    C   D           E   F    G   H
   
   A = keccak256(operationId)
```

### Proof Verification

**Leaf Computation** (on-chain):
```solidity
bytes32 leaf = keccak256(abi.encodePacked(operationId));
```

**Proof Structure**:
```javascript
{
  merkleRoot: "0xabc...",  // Tree root
  proof: [                 // Sibling hashes
    "0xdef...",           // Sibling at level 1
    "0x123...",           // Sibling at level 2
    "0x456..."            // Sibling at level 3
  ]
}
```

**Verification Algorithm**:
```solidity
computedHash = leaf;
for (i = 0; i < proof.length; i++) {
    sibling = proof[i];
    if (computedHash <= sibling) {
        computedHash = keccak256(abi.encodePacked(computedHash, sibling));
    } else {
        computedHash = keccak256(abi.encodePacked(sibling, computedHash));
    }
}
return (computedHash == root);
```

## Chain-Specific Implementations

### Solana Program

**Account Structure**:
```rust
#[account]
pub struct ProofRecord {
    pub operation_id: [u8; 32],      // Operation identifier
    pub merkle_root: [u8; 32],       // Tree root hash
    pub merkle_proof: Vec<[u8; 32]>, // Sibling hashes (max 10)
    pub slot: u64,                   // Solana slot number
    pub timestamp: i64,              // Unix timestamp
}
```

**Storage**:
- Stored in Program Derived Addresses (PDAs)
- Seeds: `["proof", operation_id]`
- Size: ~468 bytes per proof
- Rent cost: ~0.002 SOL

### TON Contract

**Getter Method**:
```func
(int, int, cell, int, int, int, int, int, int) get_proof_record(int operation_id) method_id {
    var (proof_dict, _) = get_data().udict_get?(256, operation_id);
    return parse_proof_record(proof_dict);
}
```

**Storage**:
- Dictionary-based storage
- Key: 256-bit operation ID
- Value: Proof record cell
- Getter calls are free (read-only)

### Ethereum Bridge

**Core Functions**:

1. **submitSolanaProof()**
   ```solidity
   function submitSolanaProof(
       uint256 operationId,
       bytes32 merkleRoot,
       bytes32[] calldata proof
   ) external whenNotPaused returns (bool)
   ```

2. **submitTONProof()**
   ```solidity
   function submitTONProof(
       uint256 operationId,
       bytes32 merkleRoot,
       bytes32[] calldata proof
   ) external whenNotPaused returns (bool)
   ```

3. **verifyMerkleProof()**
   ```solidity
   function verifyMerkleProof(
       bytes32 leaf,
       bytes32[] memory proof,
       bytes32 root
   ) public pure returns (bool)
   ```

**Storage**:
```solidity
struct Operation {
    bytes32 id;
    address user;
    uint8 operationType;
    uint256 amount;
    OperationStatus status;
    uint8 validProofCount;
    mapping(uint8 => bool) chainVerified;  // chainId => verified
}
```

## Trinity Relayer

**Responsibilities**:
1. Monitor all three blockchains for new operations
2. Fetch proof data from Solana/TON when available
3. Submit proofs to Ethereum bridge
4. Handle retries and error cases

**Architecture**:
```javascript
class TrinityRelayer {
    // Blockchain connections
    ethProvider: Provider
    solanaConnection: Connection
    tonClient: TonClient
    
    // Core methods
    async getSolanaProof(operationId): ProofData
    async getTONProof(operationId): ProofData
    async submitSolanaProof(operationId, proof): boolean
    async submitTONProof(operationId, proof): boolean
}
```

## Security Model

### Cryptographic Properties

1. **Collision Resistance**: Based on Keccak-256
   - Probability of collision: ~2^-256
   
2. **Proof Completeness**: Valid proofs always verify
   
3. **Proof Soundness**: Invalid proofs never verify (except with negligible probability)

### Attack Resistance

| Attack Vector | Mitigation |
|---------------|------------|
| Proof Forgery | Cryptographic Merkle verification |
| Leaf Spoofing | Leaf computed on-chain from operationId |
| Replay Attacks | Each chain can only verify once |
| Double Spend | 2-of-3 consensus required |
| Front-running | Operation state locked during verification |

### Network Assumptions

Trinity Protocol requires:
- **Chain Liveness**: At least 2 of 3 chains remain operational
- **Validator Honesty**: Majority of validators are honest
- **Network Connectivity**: Relayer can communicate with all chains

## Gas Costs (Arbitrum Sepolia)

| Operation | Gas | USD (@ 0.1 gwei, ETH=$2000) |
|-----------|-----|------------------------------|
| submitSolanaProof (3 siblings) | ~80,000 | $0.016 |
| submitSolanaProof (10 siblings) | ~82,000 | $0.016 |
| submitTONProof (3 siblings) | ~80,000 | $0.016 |
| verifyMerkleProof only | ~5,000 | $0.001 |

## Performance Characteristics

### Latency

- **Solana**: ~0.4s block time
- **TON**: ~5s block time
- **Arbitrum**: ~0.25s block time
- **Total E2E**: ~10-15s for 2-of-3 consensus

### Throughput

- **Solana**: 2,000+ TPS (theoretical)
- **TON**: 100,000+ TPS (theoretical)
- **Arbitrum**: 40,000+ TPS (theoretical)
- **Trinity Protocol**: Limited by Ethereum settlement (~100 TPS)

### Proof Sizes

| Tree Depth | Operations | Proof Size | Gas Cost |
|------------|-----------|------------|----------|
| 3 levels | 8 | 3 × 32 = 96 bytes | ~80,000 |
| 10 levels | 1,024 | 10 × 32 = 320 bytes | ~82,000 |
| 20 levels | 1,048,576 | 20 × 32 = 640 bytes | ~86,000 |

## Deployment Information

### Testnet Addresses

- **Ethereum Bridge**: Deploy to Arbitrum Sepolia
- **Solana Program**: `5oD8S1TtkdJbAX7qhsGticU7JKxjwY4AbEeBdnkUrrKY` (Devnet)
- **TON Contract**: `EQDx6yH5WH3Ex47h0PBnOBMzPCsmHdnL2snts3DZBO5CYVVJ` (Testnet)

### Network Configuration

```javascript
const networks = {
    ethereum: {
        rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
        chainId: 421614
    },
    solana: {
        rpc: 'https://api.devnet.solana.com',
        commitment: 'confirmed'
    },
    ton: {
        rpc: 'https://testnet.toncenter.com/api/v2/jsonRPC'
    }
};
```

## References

- **Merkle Trees**: https://en.wikipedia.org/wiki/Merkle_tree
- **BFT Consensus**: https://en.wikipedia.org/wiki/Byzantine_fault
- **Repository**: https://github.com/Chronos-Vault/chronos-vault-contracts
