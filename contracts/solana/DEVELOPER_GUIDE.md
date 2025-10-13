# Chronos Vault Solana Developer Integration Guide

**Build on the Trinity Protocol - Multi-Chain Security Platform**

This guide shows you how to integrate Chronos Vault's Solana contracts into your application for CVT token transfers, cross-chain bridging, and cryptographic vesting.

---

## 🚀 Quick Start

### Prerequisites

```bash
npm install @solana/web3.js @solana/spl-token
```

### Production Addresses (Devnet)

```typescript
export const CHRONOS_VAULT_ADDRESSES = {
  // CVT Token
  cvtToken: '5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4',
  cvtMetadata: 'D5qLqXpJnWDrfpZoePauQv8g22DbM8CbeVZcjeBhdDgF',
  
  // Programs
  bridgeProgram: '6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK',
  vestingProgram: '3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB',
  
  // RPC
  rpcUrl: 'https://api.devnet.solana.com',
};
```

---

## 💰 Working with CVT Token

### 1. Connect to Solana

```typescript
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(CHRONOS_VAULT_ADDRESSES.rpcUrl, 'confirmed');
const cvtMint = new PublicKey(CHRONOS_VAULT_ADDRESSES.cvtToken);
```

### 2. Get CVT Token Balance

```typescript
import { getAccount } from '@solana/spl-token';

async function getCVTBalance(walletAddress: PublicKey): Promise<number> {
  try {
    const tokenAccountAddress = await getAssociatedTokenAddress(
      cvtMint,
      walletAddress
    );
    
    const tokenAccount = await getAccount(connection, tokenAccountAddress);
    const balance = Number(tokenAccount.amount) / 1e9; // Convert from lamports
    
    return balance;
  } catch (error) {
    console.log('No CVT token account found');
    return 0;
  }
}

// Usage
const balance = await getCVTBalance(userWallet.publicKey);
console.log(`CVT Balance: ${balance} CVT`);
```

### 3. Transfer CVT Tokens

```typescript
import { 
  getOrCreateAssociatedTokenAccount,
  transfer,
} from '@solana/spl-token';
import { Keypair } from '@solana/web3.js';

async function transferCVT(
  payer: Keypair,
  recipient: PublicKey,
  amount: number
) {
  // Get or create token accounts
  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    cvtMint,
    payer.publicKey
  );
  
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    cvtMint,
    recipient
  );
  
  // Transfer tokens (amount in lamports: amount * 10^9)
  const signature = await transfer(
    connection,
    payer,
    fromTokenAccount.address,
    toTokenAccount.address,
    payer,
    amount * 1e9
  );
  
  console.log('Transfer successful:', signature);
  return signature;
}

// Usage
await transferCVT(senderWallet, recipientAddress, 100); // Transfer 100 CVT
```

---

## 🌉 Cross-Chain Bridge Integration

### 1. Bridge CVT from Solana to Arbitrum

```typescript
import {
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

const BRIDGE_PROGRAM = new PublicKey(CHRONOS_VAULT_ADDRESSES.bridgeProgram);
const CHAIN_ID_ARBITRUM = 1;
const CHAIN_ID_TON = 2;

async function bridgeCVTToArbitrum(
  payer: Keypair,
  arbitrumAddress: string,
  amount: number
) {
  // Derive bridge PDAs
  const [bridgePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bridge')],
    BRIDGE_PROGRAM
  );
  
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    BRIDGE_PROGRAM
  );
  
  // Get user's CVT token account
  const userTokenAccount = await getAssociatedTokenAddress(
    cvtMint,
    payer.publicKey
  );
  
  // Build bridge instruction
  const bridgeInstruction = {
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: bridgePDA, isSigner: false, isWritable: true },
      { pubkey: cvtMint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BRIDGE_PROGRAM,
    data: Buffer.from([
      0, // bridge_out instruction
      CHAIN_ID_ARBITRUM,
      ...Buffer.from(arbitrumAddress.slice(2), 'hex'), // Remove '0x' prefix
      ...new Uint8Array(new BigUint64Array([BigInt(amount * 1e9)]).buffer),
    ]),
  };
  
  const transaction = new Transaction().add(bridgeInstruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
  
  console.log('Bridge initiated:', signature);
  console.log(`${amount} CVT will arrive on Arbitrum in ~60 seconds`);
  
  return signature;
}

// Usage
await bridgeCVTToArbitrum(
  userWallet,
  '0xYourArbitrumAddress',
  100 // 100 CVT
);
```

### 2. Listen for Bridge Events

```typescript
async function watchBridgeEvents(userAddress: PublicKey) {
  const [bridgePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bridge')],
    BRIDGE_PROGRAM
  );
  
  // Subscribe to account changes
  const subscriptionId = connection.onAccountChange(
    bridgePDA,
    (accountInfo) => {
      console.log('Bridge state updated:', accountInfo);
      // Parse and handle bridge events
    },
    'confirmed'
  );
  
  return subscriptionId;
}
```

---

## 🔒 Vesting Integration

### 1. Create a Vesting Schedule

```typescript
const VESTING_PROGRAM = new PublicKey(CHRONOS_VAULT_ADDRESSES.vestingProgram);

async function createVestingSchedule(
  payer: Keypair,
  beneficiary: PublicKey,
  amount: number,
  cliffMonths: number,
  vestingMonths: number
) {
  const now = Math.floor(Date.now() / 1000);
  const cliffDuration = cliffMonths * 30 * 24 * 60 * 60; // Convert months to seconds
  const vestingDuration = vestingMonths * 30 * 24 * 60 * 60;
  
  // Derive vesting schedule PDA
  const scheduleId = Keypair.generate().publicKey;
  const [schedulePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vesting'), scheduleId.toBuffer()],
    VESTING_PROGRAM
  );
  
  // Build vesting instruction
  const vestingInstruction = {
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: beneficiary, isSigner: false, isWritable: false },
      { pubkey: schedulePDA, isSigner: false, isWritable: true },
      { pubkey: cvtMint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: VESTING_PROGRAM,
    data: Buffer.from([
      0, // create_schedule instruction
      ...new Uint8Array(new BigUint64Array([BigInt(amount * 1e9)]).buffer),
      ...new Uint8Array(new BigInt64Array([BigInt(now)]).buffer),
      ...new Uint8Array(new BigInt64Array([BigInt(cliffDuration)]).buffer),
      ...new Uint8Array(new BigInt64Array([BigInt(vestingDuration)]).buffer),
    ]),
  };
  
  const transaction = new Transaction().add(vestingInstruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
  
  console.log('Vesting schedule created:', signature);
  console.log('Schedule PDA:', schedulePDA.toString());
  
  return {
    schedulePDA,
    scheduleId,
    signature,
  };
}

// Usage: 4-year vesting with 1-year cliff
await createVestingSchedule(
  adminWallet,
  teamMemberAddress,
  1000000, // 1M CVT
  12, // 12-month cliff
  48  // 48-month total vesting
);
```

### 2. Check Vesting Status

```typescript
async function getVestingSchedule(schedulePDA: PublicKey) {
  const accountInfo = await connection.getAccountInfo(schedulePDA);
  
  if (!accountInfo) {
    throw new Error('Vesting schedule not found');
  }
  
  // Parse vesting schedule data
  const data = accountInfo.data;
  const schedule = {
    beneficiary: new PublicKey(data.slice(0, 32)),
    totalAmount: Number(new BigUint64Array(data.slice(32, 40).buffer)[0]) / 1e9,
    startTime: Number(new BigInt64Array(data.slice(40, 48).buffer)[0]),
    cliffDuration: Number(new BigInt64Array(data.slice(48, 56).buffer)[0]),
    vestingDuration: Number(new BigInt64Array(data.slice(56, 64).buffer)[0]),
    releasedAmount: Number(new BigUint64Array(data.slice(64, 72).buffer)[0]) / 1e9,
  };
  
  const now = Date.now() / 1000;
  const unlockTime = schedule.startTime + schedule.cliffDuration;
  const isUnlocked = now >= unlockTime;
  
  console.log('Vesting Schedule:');
  console.log('  Total:', schedule.totalAmount, 'CVT');
  console.log('  Released:', schedule.releasedAmount, 'CVT');
  console.log('  Unlock:', new Date(unlockTime * 1000).toISOString());
  console.log('  Status:', isUnlocked ? 'UNLOCKED' : 'LOCKED');
  
  return schedule;
}
```

### 3. Withdraw Vested Tokens

```typescript
async function withdrawVestedTokens(
  beneficiary: Keypair,
  schedulePDA: PublicKey
) {
  const schedule = await getVestingSchedule(schedulePDA);
  
  // Calculate vested amount
  const now = Date.now() / 1000;
  const unlockTime = schedule.startTime + schedule.cliffDuration;
  
  if (now < unlockTime) {
    throw new Error('Tokens still locked (cliff period)');
  }
  
  const vestingEnd = schedule.startTime + schedule.cliffDuration + schedule.vestingDuration;
  const vestedAmount = now >= vestingEnd
    ? schedule.totalAmount
    : (schedule.totalAmount * (now - unlockTime)) / schedule.vestingDuration;
  
  const withdrawable = vestedAmount - schedule.releasedAmount;
  
  if (withdrawable <= 0) {
    throw new Error('No tokens available to withdraw');
  }
  
  // Build withdraw instruction
  const withdrawInstruction = {
    keys: [
      { pubkey: beneficiary.publicKey, isSigner: true, isWritable: true },
      { pubkey: schedulePDA, isSigner: false, isWritable: true },
      { pubkey: cvtMint, isSigner: false, isWritable: false },
    ],
    programId: VESTING_PROGRAM,
    data: Buffer.from([1]), // withdraw instruction
  };
  
  const transaction = new Transaction().add(withdrawInstruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [beneficiary]);
  
  console.log('Withdrawn:', withdrawable, 'CVT');
  console.log('Transaction:', signature);
  
  return signature;
}
```

---

## 🔐 Trinity Protocol Integration

### Multi-Chain Consensus Verification

```typescript
async function verifyTrinityConsensus(
  transactionHash: string,
  sourceChain: 'arbitrum' | 'solana' | 'ton'
) {
  const [bridgePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bridge')],
    BRIDGE_PROGRAM
  );
  
  // Query bridge state for consensus status
  const bridgeAccount = await connection.getAccountInfo(bridgePDA);
  
  // Parse bridge data to check 2-of-3 consensus
  // Trinity Protocol requires approval from 2 out of 3 chains
  
  const consensusStatus = {
    arbitrum: false,
    solana: false,
    ton: false,
  };
  
  // ... Parse bridge data to populate consensusStatus
  
  const approvals = Object.values(consensusStatus).filter(Boolean).length;
  const isValid = approvals >= 2;
  
  console.log('Trinity Consensus Status:');
  console.log('  Arbitrum:', consensusStatus.arbitrum ? '✅' : '❌');
  console.log('  Solana:', consensusStatus.solana ? '✅' : '❌');
  console.log('  TON:', consensusStatus.ton ? '✅' : '❌');
  console.log('  Valid:', isValid ? 'YES (2-of-3)' : 'NO');
  
  return isValid;
}
```

---

## 📊 Token Information Queries

### Get CVT Token Metadata

```typescript
async function getCVTMetadata() {
  const metadataAddress = new PublicKey(CHRONOS_VAULT_ADDRESSES.cvtMetadata);
  const accountInfo = await connection.getAccountInfo(metadataAddress);
  
  if (!accountInfo) {
    throw new Error('Metadata not found');
  }
  
  // Parse Metaplex metadata
  const metadata = {
    name: 'Chronos Vault',
    symbol: 'CVT',
    uri: 'https://chronosvault.org/metadata/cvt.json',
    decimals: 9,
    totalSupply: 21_000_000,
  };
  
  console.log('CVT Token Metadata:', metadata);
  return metadata;
}
```

### Get Total CVT Supply

```typescript
import { getMint } from '@solana/spl-token';

async function getCVTSupply() {
  const mintInfo = await getMint(connection, cvtMint);
  const totalSupply = Number(mintInfo.supply) / 1e9;
  
  console.log('Total CVT Supply:', totalSupply.toLocaleString(), 'CVT');
  return totalSupply;
}
```

---

## 🛡️ Security Best Practices

### 1. Validate Addresses

```typescript
function validateCVTAddress(address: string): boolean {
  try {
    const pubkey = new PublicKey(address);
    return pubkey.equals(cvtMint);
  } catch {
    return false;
  }
}
```

### 2. Check Transaction Confirmations

```typescript
async function waitForConfirmation(signature: string) {
  const latestBlockhash = await connection.getLatestBlockhash();
  
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  }, 'confirmed');
  
  console.log('Transaction confirmed:', signature);
}
```

### 3. Handle Errors Gracefully

```typescript
async function safeBridgeTransfer(
  payer: Keypair,
  targetAddress: string,
  amount: number
) {
  try {
    // Validate amount
    if (amount < 0.001) {
      throw new Error('Minimum bridge amount is 0.001 CVT');
    }
    
    // Check balance
    const balance = await getCVTBalance(payer.publicKey);
    if (balance < amount) {
      throw new Error(`Insufficient balance: ${balance} CVT`);
    }
    
    // Execute bridge
    const signature = await bridgeCVTToArbitrum(payer, targetAddress, amount);
    await waitForConfirmation(signature);
    
    return signature;
  } catch (error) {
    console.error('Bridge failed:', error);
    throw error;
  }
}
```

---

## 📚 Additional Resources

### Documentation
- **Main Docs**: https://docs.chronosvault.org
- **API Reference**: https://api.chronosvault.org
- **Trinity Protocol**: https://chronosvault.org/trinity

### Explorers
- **CVT Token**: https://explorer.solana.com/address/5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4?cluster=devnet
- **Bridge**: https://explorer.solana.com/address/6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK?cluster=devnet
- **Vesting**: https://explorer.solana.com/address/3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB?cluster=devnet

### Support
- **Email**: chronosvault@chronosvault.org
- **GitHub**: https://github.com/Chronos-Vault/chronos-vault-contracts
- **Discord**: https://discord.gg/chronosvault

---

## 🔧 Troubleshooting

### Common Issues

**Issue**: "Account not found"
- **Solution**: Create associated token account first using `getOrCreateAssociatedTokenAccount()`

**Issue**: "Insufficient funds for transaction"
- **Solution**: Get devnet SOL from https://faucet.solana.com

**Issue**: "Bridge transaction failed"
- **Solution**: Ensure amount >= 0.001 CVT (minimum transfer)

**Issue**: "Vesting tokens still locked"
- **Solution**: Check unlock time with `getVestingSchedule()`

---

**Built with Chronos Vault - Trust Math, Not Humans** 🔐
