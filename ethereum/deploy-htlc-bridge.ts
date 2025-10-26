/**
 * @title Deploy HTLCBridge Contract
 * @notice Deployment script for Trinity Protocol HTLC Bridge v1.5
 * @author Chronos Vault Team
 */

import { ethers } from 'hardhat';

async function main() {
    console.log('🚀 Deploying HTLCBridge with Trinity Protocol v1.5 integration...\n');

    // CrossChainBridgeOptimized v1.5 address (Arbitrum Sepolia)
    const TRINITY_BRIDGE_ADDRESS = '0x499B24225a4d15966E118bfb86B2E421d57f4e21';

    console.log('📋 Configuration:');
    console.log(`- Trinity Bridge: ${TRINITY_BRIDGE_ADDRESS}`);
    console.log(`- Network: ${(await ethers.provider.getNetwork()).name}`);
    console.log('');

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Deploy HTLCBridge
    console.log('📦 Deploying HTLCBridge...');
    const HTLCBridge = await ethers.getContractFactory('HTLCBridge');
    const htlcBridge = await HTLCBridge.deploy(TRINITY_BRIDGE_ADDRESS);

    await htlcBridge.waitForDeployment();
    const htlcAddress = await htlcBridge.getAddress();

    console.log(`✅ HTLCBridge deployed at: ${htlcAddress}\n`);

    // Verify deployment
    console.log('🔍 Verifying deployment...');
    const trinityAddress = await htlcBridge.trinityBridge();
    console.log(`✅ Trinity Bridge configured: ${trinityAddress}`);
    console.log(`✅ Required consensus: ${await htlcBridge.REQUIRED_CONSENSUS()}`);
    console.log(`✅ Min timelock: ${await htlcBridge.MIN_TIMELOCK()} seconds (${(await htlcBridge.MIN_TIMELOCK()) / 3600} hours)`);
    console.log(`✅ Max timelock: ${await htlcBridge.MAX_TIMELOCK()} seconds (${(await htlcBridge.MAX_TIMELOCK()) / 86400} days)\n`);

    // Save deployment info
    const deployment = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId,
        htlcBridge: htlcAddress,
        trinityBridge: TRINITY_BRIDGE_ADDRESS,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        version: 'v1.5-PRODUCTION',
        blockNumber: await ethers.provider.getBlockNumber()
    };

    console.log('📝 Deployment Summary:');
    console.log(JSON.stringify(deployment, null, 2));
    console.log('');

    console.log('🎉 Deployment complete!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Update deployment-v1.5.json with HTLCBridge address');
    console.log('2. Update atomic-swap-service.ts with new contract address');
    console.log('3. Verify contract on Arbiscan (if mainnet)');
    console.log('4. Test HTLC swap flow on testnet');
    console.log('');
    console.log('🔗 Contract addresses to update:');
    console.log(`HTLC_BRIDGE_ADDRESS="${htlcAddress}"`);
    console.log(`TRINITY_BRIDGE_ADDRESS="${TRINITY_BRIDGE_ADDRESS}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    });
