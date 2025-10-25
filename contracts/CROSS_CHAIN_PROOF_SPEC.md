# Trinity Protocol Cross-Chain Proof Specification

## Overview

This document defines the standardized proof format for Trinity Protocol's 2-of-3 multi-chain consensus system across Ethereum/Arbitrum, Solana, and TON blockchains.

## Core Principles

1. **Mathematical Consensus**: Security through cryptographic proofs, not human validators
2. **Chain-Agnostic Format**: All three chains must be able to parse and validate proofs
3. **Replay Protection**: Each proof must be unique and non-reusable
4. **Efficient Verification**: Minimize gas/compute costs while maintaining security

## Proof Data Structure

```typescript
interface CrossChainProof {
  // PROOF METADATA
  proofVersion: uint8;           // Protocol version (current: 1)
  sourceChainId: uint8;          // 1=Ethereum, 2=Solana, 3=TON
  destinationChainId: uint8;     // Chain receiving this proof
  
  // OPERATION DETAILS
  operationType: uint8;          // 1=VaultCreation, 2=Deposit, 3=Withdrawal, 4=StateUpdate
  operationId: bytes32;          // Unique ID for this operation
  vaultId: bytes32;              // Vault identifier (cross-chain compatible)
  
  // OPERATION DATA
  timestamp: uint64;             // Unix timestamp of operation
  blockNumber: uint64;           // Block height on source chain
  amount: uint256;               // Amount (if applicable, 0 otherwise)
  
  // CRYPTOGRAPHIC PROOF
  proofType: uint8;              // 1=MerkleProof, 2=Ed25519Signature, 3=QuantumResistant
  proofData: bytes;              // Variable-length proof data
  
  // VALIDATION
  nonce: uint256;                // Sequential nonce for replay protection
  validatorSignature: bytes;     // Signature from authorized validator
}
```

## Chain-Specific Proof Generation

### Ethereum/Arbitrum → Other Chains

**Proof Type**: Merkle Proof
```solidity
function generateEthereumProof(
    uint8 operationType,
    bytes32 vaultId,
    uint256 amount
) internal returns (CrossChainProof memory) {
    bytes32 operationHash = keccak256(abi.encodePacked(
        block.chainid,
        operationType,
        vaultId,
        amount,
        block.timestamp,
        block.number
    ));
    
    bytes32[] memory merkleProof = _generateMerkleProof(operationHash);
    
    return CrossChainProof({
        proofVersion: 1,
        sourceChainId: ETHEREUM_CHAIN_ID,
        destinationChainId: 0, // Set by relayer
        operationType: operationType,
        operationId: operationHash,
        vaultId: vaultId,
        timestamp: block.timestamp,
        blockNumber: block.number,
        amount: amount,
        proofType: 1, // Merkle
        proofData: abi.encode(merkleProof),
        nonce: operationNonce++,
        validatorSignature: "" // Set by relayer
    });
}
```

### Solana → Other Chains

**Proof Type**: Ed25519 Signature
```rust
pub struct SolanaProof {
    pub proof_version: u8,
    pub source_chain_id: u8,
    pub destination_chain_id: u8,
    pub operation_type: u8,
    pub operation_id: [u8; 32],
    pub vault_id: [u8; 32],
    pub timestamp: u64,
    pub slot: u64,
    pub amount: u64,
    pub proof_type: u8, // 2 = Ed25519
    pub signature: [u8; 64],
    pub public_key: [u8; 32],
    pub nonce: u64,
}

impl SolanaProof {
    pub fn generate(
        operation_type: u8,
        vault_id: [u8; 32],
        amount: u64,
    ) -> Self {
        let operation_data = [
            &[operation_type][..],
            &vault_id[..],
            &amount.to_le_bytes()[..],
        ].concat();
        
        let signature = ed25519_dalek::sign(&operation_data);
        
        SolanaProof {
            proof_version: 1,
            source_chain_id: 2,
            destination_chain_id: 0,
            operation_type,
            operation_id: hash(&operation_data),
            vault_id,
            timestamp: Clock::get().unix_timestamp as u64,
            slot: Clock::get().slot,
            amount,
            proof_type: 2,
            signature,
            public_key: get_validator_pubkey(),
            nonce: get_next_nonce(),
        }
    }
}
```

### TON → Other Chains

**Proof Type**: Quantum-Resistant (Dilithium-5)
```func
;; Generate quantum-resistant proof for cross-chain verification
(cell) generate_ton_proof(
    int operation_type,
    int vault_id,
    int amount
) {
    ;; Build operation data
    cell operation_data = begin_cell()
        .store_uint(operation_type, 8)
        .store_uint(vault_id, 256)
        .store_uint(amount, 128)
        .store_uint(now(), 64)
        .end_cell();
    
    ;; Generate Dilithium-5 signature (quantum-resistant)
    slice signature = dilithium5_sign(operation_data);
    
    ;; Construct proof cell
    return begin_cell()
        .store_uint(1, 8)  ;; proof_version
        .store_uint(3, 8)  ;; source_chain_id (TON)
        .store_uint(0, 8)  ;; destination_chain_id (set by relayer)
        .store_uint(operation_type, 8)
        .store_ref(operation_data)
        .store_uint(3, 8)  ;; proof_type (quantum-resistant)
        .store_slice(signature)
        .store_uint(get_next_nonce(), 64)
        .end_cell();
}
```

## Proof Verification

### On Ethereum/Arbitrum

```solidity
function verifyProof(CrossChainProof calldata proof) public view returns (bool) {
    // 1. Validate proof metadata
    require(proof.proofVersion == 1, "Invalid proof version");
    require(proof.sourceChainId != proof.destinationChainId, "Same chain");
    
    // 2. Check nonce for replay protection
    require(proof.nonce > lastProcessedNonce[proof.sourceChainId], "Nonce too old");
    
    // 3. Verify proof based on source chain
    if (proof.sourceChainId == SOLANA_CHAIN_ID) {
        return _verifySolanaProof(proof);
    } else if (proof.sourceChainId == TON_CHAIN_ID) {
        return _verifyTONProof(proof);
    }
    
    return false;
}

function _verifySolanaProof(CrossChainProof calldata proof) internal view returns (bool) {
    // Decode Ed25519 signature
    (bytes memory signature, bytes memory pubkey) = abi.decode(
        proof.proofData, 
        (bytes, bytes)
    );
    
    // Reconstruct signed message
    bytes32 message = keccak256(abi.encodePacked(
        proof.operationType,
        proof.vaultId,
        proof.amount,
        proof.timestamp
    ));
    
    // Verify Ed25519 signature (requires precompile or library)
    return Ed25519.verify(signature, message, pubkey);
}

function _verifyTONProof(CrossChainProof calldata proof) internal view returns (bool) {
    // Decode Dilithium-5 signature
    bytes memory signature = proof.proofData;
    
    // Verify quantum-resistant signature
    return Dilithium5.verify(signature, proof.operationId, tonValidatorPubKey);
}
```

### On Solana

```rust
pub fn verify_ethereum_proof(proof: &EthereumProof) -> Result<bool> {
    // 1. Validate proof metadata
    require!(proof.proof_version == 1, "Invalid version");
    require!(proof.source_chain_id == 1, "Not Ethereum proof");
    
    // 2. Check nonce
    let last_nonce = get_last_nonce(proof.source_chain_id)?;
    require!(proof.nonce > last_nonce, "Nonce too old");
    
    // 3. Verify Merkle proof
    let leaf_hash = hash(&[
        &proof.operation_type.to_le_bytes()[..],
        &proof.vault_id[..],
        &proof.amount.to_le_bytes()[..],
    ].concat());
    
    verify_merkle_proof(
        &proof.merkle_proof,
        &proof.merkle_root,
        leaf_hash
    )
}

pub fn verify_ton_proof(proof: &TONProof) -> Result<bool> {
    // Verify Dilithium-5 quantum-resistant signature
    dilithium5_verify(
        &proof.signature,
        &proof.operation_data,
        &TON_VALIDATOR_PUBKEY
    )
}
```

### On TON

```func
;; Verify Ethereum Merkle proof
int verify_ethereum_proof(cell proof_cell) {
    slice ps = proof_cell.begin_parse();
    
    ;; Parse proof metadata
    int proof_version = ps~load_uint(8);
    int source_chain_id = ps~load_uint(8);
    
    throw_unless(ERROR_INVALID_PROOF, proof_version == 1);
    throw_unless(ERROR_INVALID_PROOF, source_chain_id == 1);
    
    ;; Load operation data
    int operation_type = ps~load_uint(8);
    int vault_id = ps~load_uint(256);
    int amount = ps~load_uint(256);
    
    ;; Load Merkle proof
    cell merkle_proof = ps~load_ref();
    
    ;; Verify Merkle tree
    return verify_merkle_tree(merkle_proof, operation_type, vault_id, amount);
}

;; Verify Solana Ed25519 signature
int verify_solana_proof(cell proof_cell) {
    slice ps = proof_cell.begin_parse();
    
    ;; Parse signature components
    slice signature = ps~load_bits(512);  ;; Ed25519 signature (64 bytes)
    slice pubkey = ps~load_bits(256);     ;; Public key (32 bytes)
    
    ;; Reconstruct signed message
    cell message = begin_cell()
        .store_uint(operation_type, 8)
        .store_uint(vault_id, 256)
        .store_uint(amount, 128)
        .end_cell();
    
    ;; Verify Ed25519 signature
    return ed25519_verify(signature, message.cell_hash(), pubkey);
}
```

## 2-of-3 Consensus Enforcement

Each chain maintains a mapping of received proofs:

```solidity
struct ConsensusState {
    bool ethereumVerified;
    bool solanaVerified;
    bool tonVerified;
    uint256 verificationCount;
}

mapping(bytes32 => ConsensusState) public operationConsensus;

function requireConsensus(bytes32 operationId) internal view {
    ConsensusState memory state = operationConsensus[operationId];
    require(state.verificationCount >= 2, "Insufficient consensus");
}
```

## Relayer Service Role

The relayer service (`validators/cross-chain-relayer.ts`) performs:

1. **Listen**: Monitor all 3 chains for vault operations
2. **Generate**: Create proofs in the source chain's native format
3. **Transform**: Convert proofs to destination chain format
4. **Submit**: Send proofs to the other 2 chains
5. **Track**: Maintain nonce sequence and prevent replays

## Security Considerations

1. **Nonce Management**: Sequential nonces per source chain prevent replay attacks
2. **Timestamp Validation**: Reject proofs older than 1 hour to prevent stale data
3. **Validator Authorization**: Only authorized validators can sign proofs
4. **Merkle Root Trust**: Ethereum Merkle roots must be updated by authorized oracles
5. **Quantum Resistance**: TON uses Dilithium-5 for post-quantum security

## Implementation Priority

**Phase 1** (Current Sprint):
1. ✅ Define proof data structures
2. ⏳ Implement proof generation on all 3 chains
3. ⏳ Implement proof verification on all 3 chains

**Phase 2** (Next Sprint):
4. ⏳ Build relayer service
5. ⏳ Add 2-of-3 consensus enforcement
6. ⏳ End-to-end testing across all 3 chains

## Testing Strategy

1. **Unit Tests**: Verify proof generation and validation on each chain
2. **Integration Tests**: Test proof relay between two chains
3. **End-to-End Tests**: Full 2-of-3 consensus with all three chains
4. **Attack Scenarios**: Replay attacks, invalid signatures, consensus bypass attempts
