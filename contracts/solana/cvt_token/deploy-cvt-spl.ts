/**
 * CVT SPL Token Deployment Script
 * 
 * Deploys ChronosToken (CVT) on Solana following exact tokenomics:
 * - Total Supply: 21,000,000 CVT
 * - Decimals: 9 (SPL standard)
 * - Initial Circulation: 6,300,000 CVT (30%)
 * - Time-Locked: 14,700,000 CVT (70%) in vault contracts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';
import * as fs from 'fs';

// CVT Token Configuration (from CVT_TOKENOMICS_SPECIFICATION.md)
const CVT_CONFIG = {
  name: 'ChronosToken',
  symbol: 'CVT',
  totalSupply: 21_000_000, // 21 million
  decimals: 9,
  distribution: {
    initialCirculation: 6_300_000, // 30%
    timeLocked: 14_700_000, // 70%
    breakdown: {
      privateSale: 1_050_000, // 5%
      ecosystemFund: 3_150_000, // 15%
      teamAdvisors: 2_100_000, // 10%
    }
  },
  timeLockedSchedule: [
    { year: 4, amount: 7_350_000, percent: 50 },
    { year: 8, amount: 3_675_000, percent: 25 },
    { year: 12, amount: 1_837_500, percent: 12.5 },
    { year: 16, amount: 918_750, percent: 6.25 },
    { year: 21, amount: 918_750, percent: 6.25 },
  ]
};

interface DeploymentResult {
  mintAddress: string;
  treasuryAddress: string;
  initialSupply: number;
  timeLockVaults: {
    year: number;
    amount: number;
    vaultAddress: string;
  }[];
  deploymentTime: string;
  network: string;
}

/**
 * Deploy CVT SPL Token
 */
async function deployCVTToken(): Promise<DeploymentResult> {
  console.log('🪙 Deploying ChronosToken (CVT) SPL Token...\n');

  // Connect to Solana
  const network = process.env.SOLANA_NETWORK || 'devnet';
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log(`📡 Network: ${network}`);
  console.log(`🔗 RPC: ${rpcUrl}\n`);

  // Load or create payer keypair
  let payer: Keypair;
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH || './deployer-keypair.json';
  
  if (fs.existsSync(keypairPath)) {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log(`🔑 Loaded keypair: ${payer.publicKey.toBase58()}`);
  } else {
    payer = Keypair.generate();
    console.log(`🔑 Generated new keypair: ${payer.publicKey.toBase58()}`);
    console.log(`⚠️  Save this keypair to ${keypairPath} for future use`);
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(payer.secretKey)));
  }

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL\n`);

  if (balance < 1e9) { // Less than 1 SOL
    console.log('⚠️  Low balance! Request airdrop for devnet:');
    console.log(`   solana airdrop 2 ${payer.publicKey.toBase58()} --url devnet\n`);
    
    // Auto-airdrop on devnet
    if (network === 'devnet') {
      console.log('💧 Requesting airdrop...');
      const signature = await connection.requestAirdrop(payer.publicKey, 2e9);
      await connection.confirmTransaction(signature);
      console.log('✅ Airdrop confirmed\n');
    }
  }

  // Step 1: Create CVT Mint
  console.log('🏭 Creating CVT Mint...');
  const mintKeypair = Keypair.generate();
  
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // Mint authority (will be revoked after distribution)
    null, // Freeze authority (null = no freeze)
    CVT_CONFIG.decimals,
    mintKeypair
  );

  console.log(`✅ CVT Mint created: ${mint.toBase58()}\n`);

  // Step 2: Create Treasury Account
  console.log('🏦 Creating Treasury Account...');
  const treasuryAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log(`✅ Treasury: ${treasuryAccount.address.toBase58()}\n`);

  // Step 3: Mint Initial Circulation (30% = 6.3M CVT)
  console.log('💎 Minting Initial Circulation (30%)...');
  const initialCirculationAmount = CVT_CONFIG.distribution.initialCirculation * Math.pow(10, CVT_CONFIG.decimals);
  
  await mintTo(
    connection,
    payer,
    mint,
    treasuryAccount.address,
    payer.publicKey,
    initialCirculationAmount
  );

  console.log(`✅ Minted ${CVT_CONFIG.distribution.initialCirculation.toLocaleString()} CVT to treasury\n`);

  // Step 4: Create Time-Lock Vaults for 70% (14.7M CVT)
  console.log('🔒 Creating Time-Lock Vaults (70%)...\n');
  const timeLockVaults: DeploymentResult['timeLockVaults'] = [];

  for (const schedule of CVT_CONFIG.timeLockedSchedule) {
    const vaultKeypair = Keypair.generate();
    const vaultAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      vaultKeypair.publicKey
    );

    // Mint to vault
    const vaultAmount = schedule.amount * Math.pow(10, CVT_CONFIG.decimals);
    await mintTo(
      connection,
      payer,
      mint,
      vaultAccount.address,
      payer.publicKey,
      vaultAmount
    );

    timeLockVaults.push({
      year: schedule.year,
      amount: schedule.amount,
      vaultAddress: vaultAccount.address.toBase58()
    });

    console.log(`   Year ${schedule.year}: ${schedule.amount.toLocaleString()} CVT → ${vaultAccount.address.toBase58()}`);
    
    // Save vault keypair for unlock scripts
    const vaultKeypairPath = `./vault-year-${schedule.year}-keypair.json`;
    fs.writeFileSync(vaultKeypairPath, JSON.stringify(Array.from(vaultKeypair.secretKey)));
  }

  console.log('\n✅ All time-lock vaults created\n');

  // Step 5: Revoke Mint Authority (no more minting possible - fixed supply)
  console.log('🔐 Revoking Mint Authority (fixed supply)...');
  
  const revokeInstruction = createSetAuthorityInstruction(
    mint,
    payer.publicKey,
    AuthorityType.MintTokens,
    null // Set to null = revoke forever
  );

  const transaction = new Transaction().add(revokeInstruction);
  await sendAndConfirmTransaction(connection, transaction, [payer]);

  console.log('✅ Mint authority revoked - supply is now FIXED at 21M\n');

  // Step 6: Save Deployment Info
  const deploymentInfo: DeploymentResult = {
    mintAddress: mint.toBase58(),
    treasuryAddress: treasuryAccount.address.toBase58(),
    initialSupply: CVT_CONFIG.distribution.initialCirculation,
    timeLockVaults,
    deploymentTime: new Date().toISOString(),
    network
  };

  const deploymentPath = './cvt-deployment.json';
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('📄 Deployment info saved to:', deploymentPath);
  console.log('\n' + '='.repeat(70));
  console.log('🎉 CVT SPL TOKEN DEPLOYED SUCCESSFULLY!');
  console.log('='.repeat(70));
  console.log('\n📊 Deployment Summary:');
  console.log(`   Mint Address: ${deploymentInfo.mintAddress}`);
  console.log(`   Treasury: ${deploymentInfo.treasuryAddress}`);
  console.log(`   Initial Supply: ${deploymentInfo.initialSupply.toLocaleString()} CVT (30%)`);
  console.log(`   Time-Locked: ${CVT_CONFIG.distribution.timeLocked.toLocaleString()} CVT (70%)`);
  console.log(`   Total Supply: ${CVT_CONFIG.totalSupply.toLocaleString()} CVT (FIXED)`);
  console.log(`\n   Network: ${network}`);
  console.log(`   Explorer: https://explorer.solana.com/address/${deploymentInfo.mintAddress}?cluster=${network}`);
  console.log('\n' + '='.repeat(70) + '\n');

  return deploymentInfo;
}

// Run deployment
if (require.main === module) {
  deployCVTToken()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    });
}

export { deployCVTToken, CVT_CONFIG };
