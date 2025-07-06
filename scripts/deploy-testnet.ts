/**
 * Testnet Deployment Script for Chronos Vault
 * 
 * This script handles deployment of all smart contracts to their respective
 * testnets (Ethereum Sepolia, TON Testnet, and Solana Devnet).
 */

import { ethers } from 'hardhat';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';

// Security: Validate contract addresses to prevent command injection
function validateContractAddress(address: string, chain: 'ethereum' | 'ton' | 'solana'): boolean {
  if (typeof address !== 'string' || address.length === 0) return false;
  
  switch (chain) {
    case 'ethereum':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'ton':
      return /^EQ[A-Za-z0-9_-]{46}$/.test(address);
    case 'solana':
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    default:
      return false;
  }
}

async function main() {
  console.log(chalk.blue('================================================'));
  console.log(chalk.blue('Chronos Vault Testnet Deployment'));
  console.log(chalk.blue('================================================'));

  // Ensure we have the necessary environment variables
  checkRequiredEnvVars();

  // Create deployment directory for contract addresses
  const deploymentDir = path.join(__dirname, '../deployments');
  const deploymentPath = path.join(deploymentDir, `deployment-${Date.now()}.json`);
  
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  // Object to store all deployed contract addresses
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    ethereum: {},
    ton: {},
    solana: {},
    config: {
      securityLevel: process.env.SECURITY_LEVEL || "ENHANCED"
    }
  };

  try {
    // Deploy in sequence to each testnet
    console.log(chalk.blue('\nDeploying to Ethereum Sepolia Testnet...'));
    const ethereumDeployment = await deployToEthereum();
    deploymentInfo.ethereum = ethereumDeployment;
    
    console.log(chalk.blue('\nDeploying to TON Testnet...'));
    const tonDeployment = await deployToTON();
    deploymentInfo.ton = tonDeployment;
    
    console.log(chalk.blue('\nDeploying to Solana Devnet...'));
    const solanaDeployment = await deployToSolana();
    deploymentInfo.solana = solanaDeployment;

    // Save deployment information
    fs.writeFileSync(
      deploymentPath, 
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(chalk.green('\nAll deployments completed successfully!'));
    console.log(`Deployment information saved to: ${deploymentPath}`);
    
    // Now configure the cross-chain verification
    console.log(chalk.blue('\nConfiguring cross-chain verification...'));
    await configureCrossChainVerification(deploymentInfo);
    
    console.log(chalk.green('\nTriple-Chain Security Architecture is now live on testnets!'));
    console.log(chalk.blue('\nDeployment Summary:'));
    console.log(chalk.blue('================================================'));
    console.log(chalk.yellow('Ethereum Sepolia:'));
    console.log(`  ChronosVault: ${deploymentInfo.ethereum.vault}`);
    console.log(`  CVToken: ${deploymentInfo.ethereum.token}`);
    console.log(`  Bridge: ${deploymentInfo.ethereum.bridge}`);
    
    console.log(chalk.yellow('\nTON Testnet:'));
    console.log(`  ChronosVault: ${deploymentInfo.ton.vault}`);
    console.log(`  CVToken: ${deploymentInfo.ton.token}`);
    console.log(`  Bridge: ${deploymentInfo.ton.bridge}`);
    
    console.log(chalk.yellow('\nSolana Devnet:'));
    console.log(`  ChronosVault: ${deploymentInfo.solana.vault}`);
    console.log(`  CVToken: ${deploymentInfo.solana.token}`);
    console.log(`  Bridge: ${deploymentInfo.solana.bridge}`);
    console.log(chalk.blue('================================================'));
    
  } catch (error) {
    console.error(chalk.red('Deployment failed:'), error);
    process.exit(1);
  }
}

function checkRequiredEnvVars() {
  const required = [
    'ETHEREUM_PRIVATE_KEY',
    'TON_API_KEY',
    'SOLANA_RPC_URL',
    'ETHEREUM_RPC_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(chalk.red('Missing required environment variables:'));
    missing.forEach(key => console.error(chalk.red(`  - ${key}`)));
    console.error(chalk.yellow('\nPlease set these variables before deployment.'));
    process.exit(1);
  }
}

async function deployToEthereum() {
  try {
    // Deploy Ethereum smart contracts
    console.log('Deploying ChronosVault contract...');
    const ChronosVault = await ethers.getContractFactory('ChronosVault');
    const vault = await ChronosVault.deploy();
    await vault.deployed();
    console.log(chalk.green(`ChronosVault deployed to: ${vault.address}`));
    
    // Deploy CVToken
    console.log('Deploying CVToken contract...');
    const CVToken = await ethers.getContractFactory('CVToken');
    const token = await CVToken.deploy();
    await token.deployed();
    console.log(chalk.green(`CVToken deployed to: ${token.address}`));
    
    // Deploy Bridge
    console.log('Deploying Bridge contract...');
    const Bridge = await ethers.getContractFactory('ChronosBridge');
    const bridge = await Bridge.deploy(vault.address, token.address);
    await bridge.deployed();
    console.log(chalk.green(`Bridge deployed to: ${bridge.address}`));
    
    return {
      vault: vault.address,
      token: token.address,
      bridge: bridge.address,
      network: 'sepolia'
    };
  } catch (error) {
    console.error(chalk.red('Error deploying to Ethereum:'), error);
    throw error;
  }
}

async function deployToTON() {
  try {
    // Use TON CLI to deploy
    console.log('Compiling TON contracts...');
    execSync('npx ton-compiler compile ./contracts/ton/ChronosVault.fc');
    execSync('npx ton-compiler compile ./contracts/ton/CVToken.fc');
    execSync('npx ton-compiler compile ./contracts/ton/ChronosBridge.fc');
    
    console.log('Deploying TON contracts...');
    const tonDeployOutput = execSync('npx ton-deploy deploy-testnet ./contracts/ton/deployConfig.json').toString();
    
    // Parse deployment output to extract addresses
    const vaultMatch = tonDeployOutput.match(/ChronosVault deployed to: (EQ[\w-]+)/);
    const tokenMatch = tonDeployOutput.match(/CVToken deployed to: (EQ[\w-]+)/);
    const bridgeMatch = tonDeployOutput.match(/ChronosBridge deployed to: (EQ[\w-]+)/);
    
    if (!vaultMatch || !tokenMatch || !bridgeMatch) {
      throw new Error('Failed to extract TON contract addresses from deployment output');
    }
    
    const vaultAddress = vaultMatch[1];
    const tokenAddress = tokenMatch[1];
    const bridgeAddress = bridgeMatch[1];
    
    console.log(chalk.green(`ChronosVault deployed to: ${vaultAddress}`));
    console.log(chalk.green(`CVToken deployed to: ${tokenAddress}`));
    console.log(chalk.green(`ChronosBridge deployed to: ${bridgeAddress}`));
    
    return {
      vault: vaultAddress,
      token: tokenAddress,
      bridge: bridgeAddress,
      network: 'testnet'
    };
  } catch (error) {
    console.error(chalk.red('Error deploying to TON:'), error);
    throw error;
  }
}

async function deployToSolana() {
  try {
    // Use Solana CLI to deploy
    console.log('Building Solana programs...');
    execSync('cd contracts/solana && cargo build-sbf');
    
    console.log('Deploying Solana programs...');
    const vaultDeployOutput = execSync('solana program deploy --program-id ./contracts/solana/keys/chronos_vault-keypair.json ./contracts/solana/target/deploy/chronos_vault.so').toString();
    const tokenDeployOutput = execSync('solana program deploy --program-id ./contracts/solana/keys/cvt_token-keypair.json ./contracts/solana/target/deploy/cvt_token.so').toString();
    const bridgeDeployOutput = execSync('solana program deploy --program-id ./contracts/solana/keys/chronos_bridge-keypair.json ./contracts/solana/target/deploy/chronos_bridge.so').toString();
    
    // Extract program IDs
    const vaultMatch = vaultDeployOutput.match(/Program Id: ([\w]{44})/);
    const tokenMatch = tokenDeployOutput.match(/Program Id: ([\w]{44})/);
    const bridgeMatch = bridgeDeployOutput.match(/Program Id: ([\w]{44})/);
    
    if (!vaultMatch || !tokenMatch || !bridgeMatch) {
      throw new Error('Failed to extract Solana program IDs from deployment output');
    }
    
    const vaultAddress = vaultMatch[1];
    const tokenAddress = tokenMatch[1];
    const bridgeAddress = bridgeMatch[1];
    
    console.log(chalk.green(`ChronosVault deployed to: ${vaultAddress}`));
    console.log(chalk.green(`CVToken deployed to: ${tokenAddress}`));
    console.log(chalk.green(`ChronosBridge deployed to: ${bridgeAddress}`));
    
    return {
      vault: vaultAddress,
      token: tokenAddress,
      bridge: bridgeAddress,
      network: 'devnet'
    };
  } catch (error) {
    console.error(chalk.red('Error deploying to Solana:'), error);
    throw error;
  }
}

async function configureCrossChainVerification(deploymentInfo) {
  try {
    console.log('Setting up cross-chain verification between contracts...');
    
    // Security: Validate all contract addresses before using them in commands
    if (!validateContractAddress(deploymentInfo.ethereum.bridge, 'ethereum')) {
      throw new Error('Invalid Ethereum bridge address');
    }
    if (!validateContractAddress(deploymentInfo.ton.bridge, 'ton')) {
      throw new Error('Invalid TON bridge address');
    }
    if (!validateContractAddress(deploymentInfo.solana.bridge, 'solana')) {
      throw new Error('Invalid Solana bridge address');
    }
    
    // Configure Ethereum bridge to recognize other chain bridges
    console.log('Configuring Ethereum bridge...');
    const Bridge = await ethers.getContractFactory('ChronosBridge');
    const ethereumBridge = Bridge.attach(deploymentInfo.ethereum.bridge);
    
    await ethereumBridge.setTrustedBridge('TON', deploymentInfo.ton.bridge);
    await ethereumBridge.setTrustedBridge('SOLANA', deploymentInfo.solana.bridge);
    
    // Configure TON bridge via CLI with safe parameterization
    console.log('Configuring TON bridge...');
    execSync('npx ton-cli bridge set-trusted --address $TON_BRIDGE --chain ETH --bridge $ETH_BRIDGE', {
      env: { 
        ...process.env,
        TON_BRIDGE: deploymentInfo.ton.bridge,
        ETH_BRIDGE: deploymentInfo.ethereum.bridge
      }
    });
    execSync('npx ton-cli bridge set-trusted --address $TON_BRIDGE --chain SOL --bridge $SOL_BRIDGE', {
      env: { 
        ...process.env,
        TON_BRIDGE: deploymentInfo.ton.bridge,
        SOL_BRIDGE: deploymentInfo.solana.bridge
      }
    });
    
    // Configure Solana bridge via CLI with safe parameterization
    console.log('Configuring Solana bridge...');
    execSync('solana program call', [
      deploymentInfo.solana.bridge,
      'setTrustedBridge',
      'ETH',
      deploymentInfo.ethereum.bridge
    ]);
    execSync('solana program call', [
      deploymentInfo.solana.bridge,
      'setTrustedBridge', 
      'TON',
      deploymentInfo.ton.bridge
    ]);
    
    console.log(chalk.green('Cross-chain verification configuration completed!'));
    
    // Execute test transfer to validate configuration
    console.log('Executing test transfer to validate configuration...');
    const testAmount = '0.01';
    const testResult = await ethereumBridge.initiateTransfer(
      'TON',
      deploymentInfo.ton.vault,
      ethers.utils.parseEther(testAmount),
      { gasLimit: 500000 }
    );
    
    console.log(chalk.green(`Test transfer initiated! Transaction hash: ${testResult.hash}`));
    console.log('Please check the recipient chain to confirm successful cross-chain verification.');
    
    return true;
  } catch (error) {
    console.error(chalk.red('Error configuring cross-chain verification:'), error);
    throw error;
  }
}

// Run main deployment function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });