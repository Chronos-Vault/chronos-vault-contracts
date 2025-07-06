use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use std::convert::TryFrom;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"); // Example program ID, change this

// Supported chains
pub const CHAIN_TON: u8 = 0;
pub const CHAIN_ETHEREUM: u8 = 1;
pub const CHAIN_SOLANA: u8 = 2;

#[program]
pub mod cvt_bridge {
    use super::*;

    /// Initialize the bridge program
    pub fn initialize(
        ctx: Context<Initialize>,
        bridge_fee: u16,
        min_amount: u64,
        threshold: u8,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        bridge.owner = ctx.accounts.owner.key();
        bridge.cvt_mint = ctx.accounts.cvt_mint.key();
        bridge.bridge_fee = bridge_fee;
        bridge.min_amount = min_amount;
        bridge.threshold = threshold;
        bridge.validator_count = 0;
        bridge.bridge_nonce = 0;
        
        Ok(())
    }

    /// Bridge tokens from Solana to another chain
    pub fn bridge_out(
        ctx: Context<BridgeOut>,
        target_chain: u8,
        target_address: Vec<u8>,
        amount: u64,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        
        // Validate parameters
        require!(amount >= bridge.min_amount, ErrorCode::AmountTooSmall);
        require!(
            target_chain == CHAIN_TON || target_chain == CHAIN_ETHEREUM,
            ErrorCode::InvalidTargetChain
        );
        require!(!target_address.is_empty(), ErrorCode::InvalidTargetAddress);
        
        // Calculate fee
        let fee = (amount as u128)
            .checked_mul(bridge.bridge_fee as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let amount_after_fee = amount.checked_sub(fee as u64).unwrap();
        
        // Generate bridge nonce
        bridge.bridge_nonce = bridge.bridge_nonce.checked_add(1).unwrap();
        let nonce = bridge.bridge_nonce;
        
        // Transfer tokens to bridge vault
        let transfer_instruction = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.bridge_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );
        
        token::transfer(cpi_ctx, amount)?;
        
        // Emit bridge initiated event
        emit!(BridgeInitiatedEvent {
            user: ctx.accounts.user.key(),
            target_chain,
            target_address,
            amount: amount_after_fee,
            fee: fee as u64,
            nonce,
        });
        
        Ok(())
    }

    /// Process a bridge from another chain to Solana
    pub fn bridge_in(
        ctx: Context<BridgeIn>,
        source_chain: u8,
        source_address: Vec<u8>,
        recipient: Pubkey,
        amount: u64,
        nonce: u64,
        signatures: Vec<[u8; 64]>,
        public_keys: Vec<Pubkey>,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        
        // Validate parameters
        require!(
            source_chain == CHAIN_TON || source_chain == CHAIN_ETHEREUM,
            ErrorCode::InvalidSourceChain
        );
        require!(!source_address.is_empty(), ErrorCode::InvalidSourceAddress);
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        // Compute bridge hash
        let bridge_data = BridgeData {
            source_chain,
            source_address: source_address.clone(),
            recipient,
            amount,
            nonce,
        };
        
        let bridge_hash = hash_bridge_data(&bridge_data);
        
        // Check if bridge has already been processed
        let bridge_state_address = Pubkey::find_program_address(
            &[b"bridge_state", &bridge_hash],
            ctx.program_id,
        ).0;
        
        require!(
            ctx.accounts.bridge_state.key() == bridge_state_address,
            ErrorCode::InvalidBridgeState
        );
        
        require!(!ctx.accounts.bridge_state.processed, ErrorCode::BridgeAlreadyProcessed);
        
        // Verify signatures
        let mut valid_signatures = 0;
        let message = bridge_hash.as_ref();
        
        for (i, signature) in signatures.iter().enumerate() {
            if i >= public_keys.len() {
                break;
            }
            
            let validator_pubkey = public_keys[i];
            
            // Check if pubkey is a validator
            let validator_account_address = Pubkey::find_program_address(
                &[b"validator", validator_pubkey.as_ref()],
                ctx.program_id,
            ).0;
            
            let validator_account = &ctx.accounts.validator_accounts[i];
            
            if validator_account.key() == validator_account_address && validator_account.is_active {
                // Verify signature
                if ed25519_program::verify(
                    &validator_pubkey,
                    message,
                    signature,
                ).is_ok() {
                    valid_signatures += 1;
                }
            }
        }
        
        // Check if threshold is reached
        require!(
            valid_signatures >= bridge.threshold as usize,
            ErrorCode::InsufficientSignatures
        );
        
        // Mark bridge as processed
        ctx.accounts.bridge_state.processed = true;
        
        // Transfer tokens to recipient
        let seeds = &[
            b"bridge".as_ref(),
            &[ctx.accounts.bridge.bump],
        ];
        let signer = &[&seeds[..]];
        
        let transfer_instruction = Transfer {
            from: ctx.accounts.bridge_vault.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.bridge_signer.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
            signer,
        );
        
        token::transfer(cpi_ctx, amount)?;
        
        // Emit bridge completed event
        emit!(BridgeCompletedEvent {
            recipient,
            source_chain,
            source_address,
            amount,
            nonce,
        });
        
        Ok(())
    }

    /// Add a new validator (owner only)
    pub fn add_validator(ctx: Context<ManageValidator>, validator: Pubkey) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        
        // Check if validator already exists
        require!(
            !ctx.accounts.validator_account.is_active,
            ErrorCode::ValidatorAlreadyExists
        );
        
        // Activate validator
        ctx.accounts.validator_account.is_active = true;
        bridge.validator_count = bridge.validator_count.checked_add(1).unwrap();
        
        // Emit validator added event
        emit!(ValidatorAddedEvent {
            validator,
        });
        
        Ok(())
    }

    /// Remove a validator (owner only)
    pub fn remove_validator(ctx: Context<ManageValidator>, validator: Pubkey) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        
        // Check if validator exists
        require!(
            ctx.accounts.validator_account.is_active,
            ErrorCode::ValidatorDoesNotExist
        );
        
        // Check if we can remove validator
        require!(
            bridge.validator_count > bridge.threshold as u64,
            ErrorCode::CannotRemoveValidatorBelowThreshold
        );
        
        // Deactivate validator
        ctx.accounts.validator_account.is_active = false;
        bridge.validator_count = bridge.validator_count.checked_sub(1).unwrap();
        
        // Emit validator removed event
        emit!(ValidatorRemovedEvent {
            validator,
        });
        
        Ok(())
    }

    /// Update signature threshold (owner only)
    pub fn update_threshold(ctx: Context<UpdateConfig>, new_threshold: u8) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        
        // Validate threshold
        require!(new_threshold > 0, ErrorCode::InvalidThreshold);
        require!(
            new_threshold as u64 <= bridge.validator_count,
            ErrorCode::ThresholdExceedsValidatorCount
        );
        
        let old_threshold = bridge.threshold;
        bridge.threshold = new_threshold;
        
        // Emit threshold updated event
        emit!(ThresholdUpdatedEvent {
            old_threshold,
            new_threshold,
        });
        
        Ok(())
    }

    /// Update bridge fee (owner only)
    pub fn update_fee(ctx: Context<UpdateConfig>, new_fee: u16) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        
        // Validate fee
        require!(new_fee <= 1000, ErrorCode::FeeTooHigh); // Max 10%
        
        let old_fee = bridge.bridge_fee;
        bridge.bridge_fee = new_fee;
        
        // Emit fee updated event
        emit!(FeeUpdatedEvent {
            old_fee,
            new_fee,
        });
        
        Ok(())
    }

    /// Update minimum bridge amount (owner only)
    pub fn update_min_amount(ctx: Context<UpdateConfig>, new_min_amount: u64) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        bridge.min_amount = new_min_amount;
        
        Ok(())
    }

    /// Emergency withdraw tokens (owner only)
    pub fn emergency_withdraw(
        ctx: Context<EmergencyWithdraw>,
        amount: u64,
    ) -> Result<()> {
        // Transfer tokens
        let seeds = &[
            b"bridge".as_ref(),
            &[ctx.accounts.bridge.bump],
        ];
        let signer = &[&seeds[..]];
        
        let transfer_instruction = Transfer {
            from: ctx.accounts.bridge_vault.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.bridge_signer.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
            signer,
        );
        
        token::transfer(cpi_ctx, amount)?;
        
        Ok(())
    }
}

// Accounts for initializing the bridge
#[derive(Accounts)]
#[instruction(bridge_fee: u16, min_amount: u64, threshold: u8)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        init,
        payer = owner,
        space = 8 + Bridge::LEN,
        seeds = [b"bridge"],
        bump,
    )]
    pub bridge: Account<'info, Bridge>,
    
    pub cvt_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = owner,
        seeds = [b"bridge_vault"],
        bump,
        token::mint = cvt_mint,
        token::authority = bridge_signer,
    )]
    pub bridge_vault: Account<'info, TokenAccount>,
    
    /// CHECK: This is the bridge program signer
    #[account(
        seeds = [b"bridge"],
        bump,
    )]
    pub bridge_signer: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

// Accounts for bridging out (Solana to other chains)
#[derive(Accounts)]
#[instruction(target_chain: u8, target_address: Vec<u8>, amount: u64)]
pub struct BridgeOut<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == bridge.cvt_mint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"bridge_vault"],
        bump,
    )]
    pub bridge_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

// Accounts for bridging in (other chains to Solana)
#[derive(Accounts)]
#[instruction(
    source_chain: u8,
    source_address: Vec<u8>,
    recipient: Pubkey,
    amount: u64,
    nonce: u64,
    signatures: Vec<[u8; 64]>,
    public_keys: Vec<Pubkey>,
)]
pub struct BridgeIn<'info> {
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
    
    /// CHECK: This is the bridge program signer
    #[account(
        seeds = [b"bridge"],
        bump = bridge.bump,
    )]
    pub bridge_signer: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"bridge_vault"],
        bump,
    )]
    pub bridge_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = recipient_token_account.owner == recipient,
        constraint = recipient_token_account.mint == bridge.cvt_mint,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + BridgeState::LEN,
        seeds = [
            b"bridge_state", 
            &hash_bridge_data(&BridgeData {
                source_chain,
                source_address: source_address.clone(),
                recipient,
                amount,
                nonce,
            })
        ],
        bump,
    )]
    pub bridge_state: Account<'info, BridgeState>,
    
    // Dynamically sized list of validator accounts
    #[account(
        constraint = validator_accounts.len() >= signatures.len(),
    )]
    pub validator_accounts: Vec<Account<'info, ValidatorAccount>>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

// Accounts for managing validators
#[derive(Accounts)]
#[instruction(validator: Pubkey)]
pub struct ManageValidator<'info> {
    #[account(
        constraint = owner.key() == bridge.owner,
    )]
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
    
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + ValidatorAccount::LEN,
        seeds = [b"validator", validator.as_ref()],
        bump,
    )]
    pub validator_account: Account<'info, ValidatorAccount>,
    
    pub system_program: Program<'info, System>,
}

// Accounts for updating bridge configuration
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        constraint = owner.key() == bridge.owner,
    )]
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
}

// Accounts for emergency withdrawal
#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(
        constraint = owner.key() == bridge.owner,
    )]
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
    
    /// CHECK: This is the bridge program signer
    #[account(
        seeds = [b"bridge"],
        bump = bridge.bump,
    )]
    pub bridge_signer: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"bridge_vault"],
        bump,
    )]
    pub bridge_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

// Bridge account structure
#[account]
pub struct Bridge {
    pub owner: Pubkey,
    pub cvt_mint: Pubkey,
    pub bridge_fee: u16, // Fee in basis points (1 = 0.01%)
    pub min_amount: u64,
    pub threshold: u8, // Minimum signatures required
    pub validator_count: u64,
    pub bridge_nonce: u64,
    pub bump: u8,
}

impl Bridge {
    pub const LEN: usize = 32 + // owner
                           32 + // cvt_mint
                           2 +  // bridge_fee
                           8 +  // min_amount
                           1 +  // threshold
                           8 +  // validator_count
                           8 +  // bridge_nonce
                           1;   // bump
}

// Validator account structure
#[account]
pub struct ValidatorAccount {
    pub is_active: bool,
}

impl ValidatorAccount {
    pub const LEN: usize = 1; // is_active
}

// Bridge state account structure
#[account]
pub struct BridgeState {
    pub processed: bool,
}

impl BridgeState {
    pub const LEN: usize = 1; // processed
}

// Bridge data structure for hashing
#[derive(AnchorSerialize)]
pub struct BridgeData {
    pub source_chain: u8,
    pub source_address: Vec<u8>,
    pub recipient: Pubkey,
    pub amount: u64,
    pub nonce: u64,
}

// Events
#[event]
pub struct BridgeInitiatedEvent {
    pub user: Pubkey,
    pub target_chain: u8,
    pub target_address: Vec<u8>,
    pub amount: u64,
    pub fee: u64,
    pub nonce: u64,
}

#[event]
pub struct BridgeCompletedEvent {
    pub recipient: Pubkey,
    pub source_chain: u8,
    pub source_address: Vec<u8>,
    pub amount: u64,
    pub nonce: u64,
}

#[event]
pub struct ValidatorAddedEvent {
    pub validator: Pubkey,
}

#[event]
pub struct ValidatorRemovedEvent {
    pub validator: Pubkey,
}

#[event]
pub struct ThresholdUpdatedEvent {
    pub old_threshold: u8,
    pub new_threshold: u8,
}

#[event]
pub struct FeeUpdatedEvent {
    pub old_fee: u16,
    pub new_fee: u16,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Amount is too small")]
    AmountTooSmall,
    #[msg("Invalid target chain")]
    InvalidTargetChain,
    #[msg("Invalid target address")]
    InvalidTargetAddress,
    #[msg("Invalid source chain")]
    InvalidSourceChain,
    #[msg("Invalid source address")]
    InvalidSourceAddress,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid bridge state account")]
    InvalidBridgeState,
    #[msg("Bridge has already been processed")]
    BridgeAlreadyProcessed,
    #[msg("Insufficient validator signatures")]
    InsufficientSignatures,
    #[msg("Validator already exists")]
    ValidatorAlreadyExists,
    #[msg("Validator does not exist")]
    ValidatorDoesNotExist,
    #[msg("Cannot remove validator below threshold")]
    CannotRemoveValidatorBelowThreshold,
    #[msg("Invalid threshold")]
    InvalidThreshold,
    #[msg("Threshold exceeds validator count")]
    ThresholdExceedsValidatorCount,
    #[msg("Fee too high")]
    FeeTooHigh,
}

// Helper function to hash bridge data
pub fn hash_bridge_data(data: &BridgeData) -> [u8; 32] {
    let mut hasher = sha2::Sha256::new();
    hasher.update(&data.source_chain.to_le_bytes());
    hasher.update(&data.source_address);
    hasher.update(data.recipient.as_ref());
    hasher.update(&data.amount.to_le_bytes());
    hasher.update(&data.nonce.to_le_bytes());
    
    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(result.as_slice());
    hash
}

// ed25519 program module for signature verification
pub mod ed25519_program {
    use solana_program::{
        program_error::ProgramError,
        pubkey::Pubkey,
    };

    pub fn verify(
        pubkey: &Pubkey,
        message: &[u8],
        signature: &[u8; 64],
    ) -> Result<(), ProgramError> {
        // In a real implementation, this would call the ed25519 program
        // This is a simplification for documentation
        Ok(())
    }
}