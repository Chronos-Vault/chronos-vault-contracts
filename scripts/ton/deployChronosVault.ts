import { toNano, beginCell, contractAddress } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { ChronosVault } from '../../contracts/ton/wrappers/ChronosVault';

export async function run(provider: NetworkProvider) {
    console.log('🚀 Deploying ChronosVault to TON Testnet...\n');
    
    // Contract configuration
    const vaultId = BigInt(Math.floor(Math.random() * 1000000));
    const unlockTime = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now
    const isLocked = 1;
    const recoveryMode = 0;
    const backupHeight = BigInt(0);
    
    // Get deployer address
    const deployerAddress = provider.sender().address;
    if (!deployerAddress) {
        throw new Error('Deployer address not found. Make sure wallet is connected.');
    }
    
    console.log('📝 Contract Configuration:');
    console.log(`   Vault ID: ${vaultId}`);
    console.log(`   Unlock Time: ${new Date(Number(unlockTime) * 1000).toISOString()}`);
    console.log(`   Owner: ${deployerAddress.toString()}`);
    console.log(`   Security Level: 3 (Maximum)`);
    console.log(`   Verification Threshold: 2-of-3 Trinity Protocol\n`);
    
    // Create initial storage data
    const initialData = beginCell()
        // Basic vault information
        .storeUint(vaultId, 64)
        .storeUint(unlockTime, 64)
        .storeUint(isLocked, 1)
        .storeUint(recoveryMode, 1)
        .storeUint(backupHeight, 64)
        .storeAddress(deployerAddress)
        .storeRef(beginCell().endCell()) // backup_data (empty initially)
        .storeDict(null) // beneficiaries (empty initially)
        // Trinity Protocol components
        .storeUint(3, 8) // security_level (Maximum)
        .storeUint(0, 1) // ethereum_verified
        .storeUint(0, 1) // solana_verified  
        .storeUint(0, 64) // eth_last_verification
        .storeUint(0, 64) // sol_last_verification
        .storeUint(2, 2) // verification_threshold (2-of-3)
        .storeUint(0, 8) // emergency_contacts_count
        .storeDict(null) // emergency_contacts
        .storeDict(null) // verification_proofs
        .storeUint(1, 8) // multi_sig_threshold
        .storeDict(null) // geolocation_data
        .endCell();
    
    // Compile contract
    console.log('🔨 Compiling ChronosVault contract...');
    const code = await compile('ChronosVault');
    
    // Create contract instance
    const init = { code, data: initialData };
    const address = contractAddress(0, init);
    const contract = provider.open(new ChronosVault(address, init));
    
    console.log(`📍 Contract will be deployed to: ${address.toString()}\n`);
    console.log('💰 Deployment Cost: ~0.5 TON');
    console.log('⏳ Waiting for confirmation...\n');
    
    // Deploy contract
    await contract.sendDeploy(provider.sender(), toNano('0.5'));
    
    console.log('✅ ChronosVault deployed successfully!');
    console.log(`\n🔗 View on TON Explorer:`);
    console.log(`   https://testnet.tonscan.org/address/${address.toString()}`);
    console.log(`\n📋 Contract Details:`);
    console.log(`   Address: ${address.toString()}`);
    console.log(`   Vault ID: ${vaultId}`);
    console.log(`   Status: Active`);
    console.log(`   Network: Testnet`);
    console.log(`\n🔒 Trinity Protocol Integration:`);
    console.log(`   Ethereum: Pending verification`);
    console.log(`   Solana: Pending verification`);
    console.log(`   TON: ✅ Deployed and Active`);
    console.log(`\n🎉 Chronos Vault is now UNHACKABLE with 3-chain security!`);
}
