# TON Smart Contract - ChronosVault

This directory contains the TON blockchain smart contracts for the Chronos Vault platform.

## Contract Overview

`ChronosVault.fc` - A time-locked vault contract written in FunC (TON's smart contract language). It implements:

- Time-locked storage of digital assets
- Multi-level security access controls
- Cross-chain integration capabilities
- Proof of deposit verification

## Development and Deployment

### Prerequisites

- Node.js (v16+)
- TON development tools (installed via npm)
- TON wallet with test tokens (for testnet deployment)

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
TON_API_KEY=your_ton_api_key_here
TON_MNEMONIC=your wallet mnemonic phrase with spaces between words
TON_NETWORK=testnet  # or mainnet for production
```

- **TON_API_KEY**: Get this from [TON API](https://toncenter.com/api/v2/apikey)
- **TON_MNEMONIC**: Your TON wallet's mnemonic phrase (keep this secret!)
- **TON_NETWORK**: `testnet` for development, `mainnet` for production

### Compilation

The contract is compiled from FunC to bytecode using the TON compiler:

```bash
node scripts/ton/compile.js
```

This generates the following files in the `build/ton/` directory:
- `ChronosVault.cell` - Binary cell representation
- `ChronosVault.code` - Hex string representation
- `ChronosVault.base64` - Base64 encoded representation
- `ChronosVault.meta.json` - Metadata and ABI information

### Deployment

Deploy the compiled contract to TON blockchain:

```bash
node scripts/ton/deploy.js
```

### Development Mode

For local development without real TON credentials:

```bash
./scripts/ton/run.sh --dev
```

This creates placeholder files and simulates deployment for testing the integration of TON contracts with the application.

## Contract Interface

### Get Methods

- `get_vault_data()` - Returns the stored content
- `is_unlocked()` - Checks if the time lock has expired
- `get_unlock_time()` - Returns the unlock timestamp
- `get_security_level()` - Returns the security level of the vault
- `get_verification_proof()` - Generates a verification proof for cross-chain operations
- `get_cross_chain_locations()` - Returns data about mirrored storage on other chains
- `get_vault_info()` - Returns general information about the vault

### External Methods

- `recv_internal(msg_value, in_msg_cell, in_msg)` - Main entry point for messages
  - Operation 0x1: Get vault data (owner only)
  - Operation 0x2: Update unlock time (owner only)
  - Operation 0x3: Update security level (owner only)
  - Operation 0x4: Update cross-chain data (owner only)
  - Operation 0x5: Retrieve content (if unlocked and correct access key provided)

## Security Considerations

- The contract implements a multi-level security system
- Higher security levels require an access key for retrieval
- Time-locked functionality is enforced at the contract level
- Cross-chain verification is available for redundant storage