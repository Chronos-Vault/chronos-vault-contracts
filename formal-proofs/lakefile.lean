import Lake
open Lake DSL

package «chronos-vault-proofs» where
  -- Lean 4 configuration for Chronos Vault formal verification
  version := v!"1.0.0"
  
require mathlib from git
  "https://github.com/leanprover-community/mathlib4.git"

@[default_target]
lean_lib «ChronosVaultProofs» where
  -- Root library for all formal verification modules
  roots := #[`Contracts, `Cryptography, `Consensus]
