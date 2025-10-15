# 🔐 Chronos Vault API Reference

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Base URL:** `https://api.chronosvault.com/api`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Core Endpoints](#core-api-endpoints)
- [Vault Management](#vault-management-api)
- [Trinity Protocol](#trinity-protocol-api)
- [Cross-Chain Operations](#cross-chain-api)
- [WebSocket Events](#websocket-api)
- [Error Handling](#error-handling)

---

## 🌟 Overview

The Chronos Vault API provides RESTful endpoints for managing multi-chain digital vaults with Trinity Protocol security. All responses are in JSON format with comprehensive error handling.

### Base URLs

**Production:**
```
https://api.chronosvault.com/api
```

**Testnet:**
```
https://testnet-api.chronosvault.com/api
```

**Local Development:**
```
http://localhost:5000/api
```

### API Versioning

All endpoints support versioning through the URL path:
```
/api/v1/vaults
/api/v2/vaults  (future)
```

## Authentication

Most API endpoints require authentication. The Chronos Vault API supports multiple authentication methods:

### Wallet-Based Authentication

Connect your blockchain wallet to authenticate. Supported wallets:

- Ethereum (MetaMask, WalletConnect)
- TON (Tonkeeper, TON Wallet)
- Solana (Phantom, Solflare)
- Bitcoin (via xPub)

### API Key Authentication

For programmatic access, use API key authentication:

```
Authorization: Bearer YOUR_API_KEY
```

## Core API Endpoints

### Health Check

```
GET /api/health-check
```

Lightweight endpoint to verify API availability.

#### Response

```json
{
  "status": "ok",
  "timestamp": 1716151282742,
  "version": "1.0.0"
}
```

### System Health

```
GET /api/health/system
```

Detailed system health information.

#### Response

```json
{
  "status": "healthy",
  "components": {
    "database": "connected",
    "blockchain": {
      "ethereum": "online",
      "ton": "online",
      "solana": "online",
      "bitcoin": "online"
    },
    "storage": "operational"
  },
  "uptime": 1234567,
  "timestamp": 1716151282742
}
```

### Component Health

```
GET /api/health/component/:componentId
```

Retrieves health status for a specific system component.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| componentId | string | ID of the system component to check |

#### Response

```json
{
  "componentId": "database",
  "status": "healthy",
  "metrics": {
    "responseTime": 12,
    "connections": 5,
    "queriesPerSecond": 42
  },
  "lastChecked": "2025-05-20T13:00:00Z"
}
```

### Performance Metrics

```
GET /api/performance/metrics
```

Retrieves performance metrics for the platform.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| timeframe | string | Optional timeframe for metrics (e.g., "hour", "day", "week") |

#### Response

```json
{
  "cpu": {
    "usage": 32.5,
    "trend": "stable"
  },
  "memory": {
    "used": 1024,
    "total": 4096,
    "percentage": 25.0
  },
  "requests": {
    "perSecond": 42.3,
    "trend": "increasing"
  },
  "responseTime": {
    "average": 120,
    "p95": 250,
    "p99": 450
  },
  "timeframe": "hour",
  "timestamp": "2025-05-20T13:00:00Z"
}
```

### Security Logs

```
GET /api/security/logs
```

Retrieves security-related logs.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| level | string | Filter logs by level (e.g., "info", "warning", "critical") |
| page | integer | Page number for pagination |
| limit | integer | Number of logs per page |

#### Response

```json
{
  "logs": [
    {
      "id": "log_1a2b3c4d5e6f",
      "timestamp": "2025-05-20T12:34:56Z",
      "level": "warning",
      "message": "Multiple failed authentication attempts detected",
      "source": "authentication_service",
      "metadata": {
        "ipAddress": "192.168.1.1",
        "attempts": 5
      }
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

### Incident Management

```
GET /api/incidents
```

Retrieves security incidents.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (e.g., "open", "resolved", "in_progress") |
| severity | string | Filter by severity (e.g., "low", "medium", "high", "critical") |
| page | integer | Page number for pagination |

#### Response

```json
{
  "incidents": [
    {
      "id": "incident_1a2b3c4d5e6f",
      "title": "Suspicious activity detected",
      "description": "Multiple failed authentication attempts from unusual location",
      "status": "resolved",
      "severity": "medium",
      "createdAt": "2025-05-20T12:34:56Z",
      "resolvedAt": "2025-05-20T13:45:00Z",
      "affectedVaults": ["v_1a2b3c4d5e6f"]
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

### Emergency Reset

```
POST /api/emergency-reset
```

Initiates an emergency reset procedure for account recovery.

#### Request Body

```json
{
  "accountId": "acc_1a2b3c4d5e6f",
  "resetCode": "12345678",
  "verificationFactors": {
    "email": true,
    "phone": true
  }
}
```

#### Response

```json
{
  "resetId": "reset_1a2b3c4d5e6f",
  "status": "initiated",
  "nextSteps": {
    "verificationRequired": true,
    "verificationMethod": "email",
    "expiresAt": "2025-05-20T14:34:56Z"
  }
}
```

### Mobile Reset

```
POST /api/mobile-reset
```

Initiates a reset procedure specifically for mobile applications.

#### Request Body

```json
{
  "deviceId": "device_1a2b3c4d5e6f",
  "accountId": "acc_1a2b3c4d5e6f",
  "biometricVerification": true
}
```

#### Response

```json
{
  "resetId": "reset_1a2b3c4d5e6f",
  "status": "initiated",
  "tempAccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-05-20T14:34:56Z"
}
```

## Vault Management API

### List Vaults

```
GET /api/vaults
```

Returns a list of vaults associated with the authenticated user.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by vault type (e.g., "time-lock", "quantum-resistant") |
| status | string | Filter by status (e.g., "active", "pending", "locked") |
| page | integer | Page number for pagination |
| limit | integer | Number of items per page (default: 20, max: 100) |

#### Response

```json
{
  "vaults": [
    {
      "id": "v_1a2b3c4d5e6f",
      "name": "My Savings Vault",
      "type": "time-lock",
      "status": "active",
      "createdAt": "2025-04-15T12:34:56Z",
      "lockUntil": "2026-01-01T00:00:00Z",
      "chains": ["ethereum", "ton"],
      "assets": [
        {
          "assetId": "eth_mainnet_native",
          "amount": "1.5",
          "valueUsd": 4500.00
        }
      ]
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

### Get Vault Details

```
GET /api/vaults/:vaultId
```

Returns detailed information about a specific vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Response

```json
{
  "id": "v_1a2b3c4d5e6f",
  "name": "My Savings Vault",
  "description": "Long-term savings vault",
  "type": "time-lock",
  "status": "active",
  "createdAt": "2025-04-15T12:34:56Z",
  "lockUntil": "2026-01-01T00:00:00Z",
  "chains": ["ethereum", "ton"],
  "features": {
    "quantumResistant": true,
    "crossChainVerification": true,
    "multiSignature": false
  },
  "assets": [
    {
      "assetId": "eth_mainnet_native",
      "type": "native",
      "chain": "ethereum",
      "symbol": "ETH",
      "amount": "1.5",
      "valueUsd": 4500.00
    }
  ],
  "security": {
    "verificationLevel": "advanced",
    "requireMultiSignature": false,
    "timeDelay": 86400
  },
  "accessControl": {
    "owner": "0x1234567890abcdef1234567890abcdef12345678",
    "authorized": []
  }
}
```

### Create Vault

```
POST /api/vaults
```

Creates a new vault.

#### Request Body

```json
{
  "name": "My Savings Vault",
  "description": "Long-term savings vault",
  "type": "time-lock",
  "lockUntil": "2026-01-01T00:00:00Z",
  "chains": ["ethereum", "ton"],
  "features": {
    "quantumResistant": true,
    "crossChainVerification": true,
    "multiSignature": false
  },
  "security": {
    "verificationLevel": "advanced",
    "requireMultiSignature": false,
    "timeDelay": 86400
  }
}
```

#### Response

```json
{
  "id": "v_1a2b3c4d5e6f",
  "status": "created",
  "depositAddresses": {
    "ethereum": "0xabcdef1234567890abcdef1234567890abcdef12",
    "ton": "UQAkIXbCToQ6LowMrDNG2K3ERmMH8m4XB2owWgL0BAB14Jtl"
  },
  "createdAt": "2025-05-20T12:34:56Z"
}
```

### Update Vault

```
PATCH /api/vaults/:vaultId
```

Updates an existing vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Request Body

```json
{
  "name": "Updated Vault Name",
  "description": "Updated description",
  "security": {
    "verificationLevel": "maximum"
  }
}
```

#### Response

```json
{
  "id": "v_1a2b3c4d5e6f",
  "status": "updated",
  "updatedAt": "2025-05-20T13:45:12Z"
}
```

### Deposit Assets

```
POST /api/vaults/:vaultId/deposit
```

Initiates a deposit to a vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Request Body

```json
{
  "chain": "ethereum",
  "assetType": "native",
  "amount": "0.5"
}
```

#### Response

```json
{
  "depositId": "d_7h8j9k0l1m2n",
  "status": "pending",
  "depositAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
  "expiresAt": "2025-05-20T14:34:56Z"
}
```

### Withdraw Assets

```
POST /api/vaults/:vaultId/withdraw
```

Initiates a withdrawal from a vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Request Body

```json
{
  "chain": "ethereum",
  "assetType": "native",
  "amount": "0.5",
  "destinationAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

#### Response

```json
{
  "withdrawalId": "w_7h8j9k0l1m2n",
  "status": "pending",
  "estimatedCompletionTime": "2025-05-21T12:34:56Z"
}
```

### Get Vault Types

```
GET /api/vault-types
```

Returns a list of all available vault types with their features.

#### Response

```json
{
  "vaultTypes": [
    {
      "id": "time-lock",
      "name": "Time Lock Vault",
      "description": "Secure assets with time-based unlocking conditions",
      "features": ["quantumResistant", "crossChainVerification"],
      "securityLevel": "high"
    },
    {
      "id": "quantum-resistant",
      "name": "Quantum-Resistant Vault",
      "description": "Future-proof security against quantum computing threats",
      "features": ["quantumResistant", "advancedEncryption", "crossChainVerification"],
      "securityLevel": "maximum"
    },
    {
      "id": "multi-signature",
      "name": "Multi-Signature Vault",
      "description": "Enhanced security requiring multiple approvals",
      "features": ["multiSignature", "quantumResistant", "delayedWithdrawal"],
      "securityLevel": "very-high"
    }
  ]
}
```

## Security and Verification API

### Vault Verification

```
GET /api/vault-verification/:vaultId
```

Verifies the security and integrity of a vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Response

```json
{
  "vaultId": "v_1a2b3c4d5e6f",
  "verificationStatus": "verified",
  "crossChainVerification": {
    "ethereum": {
      "status": "verified",
      "blockNumber": 12345678,
      "transactionHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    },
    "ton": {
      "status": "verified",
      "blockNumber": 87654321,
      "transactionHash": "97a5bbd8581347aaa99e2d3af5301102c4048cca571a55311fe2ffeb6beeec88"
    }
  },
  "integrityCheck": {
    "status": "passed",
    "lastVerified": "2025-05-20T12:00:00Z"
  },
  "quantumResistanceLevel": "high"
}
```

### Verification History

```
GET /api/vault-verification/:vaultId/history
```

Retrieves the verification history for a vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |
| limit | integer | Number of history records to return (default: 10) |

#### Response

```json
{
  "vaultId": "v_1a2b3c4d5e6f",
  "history": [
    {
      "timestamp": "2025-05-20T12:00:00Z",
      "status": "verified",
      "details": {
        "integrityCheck": "passed",
        "quantumResistanceCheck": "passed",
        "crossChainVerification": "passed"
      }
    },
    {
      "timestamp": "2025-05-19T12:00:00Z",
      "status": "verified",
      "details": {
        "integrityCheck": "passed",
        "quantumResistanceCheck": "passed",
        "crossChainVerification": "passed"
      }
    }
  ]
}
```

### Run Security Scan

```
POST /api/vault-verification/:vaultId/scan
```

Initiates a comprehensive security scan for a vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Request Body

```json
{
  "scanTypes": ["integrity", "quantum", "cross-chain"],
  "depth": "comprehensive"
}
```

#### Response

```json
{
  "scanId": "scan_1a2b3c4d5e6f",
  "status": "in_progress",
  "estimatedCompletionTime": "2025-05-20T12:10:00Z"
}
```

### Get Scan Results

```
GET /api/vault-verification/scan/:scanId
```

Retrieves the results of a security scan.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| scanId | string | Unique identifier of the scan |

#### Response

```json
{
  "scanId": "scan_1a2b3c4d5e6f",
  "vaultId": "v_1a2b3c4d5e6f",
  "status": "completed",
  "startedAt": "2025-05-20T12:00:00Z",
  "completedAt": "2025-05-20T12:08:34Z",
  "results": {
    "overallStatus": "passed",
    "integrityCheck": {
      "status": "passed",
      "details": "All integrity checks passed with 100% verification"
    },
    "quantumCheck": {
      "status": "passed",
      "resistanceLevel": "high",
      "vulnerabilities": []
    },
    "crossChainCheck": {
      "status": "passed",
      "networks": {
        "ethereum": "verified",
        "ton": "verified"
      }
    }
  }
}
```

### Progressive Quantum Vault Configuration

```
POST /api/security/progressive-quantum/:vaultId
```

Configures progressive quantum security settings for a vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Request Body

```json
{
  "algorithms": ["lattice-based", "multivariate", "hash-based"],
  "keySize": "maximum",
  "adaptiveMode": true
}
```

#### Response

```json
{
  "vaultId": "v_1a2b3c4d5e6f",
  "status": "configured",
  "quantumResistanceLevel": "maximum",
  "estimatedProtectionYears": 50
}
```

### Get Quantum Security Status

```
GET /api/security/progressive-quantum/:vaultId
```

Retrieves the current quantum security configuration for a vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Response

```json
{
  "vaultId": "v_1a2b3c4d5e6f",
  "quantumResistanceLevel": "maximum",
  "algorithms": ["lattice-based", "multivariate", "hash-based"],
  "keySize": "maximum",
  "adaptiveMode": true,
  "lastUpdated": "2025-05-20T12:00:00Z",
  "estimatedProtectionYears": 50,
  "quantumThreatAssessment": "minimal"
}
```

## Intent-Based Inheritance API

### Configure Inheritance

```
POST /api/intent-inheritance/:vaultId
```

Configures intent-based inheritance for a vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Request Body

```json
{
  "beneficiaries": [
    {
      "address": "0x9876543210abcdef9876543210abcdef98765432",
      "email": "beneficiary@example.com",
      "allocation": 100,
      "unlockConditions": {
        "timeBasedTrigger": {
          "inactivityPeriod": 31536000
        }
      }
    }
  ],
  "verificationRequirements": {
    "requireLegalDocumentation": true,
    "identityVerificationLevel": "advanced"
  }
}
```

#### Response

```json
{
  "vaultId": "v_1a2b3c4d5e6f",
  "status": "configured",
  "inheritanceId": "i_7h8j9k0l1m2n",
  "activationDate": "2025-05-20T13:00:00Z"
}
```

### Get Inheritance Configuration

```
GET /api/intent-inheritance/:vaultId
```

Retrieves the current inheritance configuration for a vault.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Response

```json
{
  "vaultId": "v_1a2b3c4d5e6f",
  "inheritanceId": "i_7h8j9k0l1m2n",
  "status": "active",
  "activationDate": "2025-05-20T13:00:00Z",
  "lastProofOfLifeDate": "2025-05-19T10:30:45Z",
  "beneficiaries": [
    {
      "address": "0x9876543210abcdef9876543210abcdef98765432",
      "email": "beneficiary@example.com",
      "allocation": 100,
      "unlockConditions": {
        "timeBasedTrigger": {
          "inactivityPeriod": 31536000
        }
      }
    }
  ],
  "verificationRequirements": {
    "requireLegalDocumentation": true,
    "identityVerificationLevel": "advanced"
  }
}
```

### Update Inheritance Configuration

```
PATCH /api/intent-inheritance/:vaultId
```

Updates an existing inheritance configuration.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Request Body

```json
{
  "beneficiaries": [
    {
      "address": "0x9876543210abcdef9876543210abcdef98765432",
      "email": "updated-email@example.com",
      "allocation": 50
    },
    {
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "email": "new-beneficiary@example.com",
      "allocation": 50
    }
  ],
  "verificationRequirements": {
    "identityVerificationLevel": "maximum"
  }
}
```

#### Response

```json
{
  "vaultId": "v_1a2b3c4d5e6f",
  "status": "updated",
  "inheritanceId": "i_7h8j9k0l1m2n",
  "updatedAt": "2025-05-20T14:30:00Z"
}
```

### Provide Proof of Life

```
POST /api/intent-inheritance/:vaultId/proof-of-life
```

Records a proof of life event to reset the inactivity timer.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| vaultId | string | Unique identifier of the vault |

#### Request Body

```json
{
  "verificationMethod": "signature"
}
```

#### Response

```json
{
  "vaultId": "v_1a2b3c4d5e6f",
  "inheritanceId": "i_7h8j9k0l1m2n",
  "proofOfLifeRecorded": true,
  "timestamp": "2025-05-20T14:30:00Z",
  "nextRequiredProofDate": "2025-08-20T14:30:00Z"
}
```

## WebSocket API

In addition to REST endpoints, Chronos Vault offers real-time updates via WebSockets.

### Connection

```
wss://api.chronosvault.org/api/ws
```

Authentication is required via:

```
?token=YOUR_API_KEY
```

### Events

#### Transaction Updates

```json
{
  "type": "TRANSACTION_CONFIRMED",
  "data": {
    "transactionId": "tx_7h8j9k0l1m2n",
    "vaultId": "v_1a2b3c4d5e6f",
    "chainId": "ethereum",
    "status": "confirmed",
    "blockNumber": 12345678,
    "timestamp": "2025-05-20T13:00:00Z"
  }
}
```

#### Security Alerts

```json
{
  "type": "SECURITY_ALERT",
  "data": {
    "alertId": "alert_7h8j9k0l1m2n",
    "vaultId": "v_1a2b3c4d5e6f",
    "severity": "high",
    "type": "UNUSUAL_ACTIVITY",
    "description": "Multiple failed authentication attempts detected",
    "timestamp": "2025-05-20T13:00:00Z",
    "recommendations": [
      "Review recent activity",
      "Consider enabling multi-signature"
    ]
  }
}
```

#### Vault Status Updates

```json
{
  "type": "VAULT_STATUS_CHANGED",
  "data": {
    "vaultId": "v_1a2b3c4d5e6f",
    "previousStatus": "pending",
    "newStatus": "active",
    "timestamp": "2025-05-20T13:00:00Z"
  }
}
```

#### Inheritance Events

```json
{
  "type": "INHERITANCE_TRIGGERED",
  "data": {
    "vaultId": "v_1a2b3c4d5e6f",
    "inheritanceId": "i_7h8j9k0l1m2n",
    "triggerReason": "inactivity_threshold_exceeded",
    "timestamp": "2025-05-20T13:00:00Z",
    "nextSteps": {
      "verificationRequired": true,
      "waitingPeriod": 604800 // 1 week in seconds
    }
  }
}
```

## Blockchain-Specific Endpoints

### Ethereum Integration

```
GET /api/blockchain/ethereum/gas-price
```

Returns current gas prices for Ethereum transactions.

#### Response

```json
{
  "slow": {
    "gwei": 20,
    "estimatedSeconds": 120
  },
  "standard": {
    "gwei": 30,
    "estimatedSeconds": 30
  },
  "fast": {
    "gwei": 40,
    "estimatedSeconds": 15
  },
  "timestamp": "2025-05-20T13:00:00Z"
}
```

### TON Integration

```
GET /api/blockchain/ton/account/:address
```

Returns TON account information.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| address | string | TON wallet address |

#### Response

```json
{
  "address": "UQAkIXbCToQ6LowMrDNG2K3ERmMH8m4XB2owWgL0BAB14Jtl",
  "balance": "10.5",
  "status": "active",
  "lastTransaction": {
    "hash": "97a5bbd8581347aaa99e2d3af5301102c4048cca571a55311fe2ffeb6beeec88",
    "timestamp": "2025-05-20T12:34:56Z"
  }
}
```

### Solana Integration

```
GET /api/blockchain/solana/account/:address
```

Returns Solana account information.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| address | string | Solana wallet address |

#### Response

```json
{
  "address": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  "balance": "25.75",
  "status": "active",
  "lastTransaction": {
    "signature": "5UfgccJLrTWrUJcRXQZveqUZKfF15XaJLBAXrHxZJnzJ2r9Jgx6GphU35XGQTKZvSuLjbyxoZ1dyKXV2xSx4V3pJ",
    "slot": 123456789,
    "timestamp": "2025-05-20T12:34:56Z"
  }
}
```

### Bitcoin Integration

```
GET /api/blockchain/bitcoin/account/:address
```

Returns Bitcoin account information.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| address | string | Bitcoin address |

#### Response

```json
{
  "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "balance": "0.25",
  "totalReceived": "1.5",
  "totalSent": "1.25",
  "unconfirmedBalance": "0",
  "lastTransaction": {
    "txid": "9f3c60e887a9ca8cff8a701aadad0c2874f8ac7a1fcb6b55149337010fa31b4b",
    "confirmations": 3,
    "timestamp": "2025-05-20T12:34:56Z"
  }
}
```

### Cross-Chain Transfers

```
POST /api/blockchain/cross-chain/transfer
```

Initiates a cross-chain transfer between supported blockchains.

#### Request Body

```json
{
  "sourceChain": "ethereum",
  "destinationChain": "solana",
  "sourceAsset": "ETH",
  "destinationAsset": "SOL",
  "amount": "0.5",
  "destinationAddress": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  "securityLevel": "maximum"
}
```

#### Response

```json
{
  "transferId": "transfer_1a2b3c4d5e6f",
  "status": "initiated",
  "sourceTransaction": {
    "chain": "ethereum",
    "hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "status": "pending"
  },
  "estimatedCompletionTime": "2025-05-20T13:30:00Z",
  "fee": {
    "amount": "0.005",
    "asset": "ETH"
  }
}
```

## Payments API

### Get Payment Methods

```
GET /api/payments/methods
```

Returns available payment methods for the authenticated user.

#### Response

```json
{
  "methods": [
    {
      "id": "pm_1a2b3c4d5e6f",
      "type": "card",
      "brand": "visa",
      "last4": "4242",
      "expiryMonth": 12,
      "expiryYear": 2025,
      "isDefault": true
    },
    {
      "id": "pm_2b3c4d5e6f7g",
      "type": "blockchain",
      "chain": "ethereum",
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "isDefault": false
    }
  ]
}
```

### Create Payment Intent

```
POST /api/payments/intents
```

Creates a payment intent for service fees or premium features.

#### Request Body

```json
{
  "amount": 19.99,
  "currency": "USD",
  "description": "Premium Vault Subscription - 1 Month",
  "paymentMethodId": "pm_1a2b3c4d5e6f"
}
```

#### Response

```json
{
  "intentId": "pi_1a2b3c4d5e6f",
  "status": "requires_confirmation",
  "amount": 19.99,
  "currency": "USD",
  "description": "Premium Vault Subscription - 1 Month",
  "clientSecret": "pi_1a2b3c4d5e6f_secret_7h8j9k0l1m2n"
}
```

### Confirm Payment Intent

```
POST /api/payments/intents/:intentId/confirm
```

Confirms a payment intent.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| intentId | string | ID of the payment intent to confirm |

#### Response

```json
{
  "intentId": "pi_1a2b3c4d5e6f",
  "status": "succeeded",
  "amount": 19.99,
  "currency": "USD",
  "description": "Premium Vault Subscription - 1 Month",
  "receipt": {
    "url": "https://receipts.chronosvault.org/r/1a2b3c4d5e6f",
    "number": "CVR-12345"
  }
}
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested vault does not exist",
    "requestId": "req_7h8j9k0l1m2n",
    "timestamp": "2025-05-20T13:00:00Z"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| AUTHENTICATION_REQUIRED | Authentication is required |
| INVALID_CREDENTIALS | Invalid authentication credentials |
| RESOURCE_NOT_FOUND | Requested resource not found |
| PERMISSION_DENIED | Insufficient permissions |
| VALIDATION_ERROR | Invalid request parameters |
| RATE_LIMIT_EXCEEDED | API rate limit exceeded |
| INTERNAL_SERVER_ERROR | Internal server error |
| BLOCKCHAIN_ERROR | Error interacting with blockchain |
| QUANTUM_SECURITY_ERROR | Error with quantum security features |
| VAULT_LOCKED | Vault is currently locked |
| INHERITANCE_ERROR | Error with inheritance configuration |

## Rate Limiting

API requests are limited to 120 requests per minute per authenticated user.

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: 1716152182
```

## Webhook Notifications

Chronos Vault can send webhook notifications for various events:

### Configuration

```
POST /api/webhooks
```

#### Request Body

```json
{
  "url": "https://your-server.com/webhook",
  "events": [
    "vault.created",
    "vault.updated",
    "transaction.confirmed",
    "security.alert"
  ],
  "secret": "your_webhook_secret"
}
```

#### Response

```json
{
  "webhookId": "wh_7h8j9k0l1m2n",
  "status": "active",
  "createdAt": "2025-05-20T13:00:00Z"
}
```

### List Webhooks

```
GET /api/webhooks
```

Returns a list of configured webhooks.

#### Response

```json
{
  "webhooks": [
    {
      "webhookId": "wh_7h8j9k0l1m2n",
      "url": "https://your-server.com/webhook",
      "events": [
        "vault.created",
        "vault.updated",
        "transaction.confirmed",
        "security.alert"
      ],
      "status": "active",
      "createdAt": "2025-05-20T13:00:00Z"
    }
  ]
}
```

### Delete Webhook

```
DELETE /api/webhooks/:webhookId
```

Deletes a webhook configuration.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| webhookId | string | ID of the webhook to delete |

#### Response

```json
{
  "success": true,
  "message": "Webhook deleted successfully"
}
```

## API Versioning

The current API version is v1.

API versioning is maintained through the URL path:

```
https://api.chronosvault.org/api/v1/...
```

## Support

For API support, please contact us at api-support@chronosvault.org.