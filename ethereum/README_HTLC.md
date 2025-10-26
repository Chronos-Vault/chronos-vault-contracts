# HTLC Atomic Swaps - Trinity Protocol™ v1.5

**THIS IS OUR TECHNOLOGY** - Chronos Vault's own cross-chain solution. Not LayerZero. Not Wormhole.

## Overview

Trinity Protocol™ provides mathematically provable HTLC (Hash Time-Locked Contract) atomic swaps with 2-of-3 multi-chain consensus verification across Arbitrum, Solana, and TON blockchains.

## Deployed Contracts

### Arbitrum Sepolia (Testnet)

**HTLCBridge:** [`0x6cd3B1a72F67011839439f96a70290051fd66D57`](https://sepolia.arbiscan.io/address/0x6cd3B1a72F67011839439f96a70290051fd66D57)
- HTLC atomic swap implementation
- Manages swap lifecycle and escrow
- Integrates with Trinity Protocol v1.5

**CrossChainBridgeOptimized:** [`0x499B24225a4d15966E118bfb86B2E421d57f4e21`](https://sepolia.arbiscan.io/address/0x499B24225a4d15966E118bfb86B2E421d57f4e21)
- Trinity Protocol 2-of-3 consensus
- Validator proof verification
- Multi-chain operation management

## Contract Interface

### IHTLC.sol

Complete interface for HTLC operations with Trinity Protocol integration:

```solidity
interface IHTLC {
    // Create HTLC with Trinity Protocol
    function createHTLC(...) external payable returns (bytes32 swapId, bytes32 operationId);
    
    // Lock funds in escrow
    function lockHTLC(bytes32 swapId) external payable returns (bool success);
    
    // Submit 2-of-3 consensus proofs
    function submitConsensusProof(...) external returns (bool consensusAchieved);
    
    // Claim with secret reveal
    function claimHTLC(bytes32 swapId, bytes32 secret) external returns (bool success);
    
    // Refund after timelock
    function refundHTLC(bytes32 swapId) external returns (bool success);
}
```

## Mathematical Security

**Combined Attack Probability: ~10^-50**

### Security Layers:

1. **HTLC Atomicity**: 10^-39 (Keccak256 cryptographic hash)
2. **Trinity 2-of-3 Consensus**: 10^-12 (requires compromising 2 blockchains)
3. **Economic Disincentive**: $8B+ attack cost vs <$1M gain (8000:1 ratio)

## Integration

See `server/defi/atomic-swap-service.ts` for TypeScript integration and `docs/HTLC_SECURITY_PROOF.md` for complete mathematical proofs.

## Usage Example

```typescript
import { ethers } from 'ethers';

const htlcBridge = new ethers.Contract(
  '0x6cd3B1a72F67011839439f96a70290051fd66D57',
  HTLCBridgeABI,
  signer
);

// 1. Generate secret and hash
const secret = ethers.randomBytes(32);
const secretHash = ethers.keccak256(secret);

// 2. Create HTLC
const { swapId, operationId } = await htlcBridge.createHTLC(
  recipientAddress,
  tokenAddress,
  amount,
  secretHash,
  timelock,
  'solana'
);

// 3. Lock funds
await htlcBridge.lockHTLC(swapId, { value: amount });

// 4. Wait for 2-of-3 consensus from validators

// 5. Claim by revealing secret
await htlcBridge.claimHTLC(swapId, secret);
```

---

**Author:** Chronos Vault Team  
**Version:** v1.5-PRODUCTION  
**Network:** Arbitrum Sepolia  
**HTLCBridge:** 0x6cd3B1a72F67011839439f96a70290051fd66D57  
**Trinity Bridge:** 0x499B24225a4d15966E118bfb86B2E421d57f4e21
