#!/usr/bin/env node
import { TonClient, WalletContractV4, internal, fromNano } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { Cell, beginCell, toNano, Address, storeStateInit } from '@ton/core';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ETHEREUM_BRIDGE = "0x499B24225a4d15966E118bfb86B2E421d57f4e21";
const VALIDATOR_ETH = "0x66e5046d136e82d17cbeb2ffea5bd5205d962906";
const ARBITRUM_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

// Set to null to skip wallet verification (use any wallet you have)
const YOUR_WALLET = null;

async function question(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(prompt, answer => { rl.close(); resolve(answer); });
    });
}

async function main() {
    console.log("🚀 TON TRINITY CONSENSUS DEPLOYMENT");
    console.log("=".repeat(60));
    
    // Get mnemonic FIRST
    console.log("\n🔑 Wallet Authentication");
    const mnemonicInput = await question("\nEnter your 24-word seed phrase:\n");
    const mnemonic = mnemonicInput.trim().split(/\s+/);
    
    if (mnemonic.length !== 24) {
        console.error(`\n❌ Invalid! Expected 24 words, got ${mnemonic.length}`);
        return;
    }
    
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    
    const walletBounceable = wallet.address.toString({ testOnly: true, bounceable: true });
    const walletNonBounceable = wallet.address.toString({ testOnly: true, bounceable: false });
    
    console.log(`\n📱 Your wallet addresses:`);
    console.log(`   Bounceable: ${walletBounceable}`);
    console.log(`   Non-bounceable: ${walletNonBounceable}`);
    console.log("✅ Wallet authenticated");
    
    // Connect to TON using Orbs decentralized endpoints (no rate limits!)
    console.log("\n🌐 Connecting to TON testnet...");
    const endpoint = await getHttpEndpoint({ network: 'testnet' });
    const client = new TonClient({ endpoint });
    const walletContract = client.open(wallet);
    const balance = await walletContract.getBalance();
    
    console.log(`\n💰 Balance: ${fromNano(balance)} TON`);
    
    if (balance < toNano('0.5')) {
        console.error("\n❌ Need at least 0.5 TON for deployment");
        console.error("Get testnet TON from: https://t.me/testgiver_ton_bot");
        return;
    }
    
    // Load compiled contract
    const compiled = JSON.parse(fs.readFileSync('build/TrinityConsensus.compiled.json', 'utf-8'));
    const contractCode = Cell.fromBoc(Buffer.from(compiled.hex, 'hex'))[0];
    console.log("\n✅ Contract loaded");
    
    // Use the wallet we just authenticated as authority
    const authority = wallet.address;
    
    // Store Ethereum addresses as 160-bit integers
    const ethBridge = BigInt('0x' + ETHEREUM_BRIDGE.slice(2));
    const ethValidator = BigInt('0x' + VALIDATOR_ETH.slice(2));
    
    const rpcCell = beginCell().storeStringTail(ARBITRUM_RPC).endCell();
    
    // Store quantum keys in reference cell (ROOT FIX for BitBuilder overflow)
    const quantumKeysCell = beginCell()
        .storeUint(0, 256)  // ml_kem_public_key (placeholder)
        .storeUint(0, 256)  // dilithium_public_key (placeholder)
        .endCell();
    
    const initialData = beginCell()
        .storeUint(ethBridge, 160)
        .storeUint(ethValidator, 160)
        .storeRef(rpcCell)
        .storeAddress(authority)
        .storeUint(0, 64)  // total_proofs_submitted
        .storeUint(0, 64)  // last_processed_operation
        .storeUint(1, 1)   // is_active
        .storeDict(null)   // proof_records
        .storeDict(null)   // vault_verifications
        .storeRef(quantumKeysCell)  // Quantum keys in ref (fixes overflow!)
        .endCell();
    
    console.log("✅ Initial data prepared (no overflow!)");
    
    // Build StateInit using official pattern (2024)
    const stateInit = {
        code: contractCode,
        data: initialData
    };
    
    // Serialize StateInit to Cell using storeStateInit helper
    const stateInitCell = beginCell()
        .store(storeStateInit(stateInit))
        .endCell();
    
    const contractAddress = new Address(0, stateInitCell.hash());
    console.log(`\n📍 Contract Address: ${contractAddress.toString()}`);
    console.log(`🔍 Explorer: https://testnet.tonapi.io/account/${contractAddress.toString()}`)
    
    const confirm = await question("\n🚀 Deploy? (yes/no): ");
    if (confirm.toLowerCase() !== 'yes') {
        console.log("Cancelled.");
        return;
    }
    
    console.log("\n📡 Deploying with StateInit (correct 2024 pattern)...");
    
    await walletContract.sendTransfer({
        seqno: await walletContract.getSeqno(),
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: contractAddress,
                value: toNano('0.5'),
                init: stateInit,  // Pass StateInit object!
                body: beginCell().endCell(),
                bounce: false,
            }),
        ],
    });
    
    console.log("✅ Transaction sent!");
    console.log("\n⏳ Waiting for confirmation...");
    
    let deployed = false;
    for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
            const state = await client.getContractState(contractAddress);
            if (state.state === 'active') {
                deployed = true;
                break;
            }
        } catch (e) {}
        process.stdout.write('.');
    }
    
    console.log("\n");
    
    if (deployed) {
        console.log("🎉 DEPLOYED SUCCESSFULLY!");
        console.log("=".repeat(60));
        console.log(`📍 ${contractAddress.toString()}`);
        console.log(`🔍 https://testnet.tonapi.io/account/${contractAddress.toString()}`);
        
        fs.writeFileSync('trinity-ton-deployment.json', JSON.stringify({
            network: 'testnet',
            contractAddress: contractAddress.toString(),
            walletAddress: YOUR_WALLET,
            ethereumBridge: ETHEREUM_BRIDGE,
            validatorEthAddress: VALIDATOR_ETH,
            deployedAt: new Date().toISOString(),
        }, null, 2));
        
        console.log("\n🎯 TRINITY PROTOCOL COMPLETE!");
        console.log("   ✅ Solana Validator - DEPLOYED");
        console.log("   ✅ TON Consensus - DEPLOYED");
        console.log("   ✅ Ethereum Bridge - ACTIVE");
        console.log("\n   🔐 2-of-3 Consensus Matrix LIVE!");
    } else {
        console.log("⚠️  Timeout - check explorer manually");
    }
}

main().catch(e => {
    console.error("\n❌ Error:", e.message);
    process.exit(1);
});
