# HTLC (Hash Time-Locked Contracts) - Dual Architecture

## Overview
Chronos Vault offers two HTLC implementations for different security needs:

### 1. HTLCBridgeStandalone.sol (DEFAULT - Recommended)
**Pure cryptographic security** - No external dependencies

**Security Model**:
- **Hash Lock**: Keccak256 cryptographic guarantee (~10^-39 attack probability)
- **Time Lock**: Immutable blockchain-enforced deadlines
- **Atomic Execution**: Both parties succeed OR both get refunded (mathematically guaranteed)

**Advantages**:
- ✅ Zero external dependencies
- ✅ No fees (only gas costs)
- ✅ Simpler audit surface
- ✅ Faster execution
- ✅ Production-ready for most use cases

**Use Cases**: Most atomic swaps, DEX integrations, escrow services

### 2. HTLCBridge.sol (Trinity-Enhanced)
**HTLC + Trinity Protocol v3.5.4** - For teams requiring multi-chain consensus

**Security Model**:
- All HTLCBridgeStandalone guarantees PLUS
- 2-of-3 multi-chain consensus (Arbitrum, Solana, TON)
- Enhanced authorization controls
- Formal verification (105+ proven properties)

**Note**: Requires Trinity fee (0.001 ETH per operation) and IChronosVault interface implementation

**Use Cases**: Regulated environments, institutional custody, maximum security requirements

## Architecture Recommendation

**Default Deployment**: Use HTLCBridgeStandalone.sol
- Proven HTLC security model
- Industry-standard atomic swaps
- No additional complexity

**Trinity Enhancement**: Only if you need:
- Multi-chain quorum consensus
- Institutional-grade audit trail
- Regulatory compliance features

## Security Comparison

| Feature | HTLCBridgeStandalone | HTLCBridge + Trinity |
|---------|---------------------|---------------------|
| Hash Lock Security | ✅ 10^-39 | ✅ 10^-39 |
| Time Lock | ✅ Immutable | ✅ Immutable |
| Multi-Chain Consensus | ❌ | ✅ 2-of-3 |
| Formal Verification | ❌ | ✅ 105+ properties |
| External Dependencies | None | Trinity v3.5.4 |
| Fees | Gas only | Gas + 0.001 ETH |
| Audit Complexity | Lower | Higher |

**Conclusion**: Both are secure. Choose based on your compliance/consensus needs.

---

**Chronos Vault Team** | Production-Ready Smart Contracts
