# Trinity Protocol - Merkle Proof Verification

## Overview

Trinity Protocol uses Merkle trees to cryptographically verify cross-chain operations. Each validator chain (Solana, TON) generates Merkle proofs that are verified on Ethereum.

## Merkle Tree Structure

```
                Root
               /    \
              /      \
             H1      H2
            /  \    /  \
           H3  H4  H5  H6
          /  \
        L1   L2  (Leaf = keccak256(operationId))
```

## Smart Contract Implementation

### verifyMerkleProof()

Verifies a Merkle proof against a root hash.

```solidity
function verifyMerkleProof(
    bytes32 leaf,
    bytes32[] memory proof,
    bytes32 root
) public pure returns (bool) {
    bytes32 computedHash = leaf;
    
    for (uint256 i = 0; i < proof.length; i++) {
        bytes32 sibling = proof[i];
        
        if (computedHash <= sibling) {
            computedHash = keccak256(abi.encodePacked(computedHash, sibling));
        } else {
            computedHash = keccak256(abi.encodePacked(sibling, computedHash));
        }
    }
    
    return computedHash == root;
}
```

**Parameters**:
- `leaf`: The leaf node hash (computed from operation data)
- `proof`: Array of sibling hashes forming the Merkle branch
- `root`: Expected Merkle root hash

**Returns**: `true` if proof is valid, `false` otherwise

**Gas Cost**: ~5,000 + (proof.length × 300) gas

### submitSolanaProof()

Submits and verifies a Solana-generated proof.

```solidity
function submitSolanaProof(
    uint256 operationId,
    bytes32 merkleRoot,
    bytes32[] calldata proof
) external whenNotPaused returns (bool)
```

**Process**:
1. Retrieves operation from storage
2. Validates operation exists and is pending
3. Computes leaf hash: `keccak256(abi.encodePacked(operationId))`
4. Verifies Merkle proof cryptographically
5. Marks Solana chain as verified
6. Checks for 2-of-3 consensus
7. Executes operation if consensus reached

### submitTONProof()

Submits and verifies a TON-generated proof.

```solidity
function submitTONProof(
    uint256 operationId,
    bytes32 merkleRoot,
    bytes32[] calldata proof
) external whenNotPaused returns (bool)
```

**Process**: Same as `submitSolanaProof()` but for TON chain (chainId = 3)

## Proof Generation

### Solana Program

Proofs are stored in PDAs (Program Derived Addresses):

```rust
pub struct ProofRecord {
    pub operation_id: [u8; 32],
    pub merkle_root: [u8; 32],
    pub merkle_proof: Vec<[u8; 32]>,  // Sibling hashes
    pub slot: u64,
    pub timestamp: i64,
}
```

**PDA Derivation**:
```rust
let (proof_pda, _) = Pubkey::find_program_address(
    &[b"proof", operation_id.as_ref()],
    program_id
);
```

### TON Contract

Proofs are stored in a dictionary and accessed via getter:

```func
(int, int, cell, int, int, int, int, int, int) get_proof_record(int operation_id) method_id {
    ;; Returns: (op_id, merkle_root, merkle_proof_cell, ...)
}
```

## Security Properties

### Cryptographic Guarantees

1. **Completeness**: Valid proofs always verify
2. **Soundness**: Invalid proofs never verify (except with negligible probability)
3. **Collision Resistance**: Based on SHA-256/Keccak-256 collision resistance

### On-Chain Validation

- **Leaf Computation**: Leaf hash is computed on-chain from `operationId` (prevents leaf spoofing)
- **Proof Verification**: Full cryptographic verification before accepting proof
- **Replay Protection**: Each chain can only verify an operation once
- **2-of-3 Consensus**: Operations require verification from at least 2 chains

## Integration Example

```javascript
import { ethers } from 'ethers';

// Fetch proof from Solana
const solanaProof = await fetchSolanaProof(operationId);

// Submit to Ethereum
const bridge = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, signer);
const tx = await bridge.submitSolanaProof(
    operationId,
    solanaProof.merkleRoot,
    solanaProof.proof  // Array of sibling hashes
);

await tx.wait();
```

## Gas Optimization

| Proof Depth | Siblings | Gas Cost |
|-------------|----------|----------|
| 3 levels | 3 hashes | ~6,000 |
| 5 levels | 5 hashes | ~6,500 |
| 10 levels | 10 hashes | ~8,000 |

Maximum proof depth: 10 siblings (enforced in relayer and contract)

## Error Handling

```solidity
// Common errors
require(operation.id == opId, "Operation not found");
require(operation.status == OperationStatus.PENDING, "Operation not pending");
require(!operation.chainVerified[chainId], "Chain already verified");
require(verifyMerkleProof(leaf, proof, root), "Invalid Merkle proof");
```

## Testing

```javascript
// Test valid proof
const leaf = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [operationId]));
const result = await bridge.verifyMerkleProof(leaf, proof, root);
assert(result === true);

// Test invalid proof
const invalidProof = [ethers.ZeroHash];
const result2 = await bridge.verifyMerkleProof(leaf, invalidProof, root);
assert(result2 === false);
```

## References

- **OpenZeppelin MerkleProof**: https://docs.openzeppelin.com/contracts/4.x/api/utils#MerkleProof
- **Merkle Tree Specification**: https://en.wikipedia.org/wiki/Merkle_tree
- **Trinity Protocol Repository**: https://github.com/Chronos-Vault/chronos-vault-contracts
