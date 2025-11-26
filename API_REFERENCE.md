# Trinity Protocol v3.5.20 — API Reference

Complete REST API reference for Trinity Protocol cross-chain operations.

**Version:** 3.5.20  
**Deployed:** November 26, 2025  
**Status:** Production-Ready (Testnet)

---

## Base URLs

**Development (Local):**
```
http://localhost:5000/api
```

**Testnet:**
```
https://testnet.chronosvault.io/api
```

**WebSocket Events (Real-time):**
```
wss://testnet.chronosvault.io/ws
```

---

## Authentication

All API endpoints require wallet-based authentication. Supported wallets:

- **Ethereum:** MetaMask, WalletConnect
- **Solana:** Phantom, Solflare
- **TON:** Tonkeeper, TON Wallet

### Sign Message

```
POST /api/auth/sign-message
```

Request wallet signature for authentication:

```json
{
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "message": "Sign to authenticate with Trinity Protocol",
  "chain": "arbitrum"
}
```

Response:

```json
{
  "message": "Sign to authenticate with Trinity Protocol",
  "signature": "0xabc123...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Health & Status

### System Health

```
GET /api/health
```

Returns system health status across all chains.

Response:

```json
{
  "status": "healthy",
  "chains": {
    "arbitrum": {
      "status": "online",
      "latency": "120ms",
      "blockNumber": 12345678
    },
    "solana": {
      "status": "online",
      "latency": "250ms",
      "slot": 165432109
    },
    "ton": {
      "status": "online",
      "latency": "500ms",
      "seqno": 876543
    }
  },
  "validators": {
    "arbitrum": "active",
    "solana": "active",
    "ton": "active"
  },
  "consensusStatus": "2-of-3 operational"
}
```

### Validator Status

```
GET /api/validators/status
```

Returns status of all three validators.

Response:

```json
{
  "validators": [
    {
      "chainId": 1,
      "name": "Arbitrum Validator",
      "address": "0x3A92fD5b39Ec9598225DB5b9f15af0523445E3d8",
      "status": "active",
      "lastHeartbeat": "2025-05-20T12:34:56Z",
      "proofCount": 1250,
      "feeBalance": "5.25 ETH"
    },
    {
      "chainId": 2,
      "name": "Solana Validator",
      "address": "0x2554324ae222673F4C36D1Ae0E58C19fFFf69cd5",
      "status": "active",
      "lastHeartbeat": "2025-05-20T12:34:50Z",
      "proofCount": 1247,
      "feeBalance": "125.5 SOL"
    },
    {
      "chainId": 3,
      "name": "TON Validator",
      "address": "0x9662e22D1f037C7EB370DD0463c597C6cd69B4c4",
      "status": "active",
      "lastHeartbeat": "2025-05-20T12:34:45Z",
      "proofCount": 1240,
      "feeBalance": "85.25 TON"
    }
  ],
  "consensusReady": true
}
```

---

## Vaults

### Create Vault

```
POST /api/vaults/create
```

Creates a new multi-chain vault requiring 2-of-3 consensus.

Request:

```json
{
  "name": "My Secure Vault",
  "description": "Cross-chain vault with Trinity consensus",
  "chains": ["arbitrum", "solana"],
  "features": {
    "quantumResistant": false,
    "timelock": 86400,
    "multiSig": false
  }
}
```

Response:

```json
{
  "vaultId": "v_abc123def456",
  "address": "0xabc123def456...",
  "status": "created",
  "depositAddresses": {
    "arbitrum": "0xdef456abc123...",
    "solana": "TokenAccount..."
  },
  "createdAt": "2025-05-20T12:34:56Z"
}
```

### Get Vault Details

```
GET /api/vaults/:vaultId
```

Returns vault information and balance.

Response:

```json
{
  "vaultId": "v_abc123def456",
  "name": "My Secure Vault",
  "owner": "0x1234567890abcdef1234567890abcdef12345678",
  "status": "active",
  "chains": ["arbitrum", "solana"],
  "balance": {
    "arbitrum": {
      "asset": "native",
      "amount": "1.5",
      "valueUsd": 4500
    },
    "solana": {
      "asset": "SOL",
      "amount": "25.0",
      "valueUsd": 5000
    }
  },
  "consensusStatus": "2-of-3 ready",
  "createdAt": "2025-05-20T12:34:56Z"
}
```

### List Vaults

```
GET /api/vaults
```

Query Parameters:
- `status`: "active", "locked", "paused"
- `chain`: "arbitrum", "solana", "ton"
- `page`: page number (default: 1)
- `limit`: results per page (default: 20)

Response:

```json
{
  "vaults": [
    {
      "vaultId": "v_abc123def456",
      "name": "My Secure Vault",
      "status": "active",
      "chains": ["arbitrum", "solana"],
      "totalBalance": "$9,500"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

## Operations

### Deposit

```
POST /api/vaults/:vaultId/deposit
```

Initiates deposit requiring 2-of-3 consensus.

Request:

```json
{
  "chain": "arbitrum",
  "asset": "native",
  "amount": "0.5"
}
```

Response:

```json
{
  "operationId": "op_xyz789",
  "type": "deposit",
  "status": "pending_consensus",
  "chain": "arbitrum",
  "amount": "0.5",
  "depositAddress": "0xabc123...",
  "expiresAt": "2025-05-20T13:34:56Z",
  "consensusProgress": {
    "required": 2,
    "received": 0,
    "validators": []
  }
}
```

### Withdraw

```
POST /api/vaults/:vaultId/withdraw
```

Initiates withdrawal requiring 2-of-3 consensus.

Request:

```json
{
  "chain": "arbitrum",
  "asset": "native",
  "amount": "0.5",
  "recipient": "0x1234567890abcdef1234567890abcdef12345678"
}
```

Response:

```json
{
  "operationId": "op_xyz789",
  "type": "withdraw",
  "status": "pending_consensus",
  "chain": "arbitrum",
  "amount": "0.5",
  "recipient": "0x1234567890...",
  "estimatedCompletion": "2025-05-20T12:49:56Z",
  "consensusProgress": {
    "required": 2,
    "received": 0,
    "validators": []
  }
}
```

### Atomic Swap

```
POST /api/operations/atomic-swap
```

Initiates atomic swap between chains (HTLC).

Request:

```json
{
  "sourceChain": "arbitrum",
  "targetChain": "solana",
  "sourceAsset": "native",
  "targetAsset": "SOL",
  "amount": "1.0",
  "recipient": "SolanaPubKey...",
  "timelock": 3600
}
```

Response:

```json
{
  "swapId": "swap_abc123",
  "status": "pending_consensus",
  "hashLock": "0xabc123...",
  "timelock": 3600,
  "consensusProgress": {
    "required": 2,
    "received": 0,
    "validators": ["arbitrum"]
  },
  "estimatedExecution": "2025-05-20T12:44:56Z"
}
```

---

## Operations Monitoring

### Get Operation Status

```
GET /api/operations/:operationId
```

Response:

```json
{
  "operationId": "op_xyz789",
  "type": "deposit",
  "status": "consensus_reached",
  "vaultId": "v_abc123def456",
  "consensusProgress": {
    "required": 2,
    "received": 2,
    "validators": [
      {
        "chainId": 1,
        "name": "Arbitrum Validator",
        "status": "approved",
        "timestamp": "2025-05-20T12:35:10Z",
        "proofHash": "0x123abc..."
      },
      {
        "chainId": 2,
        "name": "Solana Validator",
        "status": "approved",
        "timestamp": "2025-05-20T12:35:15Z",
        "proofHash": "0x456def..."
      }
    ]
  },
  "executionTx": {
    "arbitrum": "0xabc123...",
    "solana": "SolanaTxId...",
    "ton": null
  },
  "executedAt": "2025-05-20T12:35:20Z"
}
```

### List Recent Operations

```
GET /api/operations?vaultId=:vaultId&type=deposit
```

Query Parameters:
- `vaultId`: Filter by vault
- `type`: "deposit", "withdraw", "swap"
- `status`: "pending", "consensus_reached", "executed", "failed"
- `limit`: max results (default: 50)

Response:

```json
{
  "operations": [
    {
      "operationId": "op_xyz789",
      "type": "deposit",
      "status": "executed",
      "amount": "0.5",
      "chain": "arbitrum",
      "timestamp": "2025-05-20T12:35:20Z"
    }
  ],
  "total": 1
}
```

---

## Consensus Details

### Get Consensus Requirements

```
GET /api/consensus/requirements
```

Response:

```json
{
  "operationTypes": {
    "standard": {
      "operationTypes": ["deposit", "withdraw", "transfer"],
      "votesRequired": 2,
      "totalValidators": 3,
      "timelock": 0,
      "description": "Standard operations need 2-of-3 consensus"
    },
    "emergency": {
      "operationTypes": ["pause", "validator_rotation"],
      "votesRequired": 3,
      "totalValidators": 3,
      "timelock": 0,
      "description": "Emergency operations need 3-of-3 unanimous consensus"
    },
    "recovery": {
      "operationTypes": ["catastrophic_recovery"],
      "votesRequired": 3,
      "totalValidators": 3,
      "timelock": 172800,
      "description": "Recovery operations need 3-of-3 + 48 hour timelock"
    }
  }
}
```

### Get Consensus Proofs

```
GET /api/operations/:operationId/proofs
```

Response:

```json
{
  "operationId": "op_xyz789",
  "proofs": [
    {
      "validator": "Arbitrum Validator",
      "chainId": 1,
      "merkleRoot": "0x123abc...",
      "merkleProof": ["0x456def...", "0x789ghi..."],
      "signature": "0xabc123...",
      "timestamp": "2025-05-20T12:35:10Z"
    },
    {
      "validator": "Solana Validator",
      "chainId": 2,
      "merkleRoot": "0x123abc...",
      "merkleProof": ["0x456def...", "0x789ghi..."],
      "signature": "0xdef456...",
      "timestamp": "2025-05-20T12:35:15Z"
    }
  ]
}
```

---

## WebSocket Events

### Connect to Events

```javascript
const ws = new WebSocket('wss://testnet.chronosvault.io/ws?token=YOUR_AUTH_TOKEN');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Event Types

**Operation Started**
```json
{
  "type": "operation_started",
  "operationId": "op_xyz789",
  "operationType": "deposit",
  "vaultId": "v_abc123def456",
  "timestamp": "2025-05-20T12:35:00Z"
}
```

**Validator Voted**
```json
{
  "type": "validator_voted",
  "operationId": "op_xyz789",
  "validator": "Arbitrum Validator",
  "chainId": 1,
  "status": "approved",
  "timestamp": "2025-05-20T12:35:10Z"
}
```

**Consensus Reached**
```json
{
  "type": "consensus_reached",
  "operationId": "op_xyz789",
  "votesReceived": 2,
  "votesRequired": 2,
  "timestamp": "2025-05-20T12:35:15Z"
}
```

**Operation Executed**
```json
{
  "type": "operation_executed",
  "operationId": "op_xyz789",
  "vaultId": "v_abc123def456",
  "status": "success",
  "txHash": {
    "arbitrum": "0xabc123...",
    "solana": "SolanaTxId..."
  },
  "timestamp": "2025-05-20T12:35:20Z"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "CONSENSUS_TIMEOUT",
    "message": "Operation timed out waiting for 2-of-3 consensus",
    "details": {
      "operationId": "op_xyz789",
      "votesReceived": 1,
      "votesRequired": 2,
      "expiresAt": "2025-05-20T13:35:00Z"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `OPERATION_NOT_FOUND` | 404 | Operation does not exist |
| `VAULT_NOT_FOUND` | 404 | Vault does not exist |
| `INSUFFICIENT_BALANCE` | 400 | Vault balance too low |
| `CONSENSUS_TIMEOUT` | 408 | 2-of-3 consensus not reached in time |
| `CONSENSUS_FAILED` | 400 | Validators rejected operation |
| `INVALID_SIGNATURE` | 401 | Authentication signature invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many operations (100 per 24h) |
| `VAULT_PAUSED` | 403 | Vault paused by circuit breaker |
| `INVALID_CHAIN` | 400 | Unsupported blockchain |

---

## Rate Limiting

**Requests:** 100 per minute per IP
**Operations:** 100 per 24 hours per vault
**Consensus Timeout:** 60 minutes (after which operation expires)

Response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1716159300
```

---

## Examples

### Complete Deposit Flow

```javascript
// Step 1: Authenticate
const auth = await fetch('POST /api/auth/sign-message', {
  walletAddress: userAddress,
  chain: 'arbitrum'
});
const token = auth.token;

// Step 2: Create deposit
const deposit = await fetch('POST /api/vaults/abc123/deposit', {
  headers: { 'Authorization': `Bearer ${token}` },
  body: {
    chain: 'arbitrum',
    amount: '0.5'
  }
});

// Step 3: Monitor consensus
const ws = new WebSocket('wss://testnet.chronosvault.io/ws', {
  headers: { 'Authorization': `Bearer ${token}` }
});

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'consensus_reached') {
    console.log('Deposit approved by 2-of-3 validators!');
  }
  if (msg.type === 'operation_executed') {
    console.log('Deposit complete:', msg.txHash);
  }
};

// Step 4: Wait for execution
const operation = await fetch(`GET /api/operations/${deposit.operationId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
console.log('Status:', operation.status);
```

---

**Trinity Protocol v3.5.20 API**  
**Status:** Production-Ready (Testnet)  
**Last Updated:** November 26, 2025
