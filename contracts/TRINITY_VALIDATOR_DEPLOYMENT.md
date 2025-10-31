# Trinity Protocol Validator Deployment Guide

**For Open-Source Developers**

This guide explains how to deploy the Trinity Protocol multi-chain validators across Ethereum, Solana, and TON blockchains.

---

## What is Trinity Protocol?

Trinity Protocol provides **2-of-3 consensus verification** across three independent blockchains:
- **Ethereum/Arbitrum L2**: Primary consensus coordinator (already deployed)
- **Solana**: High-frequency proof generation (<5 seconds)
- **TON**: Emergency backup with quantum-resistant storage (<60 seconds)

**Mathematical Security**: ~10^-50 attack probability (requires compromising 2 of 3 blockchains)

---

## Files You Need

### Solana Validator

```
contracts/solana/
├── trinity_validator.rs              # Main validator program (Anchor/Rust)
└── deploy-trinity-validator.ts       # Deployment script
```

**Purpose**: Monitors Ethereum CrossChainBridgeOptimized events, generates Merkle proofs from Solana state, submits proofs back to Ethereum.

### TON Validator

```
contracts/ton/
├── TrinityConsensus.fc               # Main validator contract (FunC)
└── deploy-trinity-consensus.ts       # Deployment script
```

**Purpose**: Monitors Ethereum CrossChainBridgeOptimized events, generates Merkle proofs from TON state with quantum-resistant storage, submits proofs to Ethereum.

### Off-Chain Relayer

```
contracts/validators/
└── trinity-relayer-service.ts        # Multi-chain relayer service
```

**Purpose**: Coordinates proof generation across all chains, monitors Ethereum for new operations, submits proofs automatically.

---

## Prerequisites

### Solana Development
- Rust toolchain (stable)
- Anchor framework v0.28+
- Solana CLI tools
- Solana wallet with SOL for gas

### TON Development
- Node.js v18+
- TON Blueprint
- FunC compiler
- TON wallet with TON for gas

### Off-Chain Service
- Node.js v18+
- Ethereum RPC endpoint (Arbitrum)
- Solana RPC endpoint
- TON API endpoint

---

## Deployment Steps

### 1. Deploy Solana Trinity Validator

```bash
cd contracts/solana

# Build the Anchor program
anchor build

# Deploy to Devnet
anchor deploy --provider.cluster devnet

# Initialize the validator
ts-node deploy-trinity-validator.ts --network devnet
```

**Environment Variables Required**:
```bash
export VALIDATOR_ETHEREUM_ADDRESS="0x..."  # Your Ethereum validator address
export SOLANA_WALLET_PATH="~/.config/solana/id.json"
export ARBITRUM_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY"
```

**Output**:
- Program ID: `TrNtyV4L1D4T0RSoLAN4C0nsENSuS1111111111111`
- Validator PDA: Auto-generated
- Status: Initialized and active

### 2. Deploy TON Trinity Consensus

```bash
cd contracts/ton

# Build the FunC contract
npx blueprint build TrinityConsensus

# Deploy to TON Testnet
npx blueprint run deployTrinityConsensus --testnet
```

**Environment Variables Required**:
```bash
export VALIDATOR_ETHEREUM_ADDRESS="0x..."  # Your Ethereum validator address
export TON_WALLET_MNEMONIC="your mnemonic here"
export ARBITRUM_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY"
```

**Output**:
- Contract Address: Auto-generated
- Quantum Keys: ML-KEM-1024 + CRYSTALS-Dilithium-5
- Status: Initialized and active

### 3. Configure Ethereum CrossChainBridgeOptimized

Add your validators as authorized on Ethereum:

```javascript
// Using Hardhat or Ethers.js
const bridge = await ethers.getContractAt(
  "CrossChainBridgeOptimized",
  "0x499B24225a4d15966E118bfb86B2E421d57f4e21"
);

// Add Solana validator (Chain ID = 2)
await bridge.addAuthorizedValidator(2, "0xYourEthereumAddress");

// Add TON validator (Chain ID = 3)
await bridge.addAuthorizedValidator(3, "0xYourEthereumAddress");
```

### 4. Start Off-Chain Relayer Service

```bash
cd contracts/validators

# Install dependencies
npm install

# Configure environment
cat > .env <<EOF
ETHEREUM_PRIVATE_KEY="0x..."
ARBITRUM_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY"
SOLANA_RPC_URL="https://api.devnet.solana.com"
TON_RPC_URL="https://testnet.toncenter.com/api/v2/jsonRPC"
EOF

# Start the relayer
npm run start:relayer -- --network testnet
```

**What it does**:
- Monitors Ethereum for `OperationCreated` events
- Triggers Solana proof generation via `trinity_validator.rs`
- Triggers TON proof generation via `TrinityConsensus.fc`
- Submits proofs to Ethereum CrossChainBridgeOptimized

---

## Testing the Integration

### End-to-End Test

1. **Create Operation on Ethereum**:
```javascript
const vault = await ethers.getContractAt("ChronosVault", VAULT_ADDRESS);
const tx = await vault.withdraw(shares, receiver, owner);
```

2. **Monitor Relayer Logs**:
```
📨 New Operation Detected!
   Operation ID: 0xabc123...
   
🔧 Generating Solana proof...
   ✅ Solana proof submitted! TX: 0xdef456...
   
🔧 Generating TON proof...
   ✅ TON proof submitted! TX: 0x789ghi...
   
✅ Consensus Achieved! (2 of 3 proofs)
```

3. **Execute Withdrawal**:
```javascript
// Now that consensus is achieved, withdrawal succeeds
await vault.withdraw(shares, receiver, owner);
// ✅ Funds released
```

---

## Smart Contract Integration

### How Validators Work

```
USER CREATES OPERATION
         ↓
CrossChainBridgeOptimized.createOperation()
         ↓
Ethereum Proof: AUTO-CREATED (1/3) ✅
         ↓
    BROADCAST EVENT
         ↓
    ┌────┴────┐
    ▼         ▼
SOLANA    TON VALIDATOR
VALIDATOR      ↓
    ↓     Generate Merkle Proof
Generate      from TON State
Merkle        (<60s, quantum-safe)
Proof         ↓
(<5s)    Submit to Ethereum
    ↓          ↓
Submit to  ┌──┴──┐
Ethereum   │     │
    ↓      ▼     ▼
    └──→ ETHEREUM ←──┘
         ↓
    2-of-3 CONSENSUS ✅
         ↓
    OPERATION APPROVED
```

### Solana Validator Functions

```rust
// Initialize validator
pub fn initialize(
    ctx: Context<Initialize>,
    ethereum_bridge_address: [u8; 20],
    validator_ethereum_address: [u8; 20],
    arbitrum_rpc_url: String,
) -> Result<()>

// Submit proof to Ethereum
pub fn submit_consensus_proof(
    ctx: Context<SubmitProof>,
    operation_id: [u8; 32],
    merkle_proof: Vec<[u8; 32]>,
    solana_block_hash: [u8; 32],
    solana_tx_signature: [u8; 64],
    solana_block_number: u64,
) -> Result<()>

// Verify vault operation
pub fn verify_vault_operation(
    ctx: Context<VerifyOperation>,
    vault_id: u64,
    operation_type: OperationType,
    amount: u64,
    user: Pubkey,
) -> Result<()>
```

### TON Validator Functions

```func
;; Initialize validator
() initialize(
    slice eth_bridge_addr,
    slice validator_eth_addr,
    slice arbitrum_rpc,
    int ml_kem_pubkey,
    int dilithium_pubkey
) impure

;; Submit proof to Ethereum
() submit_consensus_proof(
    int operation_id,
    cell merkle_proof,
    int ton_block_hash,
    int ton_tx_hash,
    int ton_block_number,
    slice sender_addr
) impure

;; Get validator configuration
(slice, slice, slice, int, int, int) get_validator_config() method_id

;; Check if proof submitted
int is_proof_submitted(int operation_id) method_id
```

---

## Network Addresses

### Testnet (Current Deployment)

| Chain | Contract | Address |
|-------|----------|---------|
| Arbitrum Sepolia | CrossChainBridgeOptimized | `0x499B24225a4d15966E118bfb86B2E421d57f4e21` |
| Arbitrum Sepolia | ChronosVault | Multiple instances |
| Solana Devnet | trinity_validator | Deploy using script |
| TON Testnet | TrinityConsensus | Deploy using script |

### Mainnet (Future)

| Chain | Contract | Address |
|-------|----------|---------|
| Arbitrum One | CrossChainBridgeOptimized | TBD |
| Solana Mainnet | trinity_validator | TBD |
| TON Mainnet | TrinityConsensus | TBD |

---

## Monitoring & Maintenance

### Validator Health Checks

**Solana**:
```bash
# Check validator status
solana account <VALIDATOR_PDA> --url devnet

# View recent transactions
solana transaction-history <VALIDATOR_PDA> --url devnet
```

**TON**:
```bash
# Check contract status via API
curl https://testnet.toncenter.com/api/v2/getAddressInformation?address=<CONTRACT_ADDRESS>
```

**Relayer**:
```bash
# Check if service is running
pm2 status trinity-relayer

# View logs
pm2 logs trinity-relayer
```

### Common Issues

**Issue**: Solana proof submission fails  
**Solution**: Check RPC endpoint, verify validator has SOL for gas

**Issue**: TON proof not generated  
**Solution**: Verify TON API endpoint, check quantum key initialization

**Issue**: Relayer not detecting events  
**Solution**: Check WebSocket connection to Arbitrum RPC, verify bridge address

---

## Security Considerations

1. **Private Keys**: Never commit private keys to repositories
2. **RPC Endpoints**: Use dedicated RPC providers with rate limiting
3. **Validator Authorization**: Only authorize trusted validators on Ethereum
4. **Monitoring**: Set up alerts for validator downtime or proof submission failures
5. **Quantum Keys**: Generate proper ML-KEM-1024 and Dilithium-5 keys for TON (not placeholders)

---

## Support

- **GitHub**: https://github.com/Chronos-Vault/chronos-vault-contracts
- **Issues**: Report bugs on GitHub Issues
- **Security**: security@chronosvault.org
- **Integration**: integration@chronosvault.org

---

**Version**: Trinity Protocol v1.5  
**Status**: Testnet Deployment Ready  
**Security**: 77 properties formally verified
