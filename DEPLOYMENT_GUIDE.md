# Trinity Protocol - Replit Deployment Guide

## ✅ Current Setup

Your Trinity Protocol is now configured to run on Replit with the Trinity Relayer integrated into your main application!

## How It Works

The Trinity Relayer (cross-chain proof propagation service) is built into your Express server. It automatically starts when you enable it with environment variables.

## Deployment Steps

### Step 1: Set Environment Variables

In your Replit project, you need to add these secrets (they're already configured in your environment):

**Required Secrets:**
```bash
PRIVATE_KEY=your_ethereum_private_key
USER_WALLET_PRIVATE_KEY=your_solana_private_key_base64
ENABLE_TRINITY_RELAYER=true
```

**Optional Configuration:**
```bash
VAULT_CONTRACT_ADDRESS=your_deployed_vault_address
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
SOLANA_RPC_URL=https://api.devnet.solana.com
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC
```

### Step 2: How to Add Secrets on Replit

1. Click the **"Secrets"** icon (🔐) in the left sidebar
2. Click **"Add Secret"**
3. For each required secret:
   - **Key**: `ENABLE_TRINITY_RELAYER`
   - **Value**: `true`
   - Click **"Add Secret"**

4. Repeat for:
   - `PRIVATE_KEY` (your Ethereum private key)
   - `USER_WALLET_PRIVATE_KEY` (your Solana private key in base64 format)

### Step 3: Deploy Your Application

On Replit, you have access to **autoscale deployments**. Here's how to publish:

1. Click the **"Publish"** button in the top-right
2. Choose **"Autoscale"** deployment
3. Configure:
   - **Machine Power**: 1 vCPU, 2 GiB RAM (recommended)
   - **Max Machines**: 1-3 (start with 1 for testing)
   - **Build Command**: Leave default or use `npm run build`
   - **Run Command**: `npm run dev`
4. Add the same secrets in the **"Published App Secrets"** section
5. Click **"Deploy"**

## Understanding the Trinity Relayer

### What It Does

The Trinity Relayer is a background service that:
- Monitors Ethereum/Arbitrum for vault operations
- Monitors Solana for vault operations  
- Monitors TON for vault operations
- Automatically propagates proofs between all 3 chains
- Enforces 2-of-3 consensus for withdrawals

### When It Runs

The relayer only runs when `ENABLE_TRINITY_RELAYER=true` is set. This lets you:
- **Development**: Run with relayer disabled for faster testing
- **Production**: Enable relayer for full cross-chain security

### Monitoring

Once deployed, check your logs to see:

```
✅ Trinity Relayer Service started
   - Monitoring Ethereum/Arbitrum, Solana, and TON
   - Cross-chain proof propagation active
```

Or if disabled:
```
ℹ️  Trinity Relayer disabled (set ENABLE_TRINITY_RELAYER=true to enable)
```

## Important: Deployment Types

### ❌ Autoscale NOT Ideal for Relayer

Replit's **Autoscale** deployments scale to zero when idle. The Trinity Relayer needs to run continuously to monitor blockchains 24/7.

**For Development/Testing:** Autoscale is fine - you can manually trigger operations
**For Production:** You'll need a different solution

### ✅ Production Options

For 24/7 operation, you have two paths:

**Option 1: Run Relayer Separately**
Deploy the main web app on Replit Autoscale, and run the Trinity Relayer on:
- AWS EC2 (t3.micro ~$8/month)
- DigitalOcean Droplet (~$6/month)
- Google Cloud Compute (~$7/month)

**Option 2: Replit Reserved VM** (Coming Soon)
Replit offers Reserved VM deployments for always-on services. This would keep both your web app and relayer running 24/7.

## Testing Your Setup

### 1. Check if Relayer is Running

Watch your console logs when starting the app. You should see:

```
✅ Trinity Protocol State Coordinator started
✅ Trinity Relayer Service started
   - Monitoring Ethereum/Arbitrum, Solana, and TON
   - Cross-chain proof propagation active
```

### 2. Test a Vault Operation

1. Create a vault through the web interface
2. Make a deposit
3. Check logs - you should see proof generation:
```
🔷 [ETHEREUM] New proof detected: 0xabc123...
   Operation Type: 2 (Deposit)
   Amount: 10.5 ETH
   ➡️  Submitting to Solana...
   ✅ Submitted to Solana
   ➡️  Submitting to TON...
   ✅ Submitted to TON
```

### 3. Verify 2-of-3 Consensus

Withdrawal operations will be blocked until 2 out of 3 chains verify:
- Ethereum verifies Solana + TON proofs
- Solana verifies Ethereum + TON proofs
- TON verifies Ethereum + Solana proofs

## Troubleshooting

### "Trinity Relayer could not start"

**Cause**: Missing private keys
**Fix**: Add `PRIVATE_KEY` and `USER_WALLET_PRIVATE_KEY` to secrets

### "RPC connection failed"

**Cause**: RPC endpoint not accessible
**Fix**: Check `ARBITRUM_RPC_URL`, `SOLANA_RPC_URL`, `TON_RPC_URL` are correct

### "Proof submission failed"

**Cause**: Insufficient gas or wallet not funded
**Fix**: Ensure wallets have test tokens (Sepolia ETH, Devnet SOL, TON testnet)

## Cost Estimate

### Replit Autoscale (Dev/Testing)
- **Free tier**: Perfect for testing
- **Paid tier**: ~$20/month for reliable uptime

### Production (with separate relayer)
- **Replit Autoscale**: ~$20/month (web app)
- **AWS EC2**: ~$8/month (relayer service)
- **Total**: ~$28/month for 24/7 Trinity Protocol

## Security Best Practices

1. **Never commit private keys** - Use Replit Secrets only
2. **Use testnet first** - Test on Arbitrum Sepolia, Solana Devnet, TON Testnet
3. **Monitor gas costs** - Set alerts for unusual spending
4. **Backup keys** - Store mnemonics securely offline
5. **Use hardware wallets** - For production, integrate Ledger/Trezor

## Next Steps

1. ✅ Set `ENABLE_TRINITY_RELAYER=true` in Secrets
2. ✅ Add your private keys to Secrets
3. ✅ Click "Publish" to deploy on autoscale
4. ✅ Test vault creation and deposits
5. ✅ Monitor logs for proof propagation
6. 🎯 For 24/7 production, deploy relayer on AWS EC2

## Need Help?

Check the detailed documentation:
- `validators/README_TRINITY_RELAYER.md` - Technical relayer guide
- `contracts/CROSS_CHAIN_PROOF_SPEC.md` - Proof specification
- `replit.md` - Full system architecture

---

Your Trinity Protocol is ready for deployment! 🚀
