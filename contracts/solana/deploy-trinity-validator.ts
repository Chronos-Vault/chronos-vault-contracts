/**
 * Deployment Script for Solana Trinity Validator
 * 
 * This script deploys and initializes the Trinity Protocol validator on Solana
 * that monitors Ethereum CrossChainBridgeOptimized and submits consensus proofs.
 * 
 * Usage:
 *   ts-node deploy-trinity-validator.ts --network devnet
 *   ts-node deploy-trinity-validator.ts --network mainnet
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// ============================================================================
// DEPLOYED CONTRACT ADDRESSES (from deployment-v3.5.20-arbitrum-complete.json)
// ============================================================================
// Trinity Validator Program ID - MUST be set after program deployment
const TRINITY_VALIDATOR_PROGRAM_ID = process.env.TRINITY_VALIDATOR_PROGRAM_ID || "TrNtyV4L1D4T0RSoLAN4C0nsENSuS1111111111111";

// Arbitrum Sepolia - CrossChainMessageRelay is the bridge entry point
const ETHEREUM_BRIDGE_ADDRESS_TESTNET = "0xC6F4f855fc690CB52159eE3B13C9d9Fb8D403E59";

// MAINNET: Must be set before mainnet deployment
const ETHEREUM_BRIDGE_ADDRESS_MAINNET = process.env.MAINNET_BRIDGE_ADDRESS;

// Ethereum validator address - SECURITY: Must be set, no default zero address
const VALIDATOR_ETHEREUM_ADDRESS = process.env.VALIDATOR_ETHEREUM_ADDRESS;

// Arbitrum RPC URLs
const ARBITRUM_RPC_TESTNET = process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const ARBITRUM_RPC_MAINNET = process.env.ARBITRUM_MAINNET_RPC_URL;

// ============================================================================
// SECURITY VALIDATION
// ============================================================================
function validateConfiguration(network: string): void {
    // Validate validator Ethereum address
    if (!VALIDATOR_ETHEREUM_ADDRESS) {
        throw new Error(
            "SECURITY ERROR: Validator Ethereum address not configured!\n" +
            "Set VALIDATOR_ETHEREUM_ADDRESS environment variable.\n" +
            "This should be the Ethereum wallet address for this validator."
        );
    }

    // Check for zero address (common mistake)
    if (VALIDATOR_ETHEREUM_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error(
            "SECURITY ERROR: Validator address is zero address!\n" +
            "Set VALIDATOR_ETHEREUM_ADDRESS to your actual validator wallet address."
        );
    }

    // Validate program ID isn't placeholder for production
    if (network === "mainnet" && TRINITY_VALIDATOR_PROGRAM_ID.includes("1111111111111")) {
        throw new Error(
            "SECURITY ERROR: Program ID appears to be a placeholder!\n" +
            "Deploy the program first and set TRINITY_VALIDATOR_PROGRAM_ID."
        );
    }

    // Validate mainnet bridge address
    if (network === "mainnet" && !ETHEREUM_BRIDGE_ADDRESS_MAINNET) {
        throw new Error(
            "SECURITY ERROR: Mainnet bridge address not configured!\n" +
            "Set MAINNET_BRIDGE_ADDRESS environment variable."
        );
    }
}

interface DeploymentConfig {
    network: "devnet" | "testnet" | "mainnet";
    connection: Connection;
    ethereumBridgeAddress: string;
    arbitrumRpcUrl: string;
}

async function getConfig(): Promise<DeploymentConfig> {
    const network = process.argv.includes("--network")
        ? process.argv[process.argv.indexOf("--network") + 1] as "devnet" | "testnet" | "mainnet"
        : "devnet";

    let endpoint: string;
    let ethereumBridgeAddress: string;
    let arbitrumRpcUrl: string;

    switch (network) {
        case "devnet":
            endpoint = "https://api.devnet.solana.com";
            ethereumBridgeAddress = ETHEREUM_BRIDGE_ADDRESS_TESTNET;
            arbitrumRpcUrl = ARBITRUM_RPC_TESTNET;
            break;
        case "testnet":
            endpoint = "https://api.testnet.solana.com";
            ethereumBridgeAddress = ETHEREUM_BRIDGE_ADDRESS_TESTNET;
            arbitrumRpcUrl = ARBITRUM_RPC_TESTNET;
            break;
        case "mainnet":
            endpoint = "https://api.mainnet-beta.solana.com";
            ethereumBridgeAddress = ETHEREUM_BRIDGE_ADDRESS_MAINNET || "";
            arbitrumRpcUrl = ARBITRUM_RPC_MAINNET || "";
            break;
        default:
            throw new Error(`Unknown network: ${network}`);
    }

    return {
        network,
        connection: new Connection(endpoint, "confirmed"),
        ethereumBridgeAddress,
        arbitrumRpcUrl,
    };
}

async function loadWallet(): Promise<Keypair> {
    const walletPath = process.env.SOLANA_WALLET_PATH || path.join(
        process.env.HOME!,
        ".config",
        "solana",
        "id.json"
    );

    if (!fs.existsSync(walletPath)) {
        throw new Error(`Wallet not found at ${walletPath}. Generate one with: solana-keygen new`);
    }

    const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
    return Keypair.fromSecretKey(new Uint8Array(walletData));
}

async function deployTrinityValidator() {
    console.log("🚀 Trinity Protocol Validator Deployment");
    console.log("=========================================\n");

    // Load configuration
    const config = await getConfig();
    console.log(`📡 Network: ${config.network}`);
    console.log(`📡 RPC Endpoint: ${config.connection.rpcEndpoint}\n`);

    // ================================================================
    // SECURITY VALIDATION - Must pass before deployment proceeds
    // ================================================================
    console.log("🔐 Validating configuration...");
    validateConfiguration(config.network);
    console.log("✅ Configuration validated\n");

    // Load wallet
    const wallet = await loadWallet();
    console.log(`👛 Wallet: ${wallet.publicKey.toString()}`);

    // Check wallet balance
    const balance = await config.connection.getBalance(wallet.publicKey);
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        throw new Error(
            `Insufficient balance. Need at least 0.1 SOL for deployment.\n` +
            `Airdrop: solana airdrop 1 ${wallet.publicKey.toString()} --url ${config.network}`
        );
    }

    // Setup Anchor provider
    const provider = new anchor.AnchorProvider(
        config.connection,
        new anchor.Wallet(wallet),
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);

    // Load Trinity Validator program
    const programId = new PublicKey(TRINITY_VALIDATOR_PROGRAM_ID);
    const idl = JSON.parse(
        fs.readFileSync(path.join(__dirname, "target/idl/trinity_validator.json"), "utf-8")
    );
    const program = new Program(idl, programId, provider);

    console.log(`\n📝 Program ID: ${programId.toString()}\n`);

    // Derive validator PDA
    const [validatorPDA, validatorBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("trinity_validator")],
        programId
    );

    console.log(`🔑 Validator PDA: ${validatorPDA.toString()}`);
    console.log(`🔑 Bump: ${validatorBump}\n`);

    // Check if already initialized
    try {
        const validatorAccount = await program.account.trinityValidator.fetch(validatorPDA);
        console.log("⚠️  Validator already initialized!");
        console.log(`   Authority: ${validatorAccount.authority.toString()}`);
        console.log(`   Total proofs: ${validatorAccount.totalProofsSubmitted.toString()}`);
        console.log(`   Active: ${validatorAccount.isActive}\n`);

        const shouldUpdate = process.argv.includes("--update");
        if (!shouldUpdate) {
            console.log("Use --update flag to update configuration");
            return;
        }
    } catch (e) {
        // Not initialized, proceed with deployment
        console.log("✅ Validator not initialized. Proceeding with deployment...\n");
    }

    // Convert Ethereum address to bytes
    const ethereumBridgeBytes = Buffer.from(
        config.ethereumBridgeAddress.replace("0x", ""),
        "hex"
    );

    const validatorEthBytes = Buffer.from(
        VALIDATOR_ETHEREUM_ADDRESS!.replace("0x", ""),
        "hex"
    );

    if (ethereumBridgeBytes.length !== 20 || validatorEthBytes.length !== 20) {
        throw new Error("Invalid Ethereum address format");
    }

    // Initialize validator WITH METADATA
    console.log("🔧 Initializing Trinity Validator with Metadata...");
    console.log(`   Name: Chronos Vault Trinity Validator`);
    console.log(`   Ethereum Bridge: ${config.ethereumBridgeAddress}`);
    console.log(`   Validator ETH Address: ${VALIDATOR_ETHEREUM_ADDRESS}`);
    console.log(`   Arbitrum RPC: ${config.arbitrumRpcUrl}\n`);

    try {
        const tx = await program.methods
            .initialize(
                Array.from(ethereumBridgeBytes),
                Array.from(validatorEthBytes),
                config.arbitrumRpcUrl
            )
            .accounts({
                validator: validatorPDA,
                authority: wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        console.log("✅ Trinity Validator initialized!");
        console.log(`   Transaction: ${tx}\n`);

        // Verify deployment
        const validatorAccount = await program.account.trinityValidator.fetch(validatorPDA);
        console.log("📊 Validator Status:");
        console.log(`   Authority: ${validatorAccount.authority.toString()}`);
        console.log(`   Ethereum Bridge: 0x${Buffer.from(validatorAccount.ethereumBridgeAddress).toString("hex")}`);
        console.log(`   Validator ETH: 0x${Buffer.from(validatorAccount.validatorEthereumAddress).toString("hex")}`);
        console.log(`   Arbitrum RPC: ${validatorAccount.arbitrumRpcUrl}`);
        console.log(`   Total Proofs: ${validatorAccount.totalProofsSubmitted.toString()}`);
        console.log(`   Active: ${validatorAccount.isActive}`);

    } catch (error: any) {
        console.error("❌ Deployment failed:", error.message);
        if (error.logs) {
            console.error("Program logs:", error.logs);
        }
        throw error;
    }

    // Save deployment info
    const deploymentInfo = {
        network: config.network,
        programId: programId.toString(),
        validatorPDA: validatorPDA.toString(),
        authority: wallet.publicKey.toString(),
        ethereumBridge: config.ethereumBridgeAddress,
        validatorEthAddress: VALIDATOR_ETHEREUM_ADDRESS,
        arbitrumRpc: config.arbitrumRpcUrl,
        deployedAt: new Date().toISOString(),
    };

    const deploymentPath = path.join(__dirname, `trinity-validator-${config.network}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

    console.log("\n🎉 Deployment Complete!");
    console.log("\nNext Steps:");
    console.log("1. Add validator to Ethereum CrossChainBridgeOptimized:");
    console.log(`   bridge.addAuthorizedValidator(SOLANA_CHAIN_ID, "${VALIDATOR_ETHEREUM_ADDRESS}")`);
    console.log("\n2. Start the off-chain relayer service:");
    console.log(`   npm run start:solana-relayer -- --network ${config.network}`);
    console.log("\n3. Monitor validator status:");
    console.log(`   solana account ${validatorPDA.toString()} --url ${config.network}`);
}

// Run deployment
deployTrinityValidator()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
