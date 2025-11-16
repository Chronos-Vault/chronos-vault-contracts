# Trinity Protocol™ Integration Test Suite

Comprehensive integration tests for the Trinity Protocol™ multi-chain consensus verification system.

## Overview

This test suite validates the 2-of-3 consensus mechanism across Ethereum (Arbitrum), Solana, and TON blockchains using real validator services and local blockchain instances.

## Test Categories

### 1. Baseline Tests (`01-baseline.test.ts`)
Tests the happy path with all chains online:
- ✅ 2-of-3 consensus (Ethereum + Solana)
- ✅ 3-of-3 consensus (all validators)
- ✅ Sequential operations with unique nonces

### 2. Adversarial Tests (`02-adversarial.test.ts`)
Tests failure scenarios:
- ⚠️  1 chain down (should still work with 2-of-3)
- ⚠️  2 chains down (should fail - need 2-of-3)
- ⚠️  Validator failures and recovery

### 3. Economic Tests (`03-economic.test.ts`)
Tests fee distribution and rate limiting:
- 💰 80/20 fee split (validators/protocol)
- 🚦 Rate limiting enforcement
- 🛑 Circuit breaker activation

### 4. Stress Tests (`04-stress.test.ts`)
Tests system under load:
- 🔥 1,000+ operations with random data
- ⚡ Concurrent operation submission
- 📊 Gas cost tracking and analysis

### 5. Regression Tests (`05-regression.test.ts`)
Tests all 6 fixed vulnerabilities:
- ✅ Nonce-based Merkle updates
- ✅ Validator fee distribution
- ✅ Rolling window rate limiting
- ✅ Operation cancellation
- ✅ Circuit breaker event tracking
- ✅ Slippage protection framework

## Setup

### Prerequisites

```bash
# Install Foundry (for Anvil)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Solana CLI (optional - for real Solana validator)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Compile smart contracts
npx hardhat compile
```

### Running Tests

```bash
# Run all tests
cd integration-tests
npm test

# Run specific test suite
npm run test:baseline
npm run test:adversarial
npm run test:economic
npm run test:stress
npm run test:regression

# Watch mode
npm run test:watch

# With UI
npm run test:ui
```

## Architecture

```
integration-tests/
├── lib/                    # Test infrastructure
│   ├── chain-orchestrator.ts   # Multi-chain management
│   ├── contract-deployer.ts    # Contract deployment
│   ├── test-helpers.ts         # Reusable utilities
│   ├── types.ts                # TypeScript types
│   └── setup.ts                # Global setup/teardown
├── scenarios/              # Test scenarios
│   ├── 01-baseline.test.ts
│   ├── 02-adversarial.test.ts
│   ├── 03-economic.test.ts
│   ├── 04-stress.test.ts
│   └── 05-regression.test.ts
├── fixtures/               # Test data
├── logs/                   # Test logs
└── vitest.config.ts        # Test configuration
```

## Key Features

### Deterministic Testing
- Fixed mnemonics for reproducible wallets
- Deterministic nonces and operation IDs
- Clean chain state between tests

### Multi-Chain Orchestration
- Anvil for Ethereum (local fork of Arbitrum)
- Solana test validator (when available)
- TON localnet (when available)
- Graceful fallback to simulation mode

### Comprehensive Assertions
- 2-of-3 consensus verification
- Gas cost tracking (< 350,000 per operation)
- Fee distribution validation (80/20 split)
- Event emission verification
- State consistency checks

## Test Results

Results are logged to `logs/` directory with detailed metrics:
- Gas usage per operation
- Execution time
- Errors and warnings
- Consensus validation results

## Quality Assurance

These tests are designed to catch issues that were missed in earlier smart contract development:

1. **Type Safety** - Full TypeScript types prevent runtime errors
2. **Deterministic** - Same test data every run
3. **Comprehensive** - Tests all code paths
4. **Realistic** - Uses real validators and blockchain instances
5. **Maintainable** - Reusable helpers and clear test structure

## Environment Variables

```bash
# Ethereum (Anvil runs automatically)
ETHEREUM_RPC_URL=http://127.0.0.1:8545

# Solana (optional)
SOLANA_RPC_URL=http://127.0.0.1:8899

# TON (optional)
TON_RPC_URL=http://127.0.0.1:8081
```

## CI/CD Integration

Fast tier (runs on every commit):
```bash
npm run test:baseline
npm run test:economic
```

Full suite (runs nightly):
```bash
npm test
```

## Troubleshooting

### Anvil not found
Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### Contract artifacts missing
Run: `npx hardhat compile`

### Tests timeout
Increase timeout in `vitest.config.ts`: `testTimeout: 600000`

---

**Trinity Protocol™** - Mathematically Provable Multi-Chain Consensus
