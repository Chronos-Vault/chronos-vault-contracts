/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHRONOS VAULT (CVT) TOKEN - PRODUCTION DEPLOYMENT SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Deploys Chronos Vault native token (CVT) on Solana with Metaplex metadata.
 * This is the production-ready deployment script used for the live CVT token.
 * 
 * Production Deployment (Devnet):
 * - Token Mint:       5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4
 * - Metadata PDA:     D5qLqXpJnWDrfpZoePauQv8g22DbM8CbeVZcjeBhdDgF
 * - Bridge Program:   6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK
 * - Vesting Program:  3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB
 * 
 * Features:
 * - 21 million total supply with 9 decimals
 * - Metaplex metadata for wallet/DEX compatibility
 * - Integrated with Chronos Vault Bridge & Vesting programs
 * - Production-ready token economics (70% vesting, 20% DEX, 10% dev)
 * 
 * @see https://chronosvault.org
 * @contact chronosvault@chronosvault.org
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';
import fetch from 'node-fetch';

// ═══════════════════════════════════════════════════════════════════════════
// CHRONOS VAULT TOKEN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const TOKEN_CONFIG = {
  name: 'Chronos Vault',
  symbol: 'CVT',
  decimals: 9,
  totalSupply: 21_000_000, // 21 million CVT
  uri: 'https://chronosvault.org/metadata/cvt.json',
  description: 'Native token of Chronos Vault - Trinity Protocol multi-chain security platform',
};

// Production Deployed Addresses (Devnet)
const PRODUCTION_ADDRESSES = {
  cvtToken: '5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4',
  cvtMetadata: 'D5qLqXpJnWDrfpZoePauQv8g22DbM8CbeVZcjeBhdDgF',
  bridgeProgram: '6wo8Gso3uB8M6t9UGiritdGmc4UTPEtM5NhC6vbb9CdK',
  vestingProgram: '3dxjcEGP8MurCtodLCJi1V6JBizdRRAYg91nZkhmX1sB',
  explorerUrl: 'https://explorer.solana.com/address/5g3TkqFxyVe1ismrC5r2QD345CA1YdfWn6s6p4AYNmy4?cluster=devnet'
};

// Token Economics (21M Total)
const TOKENOMICS = {
  vesting: {
    amount: 14_700_000, // 70%
    description: 'Locked in cryptographic vesting contracts for 4-21 years'
  },
  dex: {
    amount: 4_200_000, // 20%
    description: 'DEX liquidity pools (Jupiter, Raydium, Orca)'
  },
  development: {
    amount: 2_100_000, // 10%
    description: 'Platform development and operations'
  }
};

const SOLANA_RPC = 'https://api.devnet.solana.com';

// ═══════════════════════════════════════════════════════════════════════════
// DEVNET SOL AIRDROP (Multi-Faucet Strategy)
// ═══════════════════════════════════════════════════════════════════════════

async function getDevnetSol(connection: Connection, publicKey: PublicKey): Promise<boolean> {
  console.log('💰 Getting devnet SOL...\n');

  // Try QuickNode faucet
  try {
    console.log('📡 Trying QuickNode faucet...');
    const response = await fetch(`https://faucet.quicknode.com/solana/devnet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: publicKey.toString() }),
    });
    if (response.ok) {
      console.log('✅ Faucet successful!\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    }
  } catch (e) {
    console.log('⚠️  QuickNode faucet unavailable');
  }

  // Try Solana.com faucet
  try {
    console.log('📡 Trying Solana.com faucet...');
    const response = await fetch('https://faucet.solana.com/api/v1/airdrops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pubkey: publicKey.toString(),
        amount: 2000000000,
      }),
    });
    if (response.ok) {
      console.log('✅ Faucet successful!\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    }
  } catch (e) {
    console.log('⚠️  Solana.com faucet unavailable');
  }

  // Direct RPC airdrop
  for (let i = 0; i < 2; i++) {
    try {
      console.log(`📡 Trying RPC airdrop (attempt ${i + 1}/2)...`);
      const signature = await connection.requestAirdrop(publicKey, 1_000_000_000);
      await connection.confirmTransaction(signature);
      console.log('✅ RPC airdrop successful!\n');
      return true;
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n❌ All airdrop methods failed.');
  console.log('\n📋 MANUAL STEPS:');
  console.log('1. Go to: https://faucet.solana.com');
  console.log(`2. Paste wallet: ${publicKey.toString()}`);
  console.log('3. Request 2 SOL');
  console.log('4. Wait 30 seconds');
  console.log('5. Run this script again\n');
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// CVT TOKEN DEPLOYMENT WITH METAPLEX METADATA
// ═══════════════════════════════════════════════════════════════════════════

async function createCVTTokenWithMetadata(connection: Connection, payer: Keypair) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🪙 CREATING CVT TOKEN WITH METADATA');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📋 Token Configuration:');
  console.log('  Name:         ', TOKEN_CONFIG.name);
  console.log('  Symbol:       ', TOKEN_CONFIG.symbol);
  console.log('  Decimals:     ', TOKEN_CONFIG.decimals);
  console.log('  Total Supply: ', TOKEN_CONFIG.totalSupply.toLocaleString(), 'CVT');
  console.log('  URI:          ', TOKEN_CONFIG.uri);
  console.log();

  // Step 1: Create the mint
  console.log('🔨 Creating token mint...');
  const cvtMint = await createMint(
    connection,
    payer,
    payer.publicKey, // Mint authority
    payer.publicKey, // Freeze authority
    TOKEN_CONFIG.decimals,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );

  console.log('✅ Token Mint:', cvtMint.toString());
  console.log();

  // Step 2: Find metadata PDA
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      cvtMint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  console.log('📝 Creating token metadata...');
  
  // Step 3: Create metadata account
  const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPDA,
      mint: cvtMint,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
      updateAuthority: payer.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          name: TOKEN_CONFIG.name,
          symbol: TOKEN_CONFIG.symbol,
          uri: TOKEN_CONFIG.uri,
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null,
        },
        isMutable: true,
        collectionDetails: null,
      },
    }
  );

  const transaction = new Transaction().add(createMetadataInstruction);
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer],
    { commitment: 'confirmed' }
  );

  console.log('✅ Metadata created!');
  console.log('📝 Metadata PDA:', metadataPDA.toString());
  console.log('📝 Transaction:', signature);
  console.log();

  // Step 4: Create token account and mint supply
  console.log('📦 Creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    cvtMint,
    payer.publicKey
  );

  console.log('✅ Token Account:', tokenAccount.address.toString());
  console.log();

  // Step 5: Mint total supply
  console.log(`🏭 Minting ${TOKEN_CONFIG.totalSupply.toLocaleString()} CVT...`);
  const mintAmount = TOKEN_CONFIG.totalSupply * Math.pow(10, TOKEN_CONFIG.decimals);
  
  await mintTo(
    connection,
    payer,
    cvtMint,
    tokenAccount.address,
    payer,
    mintAmount
  );

  console.log(`✅ Minted ${TOKEN_CONFIG.totalSupply.toLocaleString()} CVT\n`);

  return {
    cvtMint,
    metadataPDA,
    tokenAccount: tokenAccount.address,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DEPLOYMENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║      🚀 CVT TOKEN DEPLOYMENT WITH METADATA 🚀            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const connection = new Connection(SOLANA_RPC, 'confirmed');

  // Load or generate wallet
  let payer: Keypair;
  if (process.env.SOLANA_PRIVATE_KEY) {
    try {
      const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
      payer = Keypair.fromSecretKey(secretKey);
      console.log('✅ Loaded wallet from .env:', payer.publicKey.toString());
    } catch (e) {
      console.log('⚠️  Invalid SOLANA_PRIVATE_KEY in .env, generating new wallet...');
      payer = Keypair.generate();
    }
  } else {
    payer = Keypair.generate();
    console.log('✅ Generated new wallet:', payer.publicKey.toString());
    console.log('🔑 Private Key:', bs58.encode(payer.secretKey));
    console.log('\n💾 Save to .env:');
    console.log(`SOLANA_PRIVATE_KEY=${bs58.encode(payer.secretKey)}\n`);
  }

  // Check balance
  let balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL\n`);

  if (balance < 0.3 * 1e9) {
    const gotSol = await getDevnetSol(connection, payer.publicKey);
    if (!gotSol) {
      console.log('\n❌ Insufficient SOL. Please get devnet SOL and retry.');
      process.exit(1);
    }
    
    // Re-check balance
    balance = await connection.getBalance(payer.publicKey);
    console.log(`💰 New Balance: ${balance / 1e9} SOL\n`);
  }

  // Deploy CVT Token
  const { cvtMint, metadataPDA, tokenAccount } = await createCVTTokenWithMetadata(connection, payer);

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 CVT TOKEN DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📋 TOKEN DETAILS:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('Name:              ', TOKEN_CONFIG.name);
  console.log('Symbol:            ', TOKEN_CONFIG.symbol);
  console.log('Mint Address:      ', cvtMint.toString());
  console.log('Metadata PDA:      ', metadataPDA.toString());
  console.log('Token Account:     ', tokenAccount.toString());
  console.log('Total Supply:      ', TOKEN_CONFIG.totalSupply.toLocaleString(), 'CVT');
  console.log('Decimals:          ', TOKEN_CONFIG.decimals);
  console.log();

  console.log('🔗 INTEGRATED PROGRAMS:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('Bridge Program:    ', PRODUCTION_ADDRESSES.bridgeProgram);
  console.log('Vesting Program:   ', PRODUCTION_ADDRESSES.vestingProgram);
  console.log();

  console.log('🪙 TOKENOMICS (21M SUPPLY):');
  console.log('─────────────────────────────────────────────────────────');
  console.log('70% Vesting Lock:   14,700,000 CVT (locked in vaults)');
  console.log('20% DEX Liquidity:   4,200,000 CVT (initial pools)');
  console.log('10% Development:     2,100,000 CVT (platform dev)');
  console.log();

  console.log('🔍 EXPLORER LINKS:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Token: https://explorer.solana.com/address/${cvtMint.toString()}?cluster=devnet`);
  console.log(`Metadata: https://explorer.solana.com/address/${metadataPDA.toString()}?cluster=devnet`);
  console.log();

  console.log('💾 ADD TO .ENV:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`VITE_SOLANA_CVT_TOKEN=${cvtMint.toString()}`);
  console.log(`SOLANA_CVT_TOKEN=${cvtMint.toString()}`);
  console.log(`SOLANA_CVT_METADATA=${metadataPDA.toString()}`);
  console.log(`SOLANA_WALLET=${payer.publicKey.toString()}`);
  if (!process.env.SOLANA_PRIVATE_KEY) {
    console.log(`SOLANA_PRIVATE_KEY=${bs58.encode(payer.secretKey)}`);
  }
  console.log();

  console.log('📚 PRODUCTION REFERENCE:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('Live CVT Token:    ', PRODUCTION_ADDRESSES.cvtToken);
  console.log('Live Metadata:     ', PRODUCTION_ADDRESSES.cvtMetadata);
  console.log('Explorer:          ', PRODUCTION_ADDRESSES.explorerUrl);
  console.log();

  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .then(() => {
    console.log('✅ Deployment successful!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });

// Export for use in other scripts
export { TOKEN_CONFIG, TOKENOMICS, PRODUCTION_ADDRESSES };
