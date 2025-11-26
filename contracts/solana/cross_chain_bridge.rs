use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::convert::TryFrom;

declare_id!("ChBrdV1SoLANAcRoSsCHaiNbRiDGeOp5YTH2iN4qDiZx");

// Operation types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum OperationType {
    Transfer,
    Swap,
    Bridge,
}

// Operation status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum OperationStatus {
    Pending,
    Processing,
    Completed,
    Canceled,
    Failed,
}

#[program]
pub mod cross_chain_bridge {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        base_fee: u64,
        speed_priority_multiplier: u16,
        security_priority_multiplier: u16,
        max_fee: u64,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        bridge.owner = ctx.accounts.owner.key();
        bridge.fee_collector = ctx.accounts.fee_collector.key();
        bridge.base_fee = base_fee;
        bridge.speed_priority_multiplier = speed_priority_multiplier;
        bridge.security_priority_multiplier = security_priority_multiplier;
        bridge.max_fee = max_fee;
        bridge.operation_count = 0;
        
        // Initialize supported chains
        bridge.supported_chains = vec!["solana".to_string(), "ethereum".to_string(), "ton".to_string(), "bitcoin".to_string()];
        
        // Set authority
        bridge.authority = ctx.accounts.owner.key();
        bridge.authority_bump = *ctx.bumps.get("bridge").unwrap();
        
        Ok(())
    }

    pub fn create_operation(
        ctx: Context<CreateOperation>,
        operation_type: OperationType,
        destination_chain: String,
        amount: u64,
        prioritize_speed: bool,
        prioritize_security: bool,
        slippage_tolerance: u16,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        let user = &ctx.accounts.user;
        
        // Validate destination chain is supported
        require!(
            bridge.supported_chains.contains(&destination_chain),
            BridgeError::UnsupportedChain
        );
        
        // Ensure amount is valid
        require!(amount > 0, BridgeError::InvalidAmount);
        
        // Calculate fee based on preferences
        let mut fee = bridge.base_fee;
        if prioritize_speed {
            fee = fee.saturating_mul(bridge.speed_priority_multiplier as u64) / 10000;
        }
        if prioritize_security {
            fee = fee.saturating_mul(bridge.security_priority_multiplier as u64) / 10000;
        }
        
        // Ensure fee is within limits
        if fee > bridge.max_fee {
            fee = bridge.max_fee;
        }
        
        // Transfer tokens from user to bridge authority
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.bridge_token_account.to_account_info(),
                    authority: user.to_account_info(),
                },
            ),
            amount,
        )?;
        
        // Transfer fee from user to fee collector
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.fee_collector_token_account.to_account_info(),
                    authority: user.to_account_info(),
                },
            ),
            fee,
        )?;
        
        // Create operation
        let operation_id = bridge.operation_count;
        bridge.operation_count = bridge.operation_count.checked_add(1).unwrap();
        
        let operation = Operation {
            id: operation_id,
            user: user.key(),
            operation_type,
            source_chain: "solana".to_string(),
            destination_chain,
            mint: ctx.accounts.mint.key(),
            amount,
            fee,
            timestamp: Clock::get()?.unix_timestamp,
            status: OperationStatus::Pending,
            target_tx_hash: None,
            signature: None,
            prioritize_speed,
            prioritize_security,
            slippage_tolerance,
        };
        
        // Store operation
        let user_operations = &mut ctx.accounts.user_operations;
        user_operations.operations.push(operation_id);
        
        let operation_account = &mut ctx.accounts.operation;
        operation_account.set_inner(operation);
        
        emit!(OperationCreatedEvent {
            operation_id,
            user: user.key(),
            operation_type: operation.operation_type,
            source_chain: operation.source_chain.clone(),
            destination_chain: operation.destination_chain.clone(),
            mint: ctx.accounts.mint.key(),
            amount,
            fee,
        });
        
        Ok(())
    }

    pub fn update_operation_status(
        ctx: Context<UpdateOperationStatus>,
        status: OperationStatus,
        target_tx_hash: Option<[u8; 32]>,
    ) -> Result<()> {
        let operation = &mut ctx.accounts.operation;
        
        // Ensure operation is not already completed or canceled
        require!(
            operation.status != OperationStatus::Completed && 
            operation.status != OperationStatus::Canceled,
            BridgeError::OperationAlreadyFinalized
        );
        
        // Update status
        operation.status = status;
        
        // Update target transaction hash if provided
        if let Some(hash) = target_tx_hash {
            operation.target_tx_hash = Some(hash);
        }
        
        emit!(OperationStatusUpdatedEvent {
            operation_id: operation.id,
            status,
            target_tx_hash,
        });
        
        Ok(())
    }

    pub fn verify_and_complete_operation(
        ctx: Context<VerifyAndCompleteOperation>,
        signature: Vec<u8>,
    ) -> Result<()> {
        let operation = &mut ctx.accounts.operation;
        
        // Ensure operation is in processing state
        require!(
            operation.status == OperationStatus::Processing,
            BridgeError::InvalidOperationState
        );
        
        // Verify signature (placeholder for actual signature verification)
        // In a real implementation, we would verify against validator keys
        
        // Set signature and mark as completed
        operation.signature = Some(signature);
        operation.status = OperationStatus::Completed;
        
        emit!(OperationStatusUpdatedEvent {
            operation_id: operation.id,
            status: OperationStatus::Completed,
            target_tx_hash: operation.target_tx_hash,
        });
        
        Ok(())
    }

    pub fn cancel_operation(ctx: Context<CancelOperation>) -> Result<()> {
        let operation = &mut ctx.accounts.operation;
        let bridge = &ctx.accounts.bridge;
        
        // Ensure operation is in pending state
        require!(
            operation.status == OperationStatus::Pending,
            BridgeError::InvalidOperationState
        );
        
        // Ensure caller is either the user who created the operation or the admin
        require!(
            operation.user == ctx.accounts.authority.key() || 
            bridge.owner == ctx.accounts.authority.key(),
            BridgeError::Unauthorized
        );
        
        // Return tokens to user
        let seeds = &[
            b"bridge".as_ref(),
            &[bridge.authority_bump],
        ];
        let signer = &[&seeds[..]];
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bridge_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.bridge_authority.to_account_info(),
                },
                signer,
            ),
            operation.amount,
        )?;
        
        // Mark operation as canceled
        operation.status = OperationStatus::Canceled;
        
        emit!(OperationStatusUpdatedEvent {
            operation_id: operation.id,
            status: OperationStatus::Canceled,
            target_tx_hash: None,
        });
        
        Ok(())
    }

    pub fn update_chain_support(
        ctx: Context<UpdateChainSupport>,
        chain: String,
        supported: bool,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        
        if supported {
            // Add chain if not already in list
            if !bridge.supported_chains.contains(&chain) {
                bridge.supported_chains.push(chain.clone());
            }
        } else {
            // Remove chain if in list
            bridge.supported_chains.retain(|c| c != &chain);
        }
        
        emit!(ChainSupportUpdatedEvent {
            chain,
            supported,
        });
        
        Ok(())
    }

    pub fn update_fee_parameters(
        ctx: Context<UpdateFeeParameters>,
        base_fee: u64,
        speed_priority_multiplier: u16,
        security_priority_multiplier: u16,
        max_fee: u64,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        
        // Ensure max fee is greater than base fee
        require!(max_fee >= base_fee, BridgeError::InvalidFeeParameters);
        
        bridge.base_fee = base_fee;
        bridge.speed_priority_multiplier = speed_priority_multiplier;
        bridge.security_priority_multiplier = security_priority_multiplier;
        bridge.max_fee = max_fee;
        
        emit!(FeeUpdatedEvent {
            base_fee,
            speed_priority_multiplier,
            security_priority_multiplier,
            max_fee,
        });
        
        Ok(())
    }

    pub fn set_fee_collector(
        ctx: Context<SetFeeCollector>,
        new_fee_collector: Pubkey,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        bridge.fee_collector = new_fee_collector;
        Ok(())
    }
}

#[account]
pub struct Bridge {
    pub owner: Pubkey,
    pub authority: Pubkey,
    pub authority_bump: u8,
    pub fee_collector: Pubkey,
    pub base_fee: u64,
    pub speed_priority_multiplier: u16,
    pub security_priority_multiplier: u16,
    pub max_fee: u64,
    pub operation_count: u64,
    pub supported_chains: Vec<String>,
}

#[account]
pub struct Operation {
    pub id: u64,
    pub user: Pubkey,
    pub operation_type: OperationType,
    pub source_chain: String,
    pub destination_chain: String,
    pub mint: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub timestamp: i64,
    pub status: OperationStatus,
    pub target_tx_hash: Option<[u8; 32]>,
    pub signature: Option<Vec<u8>>,
    pub prioritize_speed: bool,
    pub prioritize_security: bool,
    pub slippage_tolerance: u16,
}

#[account]
pub struct UserOperations {
    pub user: Pubkey,
    pub operations: Vec<u64>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub fee_collector: AccountInfo<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 1 + 32 + 8 + 2 + 2 + 8 + 8 + 4 + 100 // Rough estimate
    )]
    pub bridge: Account<'info, Bridge>,
    #[account(
        seeds = [b"bridge"],
        bump,
    )]
    /// CHECK: This is the PDA that will own and manage token accounts
    pub bridge_authority: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateOperation<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
    #[account(
        seeds = [b"bridge"],
        bump = bridge.authority_bump,
    )]
    /// CHECK: Bridge authority PDA
    pub bridge_authority: AccountInfo<'info>,
    pub mint: Account<'info, token::Mint>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == mint.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = bridge_token_account.owner == bridge_authority.key(),
        constraint = bridge_token_account.mint == mint.key(),
    )]
    pub bridge_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = fee_collector_token_account.mint == mint.key(),
        constraint = fee_collector_token_account.owner == bridge.fee_collector,
    )]
    pub fee_collector_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 4 + (8 * 10), // Space for user key and 10 operation IDs
        seeds = [b"user_operations", user.key().as_ref()],
        bump,
    )]
    pub user_operations: Account<'info, UserOperations>,
    #[account(
        init,
        payer = user,
        space = 8 + 8 + 32 + 1 + 20 + 20 + 32 + 8 + 8 + 8 + 1 + 32 + 4 + 100 + 1 + 1 + 2, // Rough estimate
    )]
    pub operation: Account<'info, Operation>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateOperationStatus<'info> {
    #[account(
        constraint = operator.key() == bridge.owner || 
                    is_authorized_operator.key() == operator.key(),
    )]
    pub operator: Signer<'info>,
    /// CHECK: This account is checked in the constraint above
    pub is_authorized_operator: AccountInfo<'info>,
    pub bridge: Account<'info, Bridge>,
    #[account(mut)]
    pub operation: Account<'info, Operation>,
}

#[derive(Accounts)]
pub struct VerifyAndCompleteOperation<'info> {
    #[account(
        constraint = validator.key() == bridge.owner || 
                    is_authorized_validator.key() == validator.key(),
    )]
    pub validator: Signer<'info>,
    /// CHECK: This account is checked in the constraint above
    pub is_authorized_validator: AccountInfo<'info>,
    pub bridge: Account<'info, Bridge>,
    #[account(mut)]
    pub operation: Account<'info, Operation>,
}

#[derive(Accounts)]
pub struct CancelOperation<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
    #[account(
        seeds = [b"bridge"],
        bump = bridge.authority_bump,
    )]
    /// CHECK: Bridge authority PDA
    pub bridge_authority: AccountInfo<'info>,
    #[account(
        mut,
        constraint = operation.user == authority.key() || bridge.owner == authority.key(),
    )]
    pub operation: Account<'info, Operation>,
    #[account(
        mut,
        constraint = bridge_token_account.owner == bridge_authority.key(),
        constraint = bridge_token_account.mint == operation.mint,
    )]
    pub bridge_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_token_account.owner == operation.user,
        constraint = user_token_account.mint == operation.mint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateChainSupport<'info> {
    #[account(
        constraint = admin.key() == bridge.owner,
    )]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
}

#[derive(Accounts)]
pub struct UpdateFeeParameters<'info> {
    #[account(
        constraint = admin.key() == bridge.owner,
    )]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
}

#[derive(Accounts)]
pub struct SetFeeCollector<'info> {
    #[account(
        constraint = admin.key() == bridge.owner,
    )]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub bridge: Account<'info, Bridge>,
    /// CHECK: This is just a pubkey that will receive fees
    pub new_fee_collector: AccountInfo<'info>,
}

#[event]
pub struct OperationCreatedEvent {
    pub operation_id: u64,
    pub user: Pubkey,
    pub operation_type: OperationType,
    pub source_chain: String,
    pub destination_chain: String,
    pub mint: Pubkey,
    pub amount: u64,
    pub fee: u64,
}

#[event]
pub struct OperationStatusUpdatedEvent {
    pub operation_id: u64,
    pub status: OperationStatus,
    pub target_tx_hash: Option<[u8; 32]>,
}

#[event]
pub struct ChainSupportUpdatedEvent {
    pub chain: String,
    pub supported: bool,
}

#[event]
pub struct FeeUpdatedEvent {
    pub base_fee: u64,
    pub speed_priority_multiplier: u16,
    pub security_priority_multiplier: u16,
    pub max_fee: u64,
}

#[error_code]
pub enum BridgeError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Unsupported chain")]
    UnsupportedChain,
    #[msg("Operation not found")]
    OperationNotFound,
    #[msg("Operation already finalized")]
    OperationAlreadyFinalized,
    #[msg("Insufficient fee")]
    InsufficientFee,
    #[msg("Invalid fee parameters")]
    InvalidFeeParameters,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid operation state")]
    InvalidOperationState,
    #[msg("Invalid proof")]
    InvalidProof,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
}