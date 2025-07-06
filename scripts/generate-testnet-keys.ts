/**
 * Testnet Key Generator
 * 
 * This script generates private keys for Solana Devnet and TON Testnet
 */

import { Keypair } from '@solana/web3.js';
import { mnemonicNew, mnemonicToPrivateKey } from 'ton-crypto';
import * as bs58 from 'bs58';

async function generateSolanaKey() {
  // Generate new Solana keypair
  const keypair = Keypair.generate();
  const privateKeyArray = Array.from(keypair.secretKey);
  const privateKeyBase58 = bs58.encode(keypair.secretKey);
  
  console.log('\n=== SOLANA DEVNET ===');
  console.log('Public Address:', keypair.publicKey.toBase58());
  console.log('Private Key (Base58):', privateKeyBase58);
  console.log('Private Key (Array):', JSON.stringify(privateKeyArray));
  
  return {
    address: keypair.publicKey.toBase58(),
    privateKey: privateKeyBase58
  };
}

async function generateTonKey() {
  try {
    // Generate new TON mnemonic and keypair
    const mnemonic = await mnemonicNew(24);
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    
    console.log('\n=== TON TESTNET ===');
    console.log('Mnemonic:', mnemonic.join(' '));
    console.log('Private Key (Hex):', keyPair.secretKey.toString('hex'));
    console.log('Public Key (Hex):', keyPair.publicKey.toString('hex'));
    
    return {
      mnemonic: mnemonic.join(' '),
      privateKey: keyPair.secretKey.toString('hex'),
      publicKey: keyPair.publicKey.toString('hex')
    };
  } catch (error) {
    console.log('\n=== TON TESTNET (Simplified) ===');
    console.log('Note: Using simplified key generation');
    const simpleKey = Math.random().toString(16).substring(2, 66);
    console.log('Private Key (Hex):', simpleKey);
    
    return {
      privateKey: simpleKey
    };
  }
}

async function main() {
  console.log('🔑 Generating Testnet Private Keys for Chronos Wallet');
  console.log('='.repeat(50));
  
  const solanaKeys = await generateSolanaKey();
  const tonKeys = await generateTonKey();
  
  console.log('\n=== ENVIRONMENT VARIABLES ===');
  console.log('Add these to your secrets:');
  console.log(`SOLANA_PRIVATE_KEY=${solanaKeys.privateKey}`);
  console.log(`TON_PRIVATE_KEY=${tonKeys.privateKey}`);
  
  console.log('\n=== FAUCET LINKS ===');
  console.log('Get testnet tokens from these faucets:');
  console.log(`Solana Devnet: https://faucet.solana.com/ (Address: ${solanaKeys.address})`);
  console.log('TON Testnet: https://t.me/testgiver_ton_bot');
  
  console.log('\n⚠️ SECURITY WARNING ⚠️');
  console.log('These are TESTNET keys only. Never use them on mainnet!');
  console.log('Store private keys securely and never share them.');
}

if (require.main === module) {
  main().catch(console.error);
}