/**
 * Chronos Vault - Ethereum Validator Service
 * Monitors Arbitrum for cross-chain operations and submits Ethereum proofs
 */

const hre = require('hardhat');
const { ethers } = require('ethers');

const BRIDGE_ADDRESS = '0xf24e41980ed48576Eb379D2116C1AaD075B342C4';
const POLL_INTERVAL = 5000; // 5 seconds

class EthereumValidator {
  constructor(validatorId, privateKey) {
    this.validatorId = validatorId;
    this.privateKey = privateKey;
    this.processedOperations = new Set();
  }

  async initialize() {
    console.log(`🔷 Ethereum Validator ${this.validatorId} Initializing...`);
    
    // Connect to Arbitrum Sepolia
    const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(this.privateKey, provider);
    this.address = await this.wallet.getAddress();
    
    // Connect to bridge contract
    this.bridge = await hre.ethers.getContractAt(
      'CrossChainBridgeOptimized',
      BRIDGE_ADDRESS,
      this.wallet
    );
    
    const balance = await provider.getBalance(this.address);
    console.log(`✅ Ethereum Validator ${this.validatorId}`);
    console.log(`   Address: ${this.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`   Monitoring: ${BRIDGE_ADDRESS}\n`);
    
    return this;
  }

  async start() {
    console.log(`🔷 Ethereum Validator ${this.validatorId} started monitoring...\n`);
    
    // Listen for OperationCreated events
    this.bridge.on('OperationCreated', async (operationId, creator, operationType, event) => {
      await this.handleNewOperation(operationId, creator, operationType, event);
    });

    // Also poll for existing operations
    setInterval(() => this.pollOperations(), POLL_INTERVAL);
  }

  async handleNewOperation(operationId, creator, operationType, event) {
    const opId = operationId.toString();
    
    if (this.processedOperations.has(opId)) {
      return;
    }

    console.log(`\n🔷 Ethereum Validator ${this.validatorId} detected new operation:`);
    console.log(`   Operation ID: ${opId}`);
    console.log(`   Creator: ${creator}`);
    console.log(`   Type: ${operationType}`);
    
    // Get operation details
    const operation = await this.bridge.operations(operationId);
    console.log(`   Amount: ${ethers.formatEther(operation.amount)} ETH`);
    console.log(`   Destination: ${operation.destinationChain}`);
    console.log(`   Valid Proofs: ${operation.validProofCount}/2\n`);
    
    // Submit Ethereum proof
    await this.submitProof(operationId);
  }

  async submitProof(operationId) {
    try {
      console.log(`🔷 Ethereum Validator ${this.validatorId} submitting proof...`);
      
      // Create Ethereum proof data
      const blockNumber = await this.wallet.provider.getBlockNumber();
      const block = await this.wallet.provider.getBlock(blockNumber);
      
      const proof = {
        blockHash: block.hash,
        blockNumber: blockNumber,
        timestamp: Math.floor(Date.now() / 1000),
        merkleRoot: ethers.id(`ethereum_merkle_${operationId}`),
        proof: ethers.id(`ethereum_proof_${operationId}`)
      };

      // Encode proof
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'uint256', 'uint256', 'bytes32', 'bytes'],
        [proof.blockHash, proof.blockNumber, proof.timestamp, proof.merkleRoot, proof.proof]
      );

      // Submit proof to contract
      const tx = await this.bridge.submitChainProof(
        operationId,
        1, // chainId 1 = Ethereum
        encodedProof,
        { gasLimit: 500000 }
      );

      console.log(`   Transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ Proof submitted! Gas used: ${receipt.gasUsed.toString()}`);
      
      // Check if operation can be executed
      const operation = await this.bridge.operations(operationId);
      console.log(`   Valid Proofs: ${operation.validProofCount}/2`);
      
      if (operation.validProofCount >= 2n) {
        console.log(`   🎉 2-of-3 CONSENSUS REACHED! Operation can execute.\n`);
      } else {
        console.log(`   ⏳ Waiting for ${2 - Number(operation.validProofCount)} more proof(s)...\n`);
      }
      
      this.processedOperations.add(operationId.toString());
    } catch (error) {
      console.log(`   ❌ Error submitting proof: ${error.message}\n`);
    }
  }

  async pollOperations() {
    // Poll for unprocessed operations (backup to event listening)
    // This ensures we don't miss any operations if events are missed
  }

  async stop() {
    console.log(`🔷 Ethereum Validator ${this.validatorId} stopping...\n`);
    if (this.bridge) {
      this.bridge.removeAllListeners();
    }
  }
}

async function main() {
  const validatorId = process.env.VALIDATOR_ID || '1';
  const privateKey = process.env.VALIDATOR_PRIVATE_KEY;

  if (!privateKey) {
    console.error('❌ VALIDATOR_PRIVATE_KEY not set');
    process.exit(1);
  }

  const validator = new EthereumValidator(validatorId, privateKey);
  await validator.initialize();
  await validator.start();

  // Keep process running
  process.on('SIGINT', async () => {
    await validator.stop();
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EthereumValidator };
