#!/usr/bin/env node
import { TonClient } from '@ton/ton';
import { Address } from '@ton/core';
import { getHttpEndpoint } from '@orbs-network/ton-access';

const CONTRACT_ADDRESS = "EQDx6yH5WH3Ex47h0PBnOBMzPCsmHdnL2snts3DZBO5CYVVJ";

async function testTONContract() {
    console.log("🧪 TRINITY PROTOCOL - TON CONTRACT TESTING");
    console.log("=".repeat(60));
    
    // Connect to TON testnet
    const endpoint = await getHttpEndpoint({ network: 'testnet' });
    const client = new TonClient({ endpoint });
    
    const contractAddress = Address.parse(CONTRACT_ADDRESS);
    console.log(`📍 Contract: ${contractAddress.toString()}\n`);
    
    // Test 1: Get Total Proofs
    console.log("🔍 Test 1: get_total_proofs()");
    try {
        const result = await client.runMethod(contractAddress, 'get_total_proofs');
        const totalProofs = result.stack.readNumber();
        console.log(`   ✅ Total Proofs: ${totalProofs}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 2: Get Is Active
    console.log("\n🔍 Test 2: get_is_active()");
    try {
        const result = await client.runMethod(contractAddress, 'get_is_active');
        const isActive = result.stack.readNumber();
        console.log(`   ✅ Is Active: ${isActive === 1 ? 'Yes' : 'No'} (${isActive})`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 3: Get Authority Address
    console.log("\n🔍 Test 3: get_authority_address()");
    try {
        const result = await client.runMethod(contractAddress, 'get_authority_address');
        const authoritySlice = result.stack.readAddress();
        console.log(`   ✅ Authority: ${authoritySlice.toString()}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 4: Get Arbitrum RPC URL
    console.log("\n🔍 Test 4: get_arbitrum_rpc_url()");
    try {
        const result = await client.runMethod(contractAddress, 'get_arbitrum_rpc_url');
        const rpcSlice = result.stack.readCell().beginParse();
        let rpcUrl = '';
        while (rpcSlice.remainingBits > 0) {
            rpcUrl += String.fromCharCode(rpcSlice.loadUint(8));
        }
        console.log(`   ✅ Arbitrum RPC: ${rpcUrl}`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ TON Contract Testing Complete!");
    console.log(`🔍 Explorer: https://testnet.tonapi.io/account/${CONTRACT_ADDRESS}`);
}

testTONContract().catch(console.error);
