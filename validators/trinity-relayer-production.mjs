#!/usr/bin/env node
/**
 * Trinity Protocol Production Relayer Service
 * 
 * Fixes Applied:
 * 1. ✅ Real Merkle proof generation from blockchain data
 * 2. ✅ Authenticated proof submission with wallet signing
 * 3. ✅ Environment variables for configuration
 * 4. ✅ Comprehensive error handling with retry logic
 * 5. ✅ Connection and balance verification
 * 6. ✅ Gas estimation and management
 * 7. ✅ End-to-end testing support
 * 8. ✅ Production-ready monitoring and logging
 * 
 * Author: Chronos Vault Team
 */

import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { TonClient, Address } from '@ton/ton';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration from environment variables
const CONFIG = {
    ethereum: {
        rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
        bridgeAddress: process.env.BRIDGE_CONTRACT_ADDRESS || '0x499B24225a4d15966E118bfb86B2E421d57f4e21',
        privateKey: process.env.RELAYER_PRIVATE_KEY
    },
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        programId: process.env.SOLANA_PROGRAM_ID || '5oD8S1TtkdJbAX7qhsGticU7JKxjwY4AbEeBdnkUrrKY'
    },
    ton: {
        network: process.env.TON_NETWORK || 'testnet',
        contractAddress: process.env.TON_CONTRACT_ADDRESS || 'EQDx6yH5WH3Ex47h0PBnOBMzPCsmHdnL2snts3DZBO5CYVVJ'
    },
    relayer: {
        pollInterval: parseInt(process.env.POLL_INTERVAL_MS) || 5000,
        maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
        gasPriceMultiplier: parseFloat(process.env.GAS_PRICE_MULTIPLIER) || 1.2,
        minBalanceEth: parseFloat(process.env.MIN_BALANCE_ETH) || 0.01,
        enableAutoSubmission: process.env.ENABLE_AUTO_SUBMISSION !== 'false'
    }
};

// Cross-Chain Bridge ABI (PRODUCTION with Merkle verification)
const BRIDGE_ABI = [
    "function getOperationConsensus(uint256 operationId) view returns (uint8 arbitrumConfirmed, uint8 solanaConfirmed, uint8 tonConfirmed, bool consensusReached)",
    "function submitSolanaProof(uint256 operationId, bytes32 merkleRoot, bytes32 merkleLeaf, bytes32[] calldata proof) returns (bool)",
    "function submitTONProof(uint256 operationId, bytes32 merkleRoot, bytes32 merkleLeaf, bytes32[] calldata proof) returns (bool)",
    "function verifyMerkleProof(bytes32 leaf, bytes32[] calldata proof, bytes32 root) view returns (bool)",
    "function operations(uint256) view returns (address user, uint8 operationType, uint256 amount, uint8 status, uint8 validProofCount)",
    "event OperationInitiated(uint256 indexed operationId, address indexed user, uint8 operationType)",
    "event ConsensusReached(uint256 indexed operationId, uint8 consensusCount)",
    "event ProofSubmitted(uint256 indexed operationId, uint8 chainId, bytes32 merkleRoot)"
];

class TrinityRelayerProduction {
    constructor() {
        this.ethProvider = null;
        this.ethWallet = null;
        this.solanaConnection = null;
        this.tonClient = null;
        this.bridgeContract = null;
        this.isInitialized = false;
        this.stats = {
            proofsSubmitted: 0,
            consensusAchieved: 0,
            errors: 0,
            retries: 0
        };
    }

    /**
     * FIX #3: Environment Variables Configuration
     * PRODUCTION: Validates all required env vars and rejects placeholder values
     */
    validateConfig() {
        console.log("🔍 Validating configuration...");
        
        const required = {
            'ARBITRUM_RPC_URL': CONFIG.ethereum.rpcUrl,
            'BRIDGE_CONTRACT_ADDRESS': CONFIG.ethereum.bridgeAddress,
            'RELAYER_PRIVATE_KEY': CONFIG.ethereum.privateKey
        };

        const missing = [];
        const placeholders = [
            'your_private_key_here',
            'your_relayer_private_key_here',  // FIX: Catch .env.example placeholder
            'your_key_here',
            '0x0000000000000000000000000000000000000000'
        ];
        
        for (const [key, value] of Object.entries(required)) {
            if (!value) {
                missing.push(key);
            } else {
                // Check for placeholder values
                for (const placeholder of placeholders) {
                    if (value.toLowerCase().includes(placeholder.toLowerCase())) {
                        missing.push(`${key} (contains placeholder "${placeholder}")`);
                        break;
                    }
                }
            }
        }

        if (missing.length > 0) {
            throw new Error(`❌ Invalid configuration!\n\nMissing or placeholder values:\n${missing.map(m => `  - ${m}`).join('\n')}\n\nPlease:\n1. Copy .env.example to .env\n2. Replace ALL placeholder values with real keys\n3. Restart the relayer`);
        }

        console.log("   ✅ Configuration validated - all secrets configured");
    }

    /**
     * FIX #5: Connection and Balance Tests
     */
    async initialize() {
        console.log("🚀 TRINITY PROTOCOL PRODUCTION RELAYER");
        console.log("=".repeat(60));
        
        this.validateConfig();
        
        try {
            // Initialize Ethereum with wallet
            console.log("📡 Connecting to Arbitrum Sepolia...");
            this.ethProvider = new ethers.JsonRpcProvider(CONFIG.ethereum.rpcUrl);
            this.ethWallet = new ethers.Wallet(CONFIG.ethereum.privateKey, this.ethProvider);
            
            // Test connection
            const network = await this.retryOperation(() => this.ethProvider.getNetwork());
            console.log(`   ✅ Connected to chain ID: ${network.chainId}`);
            
            // Check wallet balance
            const balance = await this.ethWallet.provider.getBalance(this.ethWallet.address);
            const balanceEth = parseFloat(ethers.formatEther(balance));
            console.log(`   💰 Relayer balance: ${balanceEth.toFixed(4)} ETH`);
            
            if (balanceEth < CONFIG.relayer.minBalanceEth) {
                console.log(`   ⚠️  WARNING: Balance below minimum (${CONFIG.relayer.minBalanceEth} ETH)`);
                console.log(`   ⚠️  Please fund wallet: ${this.ethWallet.address}`);
            }
            
            // Initialize bridge contract with signer
            this.bridgeContract = new ethers.Contract(
                CONFIG.ethereum.bridgeAddress,
                BRIDGE_ABI,
                this.ethWallet  // Use wallet for signing transactions
            );
            
            // Test contract connection
            await this.retryOperation(() => this.bridgeContract.getOperationConsensus(1));
            console.log(`   ✅ Bridge contract accessible`);
            
            // Initialize Solana
            console.log("📡 Connecting to Solana Devnet...");
            this.solanaConnection = new Connection(CONFIG.solana.rpcUrl, 'confirmed');
            const version = await this.retryOperation(() => this.solanaConnection.getVersion());
            console.log(`   ✅ Connected to Solana v${version['solana-core']}`);
            
            // Initialize TON
            console.log("📡 Connecting to TON Testnet...");
            const endpoint = await getHttpEndpoint({ network: CONFIG.ton.network });
            this.tonClient = new TonClient({ endpoint });
            
            const tonContract = Address.parse(CONFIG.ton.contractAddress);
            const result = await this.retryOperation(() => 
                this.tonClient.runMethod(tonContract, 'get_is_active')
            );
            const isActive = result.stack.readNumber();
            console.log(`   ✅ TON contract active: ${isActive === 1 ? 'Yes' : 'No'}`);
            
            this.isInitialized = true;
            console.log("\n✅ All chains connected and verified!");
            console.log(`🔑 Relayer address: ${this.ethWallet.address}`);
            console.log("=".repeat(60));
            
        } catch (error) {
            console.error("❌ Initialization failed:", error.message);
            throw error;
        }
    }

    /**
     * FIX #4: Retry Logic for Network Failures
     */
    async retryOperation(operation, maxRetries = CONFIG.relayer.maxRetries) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                this.stats.retries++;
                
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
                    console.log(`   ⏳ Retry ${attempt}/${maxRetries} after ${delay}ms...`);
                    await this.sleep(delay);
                } else {
                    this.stats.errors++;
                }
            }
        }
        
        throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * FIX #1: Real Merkle Proof Generation from Solana
     * PRODUCTION: Reads actual proof data stored on-chain by Solana program
     */
    async getSolanaProof(operationId) {
        try {
            const programId = new PublicKey(CONFIG.solana.programId);
            
            // Derive PDA for proof record (matches Solana program: seeds = [b"proof", operation_id])
            const operationIdBuffer = Buffer.alloc(32);
            operationIdBuffer.writeBigUInt64BE(BigInt(operationId), 24);
            
            const [proofPda] = PublicKey.findProgramAddressSync(
                [Buffer.from('proof'), operationIdBuffer],
                programId
            );
            
            // Fetch REAL proof record from Solana blockchain
            const accountInfo = await this.retryOperation(() => 
                this.solanaConnection.getAccountInfo(proofPda)
            );
            
            if (!accountInfo || !accountInfo.data) {
                console.log(`   ⚠️  Solana proof not found for operation ${operationId}`);
                return null;
            }
            
            // PRODUCTION: Parse ProofRecord structure from Solana program
            // struct ProofRecord {
            //     operation_id: [u8; 32],          // bytes 8-40  (anchor discriminator 8 bytes)
            //     merkle_root: [u8; 32],           // bytes 40-72
            //     merkle_proof: Vec<[u8; 32]>,     // bytes 72+ (vec with max 10 siblings)
            //     ...
            // }
            
            const data = accountInfo.data;
            
            // Skip 8-byte Anchor discriminator
            let offset = 8;
            
            // Read operation_id (32 bytes) - skip it
            offset += 32;
            
            // Read merkle_root (32 bytes) - THIS IS WHAT WE NEED
            const merkleRoot = data.slice(offset, offset + 32);
            offset += 32;
            
            // Read merkle_proof vector (4 bytes length + 32 bytes per sibling)
            const proofLength = data.readUInt32LE(offset);
            offset += 4;
            
            const proof = [];
            for (let i = 0; i < proofLength; i++) {
                const sibling = data.slice(offset, offset + 32);
                proof.push('0x' + sibling.toString('hex'));
                offset += 32;
            }
            
            // Read slot from on-chain data for verification
            const slot = await this.solanaConnection.getSlot();
            
            console.log(`   ✅ REAL Solana proof retrieved for operation ${operationId}`);
            console.log(`   📝 Merkle Root: 0x${merkleRoot.toString('hex')}`);
            console.log(`   🌲 Proof Siblings: ${proofLength}`);
            console.log(`   📊 Slot: ${slot}`);
            
            return {
                merkleRoot: '0x' + merkleRoot.toString('hex'),
                merkleLeaf: '0x' + Buffer.from(operationIdBuffer).toString('hex'),
                proof: proof,  // REAL sibling hashes from blockchain!
                slot: slot
            };
            
        } catch (error) {
            console.log(`   ⚠️  Error fetching Solana proof: ${error.message}`);
            return null;
        }
    }

    /**
     * FIX #1: Real Merkle Proof Generation from TON
     * PRODUCTION: Reads actual proof data from TON contract via get_proof_record() getter
     */
    async getTONProof(operationId) {
        try {
            const contractAddress = Address.parse(CONFIG.ton.contractAddress);
            
            // Convert operation ID to 256-bit integer for TON
            const opIdBigInt = BigInt(operationId);
            
            // Query TON contract's get_proof_record(operation_id) method
            // Returns: (op_id, merkle_root, merkle_proof_cell, ton_block_hash, ton_tx_hash, 
            //           ton_block_number, timestamp, submitted, eth_tx_hash)
            const result = await this.retryOperation(() => 
                this.tonClient.runMethod(
                    contractAddress, 
                    'get_proof_record',
                    [{ type: 'int', value: opIdBigInt.toString() }]
                )
            );
            
            // Parse result from TON stack
            const returnedOpId = result.stack.readBigNumber();
            
            // Check if proof exists (operation_id == 0 means not found)
            if (returnedOpId.eq(0)) {
                console.log(`   ⚠️  TON proof not found for operation ${operationId}`);
                return null;
            }
            
            const merkleRoot = result.stack.readBigNumber();
            const merkleProofCell = result.stack.readCell();
            const tonBlockHash = result.stack.readBigNumber();
            const tonTxHash = result.stack.readBigNumber();
            const tonBlockNumber = result.stack.readBigNumber();
            const timestamp = result.stack.readBigNumber();
            const submitted = result.stack.readNumber();
            const ethTxHash = result.stack.readBigNumber();
            
            // Parse Merkle proof siblings from cell
            const proof = this.parseTONMerkleProofCell(merkleProofCell);
            
            console.log(`   ✅ REAL TON proof retrieved for operation ${operationId}`);
            console.log(`   📝 Merkle Root: 0x${merkleRoot.toString(16).padStart(64, '0')}`);
            console.log(`   🌲 Proof Siblings: ${proof.length}`);
            console.log(`   📊 TON Block: ${tonBlockNumber.toString()}`);
            console.log(`   ⏰ Timestamp: ${new Date(timestamp.toNumber() * 1000).toISOString()}`);
            
            return {
                merkleRoot: '0x' + merkleRoot.toString(16).padStart(64, '0'),
                merkleLeaf: '0x' + opIdBigInt.toString(16).padStart(64, '0'),
                proof: proof,  // REAL sibling hashes from TON contract!
                tonBlockNumber: tonBlockNumber.toString(),
                timestamp: timestamp.toString()
            };
            
        } catch (error) {
            console.log(`   ⚠️  Error fetching TON proof: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Parse Merkle proof siblings from TON cell structure
     * TON stores proof as a cell containing sequential 256-bit hashes
     */
    parseTONMerkleProofCell(cell) {
        try {
            const slice = cell.beginParse();
            const proof = [];
            
            // Read 256-bit hashes until cell is empty
            while (slice.remainingBits >= 256) {
                const sibling = slice.loadUintBig(256);
                proof.push('0x' + sibling.toString(16).padStart(64, '0'));
            }
            
            // Check if there are more siblings in referenced cells
            while (slice.remainingRefs > 0) {
                const refCell = slice.loadRef();
                const refProof = this.parseTONMerkleProofCell(refCell);
                proof.push(...refProof);
            }
            
            return proof;
        } catch (error) {
            console.log(`   ⚠️  Error parsing TON proof cell: ${error.message}`);
            return [];
        }
    }


    /**
     * FIX #2 & #6: Authenticated Proof Submission with Gas Management
     * PRODUCTION: Submits REAL Merkle proofs with leaf + siblings
     */
    async submitProofToEthereum(operationId, chainType, proofData) {
        try {
            console.log(`\n📤 Submitting ${chainType} proof to Ethereum...`);
            
            // Check if already submitted
            const consensus = await this.bridgeContract.getOperationConsensus(operationId);
            
            if (chainType === 'Solana' && consensus.solanaConfirmed > 0) {
                console.log(`   ℹ️  Solana proof already submitted`);
                return false;
            }
            
            if (chainType === 'TON' && consensus.tonConfirmed > 0) {
                console.log(`   ℹ️  TON proof already submitted`);
                return false;
            }
            
            // Select correct function
            const submitFunction = chainType === 'Solana' ? 
                'submitSolanaProof' : 'submitTONProof';
            
            // PRODUCTION: Include merkleLeaf in proof submission
            const merkleLeaf = proofData.merkleLeaf || proofData.merkleRoot;
            
            // FIX #6: Gas Estimation
            let gasLimit;
            try {
                gasLimit = await this.bridgeContract[submitFunction].estimateGas(
                    operationId,
                    proofData.merkleRoot,
                    merkleLeaf,
                    proofData.proof
                );
                // Add 20% buffer
                gasLimit = (gasLimit * 120n) / 100n;
                console.log(`   ⛽ Estimated gas: ${gasLimit.toString()}`);
            } catch (error) {
                console.log(`   ⚠️  Gas estimation failed, using default: ${error.message}`);
                gasLimit = 300000n; // Fallback
            }
            
            // Get current gas price and apply multiplier
            const feeData = await this.ethProvider.getFeeData();
            const gasPrice = (feeData.gasPrice * BigInt(Math.floor(CONFIG.relayer.gasPriceMultiplier * 100))) / 100n;
            
            console.log(`   ⛽ Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
            
            // Submit transaction with REAL proof data
            const tx = await this.retryOperation(() => 
                this.bridgeContract[submitFunction](
                    operationId,
                    proofData.merkleRoot,
                    merkleLeaf,
                    proofData.proof,
                    {
                        gasLimit: gasLimit,
                        gasPrice: gasPrice
                    }
                )
            );
            
            console.log(`   📝 Transaction sent: ${tx.hash}`);
            console.log(`   ⏳ Waiting for confirmation...`);
            
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log(`   ✅ REAL proof submitted successfully!`);
                console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
                this.stats.proofsSubmitted++;
                return true;
            } else {
                console.log(`   ❌ Transaction failed`);
                return false;
            }
            
        } catch (error) {
            console.error(`   ❌ Error submitting proof: ${error.message}`);
            
            // Parse error for specific issues
            if (error.message.includes('insufficient funds')) {
                console.log(`   💰 Insufficient funds. Please fund wallet: ${this.ethWallet.address}`);
            } else if (error.message.includes('nonce')) {
                console.log(`   ⚠️  Nonce error - transaction may be pending`);
            } else if (error.message.includes('Invalid Merkle proof')) {
                console.log(`   ❌ CRITICAL: Merkle proof verification failed on-chain!`);
                console.log(`   📊 Proof data: root=${proofData.merkleRoot}, leaf=${merkleLeaf}, siblings=${proofData.proof.length}`);
            }
            
            throw error;
        }
    }

    /**
     * Monitor Ethereum events and collect proofs
     */
    async monitorEthereumEvents() {
        console.log("\n👀 Monitoring Ethereum for new operations...");
        
        this.bridgeContract.on('OperationInitiated', async (operationId, user, operationType, event) => {
            console.log(`\n🔔 NEW OPERATION DETECTED!`);
            console.log(`   Operation ID: ${operationId}`);
            console.log(`   User: ${user}`);
            console.log(`   Type: ${operationType}`);
            console.log(`   Block: ${event.log.blockNumber}`);
            
            // Process operation
            await this.processOperation(operationId.toString());
        });
        
        this.bridgeContract.on('ConsensusReached', (operationId, consensusCount) => {
            console.log(`\n🎉 CONSENSUS REACHED for Operation ${operationId}!`);
            console.log(`   Consensus count: ${consensusCount}/3`);
            this.stats.consensusAchieved++;
        });
    }

    /**
     * FIX #7: End-to-End Operation Processing
     */
    async processOperation(operationId) {
        try {
            console.log(`\n🔍 Processing operation ${operationId}...`);
            
            // Step 1: Collect Solana proof
            console.log("   📊 Collecting Solana proof...");
            const solanaProof = await this.getSolanaProof(operationId);
            
            // Step 2: Collect TON proof
            console.log("   📊 Collecting TON proof...");
            const tonProof = await this.getTONProof(operationId);
            
            // Step 3: Submit proofs to Ethereum (if auto-submission enabled)
            if (CONFIG.relayer.enableAutoSubmission) {
                if (solanaProof) {
                    await this.submitProofToEthereum(operationId, 'Solana', solanaProof);
                    await this.sleep(2000); // Small delay between submissions
                }
                
                if (tonProof) {
                    await this.submitProofToEthereum(operationId, 'TON', tonProof);
                }
            }
            
            // Step 4: Check consensus
            await this.checkConsensus(operationId);
            
        } catch (error) {
            console.error(`   ❌ Error processing operation: ${error.message}`);
            this.stats.errors++;
        }
    }

    /**
     * Check consensus status
     */
    async checkConsensus(operationId) {
        try {
            const consensus = await this.bridgeContract.getOperationConsensus(operationId);
            console.log(`\n   📊 Consensus Status for Operation ${operationId}:`);
            console.log(`      Arbitrum: ${consensus.arbitrumConfirmed > 0 ? '✅' : '⏳'}`);
            console.log(`      Solana: ${consensus.solanaConfirmed > 0 ? '✅' : '⏳'}`);
            console.log(`      TON: ${consensus.tonConfirmed > 0 ? '✅' : '⏳'}`);
            console.log(`      Consensus: ${consensus.consensusReached ? '✅ REACHED' : '⏳ PENDING'}`);
            
            if (consensus.consensusReached) {
                console.log(`\n   🎉 2-of-3 CONSENSUS ACHIEVED!`);
            }
            
            return consensus;
        } catch (error) {
            console.log(`   ⚠️  Error checking consensus: ${error.message}`);
            return null;
        }
    }

    /**
     * FIX #7: Manual Test Mode
     */
    async runTests() {
        console.log("\n🧪 RUNNING END-TO-END TESTS");
        console.log("=".repeat(60));
        
        const testOpId = 1;
        
        // Test 1: Connection Tests
        console.log("\n✅ Test 1: Connection Tests - PASSED");
        console.log(`   Arbitrum: Connected`);
        console.log(`   Solana: Connected`);
        console.log(`   TON: Connected`);
        
        // Test 2: Balance Verification
        const balance = await this.ethWallet.provider.getBalance(this.ethWallet.address);
        console.log(`\n✅ Test 2: Balance Verification - ${parseFloat(ethers.formatEther(balance)) >= CONFIG.relayer.minBalanceEth ? 'PASSED' : 'WARNING'}`);
        console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
        
        // Test 3: Proof Generation
        console.log(`\n🧪 Test 3: Proof Generation`);
        const solanaProof = await this.getSolanaProof(testOpId);
        const tonProof = await this.getTONProof(testOpId);
        console.log(`   ${solanaProof ? '✅' : '❌'} Solana proof generation`);
        console.log(`   ${tonProof ? '✅' : '❌'} TON proof generation`);
        
        // Test 4: Consensus Check
        console.log(`\n🧪 Test 4: Consensus Verification`);
        await this.checkConsensus(testOpId);
        
        console.log("\n" + "=".repeat(60));
        console.log("📊 Test Summary:");
        console.log(`   Proofs Submitted: ${this.stats.proofsSubmitted}`);
        console.log(`   Consensus Achieved: ${this.stats.consensusAchieved}`);
        console.log(`   Errors: ${this.stats.errors}`);
        console.log(`   Retries: ${this.stats.retries}`);
        console.log("=".repeat(60));
    }

    /**
     * Print statistics
     */
    printStats() {
        console.log("\n📊 RELAYER STATISTICS");
        console.log("=".repeat(60));
        console.log(`   Proofs Submitted: ${this.stats.proofsSubmitted}`);
        console.log(`   Consensus Achieved: ${this.stats.consensusAchieved}`);
        console.log(`   Errors: ${this.stats.errors}`);
        console.log(`   Retries: ${this.stats.retries}`);
        console.log(`   Uptime: ${process.uptime().toFixed(0)}s`);
        console.log("=".repeat(60));
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log("\n🛑 Shutting down relayer...");
        this.printStats();
        
        if (this.bridgeContract) {
            this.bridgeContract.removeAllListeners();
        }
        
        console.log("👋 Goodbye!");
        process.exit(0);
    }

    /**
     * Start relayer
     */
    async start(testMode = false) {
        try {
            await this.initialize();
            
            if (testMode) {
                await this.runTests();
            } else {
                console.log("\n👂 Relayer now listening for events...");
                console.log("   Press Ctrl+C to stop\n");
                await this.monitorEthereumEvents();
                
                // Print stats every 5 minutes
                setInterval(() => this.printStats(), 300000);
            }
            
        } catch (error) {
            console.error("❌ Fatal error:", error.message);
            process.exit(1);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Handle graceful shutdown
const relayer = new TrinityRelayerProduction();

process.on('SIGINT', () => relayer.shutdown());
process.on('SIGTERM', () => relayer.shutdown());

// Run relayer
const testMode = process.argv.includes('--test');
relayer.start(testMode).catch(error => {
    console.error("❌ Relayer crashed:", error.message);
    console.error(error.stack);
    process.exit(1);
});
