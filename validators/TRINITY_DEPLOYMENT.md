# Trinity Protocol Deployment Guide

## Overview

Trinity Protocol is a 2-of-3 multi-chain consensus verification system operating across Ethereum (Arbitrum), Solana, and TON blockchains. This guide covers deployment and integration.

## Architecture

```
┌─────────────────┐
│ Ethereum Bridge │ ← Aggregates proofs from Solana & TON
│  (Arbitrum L2)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──┐
│Solana │ │ TON │ ← Validators generate Merkle proofs
│Program│ │ Contract│
└───────┘ └─────┘
```

## Smart Contracts

### Ethereum Bridge (Arbitrum Sepolia)

**Contract**: `CrossChainBridgeOptimized.sol`

**Key Functions**:
```solidity
// Submit Solana proof
function submitSolanaProof(
    uint256 operationId,
    bytes32 merkleRoot,
    bytes32[] calldata proof
) external returns (bool)

// Submit TON proof
function submitTONProof(
    uint256 operationId,
    bytes32 merkleRoot,
    bytes32[] calldata proof
) external returns (bool)

// Verify Merkle proof
function verifyMerkleProof(
    bytes32 leaf,
    bytes32[] memory proof,
    bytes32 root
) public pure returns (bool)
```

**Deployment**:
```bash
cd contracts/ethereum
npx hardhat compile
npx hardhat run scripts/deploy-bridge-production.js --network arbitrum-sepolia
```

### Solana Program (Devnet)

**Program ID**: `5oD8S1TtkdJbAX7qhsGticU7JKxjwY4AbEeBdnkUrrKY`

**Account Structure**:
```rust
pub struct ProofRecord {
    pub operation_id: [u8; 32],
    pub merkle_root: [u8; 32],
    pub merkle_proof: Vec<[u8; 32]>,
    pub slot: u64,
    pub timestamp: i64,
}
```

### TON Contract (Testnet)

**Address**: `EQDx6yH5WH3Ex47h0PBnOBMzPCsmHdnL2snts3DZBO5CYVVJ`

**Getter Method**:
```func
(int, int, cell, int, int, int, int, int, int) get_proof_record(int operation_id)
```

## Trinity Relayer

The relayer monitors all three chains and submits proofs to the Ethereum bridge.

**Configuration** (`.env`):
```env
# Ethereum/Arbitrum
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_private_key
BRIDGE_CONTRACT_ADDRESS=deployed_bridge_address

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PROGRAM_ID=5oD8S1TtkdJbAX7qhsGticU7JKxjwY4AbEeBdnkUrrKY

# TON
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC
TON_CONTRACT_ADDRESS=EQDx6yH5WH3Ex47h0PBnOBMzPCsmHdnL2snts3DZBO5CYVVJ
```

**Running**:
```bash
node trinity-relayer-production.mjs
```

## Merkle Proof Flow

1. **Operation Creation**: User initiates operation on Ethereum
2. **Proof Generation**: Validators on Solana and TON generate Merkle proofs
3. **Proof Storage**: Proofs stored on-chain (Solana PDA, TON dictionary)
4. **Relayer Submission**: Relayer fetches proofs and submits to Ethereum
5. **Verification**: Ethereum contract verifies proofs cryptographically
6. **Consensus**: When 2-of-3 chains verify, operation executes

## Integration Example

```javascript
import { ethers } from 'ethers';

// Connect to bridge
const bridge = new ethers.Contract(
    BRIDGE_ADDRESS,
    BRIDGE_ABI,
    signer
);

// Monitor consensus
bridge.on('ConsensusReached', (operationId, proofCount) => {
    console.log(`Operation ${operationId} reached consensus: ${proofCount}/3`);
});

// Submit proof
const tx = await bridge.submitSolanaProof(
    operationId,
    merkleRoot,
    proofSiblings
);
await tx.wait();
```

## Security

- **Merkle Verification**: All proofs verified cryptographically on-chain
- **Leaf Computation**: Operation leaf computed on-chain (prevents spoofing)
- **2-of-3 Consensus**: Requires verification from at least 2 chains
- **Replay Protection**: Operations can only be verified once per chain

## Gas Costs (Arbitrum Sepolia)

| Operation | Gas | Cost (@ 0.1 gwei) |
|-----------|-----|-------------------|
| submitSolanaProof | ~80,000 | $0.008 |
| submitTONProof | ~80,000 | $0.008 |
| verifyMerkleProof | ~5,000 | $0.0005 |

## Network Information

| Chain | Network | RPC |
|-------|---------|-----|
| Ethereum | Arbitrum Sepolia | https://sepolia-rollup.arbitrum.io/rpc |
| Solana | Devnet | https://api.devnet.solana.com |
| TON | Testnet | https://testnet.toncenter.com/api/v2/jsonRPC |

## Events

```solidity
// Emitted when proof submitted
event ProofSubmitted(
    uint256 indexed operationId,
    uint8 indexed chainId,
    bytes32 merkleRoot
);

// Emitted when 2-of-3 consensus reached
event ConsensusReached(
    uint256 indexed operationId,
    uint8 validProofCount
);
```

## Support

- **Repository**: https://github.com/Chronos-Vault/chronos-vault-contracts
- **Documentation**: `/validators` directory
- **Smart Contracts**: `/contracts` directory

## License

MIT
