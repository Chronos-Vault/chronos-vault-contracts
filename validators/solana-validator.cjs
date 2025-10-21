/**
 * Chronos Vault - Solana Validator Service
 * Monitors Arbitrum for cross-chain operations and submits Solana proofs
 */

const hre = require('hardhat');
const { ethers } = require('ethers');

const BRIDGE_ADDRESS = '0xf24e41980ed48576Eb379D2116C1AaD075B342C4';
const POLL_INTERVAL = 6000; // 6 seconds (slightly offset from Ethereum)

class SolanaValidator {
  constructor(validatorId, ethereumPrivateKey, solanaAddress) {
    this.validatorId = validatorId;
    this.ethereumPrivateKey = ethereumPrivateKey; // Used to sign transactions on Arbitrum
    this.solanaAddress = solanaAddress;
    this.processedOperations = new Set();
  }

  async initialize() {
    console.log(`☀️  Solana Validator ${this.validatorId} Initializing...`);
    
    // Connect to Arbitrum Sepolia
    const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(this.ethereumPrivateKey, provider);
    this.address = await this.wallet.getAddress();
    
    // Connect to bridge contract
    this.bridge = await hre.ethers.getContractAt(
      'CrossChainBridgeOptimized',
      BRIDGE_ADDRESS,
      this.wallet
    );
    
    const balance = await provider.getBalance(this.address);
    console.log(`✅ Solana Validator ${this.validatorId}`);
    console.log(`   Ethereum Address: ${this.address}`);
    console.log(`   Solana Address: ${this.solanaAddress}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`   Monitoring: ${BRIDGE_ADDRESS}\n`);
    
    return this;
  }

  async start() {
    console.log(`☀️  Solana Validator ${this.validatorId} started monitoring...\n`);
    
    // Listen for OperationCreated events
    this.bridge.on('OperationCreated', async (operationId, creator, operationType, event) => {
      await this.handleNewOperation(operationId, creator, operationType, event);
    });

    // Poll for operations
    setInterval(() => this.pollOperations(), POLL_INTERVAL);
  }

  async handleNewOperation(operationId, creator, operationType, event) {
    const opId = operationId.toString();
    
    if (this.processedOperations.has(opId)) {
      return;
    }

    console.log(`\n☀️  Solana Validator ${this.validatorId} detected new operation:`);
    console.log(`   Operation ID: ${opId}`);
    console.log(`   Creator: ${creator}`);
    console.log(`   Type: ${operationType}`);
    
    // Get operation details
    const operation = await this.bridge.operations(operationId);
    console.log(`   Amount: ${ethers.formatEther(operation.amount)} ETH`);
    console.log(`   Destination: ${operation.destinationChain}`);
    console.log(`   Valid Proofs: ${operation.validProofCount}/2\n`);
    
    // Wait 3 seconds to simulate Solana confirmation time
    console.log(`   ⏳ Waiting for Solana finalization (3s)...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Submit Solana proof
    await this.submitProof(operationId);
  }

  async submitProof(operationId) {
    try {
      console.log(`☀️  Solana Validator ${this.validatorId} submitting proof...`);
      
      // Create Solana proof data (simulated)
      const slot = Math.floor(Date.now() / 400); // Approximate Solana slot
      
      const proof = {
        blockHash: ethers.id(`solana_blockhash_${slot}`),
        blockNumber: slot,
        timestamp: Math.floor(Date.now() / 1000),
        merkleRoot: ethers.id(`solana_merkle_${operationId}`),
        proof: ethers.id(`solana_proof_${operationId}_${this.solanaAddress}`)
      };

      // Encode proof
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'uint256', 'uint256', 'bytes32', 'bytes'],
        [proof.blockHash, proof.blockNumber, proof.timestamp, proof.merkleRoot, proof.proof]
      );

      // Submit proof to contract
      const tx = await this.bridge.submitChainProof(
        operationId,
        2, // chainId 2 = Solana
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
    // Poll for unprocessed operations
  }

  async stop() {
    console.log(`☀️  Solana Validator ${this.validatorId} stopping...\n`);
    if (this.bridge) {
      this.bridge.removeAllListeners();
    }
  }
}

async function main() {
  const validatorId = process.env.VALIDATOR_ID || '1';
  const ethereumPrivateKey = process.env.VALIDATOR_PRIVATE_KEY;
  const solanaAddress = process.env.SOLANA_ADDRESS;

  if (!ethereumPrivateKey || !solanaAddress) {
    console.error('❌ VALIDATOR_PRIVATE_KEY and SOLANA_ADDRESS required');
    process.exit(1);
  }

  const validator = new SolanaValidator(validatorId, ethereumPrivateKey, solanaAddress);
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

module.exports = { SolanaValidator };
