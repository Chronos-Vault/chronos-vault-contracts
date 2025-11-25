// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:21.983Z
///! Trinity Protocol Validator for Solana
///! 
///! This program monitors Ethereum CrossChainBridgeOptimized events and submits
///! Merkle proofs back to Ethereum for 2-of-3 consensus verification.
///! 
///! Integration: Solana → Ethereum/Arbitrum L2
///! Role: High-frequency monitoring and proof submission (<5 seconds)

use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak::hashv;

declare_id!("TrNtyV4L1D4T0RSoLAN4C0nsENSuS1111111111111");

#[program]
pub mod trinity_validator {
    use super::*;

    /// Initialize the Trinity Validator program
    /// Connects to Ethereum CrossChainBridgeOptimized contract
    pub fn initialize(
        ctx: Context<Initialize>,
        ethereum_bridge_address: [u8; 20],      // CrossChainBridgeOptimized address
        validator_ethereum_address: [u8; 20],   // Validator's Ethereum address
        arbitrum_rpc_url: String,               // Arbitrum Sepolia/Mainnet RPC
    ) -> Result<()> {
        let validator = &mut ctx.accounts.validator;
        validator.authority = ctx.accounts.authority.key();
        validator.ethereum_bridge_address = ethereum_bridge_address;
        validator.validator_ethereum_address = validator_ethereum_address;
        validator.arbitrum_rpc_url = arbitrum_rpc_url;
        validator.total_proofs_submitted = 0;
        validator.last_processed_operation = 0;
        validator.is_active = true;
        validator.bump = *ctx.bumps.get("validator").unwrap();
        
        msg!("Trinity Validator initialized for Ethereum bridge: {:?}", ethereum_bridge_address);
        Ok(())
    }

    /// Submit Trinity consensus proof to Ethereum
    /// Called by off-chain validator service after monitoring Ethereum events
    pub fn submit_consensus_proof(
        ctx: Context<SubmitProof>,
        operation_id: [u8; 32],                 // Ethereum operation ID
        merkle_proof: Vec<[u8; 32]>,            // Merkle proof from Solana state
        solana_block_hash: [u8; 32],            // Solana block hash
        solana_tx_signature: [u8; 64],          // Solana transaction signature
        solana_block_number: u64,               // Solana slot number
    ) -> Result<()> {
        let validator = &mut ctx.accounts.validator;
        let proof_record = &mut ctx.accounts.proof_record;
        
        require!(validator.is_active, TrinityError::ValidatorNotActive);
        
        // Generate Merkle root from proof
        let merkle_root = calculate_merkle_root(&merkle_proof, &operation_id);
        
        // Store proof record on Solana
        proof_record.operation_id = operation_id;
        proof_record.merkle_root = merkle_root;
        proof_record.merkle_proof = merkle_proof;
        proof_record.solana_block_hash = solana_block_hash;
        proof_record.solana_tx_signature = solana_tx_signature;
        proof_record.solana_block_number = solana_block_number;
        proof_record.timestamp = Clock::get()?.unix_timestamp as u64;
        proof_record.submitted_to_ethereum = false;
        proof_record.validator = validator.key();
        
        validator.total_proofs_submitted += 1;
        
        msg!("Solana proof generated for operation: {:?}", operation_id);
        msg!("Merkle root: {:?}", merkle_root);
        msg!("Block number: {}", solana_block_number);
        
        // Emit event for off-chain relayer to submit to Ethereum
        emit!(ProofGenerated {
            operation_id,
            merkle_root,
            solana_block_hash,
            solana_block_number,
            timestamp: proof_record.timestamp,
        });
        
        Ok(())
    }

    /// Mark proof as submitted to Ethereum
    /// Called after off-chain relayer confirms Ethereum transaction
    pub fn confirm_ethereum_submission(
        ctx: Context<ConfirmSubmission>,
        operation_id: [u8; 32],
        ethereum_tx_hash: [u8; 32],
    ) -> Result<()> {
        let proof_record = &mut ctx.accounts.proof_record;
        
        require!(!proof_record.submitted_to_ethereum, TrinityError::AlreadySubmitted);
        
        proof_record.submitted_to_ethereum = true;
        proof_record.ethereum_tx_hash = ethereum_tx_hash;
        
        msg!("Ethereum submission confirmed for operation: {:?}", operation_id);
        msg!("Ethereum TX: {:?}", ethereum_tx_hash);
        
        Ok(())
    }

    /// Verify vault operation for Trinity consensus
    /// Checks vault state on Solana and generates Merkle proof for Ethereum
    pub fn verify_vault_operation(
        ctx: Context<VerifyOperation>,
        vault_id: u64,
        vault_owner: Pubkey,              // Vault owner from Ethereum
        operation_type: OperationType,
        amount: u64,
        user: Pubkey,
    ) -> Result<()> {
        let verification = &mut ctx.accounts.verification;
        let validator = &ctx.accounts.validator;
        let vault = &ctx.accounts.vault;
        
        // SECURITY: Verify vault exists and is owned by correct user
        require!(*vault.owner != System::id(), TrinityError::VaultNotInitialized);
        require!(vault.key() == vault_owner, TrinityError::VaultMismatch);
        
        // Generate verification proof that will be submitted to Ethereum
        let verification_hash = hashv(&[
            &vault_id.to_le_bytes(),
            vault_owner.as_ref(),
            &[operation_type as u8],
            &amount.to_le_bytes(),
            user.as_ref(),
            &Clock::get()?.unix_timestamp.to_le_bytes(),
        ]);
        
        verification.vault_id = vault_id;
        verification.vault_owner = vault_owner;
        verification.operation_type = operation_type;
        verification.amount = amount;
        verification.user = user;
        verification.verification_hash = verification_hash.0;
        verification.timestamp = Clock::get()?.unix_timestamp as u64;
        verification.validator = validator.key();
        
        msg!("✅ Vault operation verified on Solana");
        msg!("   Vault ID: {}", vault_id);
        msg!("   Vault Owner: {}", vault_owner);
        msg!("   Operation: {:?}", operation_type);
        msg!("   Amount: {}", amount);
        msg!("   User: {}", user);
        
        // Emit event for off-chain relayer to submit to Ethereum
        emit!(OperationVerified {
            vault_id,
            vault_owner,
            operation_type,
            amount,
            user,
            verification_hash: verification_hash.0,
        });
        
        Ok(())
    }

    /// Update validator configuration
    pub fn update_validator(
        ctx: Context<UpdateValidator>,
        new_arbitrum_rpc: Option<String>,
        new_ethereum_bridge: Option<[u8; 20]>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let validator = &mut ctx.accounts.validator;
        
        if let Some(rpc) = new_arbitrum_rpc {
            validator.arbitrum_rpc_url = rpc;
        }
        
        if let Some(bridge) = new_ethereum_bridge {
            validator.ethereum_bridge_address = bridge;
        }
        
        if let Some(active) = is_active {
            validator.is_active = active;
        }
        
        msg!("Validator configuration updated");
        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + TrinityValidator::INIT_SPACE,
        seeds = [b"trinity_validator"],
        bump
    )]
    pub validator: Account<'info, TrinityValidator>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct SubmitProof<'info> {
    #[account(mut, seeds = [b"trinity_validator"], bump = validator.bump)]
    pub validator: Account<'info, TrinityValidator>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + ProofRecord::INIT_SPACE,
        seeds = [b"proof", operation_id.as_ref()],
        bump
    )]
    pub proof_record: Account<'info, ProofRecord>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ConfirmSubmission<'info> {
    #[account(
        mut,
        seeds = [b"proof", operation_id.as_ref()],
        bump
    )]
    pub proof_record: Account<'info, ProofRecord>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(vault_id: u64, vault_owner: Pubkey)]
pub struct VerifyOperation<'info> {
    #[account(seeds = [b"trinity_validator"], bump = validator.bump)]
    pub validator: Account<'info, TrinityValidator>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + VaultVerification::INIT_SPACE,
        seeds = [b"verification", &vault_id.to_le_bytes(), vault_owner.as_ref()],
        bump
    )]
    pub verification: Account<'info, VaultVerification>,
    
    /// CHECK: Vault account - verified by checking it's not System-owned and matches vault_owner
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateValidator<'info> {
    #[account(
        mut,
        seeds = [b"trinity_validator"],
        bump = validator.bump,
        has_one = authority
    )]
    pub validator: Account<'info, TrinityValidator>,
    
    pub authority: Signer<'info>,
}

// ============================================================================
// State Structures
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct TrinityValidator {
    pub authority: Pubkey,                          // Validator authority
    pub ethereum_bridge_address: [u8; 20],          // CrossChainBridgeOptimized address
    pub validator_ethereum_address: [u8; 20],       // Validator's Ethereum address (for signing)
    #[max_len(200)]
    pub arbitrum_rpc_url: String,                   // Arbitrum RPC endpoint
    pub total_proofs_submitted: u64,                // Total proofs generated
    pub last_processed_operation: u64,              // Last operation ID processed
    pub is_active: bool,                            // Validator active status
    pub bump: u8,                                   // PDA bump
}

#[account]
#[derive(InitSpace)]
pub struct ProofRecord {
    pub operation_id: [u8; 32],                     // Ethereum operation ID
    pub merkle_root: [u8; 32],                      // Computed Merkle root
    #[max_len(10)]
    pub merkle_proof: Vec<[u8; 32]>,                // Merkle proof path
    pub solana_block_hash: [u8; 32],                // Solana block hash
    pub solana_tx_signature: [u8; 64],              // Solana transaction signature
    pub solana_block_number: u64,                   // Solana slot number
    pub timestamp: u64,                             // Proof generation timestamp
    pub submitted_to_ethereum: bool,                // Ethereum submission status
    pub ethereum_tx_hash: [u8; 32],                 // Ethereum transaction hash
    pub validator: Pubkey,                          // Validator that generated proof
}

#[account]
#[derive(InitSpace)]
pub struct VaultVerification {
    pub vault_id: u64,                              // Vault identifier from Ethereum
    pub vault_owner: Pubkey,                        // Vault owner public key
    pub operation_type: OperationType,              // Operation being verified
    pub amount: u64,                                // Operation amount
    pub user: Pubkey,                               // User initiating operation
    pub verification_hash: [u8; 32],                // Verification hash (submitted to Ethereum)
    pub timestamp: u64,                             // Verification timestamp
    pub validator: Pubkey,                          // Validator that verified
}

// ============================================================================
// Enums
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum OperationType {
    VaultWithdrawal,
    HTLCSwap,
    EmergencyRecovery,
    CrossChainTransfer,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct ProofGenerated {
    pub operation_id: [u8; 32],
    pub merkle_root: [u8; 32],
    pub solana_block_hash: [u8; 32],
    pub solana_block_number: u64,
    pub timestamp: u64,
}

#[event]
pub struct OperationVerified {
    pub vault_id: u64,
    pub vault_owner: Pubkey,
    pub operation_type: OperationType,
    pub amount: u64,
    pub user: Pubkey,
    pub verification_hash: [u8; 32],
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Calculate Merkle root from proof and leaf
fn calculate_merkle_root(proof: &[[u8; 32]], leaf: &[u8; 32]) -> [u8; 32] {
    let mut current_hash = *leaf;
    
    for proof_element in proof {
        current_hash = if current_hash < *proof_element {
            hashv(&[&current_hash, proof_element]).0
        } else {
            hashv(&[proof_element, &current_hash]).0
        };
    }
    
    current_hash
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum TrinityError {
    #[msg("Validator is not active")]
    ValidatorNotActive,
    
    #[msg("Proof already submitted to Ethereum")]
    AlreadySubmitted,
    
    #[msg("Vault ID mismatch")]
    VaultMismatch,
    
    #[msg("Unauthorized user")]
    UnauthorizedUser,
    
    #[msg("Invalid Merkle proof")]
    InvalidMerkleProof,
    
    #[msg("Operation not found")]
    OperationNotFound,
    
    #[msg("Vault not initialized (owned by System program)")]
    VaultNotInitialized,
}
