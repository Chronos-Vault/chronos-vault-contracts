# Lean 4 Setup Guide

**Setting up Formal Verification Environment for Chronos Vault**

---

## 📋 Prerequisites

Before installing Lean 4, ensure you have:

- **Operating System:** Linux, macOS, or Windows (WSL2)
- **Git:** Version 2.0 or higher
- **Internet Connection:** For downloading dependencies
- **Disk Space:** ~500MB for Lean 4 + mathlib

---

## 🚀 Quick Install (5 Minutes)

### Step 1: Install Elan (Lean Version Manager)

**Linux / macOS:**
```bash
curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh
```

**Windows (WSL2 / PowerShell):**
```powershell
curl -sSfL https://github.com/leanprover/elan/releases/latest/download/elan-x86_64-pc-windows-msvc.zip -o elan.zip
Expand-Archive elan.zip -DestinationPath .
./elan-init.exe
```

**Verify Installation:**
```bash
elan --version
# Expected: elan 3.0.0 or higher
```

---

### Step 2: Clone Chronos Vault Contracts

```bash
# Clone the repository
git clone https://github.com/Chronos-Vault/chronos-vault-contracts.git
cd chronos-vault-contracts/formal-proofs

# Elan automatically installs the correct Lean version from lean-toolchain
cat lean-toolchain
# Shows: leanprover/lean4:v4.3.0
```

**Lean Version:**
```bash
lean --version
# Expected: Lean (version 4.3.0, ...)
```

---

### Step 3: Install Dependencies

```bash
# Lake is Lean's package manager (installed with Lean)
lake --version

# Update dependencies (mathlib, std4)
lake update

# Build all dependencies
lake build
```

**Expected Output (Current Status):**
```
error: declaration 'ChronosVault.withdrawal_safety' uses sorry
error: declaration 'CVTBridge.supply_conservation' uses sorry
...
error: 51 declarations use sorry
```

**This is expected!** The proofs are incomplete (51 `sorry` placeholders). This will succeed once proofs are complete.

---

## 📚 Understanding the Lean Environment

### Project Structure

```
formal-proofs/
├── lakefile.lean              # Lake build configuration
├── lean-toolchain             # Lean version (v4.3.0)
├── Contracts/                 # Smart contract proofs
│   ├── ChronosVault.lean      # 5 theorems
│   ├── CVTBridge.lean         # 4 theorems
│   ├── CrossChainBridge.lean  # 4 theorems
│   ├── EmergencyRecoveryNonce.lean  # 10 theorems
│   └── OperationIdUniqueness.lean   # 10 theorems
├── Cryptography/              # Cryptographic proofs
│   ├── VDF.lean               # 4 theorems
│   ├── MPC.lean               # 3 theorems
│   ├── ZeroKnowledge.lean     # 3 theorems
│   └── QuantumResistant.lean  # 3 theorems
└── Consensus/                 # Consensus proofs
    ├── TrinityProtocol.lean   # 5 theorems
    └── AIGovernance.lean      # 3 theorems
```

---

### Lake Commands Reference

**Build Everything:**
```bash
lake build
```

**Build Specific Module:**
```bash
lake build Contracts.ChronosVault
lake build Cryptography.VDF
lake build Consensus.TrinityProtocol
```

**Run Lean File Directly:**
```bash
lake env lean --run Contracts/ChronosVault.lean
```

**Clean Build Artifacts:**
```bash
lake clean
```

**Update Dependencies:**
```bash
lake update
```

---

## 🔍 Verifying a Proof

### Check Individual Theorem

**Example: Verify `balance_non_negative` theorem**

```bash
# Navigate to formal-proofs directory
cd formal-proofs

# Run the file containing the theorem
lake env lean --run Contracts/ChronosVault.lean
```

**Successful Output:**
```
✓ Compiled ChronosVault
✓ All theorems type-check correctly
```

**If theorem has `sorry`:**
```
error: declaration 'ChronosVault.withdrawal_safety' uses sorry
```

---

### Interactive Proof Development

**Using VS Code with Lean 4 Extension:**

1. **Install VS Code:** https://code.visualstudio.com/

2. **Install Lean 4 Extension:**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search "Lean 4"
   - Install "lean4" by leanprover

3. **Open Formal Proofs:**
   ```bash
   code formal-proofs/
   ```

4. **Interactive Features:**
   - **Hover:** See theorem types
   - **Ctrl+Click:** Jump to definitions
   - **Lean Infoview:** Real-time proof state (Ctrl+Shift+Enter)
   - **Autocomplete:** Tactic suggestions

**Example: Completing a Proof Interactively**

Open `Contracts/ChronosVault.lean`:

```lean
theorem withdrawal_safety (vault : VaultState) (tx : Transaction) :
    tx.sender ≠ vault.owner → ¬(tx.amount > 0 ∧ vault.balance ≥ tx.amount) := by
  intro h_not_owner
  intro ⟨h_positive, h_sufficient⟩
  -- Place cursor here, view proof state in Infoview
  sorry  -- Replace with actual proof
```

**Infoview shows:**
```
h_not_owner : tx.sender ≠ vault.owner
h_positive : tx.amount > 0
h_sufficient : vault.balance ≥ tx.amount
⊢ False  -- Goal: Prove contradiction
```

---

## 🧪 Testing Proofs

### Current Status (51 Sorry)

**Test Compilation:**
```bash
cd formal-proofs
lake build 2>&1 | grep -c "uses sorry"
# Output: 51
```

**List All Sorry Locations:**
```bash
lake build 2>&1 | grep "uses sorry"
```

**Example Output:**
```
error: declaration 'ChronosVault.withdrawal_safety' uses sorry
error: declaration 'ChronosVault.timelock_enforcement' uses sorry
error: declaration 'CVTBridge.supply_conservation' uses sorry
...
```

---

### When All Proofs Are Complete

**Expected Success:**
```bash
lake build
# Output:
# Building Contracts.ChronosVault
# Building Contracts.CVTBridge
# Building Cryptography.VDF
# Building Consensus.TrinityProtocol
# Build succeeded! ✓
```

**Verify Specific Properties:**
```bash
# Test authorization invariant
lake env lean --run Contracts/ChronosVault.lean

# Test supply conservation
lake env lean --run Contracts/CVTBridge.lean

# Test Trinity consensus
lake env lean --run Consensus/TrinityProtocol.lean
```

---

## 📊 Proof Development Workflow

### Recommended Development Cycle

1. **Choose a Theorem** (from PROOF_STATUS.md)
   - Start with Priority 1 theorems
   - Focus on user's 6 core properties

2. **Understand the Smart Contract**
   - Read corresponding Solidity code
   - Identify invariants and security properties

3. **Write the Proof**
   - Use existing proven theorems as templates
   - Common tactics: `intro`, `exact`, `simp`, `omega`, `cases`

4. **Test Locally**
   ```bash
   lake env lean --run YourFile.lean
   ```

5. **Verify No Sorry**
   ```bash
   lake build YourFile
   # Should succeed without "uses sorry" error
   ```

6. **Commit & Push**
   ```bash
   git add YourFile.lean
   git commit -m "✅ Prove TheoreмName - complete proof (no sorry)"
   git push
   ```

---

## 🔧 Common Issues & Solutions

### Issue 1: `lake: command not found`

**Cause:** Elan not installed or not in PATH

**Solution:**
```bash
# Add elan to PATH (if not done automatically)
export PATH="$HOME/.elan/bin:$PATH"

# Verify
lake --version
```

**Permanent Fix (Linux/macOS):**
```bash
echo 'export PATH="$HOME/.elan/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

### Issue 2: `unknown package 'Mathlib'`

**Cause:** Dependencies not installed

**Solution:**
```bash
cd formal-proofs
lake update
lake build
```

---

### Issue 3: `declaration uses sorry`

**Cause:** Proof is incomplete (expected during development)

**Solution:**
- This is normal! 51 proofs are incomplete
- See PROOF_STATUS.md for which theorems need completion
- Replace `sorry` with actual proof

**To ignore and continue development:**
```bash
# Build anyway (type-check without proof verification)
lake build --continue-on-error
```

---

### Issue 4: Lean Version Mismatch

**Cause:** Wrong Lean version installed

**Solution:**
```bash
# Check required version
cat formal-proofs/lean-toolchain
# Shows: leanprover/lean4:v4.3.0

# Install correct version
elan install leanprover/lean4:v4.3.0
elan default leanprover/lean4:v4.3.0

# Verify
lean --version
```

---

## 🎓 Learning Lean 4

### Essential Resources

**Official Documentation:**
- [Lean 4 Manual](https://leanprover.github.io/lean4/doc/) - Language reference
- [Theorem Proving in Lean 4](https://leanprover.github.io/theorem_proving_in_lean4/) - Tutorial
- [Mathematics in Lean](https://leanprover-community.github.io/mathematics_in_lean/) - Applied proofs

**Community:**
- [Lean Zulip Chat](https://leanprover.zulipchat.com/) - Ask questions
- [Lean 4 GitHub](https://github.com/leanprover/lean4) - Source code
- [Mathlib4 Docs](https://leanprover-community.github.io/mathlib4_docs/) - Library reference

**DeFi-Specific:**
- [Formal Verification of Smart Contracts](https://arxiv.org/abs/2104.12419) - Survey paper
- [Certora Prover](https://www.certora.com/) - Alternative tool
- [Runtime Verification](https://runtimeverification.com/) - K Framework

---

### Proof Tactics Cheat Sheet

**Basic Tactics:**
- `intro h` - Introduce hypothesis
- `exact e` - Prove goal with expression e
- `rfl` - Prove equality by reflexivity
- `simp` - Simplify using lemmas
- `omega` - Solve linear arithmetic

**Logical Tactics:**
- `constructor` - Split conjunction (A ∧ B)
- `cases h` - Case split on hypothesis
- `left` / `right` - Choose disjunction (A ∨ B)
- `exfalso` - Proof by contradiction

**Advanced Tactics:**
- `induction` - Proof by induction
- `unfold` - Expand definitions
- `have : P := proof` - Introduce intermediate result
- `calc` - Chain of equalities

---

## 🏗️ Contributing Proofs

### How to Contribute

1. **Find a Sorry:**
   - Check [PROOF_STATUS.md](./PROOF_STATUS.md)
   - Choose Priority 1 theorems first

2. **Set Up Environment:**
   ```bash
   git clone https://github.com/Chronos-Vault/chronos-vault-contracts.git
   cd chronos-vault-contracts/formal-proofs
   lake update
   code .  # Open in VS Code
   ```

3. **Complete the Proof:**
   - Replace `sorry` with actual proof
   - Test: `lake env lean --run YourFile.lean`
   - Verify: `lake build YourFile`

4. **Submit Pull Request:**
   ```bash
   git checkout -b proof/theorem-name
   git add YourFile.lean
   git commit -m "✅ Prove theorem_name - Authorization invariant (2/12 core proofs)"
   git push origin proof/theorem-name
   # Open PR on GitHub
   ```

**PR Template:**
```markdown
## Proof Completion: [Theorem Name]

**Theorem:** `theorem_name`
**File:** `Contracts/ChronosVault.lean`
**Property:** Authorization Invariant (User's Core Property #1)

**Changes:**
- ✅ Replaced `sorry` with complete proof
- ✅ Proof type-checks successfully
- ✅ All intermediate lemmas proven
- ✅ No new `sorry` introduced

**Testing:**
```bash
lake env lean --run Contracts/ChronosVault.lean
# ✅ Success: No errors
```

**Progress:**
- Core Property #1 (Authorization): 2/2 theorems ✅
- Total Core Proofs: 2/12 complete
- Total Sorry Count: 51 → 50
```

---

## 🔐 Continuous Integration

### GitHub Actions Workflow

**Automatic Verification:**
```yaml
name: Lean 4 Formal Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: leanprover/lean-action@v1
        with:
          lean-version: leanprover/lean4:v4.3.0
      - run: |
          cd formal-proofs
          lake build
```

**Current Status:**
- ❌ CI fails (51 sorry statements)
- ✅ Type-checking passes
- 🔨 Will succeed when proofs complete

**When Complete:**
- ✅ CI passes on all commits
- ✅ Badge updates to "54/54 Proven"
- ✅ Public verification possible

---

## 🎯 Verification Milestones

### Milestone 1: First Proof Complete (Week 1)
```bash
# Fix authorization invariant
# ChronosVault: withdrawal_safety, ownership_immutable

lake build Contracts.ChronosVault
# Expected: 2 theorems proven, 49 sorry remaining
```

### Milestone 2: Core Security Complete (Week 3)
```bash
# Fix user's 6 core properties (12 theorems)

lake build
# Expected: 12 theorems proven, 39 sorry remaining
```

### Milestone 3: Full Verification (Week 8)
```bash
# Fix all 51 sorry statements

lake build
# Expected: ✅ Build succeeded! All 54 theorems proven.
```

### Milestone 4: Public Verification (Week 9)
```bash
# Anyone can verify:
git clone https://github.com/Chronos-Vault/chronos-vault-contracts.git
cd chronos-vault-contracts/formal-proofs
lake update && lake build
# Expected: ✅ All proofs verified successfully
```

---

## 📞 Support

### Get Help

**Lean 4 Questions:**
- [Lean Zulip](https://leanprover.zulipchat.com/) - Active community
- [Stack Overflow](https://stackoverflow.com/questions/tagged/lean) - Tag: `lean`

**Chronos Vault Specific:**
- **Discord:** [Chronos Vault Community](https://discord.gg/chronos-vault)
- **GitHub Issues:** [Proof Questions](https://github.com/Chronos-Vault/chronos-vault-contracts/issues)
- **Email:** security@chronosvault.io

**Documentation:**
- [Lean Proof Roadmap](../LEAN_PROOF_ROADMAP.md)
- [Formal Verification Status](../FORMAL_VERIFICATION_STATUS.md)
- [Proof Status Tracker](./PROOF_STATUS.md)
- [Verify Yourself](./VERIFY_YOURSELF.md)

---

## 🏆 Success Criteria

### Environment Setup Complete When:

✅ **Lean 4 Installed:**
```bash
lean --version
# Lean (version 4.3.0, ...)
```

✅ **Dependencies Installed:**
```bash
lake build --continue-on-error
# Builds with expected sorry errors
```

✅ **VS Code Working:**
- Lean 4 extension installed
- Infoview shows proof states
- Go-to-definition works

✅ **Ready to Contribute:**
- Can run `lake env lean --run YourFile.lean`
- Can view sorry locations
- Understand proof workflow

---

*Trust Math, Not Humans - Set Up Your Environment and Verify It Yourself! ✓*

---

*Last Updated: October 14, 2025*  
*Formal Verification Team - Chronos Vault*
