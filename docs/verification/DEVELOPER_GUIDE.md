# Formal Verification Developer Guide

## Overview

Chronos Vault implements a **3-layer formal verification system** that provides mathematical guarantees at multiple levels of abstraction:

1. **Layer 1: Abstract Proofs** (Lean 4) - Theoretical security properties
2. **Layer 2: Code Verification** (Certora) - Actual Solidity implementation
3. **Layer 3: Distributed Systems** (TLA+) - Multi-chain consensus behavior

This guide shows developers how to run, extend, and contribute to our verification system.

---

## 🚀 Quick Start

### Prerequisites

```bash
# Lean 4 (for abstract proofs)
curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh

# Certora (for Solidity verification)
pip install certora-cli

# TLA+ (for consensus modeling)
wget https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar

# Node.js & dependencies
npm install
```

### Run All Verifications

```bash
# Verify Layer 1: Lean 4 abstract proofs
cd formal-proofs && lake build

# Verify Layer 2: Certora Solidity analysis
certoraRun certora/conf/ChronosVault.conf
certoraRun certora/conf/CVTBridgeV3.conf
certoraRun certora/conf/CrossChainBridgeV3.conf

# Verify Layer 3: TLA+ Trinity Protocol
java -jar tla2tools.jar tlaplus/specs/TrinityProtocol.tla
```

---

## 📚 Layer 1: Lean 4 Abstract Proofs

### What It Proves

Lean 4 proves **abstract mathematical properties** independent of implementation:

- Withdrawal safety
- Time-lock enforcement
- Supply conservation
- Byzantine fault tolerance
- Consensus requirements

### Running Lean Proofs

```bash
cd formal-proofs
lake build
```

**Expected output:**
```
✓ Compiling Contracts.ChronosVault
✓ Compiling Contracts.CVTBridge
✓ Compiling Cryptography.VDF
✓ Compiling Consensus.TrinityProtocol
All proofs verified!
```

### Adding New Lean Theorems

1. **Create theorem file**:
```bash
touch formal-proofs/Contracts/NewContract.lean
```

2. **Write theorem**:
```lean
theorem new_security_property (contract : ContractState) :
    security_condition contract → safe_outcome contract := by
  intro h_secure
  -- Proof steps here
  sorry  -- Replace with actual proof
```

3. **Verify**:
```bash
lake build Contracts.NewContract
```

4. **Link to code** (add to `integration/mappings/theorem-to-code.json`):
```json
{
  "theoremId": "36",
  "theoremName": "new_security_property",
  "leanFile": "formal-proofs/Contracts/NewContract.lean",
  "leanLine": 10,
  "status": "PROVEN"
}
```

---

## 🔍 Layer 2: Certora Code Verification

### What It Proves

Certora analyzes **actual Solidity code** and proves:

- Specific function behaviors
- State invariants
- Access control
- Reentrancy safety

### Running Certora

```bash
# Verify single contract
certoraRun certora/conf/ChronosVault.conf

# With custom options
certoraRun certora/conf/ChronosVault.conf \
  --rule withdrawalSafety \
  --loop_iter 5
```

### Reading Certora Reports

After verification, view report at:
```
https://prover.certora.com/output/[job-id]
```

**Interpreting Results:**
- ✅ Green = Rule proven
- ❌ Red = Counterexample found (bug!)
- ⚠️ Yellow = Timeout/inconclusive

### Writing Certora Rules

**Example: Verify withdrawal requires unlock**

```solidity
rule cannotWithdrawBeforeUnlock(uint256 amount) {
    env e;
    
    // Precondition: time-lock not expired
    require e.block.timestamp < unlockTime();
    
    // Action: try to withdraw
    withdraw@withrevert(e, amount, e.msg.sender, e.msg.sender);
    
    // Postcondition: must revert
    assert lastReverted, "Withdrawal succeeded before unlock!";
}
```

**Save to**: `certora/specs/ChronosVault.spec`

**Run**:
```bash
certoraRun certora/conf/ChronosVault.conf --rule cannotWithdrawBeforeUnlock
```

### Certora Best Practices

1. **Start Simple**: Test one property per rule
2. **Use Filters**: Reduce state space with `filtered` keyword
3. **Ghost Variables**: Track additional state for complex properties
4. **Sanity Checks**: Use `rule_sanity: basic` to catch vacuous rules

---

## 🌐 Layer 3: TLA+ Distributed Consensus

### What It Proves

TLA+ models **Trinity Protocol's distributed behavior**:

- 2-of-3 consensus requirement
- Byzantine fault tolerance
- Liveness under partial failures
- No deadlocks or livelocks

### Running TLA+ Model Checker

```bash
# Basic verification
java -jar tla2tools.jar tlaplus/specs/TrinityProtocol.tla

# With custom parameters
java -XX:+UseParallelGC -jar tla2tools.jar \
  -workers 8 \
  -depth 100 \
  tlaplus/specs/TrinityProtocol.tla
```

### Understanding TLA+ Properties

**Safety Property** (something bad never happens):
```tla
\* Operations require 2-of-3 consensus
TwoOfThreeConsensus ==
    \A op \in Operations :
        operationStatus[op] = "APPROVED" =>
            CountVotes(op, "APPROVE") >= REQUIRED_CONSENSUS
```

**Liveness Property** (something good eventually happens):
```tla
\* Operations eventually finalize
EventualFinalization ==
    \A op \in Operations :
        ActiveChains >= 2 ~> 
            (operationStatus[op] = "APPROVED" \/ "REJECTED")
```

### Modifying TLA+ Models

1. **Edit constants** in `.cfg` file:
```
CONSTANTS
    Chains = {Ethereum, Solana, TON}
    REQUIRED_CONSENSUS = 2
```

2. **Add new behaviors**:
```tla
\* New action: chain synchronization
ChainSync(chain1, chain2) ==
    /\ chainState[chain1] = "ACTIVE"
    /\ chainState[chain2] = "ACTIVE"
    /\ ...  \* Synchronization logic
```

3. **Verify**:
```bash
java -jar tla2tools.jar tlaplus/specs/TrinityProtocol.tla
```

---

## 🔗 Integration Layer

### Theorem-to-Code Mapping

The integration layer tracks how abstract theorems map to concrete code:

```json
{
  "theoremId": "1",
  "theoremName": "withdrawal_safety",
  "leanFile": "formal-proofs/Contracts/ChronosVault.lean",
  "certoraRule": "nonOwnerCannotWithdrawBeforeUnlock",
  "certoraFile": "certora/specs/ChronosVault.spec",
  "solidityContract": "ChronosVault.sol",
  "solidityFunction": "withdraw",
  "status": "PROVEN"
}
```

### Generating Traceability Reports

```bash
# Validate all mappings
python3 scripts/validate-mappings.py

# Generate HTML report
python3 scripts/generate-report.py --format html > report.html
```

---

## 🧪 Testing Verification Changes

### Before Committing

1. **Run all layers**:
```bash
make verify-all
```

2. **Check mappings**:
```bash
python3 scripts/validate-mappings.py
```

3. **Generate report**:
```bash
make report
```

### CI/CD Integration

Our GitHub Actions workflow automatically:
- Verifies all Lean proofs
- Runs Certora on all contracts
- Model-checks TLA+ specs
- Validates theorem mappings
- Posts results to PRs

**Workflow file**: `.github/workflows/code-verification.yml`

---

## 📊 Verification Coverage

### Current Status

| Layer | Tool | Files | Theorems | Coverage |
|-------|------|-------|----------|----------|
| Abstract | Lean 4 | 9 | 35 | 100% |
| Code | Certora | 3 | 34 rules | 18 theorems |
| Distributed | TLA+ | 1 | 5 props | Trinity Protocol |

### Coverage Gaps

**Covered**:
- ✅ Smart contract security
- ✅ Cross-chain consensus
- ✅ Time-lock enforcement
- ✅ Supply conservation

**Not Covered (Future Work)**:
- ⏸️ Solana program verification (need Certora for Rust)
- ⏸️ TON FunC contracts (need custom tooling)
- ⏸️ ZK circuit correctness (need specialized prover)

---

## 🐛 Debugging Failed Proofs

### Lean 4 Failures

**Error**: `sorry` (unproven theorem)

**Fix**:
```lean
-- Before: incomplete proof
theorem my_theorem : P := by
  sorry

-- After: complete proof
theorem my_theorem : P := by
  intro h
  apply some_tactic
  exact proof_term
```

### Certora Counterexamples

**Error**: Rule fails with counterexample

**Steps**:
1. View report: `https://prover.certora.com/output/[job-id]`
2. Examine counterexample values
3. Check if bug is in:
   - Contract code (fix Solidity)
   - Rule specification (fix Certora spec)
   - Preconditions (add `require` statements)

**Example**:
```solidity
// Counterexample shows: amount = 0 withdraws succeed
rule noWithdrawalBeforeUnlock(uint256 amount) {
    env e;
    require amount > 0;  // Add this!
    require e.block.timestamp < unlockTime();
    
    withdraw@withrevert(e, amount, e.msg.sender, e.msg.sender);
    
    assert lastReverted;
}
```

### TLA+ Invariant Violations

**Error**: Invariant violated in state graph

**Debug**:
```bash
# Run with error trace
java -jar tla2tools.jar -deadlock tlaplus/specs/TrinityProtocol.tla
```

**Fix**: Strengthen invariants or fix model logic

---

## 🤝 Contributing

### Adding New Verification

1. **Abstract Proof** (Lean 4):
   - Add theorem to appropriate `.lean` file
   - Write proof or mark `sorry` for future work
   - Build: `lake build`

2. **Code Verification** (Certora):
   - Add rule to `.spec` file
   - Create `.conf` file if new contract
   - Run: `certoraRun certora/conf/YourContract.conf`

3. **Integration**:
   - Add mapping to `integration/mappings/theorem-to-code.json`
   - Update documentation

4. **Pull Request**:
   - All CI checks must pass
   - Include verification reports

---

## 📖 Further Reading

- [Lean 4 Documentation](https://leanprover.github.io/lean4/doc/)
- [Certora User Guide](https://docs.certora.com/)
- [TLA+ Video Course](https://lamport.azurewebsites.net/video/videos.html)
- [Our Verification Report](../formal-verification/verification-report.md)

---

## 💬 Support

**Questions?** Open an issue on GitHub

**Bug in Proof?** Create PR with counterexample

**Security Issue?** Email: chronosvault@chronosvault.org

---

**Last Updated**: 2025-10-11  
**Maintainers**: Chronos Vault Core Team
