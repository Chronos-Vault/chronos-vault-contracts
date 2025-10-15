# Chronos Vault SDK Usage Guide

## Overview

The Chronos Vault SDK provides client libraries for multiple programming languages, enabling seamless integration with the Chronos Vault platform. This document provides guidance on how to use these SDKs to interact with the Chronos Vault API.

## Available SDKs

- [JavaScript/TypeScript](#javascripttypescript)
- [Python](#python)
- [Java](#java)
- [Go](#go)
- [Rust](#rust)
- [.NET](#net)

## Installation

### JavaScript/TypeScript

```bash
# npm
npm install @chronos-vault/sdk

# yarn
yarn add @chronos-vault/sdk

# pnpm
pnpm add @chronos-vault/sdk
```

### Python

```bash
pip install chronos-vault-sdk
```

### Java

```xml
<!-- Maven -->
<dependency>
  <groupId>org.chronosvault</groupId>
  <artifactId>chronos-vault-sdk</artifactId>
  <version>1.0.0</version>
</dependency>
```

```gradle
// Gradle
implementation 'org.chronosvault:chronos-vault-sdk:1.0.0'
```

### Go

```bash
go get github.com/chronosvault/sdk-go
```

### Rust

```toml
# Cargo.toml
[dependencies]
chronos-vault-sdk = "1.0.0"
```

### .NET

```bash
dotnet add package ChronosVault.SDK
```

## Authentication

### API Key Authentication

#### JavaScript/TypeScript

```typescript
import { ChronosVaultClient } from '@chronos-vault/sdk';

// Initialize with API key
const client = new ChronosVaultClient({
  apiKey: 'your_api_key',
  environment: 'production' // or 'testnet'
});
```

#### Python

```python
from chronos_vault_sdk import ChronosVaultClient

# Initialize with API key
client = ChronosVaultClient(
    api_key='your_api_key',
    environment='production'  # or 'testnet'
)
```

### Wallet-Based Authentication

#### JavaScript/TypeScript

```typescript
import { ChronosVaultClient } from '@chronos-vault/sdk';

// Initialize with wallet
const client = new ChronosVaultClient({
  wallet: {
    type: 'ethereum', // or 'ton', 'solana', 'bitcoin'
    provider: window.ethereum // or custom provider
  },
  environment: 'production' // or 'testnet'
});

// Authenticate
await client.authenticate();
```

#### Python

```python
from chronos_vault_sdk import ChronosVaultClient
from chronos_vault_sdk.providers import EthereumProvider

# Initialize with wallet
ethereum_provider = EthereumProvider(private_key='your_ethereum_private_key')
client = ChronosVaultClient(
    wallet={
        'type': 'ethereum',  # or 'ton', 'solana', 'bitcoin'
        'provider': ethereum_provider
    },
    environment='production'  # or 'testnet'
)

# Authenticate
client.authenticate()
```

## Basic Usage

### Vault Management

#### List Vaults

##### JavaScript/TypeScript

```typescript
// Get all vaults
const vaults = await client.vaults.list();

// Get vaults with filters
const timeLockedVaults = await client.vaults.list({
  type: 'time-lock',
  status: 'active',
  page: 1,
  limit: 20
});
```

##### Python

```python
# Get all vaults
vaults = client.vaults.list()

# Get vaults with filters
time_locked_vaults = client.vaults.list(
    type='time-lock',
    status='active',
    page=1,
    limit=20
)
```

#### Get Vault Details

##### JavaScript/TypeScript

```typescript
const vault = await client.vaults.get('v_1a2b3c4d5e6f');
console.log(vault.name); // "My Savings Vault"
console.log(vault.status); // "active"
```

##### Python

```python
vault = client.vaults.get('v_1a2b3c4d5e6f')
print(vault.name)  # "My Savings Vault"
print(vault.status)  # "active"
```

#### Create a Vault

##### JavaScript/TypeScript

```typescript
const newVault = await client.vaults.create({
  name: 'My Savings Vault',
  description: 'Long-term savings vault',
  type: 'time-lock',
  lockUntil: new Date('2026-01-01'),
  chains: ['ethereum', 'ton'],
  features: {
    quantumResistant: true,
    crossChainVerification: true,
    multiSignature: false
  },
  security: {
    verificationLevel: 'advanced',
    requireMultiSignature: false,
    timeDelay: 86400
  }
});

console.log(newVault.id); // "v_1a2b3c4d5e6f"
console.log(newVault.depositAddresses.ethereum); // "0xabcdef1234567890abcdef1234567890abcdef12"
```

##### Python

```python
from datetime import datetime, timezone

new_vault = client.vaults.create({
    'name': 'My Savings Vault',
    'description': 'Long-term savings vault',
    'type': 'time-lock',
    'lockUntil': datetime(2026, 1, 1, tzinfo=timezone.utc),
    'chains': ['ethereum', 'ton'],
    'features': {
        'quantumResistant': True,
        'crossChainVerification': True,
        'multiSignature': False
    },
    'security': {
        'verificationLevel': 'advanced',
        'requireMultiSignature': False,
        'timeDelay': 86400
    }
})

print(new_vault.id)  # "v_1a2b3c4d5e6f"
print(new_vault.deposit_addresses.ethereum)  # "0xabcdef1234567890abcdef1234567890abcdef12"
```

#### Update a Vault

##### JavaScript/TypeScript

```typescript
const updatedVault = await client.vaults.update('v_1a2b3c4d5e6f', {
  name: 'Updated Vault Name',
  description: 'Updated description',
  security: {
    verificationLevel: 'maximum'
  }
});

console.log(updatedVault.status); // "updated"
```

##### Python

```python
updated_vault = client.vaults.update('v_1a2b3c4d5e6f', {
    'name': 'Updated Vault Name',
    'description': 'Updated description',
    'security': {
        'verificationLevel': 'maximum'
    }
})

print(updated_vault.status)  # "updated"
```

### Asset Management

#### Deposit Assets

##### JavaScript/TypeScript

```typescript
const deposit = await client.assets.deposit('v_1a2b3c4d5e6f', {
  chain: 'ethereum',
  assetType: 'native',
  amount: '0.5'
});

console.log(deposit.depositAddress); // "0xabcdef1234567890abcdef1234567890abcdef12"
console.log(deposit.status); // "pending"
```

##### Python

```python
deposit = client.assets.deposit('v_1a2b3c4d5e6f', {
    'chain': 'ethereum',
    'assetType': 'native',
    'amount': '0.5'
})

print(deposit.deposit_address)  # "0xabcdef1234567890abcdef1234567890abcdef12"
print(deposit.status)  # "pending"
```

#### Withdraw Assets

##### JavaScript/TypeScript

```typescript
const withdrawal = await client.assets.withdraw('v_1a2b3c4d5e6f', {
  chain: 'ethereum',
  assetType: 'native',
  amount: '0.5',
  destinationAddress: '0x1234567890abcdef1234567890abcdef12345678'
});

console.log(withdrawal.withdrawalId); // "w_7h8j9k0l1m2n"
console.log(withdrawal.status); // "pending"
```

##### Python

```python
withdrawal = client.assets.withdraw('v_1a2b3c4d5e6f', {
    'chain': 'ethereum',
    'assetType': 'native',
    'amount': '0.5',
    'destinationAddress': '0x1234567890abcdef1234567890abcdef12345678'
})

print(withdrawal.withdrawal_id)  # "w_7h8j9k0l1m2n"
print(withdrawal.status)  # "pending"
```

## Advanced Features

### Vault Verification

#### JavaScript/TypeScript

```typescript
const verification = await client.security.verifyVault('v_1a2b3c4d5e6f');

console.log(verification.verificationStatus); // "verified"
console.log(verification.quantumResistanceLevel); // "high"
```

#### Python

```python
verification = client.security.verify_vault('v_1a2b3c4d5e6f')

print(verification.verification_status)  # "verified"
print(verification.quantum_resistance_level)  # "high"
```

### Progressive Quantum Vault Configuration

#### JavaScript/TypeScript

```typescript
const quantum = await client.security.configureQuantumSecurity('v_1a2b3c4d5e6f', {
  algorithms: ['lattice-based', 'multivariate', 'hash-based'],
  keySize: 'maximum',
  adaptiveMode: true
});

console.log(quantum.quantumResistanceLevel); // "maximum"
console.log(quantum.estimatedProtectionYears); // 50
```

#### Python

```python
quantum = client.security.configure_quantum_security('v_1a2b3c4d5e6f', {
    'algorithms': ['lattice-based', 'multivariate', 'hash-based'],
    'keySize': 'maximum',
    'adaptiveMode': True
})

print(quantum.quantum_resistance_level)  # "maximum"
print(quantum.estimated_protection_years)  # 50
```

### Intent-Based Inheritance

#### JavaScript/TypeScript

```typescript
const inheritance = await client.inheritance.configure('v_1a2b3c4d5e6f', {
  beneficiaries: [
    {
      address: '0x9876543210abcdef9876543210abcdef98765432',
      email: 'beneficiary@example.com',
      allocation: 100,
      unlockConditions: {
        timeBasedTrigger: {
          inactivityPeriod: 31536000 // 1 year in seconds
        }
      }
    }
  ],
  verificationRequirements: {
    requireLegalDocumentation: true,
    identityVerificationLevel: 'advanced'
  }
});

console.log(inheritance.inheritanceId); // "i_7h8j9k0l1m2n"
console.log(inheritance.status); // "configured"
```

#### Python

```python
inheritance = client.inheritance.configure('v_1a2b3c4d5e6f', {
    'beneficiaries': [
        {
            'address': '0x9876543210abcdef9876543210abcdef98765432',
            'email': 'beneficiary@example.com',
            'allocation': 100,
            'unlockConditions': {
                'timeBasedTrigger': {
                    'inactivityPeriod': 31536000  # 1 year in seconds
                }
            }
        }
    ],
    'verificationRequirements': {
        'requireLegalDocumentation': True,
        'identityVerificationLevel': 'advanced'
    }
})

print(inheritance.inheritance_id)  # "i_7h8j9k0l1m2n"
print(inheritance.status)  # "configured"
```

## Blockchain-Specific API

### Ethereum

#### Get Gas Price

##### JavaScript/TypeScript

```typescript
const gasPrice = await client.blockchain.ethereum.getGasPrice();

console.log(gasPrice.standard.gwei); // 30
console.log(gasPrice.fast.estimatedSeconds); // 15
```

##### Python

```python
gas_price = client.blockchain.ethereum.get_gas_price()

print(gas_price.standard.gwei)  # 30
print(gas_price.fast.estimated_seconds)  # 15
```

### TON

#### Get Account Information

##### JavaScript/TypeScript

```typescript
const account = await client.blockchain.ton.getAccount('UQAkIXbCToQ6LowMrDNG2K3ERmMH8m4XB2owWgL0BAB14Jtl');

console.log(account.balance); // "10.5"
console.log(account.status); // "active"
```

##### Python

```python
account = client.blockchain.ton.get_account('UQAkIXbCToQ6LowMrDNG2K3ERmMH8m4XB2owWgL0BAB14Jtl')

print(account.balance)  # "10.5"
print(account.status)  # "active"
```

### Solana

#### Get Account Information

##### JavaScript/TypeScript

```typescript
const account = await client.blockchain.solana.getAccount('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

console.log(account.balance); // "25.75"
console.log(account.status); // "active"
```

##### Python

```python
account = client.blockchain.solana.get_account('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS')

print(account.balance)  # "25.75"
print(account.status)  # "active"
```

### Bitcoin

#### Get Account Information

##### JavaScript/TypeScript

```typescript
const account = await client.blockchain.bitcoin.getAccount('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');

console.log(account.balance); // "0.25"
console.log(account.totalReceived); // "1.5"
```

##### Python

```python
account = client.blockchain.bitcoin.get_account('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')

print(account.balance)  # "0.25"
print(account.total_received)  # "1.5"
```

## Real-time Updates with WebSockets

### JavaScript/TypeScript

```typescript
// Connect to WebSocket
const socket = client.connectWebSocket();

// Listen for transaction confirmations
socket.on('TRANSACTION_CONFIRMED', (data) => {
  console.log(`Transaction ${data.transactionId} confirmed`);
  console.log(`Block number: ${data.blockNumber}`);
});

// Listen for security alerts
socket.on('SECURITY_ALERT', (data) => {
  console.log(`Security alert: ${data.type}`);
  console.log(`Severity: ${data.severity}`);
  console.log(`Description: ${data.description}`);
});

// Close connection when done
socket.close();
```

### Python

```python
# Define event handlers
def on_transaction_confirmed(data):
    print(f"Transaction {data['transactionId']} confirmed")
    print(f"Block number: {data['blockNumber']}")

def on_security_alert(data):
    print(f"Security alert: {data['type']}")
    print(f"Severity: {data['severity']}")
    print(f"Description: {data['description']}")

# Connect to WebSocket
socket = client.connect_websocket()

# Register event handlers
socket.on('TRANSACTION_CONFIRMED', on_transaction_confirmed)
socket.on('SECURITY_ALERT', on_security_alert)

# Keep connection open (in a real application)
# import time
# time.sleep(60)  # Keep connection open for 1 minute

# Close connection when done
socket.close()
```

## Webhook Management

### Register a Webhook

#### JavaScript/TypeScript

```typescript
const webhook = await client.webhooks.create({
  url: 'https://your-server.com/webhook',
  events: [
    'vault.created',
    'vault.updated',
    'transaction.confirmed',
    'security.alert'
  ],
  secret: 'your_webhook_secret'
});

console.log(webhook.webhookId); // "wh_7h8j9k0l1m2n"
console.log(webhook.status); // "active"
```

#### Python

```python
webhook = client.webhooks.create({
    'url': 'https://your-server.com/webhook',
    'events': [
        'vault.created',
        'vault.updated',
        'transaction.confirmed',
        'security.alert'
    ],
    'secret': 'your_webhook_secret'
})

print(webhook.webhook_id)  # "wh_7h8j9k0l1m2n"
print(webhook.status)  # "active"
```

### List Webhooks

#### JavaScript/TypeScript

```typescript
const webhooks = await client.webhooks.list();

webhooks.forEach(webhook => {
  console.log(webhook.webhookId);
  console.log(webhook.url);
  console.log(webhook.events);
});
```

#### Python

```python
webhooks = client.webhooks.list()

for webhook in webhooks:
    print(webhook.webhook_id)
    print(webhook.url)
    print(webhook.events)
```

### Delete a Webhook

#### JavaScript/TypeScript

```typescript
const result = await client.webhooks.delete('wh_7h8j9k0l1m2n');

console.log(result.success); // true
```

#### Python

```python
result = client.webhooks.delete('wh_7h8j9k0l1m2n')

print(result.success)  # True
```

## Error Handling

### JavaScript/TypeScript

```typescript
try {
  const vault = await client.vaults.get('non_existent_vault_id');
} catch (error) {
  if (error.code === 'RESOURCE_NOT_FOUND') {
    console.error('Vault not found');
  } else if (error.code === 'AUTHENTICATION_REQUIRED') {
    console.error('Authentication required');
  } else {
    console.error(`Error: ${error.message}`);
  }
  console.log(`Request ID: ${error.requestId}`);
}
```

### Python

```python
try:
    vault = client.vaults.get('non_existent_vault_id')
except ChronosVaultException as error:
    if error.code == 'RESOURCE_NOT_FOUND':
        print('Vault not found')
    elif error.code == 'AUTHENTICATION_REQUIRED':
        print('Authentication required')
    else:
        print(f'Error: {error.message}')
    print(f'Request ID: {error.request_id}')
```

## Best Practices

1. **API Key Security**: Store API keys securely using environment variables or a secure key management service.

2. **Error Handling**: Always implement proper error handling to gracefully manage API failures.

3. **Pagination**: When listing resources, utilize pagination parameters to avoid fetching excessive data.

4. **Retry Logic**: Implement retry logic for transient failures, with exponential backoff.

5. **Connection Pooling**: For high-throughput applications, use connection pooling to optimize performance.

6. **Webhook Verification**: Verify webhook signatures to ensure requests are legitimate.

7. **Rate Limiting**: Respect rate limits by monitoring the rate limit headers and implementing throttling when necessary.

## SDK Versioning

The SDK follows semantic versioning (MAJOR.MINOR.PATCH).

- **MAJOR** version increments indicate incompatible API changes
- **MINOR** version increments add functionality in a backward-compatible manner
- **PATCH** version increments make backward-compatible bug fixes

## Support

For SDK support, please contact us at sdk-support@chronosvault.org or visit our [developer forum](https://developers.chronosvault.org).