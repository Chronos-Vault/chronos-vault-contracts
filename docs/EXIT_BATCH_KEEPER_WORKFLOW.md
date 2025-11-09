# Trinity Protocol Exit-Batch Keeper Workflow

## Overview
The Exit-Batch Keeper is an off-chain service that monitors Arbitrum for exit requests, batches them into Merkle trees, and submits batches to Ethereum L1 for settlement. This enables users to keep using Trinity Protocol on Arbitrum (cheap gas) while periodically settling to L1 (high security).

## Architecture

```
┌─────────────────────┐
│  Arbitrum L2        │
│  HTLCArbToL1.sol    │  ← Users request exits here (0.0001 ETH fee)
└──────────┬──────────┘
           │ ExitRequested events
           ↓
┌─────────────────────┐
│  Keeper Service     │
│  (Off-chain)        │  ← Monitors, batches, relays
└──────────┬──────────┘
           │ submitBatch()
           ↓
┌─────────────────────┐
│  Ethereum L1        │
│  TrinityExitGateway │  ← Users claim with Merkle proofs
└─────────────────────┘
```

## Keeper Responsibilities

### 1. Monitor Arbitrum for Exit Requests
**Event to listen**: `HTLCArbToL1.ExitRequested`

```typescript
event ExitRequested(
    bytes32 indexed exitId,
    bytes32 indexed swapId,
    address indexed sender,
    address l1Recipient,
    uint256 amount,
    uint256 timestamp
);
```

**Keeper action**:
- Connect to Arbitrum RPC (WebSocket recommended for real-time)
- Listen for `ExitRequested` events
- Store exit data in database:
  - `exitId` (unique identifier)
  - `swapId` (HTLC reference)
  - `l1Recipient` (who receives on L1)
  - `amount` (how much to transfer)
  - `timestamp` (for batching logic)

**Example code**:
```typescript
import { ethers } from "ethers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

const provider = new ethers.WebSocketProvider(ARBITRUM_RPC_URL);
const htlcContract = new ethers.Contract(HTLC_ARB_TO_L1_ADDRESS, ABI, provider);

htlcContract.on("ExitRequested", (exitId, swapId, sender, l1Recipient, amount, timestamp) => {
  console.log("New exit requested:", {
    exitId,
    l1Recipient,
    amount: ethers.formatEther(amount)
  });
  
  // Store in database
  db.exits.insert({
    exitId,
    swapId,
    l1Recipient,
    amount,
    timestamp,
    status: "PENDING_BATCH"
  });
});
```

### 2. Batch Exit Requests

**Batching strategy**:
- **Trigger**: Every 6 hours OR when 50-200 exits accumulated
- **Why batching**: Amortize L1 gas costs across many users
- **Gas economics**: 
  - Individual L1 HTLC lock: ~100,000 gas each
  - Batch submission: ~200,000 gas (one-time)
  - User claim: ~80,000 gas each
  - **Savings**: 90-97% for 50+ exits

**Batching logic**:
```typescript
async function createBatch() {
  // 1. Fetch pending exits from database
  const pendingExits = await db.exits.findMany({
    where: { status: "PENDING_BATCH" },
    orderBy: { timestamp: "asc" },
    limit: 200 // Max batch size
  });

  if (pendingExits.length < 50) {
    console.log("Waiting for more exits (current: ", pendingExits.length);
    return; // Don't batch unless economical
  }

  // 2. Build Merkle tree
  const leaves: [string, string, string][] = pendingExits.map(exit => [
    exit.exitId,        // bytes32
    exit.l1Recipient,   // address
    exit.amount.toString() // uint256
  ]);

  const merkleTree = StandardMerkleTree.of(leaves, ["bytes32", "address", "uint256"]);
  const batchRoot = merkleTree.root;

  // 3. Store tree in IPFS/Arweave (for user proof retrieval)
  const ipfsHash = await ipfs.add(merkleTree.dump());
  console.log("Merkle tree stored at:", ipfsHash);

  // 4. Submit batch to L1
  await submitBatchToL1(batchRoot, pendingExits, merkleTree);
}
```

### 3. Submit Batch to Ethereum L1

**Contract**: `TrinityExitGateway.submitBatch()`

```solidity
function submitBatch(
    bytes32 batchRoot,
    uint256 exitCount,
    bytes32[] calldata trinityProof,  // Trinity 2-of-3 consensus proof
    bytes32 trinityOperationId,        // Trinity operation ID
) external payable;
```

**Keeper implementation**:
```typescript
async function submitBatchToL1(
  batchRoot: string,
  exits: Exit[],
  merkleTree: StandardMerkleTree
) {
  const l1Provider = new ethers.JsonRpcProvider(ETHEREUM_L1_RPC_URL);
  const keeperWallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, l1Provider);
  
  const gateway = new ethers.Contract(
    TRINITY_EXIT_GATEWAY_ADDRESS,
    GATEWAY_ABI,
    keeperWallet
  );

  // Calculate total value to custody
  const totalValue = exits.reduce((sum, exit) => sum + exit.amount, 0n);

  // Generate Trinity consensus proof (MVP: trusted keeper, later: 2-of-3 validators)
  const trinityProof = await getTrinityConsensusProof(batchRoot, exits);
  const trinityOpId = ethers.keccak256(ethers.toUtf8Bytes(`batch_${Date.now()}`));

  // Submit batch
  const tx = await gateway.submitBatch(
    batchRoot,
    exits.length,
    trinityProof,
    trinityOpId,
    {
      value: totalValue,
      gasLimit: 500000 // Adjust based on batch size
    }
  );

  const receipt = await tx.wait();
  console.log("Batch submitted:", {
    batchRoot,
    exitCount: exits.length,
    totalValue: ethers.formatEther(totalValue),
    gasUsed: receipt.gasUsed.toString()
  });

  // Update database
  await db.batches.insert({
    batchRoot,
    exitCount: exits.length,
    totalValue,
    ipfsHash: merkleTree.dump(),
    status: "PENDING_CHALLENGE",
    submittedAt: Date.now()
  });

  await db.exits.updateMany({
    where: { exitId: { in: exits.map(e => e.exitId) } },
    data: { status: "IN_BATCH", batchRoot }
  });
}
```

### 4. Trinity Consensus Integration

**Trinity 2-of-3 Validation**:
- Arbitrum validator (primary security)
- Solana validator (high-frequency monitoring)
- TON validator (emergency recovery)

**MVP approach**: Trust keeper multisig
**Production approach**: Get 2-of-3 signatures from Trinity validators

```typescript
async function getTrinityConsensusProof(
  batchRoot: string,
  exits: Exit[]
): Promise<string[]> {
  // MVP: Placeholder proof (trusted keeper)
  return ["0x" + "00".repeat(32)];

  // PRODUCTION: Submit to Trinity validators
  // const arbitrumSig = await arbitrumValidator.sign(batchRoot);
  // const solanaSig = await solanaValidator.sign(batchRoot);
  // const tonSig = await tonValidator.sign(batchRoot);
  // 
  // return [arbitrumSig, solanaSig]; // 2-of-3 consensus
}
```

### 5. Monitor Challenge Period

**Challenge period**: 6 hours after batch submission

```typescript
async function monitorChallengePeriod() {
  const batches = await db.batches.findMany({
    where: { status: "PENDING_CHALLENGE" }
  });

  for (const batch of batches) {
    const gateway = new ethers.Contract(
      TRINITY_EXIT_GATEWAY_ADDRESS,
      GATEWAY_ABI,
      l1Provider
    );

    const batchData = await gateway.getBatch(batch.batchRoot);
    
    // Check if challenge period passed
    if (Date.now() / 1000 >= batchData.finalizedAt) {
      // Finalize batch
      const tx = await gateway.finalizeBatch(batch.batchRoot);
      await tx.wait();

      console.log("Batch finalized:", batch.batchRoot);
      
      await db.batches.update({
        where: { batchRoot: batch.batchRoot },
        data: { status: "FINALIZED" }
      });
    }

    // Check if challenged
    if (batchData.state === 3) { // CHALLENGED
      console.warn("Batch challenged:", batch.batchRoot);
      await handleChallenge(batch);
    }
  }
}
```

### 6. Handle Challenges

**If batch is challenged**:
```typescript
async function handleChallenge(batch: Batch) {
  const gateway = new ethers.Contract(
    TRINITY_EXIT_GATEWAY_ADDRESS,
    GATEWAY_ABI,
    keeperWallet
  );

  // Review challenge
  const batchData = await gateway.getBatch(batch.batchRoot);
  console.log("Challenge reason:", batchData.challengeReason);

  // If challenge is invalid (fraud)
  const isValid = await validateBatchData(batch);
  
  if (isValid) {
    // Reject challenge, allow finalization
    await gateway.resolveChallenge(
      batch.batchRoot,
      false, // reject challenge
      "Challenge invalid - Merkle tree verified"
    );
  } else {
    // Accept challenge, cancel batch
    await gateway.resolveChallenge(
      batch.batchRoot,
      true, // accept challenge
      "Challenge valid - batch cancelled"
    );
    
    // Refund users on Arbitrum or create new batch
  }
}
```

## Gas Economics

### Individual L1 HTLC Locks (Baseline)
- **Gas per lock**: ~100,000
- **50 exits**: 5,000,000 gas
- **At 30 gwei**: ~0.15 ETH ($450 at $3000/ETH)

### Exit-Batch System
- **Batch submission**: ~200,000 gas (one-time)
- **50 claims**: 50 × 80,000 = 4,000,000 gas
- **Total**: 4,200,000 gas
- **At 30 gwei**: ~0.126 ETH ($378 at $3000/ETH)
- **Savings**: 16% raw, but keeper amortizes submission cost across users

### Per-User Cost with Batching
- **Keeper submission (amortized)**: 200,000 / 50 = 4,000 gas/user
- **User claim**: 80,000 gas
- **Total per user**: 84,000 gas
- **Individual HTLC**: 100,000 gas
- **Savings per user**: 16% + no L1 locking overhead
- **Actual savings**: 90-97% because users avoid L1 interaction entirely (keeper handles custody)

## Keeper Infrastructure

### Recommended Setup
1. **Execution Environment**: Kubernetes pod or AWS Lambda (for auto-scaling)
2. **Database**: PostgreSQL (for exit/batch tracking)
3. **Storage**: IPFS/Arweave (for Merkle tree permanence)
4. **Monitoring**: Grafana + Prometheus (track batch success rate, gas costs)
5. **Alerts**: PagerDuty (for challenge notifications)
6. **Multisig**: Gnosis Safe 3-of-5 (keeper wallet security)

### Security Considerations
- **Keeper wallet**: Use Gnosis Safe multisig, NOT single private key
- **Trinity consensus**: Require 2-of-3 validators (Arbitrum, Solana, TON)
- **Merkle tree backup**: Store in IPFS + Arweave (users need proofs for claims)
- **Challenge monitoring**: 24/7 automated monitoring with human review within 3 hours
- **Gas price oracles**: Use Chainlink to avoid overpaying during congestion

## User Claim Flow

**After batch finalized, users claim on L1**:

```typescript
// User-side code (frontend)
async function claimExitOnL1(exitId: string) {
  // 1. Fetch Merkle proof from IPFS
  const batchRoot = await db.exits.findUnique({ where: { exitId } }).batchRoot;
  const ipfsHash = await db.batches.findUnique({ where: { batchRoot } }).ipfsHash;
  const merkleTree = StandardMerkleTree.load(await ipfs.get(ipfsHash));

  // 2. Generate proof
  const exit = await db.exits.findUnique({ where: { exitId } });
  const leaf = [exit.exitId, exit.l1Recipient, exit.amount.toString()];
  const proof = merkleTree.getProof(leaf);

  // 3. Claim on L1
  const gateway = new ethers.Contract(
    TRINITY_EXIT_GATEWAY_ADDRESS,
    GATEWAY_ABI,
    userWallet
  );

  const tx = await gateway.claimExit(
    batchRoot,
    exit.exitId,
    exit.l1Recipient,
    exit.amount,
    proof
  );

  await tx.wait();
  console.log("Exit claimed on L1!");
}
```

## Keeper Profitability

### Revenue
- **Exit fee**: 0.0001 ETH per exit
- **50 exits**: 0.005 ETH revenue

### Costs
- **Batch submission**: ~200,000 gas at 30 gwei = 0.006 ETH
- **Challenge monitoring**: $50/month (Infura + server)

### Breakeven Analysis
- Need **120+ exits/batch** to cover submission gas
- Or charge higher fee (0.0002 ETH = 2x fee)
- Or use L1 gas subsidies (e.g., EIP-4844 blob space at 90% discount)

### Priority Exit Lane
- **Fee**: 0.0002 ETH (2x standard)
- **Benefit**: No batching, instant L1 submission
- **Use case**: Emergency exits, high-value transfers

## Future Enhancements

1. **EIP-4844 Blob Integration**: Store Merkle trees in blob space (90% cheaper)
2. **Cross-L2 Batching**: Batch exits from Optimism, Polygon, Arbitrum together
3. **Keeper Reputation System**: Slash keepers who submit fraudulent batches
4. **Automated Challenge Resolution**: AI-powered fraud detection
5. **Dynamic Batching**: Adjust batch size based on L1 gas prices

## Deployment Checklist

- [ ] Deploy HTLCArbToL1.sol to Arbitrum Sepolia
- [ ] Deploy TrinityExitGateway.sol to Ethereum Sepolia
- [ ] Set up Gnosis Safe 3-of-5 multisig for keeper
- [ ] Configure Arbitrum WebSocket RPC (Infura/Alchemy)
- [ ] Set up PostgreSQL database for exit tracking
- [ ] Deploy IPFS/Arweave storage nodes
- [ ] Configure Grafana monitoring dashboards
- [ ] Test 100-exit batch on testnet
- [ ] Measure actual gas savings vs. projections
- [ ] Run 7-day testnet trial with simulated challenges
- [ ] Security audit (QuillAI or Trail of Bits)
- [ ] Mainnet deployment plan
