# Contributing to Trinity Protocol

Thank you for your interest in contributing to Trinity Protocol! This guide will help you get started.

---

## 🎯 Quick Start (5 Minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/Chronos-Vault/chronos-vault-contracts
cd chronos-vault-contracts
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Compile Contracts
```bash
npx hardhat compile
```

### 4. Run Tests
```bash
npx hardhat test test/TrinityExitBatch.integration.test.ts
```

**Expected Output:**
```
  Trinity Exit-Batch System Integration Tests
    ✓ Should request exit and create batch
    ✓ Should submit batch with Trinity consensus
    ✓ Should claim exit with Merkle proof
    ✓ Should handle priority exits
    
  4 passing (12s)
```

---

## 📂 Project Structure

```
chronos-vault-contracts/
├── contracts/ethereum/
│   ├── TrinityConsensusVerifier.sol    ← Core consensus (start here!)
│   ├── HTLCChronosBridge.sol           ← Atomic swaps
│   ├── HTLCArbToL1.sol                 ← Exit requests (L2)
│   ├── TrinityExitGateway.sol          ← Exit settlement (L1)
│   ├── ChronosVault.sol                ← Security vaults
│   ├── libraries/                      ← Shared logic
│   └── interfaces/                     ← Contract ABIs
├── test/
│   └── TrinityExitBatch.integration.test.ts
├── scripts/deploy/
│   ├── 01-deploy-trinity-dual.ts       ← Deploy Trinity to L1+L2
│   └── 02-deploy-exit-batch-system.ts  ← Deploy Exit-Batch
└── docs/
    ├── TRINITY_ARCHITECTURE.md         ← System overview
    └── CONTRACTS_REFERENCE.md          ← Quick reference
```

---

## 🎓 Learning Path

### **New to Trinity Protocol?**

**Step 1:** Read the core concepts (15 min)
- [TRINITY_ARCHITECTURE.md](./TRINITY_ARCHITECTURE.md) - Complete system overview
- [README_HTLC.md](./README_HTLC.md) - HTLC implementation details

**Step 2:** Understand the Exit-Batch innovation (10 min)
- Read [TrinityExitGateway.sol](./TrinityExitGateway.sol) comments (lines 1-50)
- Study the gas economics in TRINITY_ARCHITECTURE.md

**Step 3:** Run the tests (5 min)
```bash
npx hardhat test --grep "Exit-Batch"
```

**Step 4:** Make your first contribution!
- See [Good First Issues](#good-first-issues) below

---

## 🛠️ Development Workflow

### 1. **Pick an Issue**
- Check [GitHub Issues](https://github.com/Chronos-Vault/chronos-vault-contracts/issues)
- Look for `good-first-issue` or `help-wanted` labels

### 2. **Create a Branch**
```bash
git checkout -b feature/your-feature-name
```

### 3. **Make Changes**
- Edit contracts in `contracts/ethereum/`
- Follow our [Code Style Guide](#code-style-guide)

### 4. **Test Your Changes**
```bash
# Compile
npx hardhat compile

# Run specific test
npx hardhat test test/YourTest.test.ts

# Run all tests
npx hardhat test
```

### 5. **Commit & Push**
```bash
git add .
git commit -m "feat: Add XYZ feature"
git push origin feature/your-feature-name
```

### 6. **Open a Pull Request**
- Go to GitHub and create a PR
- Fill out the PR template
- Wait for code review

---

## 🎯 Good First Issues

### **Beginner-Friendly Tasks**

1. **Documentation Improvements**
   - Add more code comments to [HTLCArbToL1.sol](./HTLCArbToL1.sol)
   - Create a gas cost comparison chart
   - Write a tutorial for deploying to testnet

2. **Testing**
   - Add edge case tests for batch size limits
   - Test challenge period edge cases
   - Add fuzz testing for Merkle proofs

3. **Tooling**
   - Create a Hardhat task to calculate gas costs
   - Build a batch monitoring script
   - Add TypeScript type definitions

### **Intermediate Tasks**

4. **Gas Optimization**
   - Optimize `claimExit()` storage reads
   - Reduce batch submission costs
   - Implement EIP-2929 warm slot optimization

5. **Security Enhancements**
   - Add timelock for owner functions
   - Implement rate limiting for priority exits
   - Add batch size dynamic adjustment

6. **Feature Additions**
   - Multi-token support (ERC20)
   - Batch splitting for large queues
   - Cross-chain exit tracking dashboard

### **Advanced Tasks**

7. **Protocol Upgrades**
   - Implement EIP-4337 (account abstraction) support
   - Add ZK-proof batch verification
   - Integrate with Gnosis Safe for keeper operations

8. **Performance**
   - Benchmark batch creation algorithms
   - Optimize Merkle tree construction
   - Parallel exit processing

---

## 📝 Code Style Guide

### **Solidity Best Practices**

**1. Use Clear Variable Names**
```solidity
// ❌ Bad
uint256 t;
bytes32 h;

// ✅ Good
uint256 totalValue;
bytes32 exitHash;
```

**2. Add NatSpec Comments**
```solidity
/// @notice Request an exit from Arbitrum to L1
/// @param swapId The HTLC swap ID to exit
/// @return exitId Unique exit identifier
function requestExit(bytes32 swapId) external payable returns (bytes32 exitId) {
    // ...
}
```

**3. Follow Checks-Effects-Interactions (CEI)**
```solidity
function claimExit(...) external {
    // CHECKS
    require(!exitClaimed[batchRoot][exitId], "Already claimed");
    require(MerkleProof.verify(...), "Invalid proof");
    
    // EFFECTS
    exitClaimed[batchRoot][exitId] = true;
    batch.claimedValue += amount;
    
    // INTERACTIONS (external calls last)
    (bool sent,) = payable(recipient).call{value: amount}("");
    require(sent, "Transfer failed");
}
```

**4. Use Custom Errors (Gas Efficient)**
```solidity
// ❌ Old way (expensive)
require(msg.value >= fee, "Insufficient fee");

// ✅ New way (saves gas)
error InsufficientFee();
if (msg.value < fee) revert InsufficientFee();
```

**5. Add Events for All State Changes**
```solidity
event ExitRequested(
    bytes32 indexed exitId,
    bytes32 indexed swapId,
    address indexed requester,
    uint256 amount,
    bytes32 secretHash
);

function requestExit(bytes32 swapId) external payable {
    // ... logic ...
    emit ExitRequested(exitId, swapId, msg.sender, amount, secretHash);
}
```

---

### **TypeScript Test Style**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("TrinityExitGateway", function() {
  let gateway: TrinityExitGateway;
  let trinity: TrinityConsensusVerifier;
  let owner: SignerWithAddress;
  
  beforeEach(async function() {
    [owner] = await ethers.getSigners();
    
    // Deploy contracts
    const Trinity = await ethers.getContractFactory("TrinityConsensusVerifier");
    trinity = await Trinity.deploy(/* params */);
    
    const Gateway = await ethers.getContractFactory("TrinityExitGateway");
    gateway = await Gateway.deploy(await trinity.getAddress(), owner.address);
  });
  
  it("should submit batch with Trinity consensus", async function() {
    // Arrange
    const batchRoot = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const exitCount = 50;
    
    // Act
    const tx = await gateway.submitBatch(batchRoot, exitCount, trinityOpId);
    
    // Assert
    await expect(tx).to.emit(gateway, "BatchSubmitted");
    const batch = await gateway.batches(batchRoot);
    expect(batch.state).to.equal(BatchState.PENDING);
  });
});
```

---

## 🧪 Testing Guidelines

### **Test Structure**

1. **Unit Tests** - Test individual functions
2. **Integration Tests** - Test contract interactions
3. **End-to-End Tests** - Test complete user flows

### **Writing Good Tests**

```typescript
describe("Feature: Exit Batching", function() {
  describe("requestExit()", function() {
    it("should create exit request with correct fee", async function() {
      // Test happy path
    });
    
    it("should revert if fee too low", async function() {
      // Test error case
    });
    
    it("should emit ExitRequested event", async function() {
      // Test events
    });
  });
  
  describe("createBatch()", function() {
    it("should reject batch smaller than MIN_BATCH_SIZE", async function() {
      // Test validation
    });
  });
});
```

### **Running Tests**

```bash
# All tests
npx hardhat test

# Specific test file
npx hardhat test test/TrinityExitBatch.integration.test.ts

# With gas reporting
REPORT_GAS=true npx hardhat test

# With coverage
npx hardhat coverage
```

---

## 🔒 Security Checklist

Before submitting a PR with contract changes:

- [ ] All functions follow Checks-Effects-Interactions (CEI) pattern
- [ ] State-changing functions have `nonReentrant` modifier
- [ ] All external calls are after state updates
- [ ] Custom errors used instead of `require()` strings
- [ ] Events emitted for all important state changes
- [ ] Input validation for all user-provided data
- [ ] Access control modifiers applied correctly
- [ ] Gas limits considered for loops
- [ ] Integer overflow/underflow checked (Solidity 0.8+)
- [ ] Comprehensive test coverage added

**Run Security Tools:**
```bash
# Slither static analysis
slither contracts/ethereum/YourContract.sol

# Hardhat compile with warnings
npx hardhat compile --show-stack-traces
```

---

## 📋 Pull Request Guidelines

### **PR Title Format**
```
<type>: <short description>

Examples:
feat: Add batch splitting for large exit queues
fix: Prevent double-claim in claimExit()
docs: Update CONTRIBUTING.md with gas optimization tips
test: Add edge case tests for challenge period
```

### **PR Description Template**
```markdown
## Description
Brief description of what this PR does.

## Motivation
Why is this change needed?

## Changes
- List of changes made
- Another change

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Gas costs analyzed

## Screenshots (if UI changes)
[Add screenshots]

## Checklist
- [ ] Code follows style guide
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Security checklist completed
```

---

## 🎓 Resources

### **Learn Solidity**
- [Solidity Docs](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Tutorials](https://hardhat.org/tutorial)

### **Trinity Protocol Specific**
- [TRINITY_ARCHITECTURE.md](./TRINITY_ARCHITECTURE.md) - System overview
- [CONTRACTS_REFERENCE.md](./CONTRACTS_REFERENCE.md) - Quick reference
- [SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md) - Security best practices

### **Gas Optimization**
- [EIP-2929](https://eips.ethereum.org/EIPS/eip-2929) - Gas cost changes
- [Solidity Gas Optimization](https://github.com/iskdrews/awesome-solidity-gas-optimization)

---

## 💬 Community & Support

### **Get Help**
- **GitHub Issues:** https://github.com/Chronos-Vault/chronos-vault-contracts/issues
- **Discussions:** https://github.com/Chronos-Vault/chronos-vault-contracts/discussions
- **Discord:** [Coming Soon]

### **Report Security Issues**
**DO NOT** open a public issue for security vulnerabilities.

Email: security@chronosvault.org

We'll respond within 24 hours and work with you to fix the issue.

---

## 🏆 Contributors

Thank you to all our contributors! Your work makes Trinity Protocol better for everyone.

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- Will be automatically generated -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## 📄 License

Trinity Protocol is open-source under the MIT License.

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Happy Coding!** 🚀

If you have questions, don't hesitate to ask in GitHub Discussions or open an issue.

**Last Updated:** November 16, 2025
