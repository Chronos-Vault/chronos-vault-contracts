/**
 * Contract Address Update Script
 * 
 * This script updates the frontend configuration with the latest contract addresses
 * from a deployment file. It supports different environments (testnet, mainnet).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const env = envArg ? envArg.split('=')[1] : 'testnet';

// Validate environment
if (env !== 'testnet' && env !== 'mainnet') {
  console.error(`Invalid environment: ${env}`);
  console.error('Supported environments: testnet, mainnet');
  process.exit(1);
}

async function main() {
  console.log(`Updating contract addresses for ${env} environment...`);

  // Find latest deployment file
  const deploymentDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentDir)) {
    console.error('Deployment directory not found.');
    console.error('Please run a deployment first.');
    process.exit(1);
  }

  const deploymentFiles = fs.readdirSync(deploymentDir)
    .filter(file => file.startsWith('deployment-') && file.endsWith('.json'))
    .sort((a, b) => {
      // Sort by timestamp in filename (newest first)
      const timestampA = parseInt(a.replace('deployment-', '').replace('.json', ''));
      const timestampB = parseInt(b.replace('deployment-', '').replace('.json', ''));
      return timestampB - timestampA;
    });

  if (deploymentFiles.length === 0) {
    console.error('No deployment files found.');
    console.error('Please run a deployment first.');
    process.exit(1);
  }

  const latestDeploymentFile = deploymentFiles[0];
  console.log(`Using latest deployment: ${latestDeploymentFile}`);

  // Load deployment data
  const deploymentPath = path.join(deploymentDir, latestDeploymentFile);
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  // Create config directory if it doesn't exist
  const configDir = path.join(__dirname, '../client/src/config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Update frontend configuration
  const configPath = path.join(configDir, 'contracts.ts');
  let configContent = '';

  if (fs.existsSync(configPath)) {
    configContent = fs.readFileSync(configPath, 'utf8');
  } else {
    // Create new config file if it doesn't exist
    configContent = `export const CONTRACT_ADDRESSES = {
  ethereum: {},
  ton: {},
  solana: {},
};

export const NETWORK_CONFIG = {
  ethereum: 'mainnet',
  ton: 'mainnet',
  solana: 'mainnet',
};
`;
  }

  // Update Ethereum addresses
  configContent = updateContractAddresses(
    configContent, 
    'ethereum', 
    deploymentData.ethereum
  );

  // Update TON addresses
  configContent = updateContractAddresses(
    configContent, 
    'ton', 
    deploymentData.ton
  );

  // Update Solana addresses
  configContent = updateContractAddresses(
    configContent, 
    'solana', 
    deploymentData.solana
  );

  // Update network config
  configContent = updateNetworkConfig(
    configContent, 
    env
  );

  // Write updated config
  fs.writeFileSync(configPath, configContent);

  console.log('Contract addresses updated successfully!');
  console.log(`Updated configuration: ${configPath}`);
}

function updateContractAddresses(content: string, chain: string, addresses: any): string {
  // Replace the contract addresses section for the specific chain
  const pattern = new RegExp(`(export const CONTRACT_ADDRESSES = [\\s\\S]*?${chain}: \\{)[\\s\\S]*?(\\},[\\s\\S]*?\\};)`, 'm');
  
  const newAddresses = Object.entries(addresses)
    .filter(([key]) => key !== 'network') // Skip network config
    .map(([key, value]) => `    ${key}: '${value}'`)
    .join(',\n');

  // Check if the pattern is found
  if (pattern.test(content)) {
    return content.replace(pattern, `$1\n${newAddresses}\n  $2`);
  } else {
    // If pattern not found, just update the empty object
    const simplePattern = new RegExp(`(${chain}: \\{)(\\})`, 'm');
    return content.replace(simplePattern, `$1\n${newAddresses}\n  $2`);
  }
}

function updateNetworkConfig(content: string, env: string): string {
  // Replace network configuration for all chains
  const networks = env === 'testnet' 
    ? { ethereum: 'sepolia', ton: 'testnet', solana: 'devnet' }
    : { ethereum: 'mainnet', ton: 'mainnet', solana: 'mainnet' };

  let updatedContent = content;
  
  for (const [chain, network] of Object.entries(networks)) {
    const pattern = new RegExp(`(NETWORK_CONFIG = [\\s\\S]*?${chain}: )'[^']+'`, 'm');
    
    // Check if the pattern is found
    if (pattern.test(updatedContent)) {
      updatedContent = updatedContent.replace(pattern, `$1'${network}'`);
    }
  }

  return updatedContent;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to update contract addresses:', error);
    process.exit(1);
  });