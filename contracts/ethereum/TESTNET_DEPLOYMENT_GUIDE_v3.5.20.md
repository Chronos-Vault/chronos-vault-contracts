# Trinity Protocol™ v3.5.20 - Testnet Deployment Guide

## Quick Start Summary

Deploy Trinity Protocol to **Arbitrum Sepolia** (421614) in this exact order:

```
1. Deploy TrinityConsensusVerifier (core)
2. Deploy ChronosVaultOptimized (user vault)
3. Deploy EmergencyMultiSig (security)
4. Deploy TrinityKeeperRegistry (keeper management)
5. Deploy TrinityGovernanceTimelock (governance)
6. Deploy CrossChainMessageRelay (cross-chain)
7. Deploy HTLCChronosBridge (HTLC security)
8. Deploy HTLCArbToL1 (bridge layer)
```

---

## Step 1: Set Up Environment

### Required Environment Variables
```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_arbiscan_api_key

# Testnet Addresses (configure in config)
ARBITRUM_VALIDATOR=0x...  # Validator 1 (Arbitrum)
SOLANA_VALIDATOR=0x...    # Validator 2 (Solana bridge address)
TON_VALIDATOR=0x...       # Validator 3 (TON bridge address)
EMERGENCY_CONTROLLER=0x...
TREASURY=0x...
```

### Get Test ETH
- Arbitrum Sepolia faucet: https://faucet.arbitrum.io
- Need ~5 ETH for all deployments + testing

---

## Step 2: Deploy Core Contracts

### 2.1 Deploy TrinityConsensusVerifier
```bash
npx hardhat run scripts/deploy-trinity-v3.5.ts --network arbitrumSepolia
```

**Parameters:**
```solidity
constructor(
    address _arbitrumValidator,      // Your validator 1 address
    address _solanaValidator,        // Your validator 2 address
    address _tonValidator,           // Your validator 3 address
    address _emergencyController,    // Emergency admin
    address _feeBeneficiary          // Treasury address
)
```

**Save Output:**
```json
{
  "TrinityConsensusVerifier": "0x..."
}
```

### 2.2 Deploy ChronosVaultOptimized
```bash
npx hardhat run scripts/deploy-vault.ts --network arbitrumSepolia
```

**Parameters:**
```solidity
constructor(
    IERC20 _asset,           // Use USDC: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d (Arbitrum Sepolia)
    string _name,            // "Trinity Test Vault"
    string _symbol,          // "TTV"
    uint256 _unlockTime,     // block.timestamp + 30 days
    uint8 _securityLevel,    // 3
    string _accessKey,       // "testnet-trinity-key"
    bool _isPublic,          // true
    VaultType _vaultType     // 6 (SOVEREIGN_FORTRESS)
)
```

### 2.3 Deploy EmergencyMultiSig
```bash
npx hardhat run scripts/deploy-multisig.ts --network arbitrumSepolia
```

**Parameters:**
```solidity
constructor(
    address _signer1,   // Validator 1
    address _signer2,   // Validator 2
    address _signer3    // Validator 3
)
```

### 2.4 Deploy TrinityKeeperRegistry
```bash
npx hardhat run scripts/deploy-keepers.ts --network arbitrumSepolia
```

**Parameters:**
```solidity
constructor(
    address _treasury,  // Treasury address
    address _owner      // Deployer address
)
```

### 2.5 Deploy TrinityGovernanceTimelock
```bash
npx hardhat run scripts/deploy-governance.ts --network arbitrumSepolia
```

**Parameters:**
```solidity
constructor(
    address _owner,              // Deployer
    uint256 _minDelay = 2 days   // Governance timelock
)
```

### 2.6 Deploy CrossChainMessageRelay
```bash
npx hardhat run scripts/deploy-relay.ts --network arbitrumSepolia
```

**Parameters:**
```solidity
constructor(
    address _trinityVerifier,    // TrinityConsensusVerifier address
    address _treasury,           // Treasury
    address _owner               // Deployer
)
```

### 2.7 Deploy HTLCChronosBridge
```bash
npx hardhat run scripts/deploy-htlc-bridge.ts --network arbitrumSepolia
```

**Parameters:**
```solidity
constructor(
    address _chronosVault,       // ChronosVaultOptimized address
    address _trinityVerifier     // TrinityConsensusVerifier address
)
```

### 2.8 Deploy HTLCArbToL1
```bash
npx hardhat run scripts/deploy-htlc-arb.ts --network arbitrumSepolia
```

**Parameters:**
```solidity
constructor(
    address _htlcBridge          // HTLCChronosBridge address
)
```

---

## Step 3: Verify Deployments

### Test on Etherscan
```bash
npx hardhat verify --network arbitrumSepolia <contract_address> <constructor_args>
```

### Run Local Tests
```bash
npx hardhat test tests/ethereum/TrinityIntegration.test.cjs
```

Expected Output:
```
20 passing (1s)
✅ All production integration tests passed
```

---

## Step 4: Testnet Validation Checklist

### Core Functionality
- [ ] TrinityConsensusVerifier can receive validator registrations
- [ ] ChronosVaultOptimized bootstrap initializes within 1 hour
- [ ] EmergencyMultiSig requires 2-of-3 approvals
- [ ] Keeper registration accepts bonds
- [ ] Governance timelock enforces delays

### Security Features
- [ ] Bootstrap deadline (1 hour) enforced
- [ ] Merkle root expiration (24 hours) enforced
- [ ] Deployment chain validation (only Arbitrum Sepolia)
- [ ] ReentrancyGuard prevents reentrancy attacks
- [ ] CEI pattern in all external functions

### Cross-Chain Integration
- [ ] CrossChainMessageRelay sends messages
- [ ] HTLCChronosBridge processes swaps
- [ ] HTLCArbToL1 bridges work correctly

---

## Step 5: Test Data Setup

### Create Test Vault
```javascript
const vault = await chronosVaultOptimized.deploy(
    usdcAddress,
    "Test Vault",
    "TTVLT",
    Math.floor(Date.now()/1000) + 2592000, // 30 days
    3,
    "test-key",
    true,
    6
);
```

### Register Test Keeper
```javascript
const stakeAmount = ethers.parseEther("1");
await keeperRegistry.registerKeeper({ value: stakeAmount });
```

### Create Test Operation
```javascript
await trinityVerifier.createOperation(
    vault.address,
    0, // DEPOSIT
    ethers.parseEther("100"),
    usdcAddress,
    Math.floor(Date.now()/1000) + 86400,
    { value: ethers.parseEther("0.01") }
);
```

---

## Step 6: Validator Configuration

### Setup Validator 1 (Arbitrum Chain)
```javascript
// Register on TrinityConsensusVerifier
await trinityVerifier.connect(validator1).confirmChain(
    operationId,
    1, // ARBITRUM_CHAIN_ID
    merkleProof
);
```

### Setup Validator 2 (Solana Bridge)
```javascript
// For testing, use a bridged account
// In production: actual Solana validator
```

### Setup Validator 3 (TON Bridge)
```javascript
// For testing, use a bridged account
// In production: actual TON validator
```

---

## Step 7: End-to-End Flow Test

### 1. Create Operation
```javascript
const operationId = await trinityVerifier.createOperation(
    vaultAddress,
    0,
    amount,
    tokenAddress,
    deadline,
    { value: fee }
);
```

### 2. Get Validator 1 Confirmation
```javascript
await trinityVerifier.connect(validator1).confirmChain(
    operationId,
    1,
    merkleProof1
);
// Result: 1/3 confirmations
```

### 3. Get Validator 2 Confirmation
```javascript
await trinityVerifier.connect(validator2).confirmChain(
    operationId,
    2,
    merkleProof2
);
// Result: 2/3 confirmations - CONSENSUS ACHIEVED ✅
```

### 4. Verify Operation Executed
```javascript
const operation = await trinityVerifier.getOperation(operationId);
expect(operation.chainConfirmations).to.equal(2);
expect(operation.executed).to.equal(true);
```

---

## Testnet URLs

| Service | URL |
|---------|-----|
| Arbitrum Sepolia Explorer | https://sepolia.arbiscan.io |
| RPC Endpoint | https://sepolia-rollup.arbitrum.io/rpc |
| Faucet | https://faucet.arbitrum.io |

---

## Testnet Contract Addresses (After Deployment)

Save these for reference:
```json
{
  "TrinityConsensusVerifier": "0x...",
  "ChronosVaultOptimized": "0x...",
  "EmergencyMultiSig": "0x...",
  "TrinityKeeperRegistry": "0x...",
  "TrinityGovernanceTimelock": "0x...",
  "CrossChainMessageRelay": "0x...",
  "HTLCChronosBridge": "0x...",
  "HTLCArbToL1": "0x...",
  "USDC_Testnet": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
}
```

---

## Troubleshooting

### Deployment Fails: "Unsupported deployment chain"
- Verify `block.chainid == 421614` (Arbitrum Sepolia)
- Check RPC endpoint is correct

### Bootstrap Deadline Exceeded
- Bootstrap must be called within 1 hour of deployment
- Re-deploy vault and bootstrap immediately

### 2-of-3 Consensus Not Reaching
- Verify all 3 validators are unique addresses
- Check validator addresses are authorized
- Ensure 2 confirmations before 3rd attempt

### Merkle Root Expired
- Refresh Merkle roots every 12 hours
- Roots expire after 24 hours

---

## Next Steps

After successful testnet deployment:

1. **Run security audit** on deployed contracts
2. **Load test** with multiple operations
3. **Test failover** scenarios (validator offline)
4. **Verify gas optimizations** from v3.5.20
5. **Deploy to Mainnet** when ready

---

## Support

For deployment issues:
- GitHub Issues: https://github.com/Chronos-Vault/chronos-vault-contracts/issues
- Documentation: See OPERATIONAL_RUNBOOK_v3.5.20.md
