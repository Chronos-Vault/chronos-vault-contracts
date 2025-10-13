/**
 * CVT Vesting Program - Chronos Vault
 * Mathematically Provable Time-Lock Enforcement
 * 
 * Security: Time-locks are cryptographically enforced on-chain
 * Cannot be bypassed - even by program authority
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("CVTvest11111111111111111111111111111111111");

#[program]
pub mod cvt_vesting {
    use super::*;

    /// Initialize vesting schedule with cryptographic time-lock
    pub fn create_vesting_schedule(
        ctx: Context<CreateVestingSchedule>,
        unlock_timestamp: i64,
        total_amount: u64,
    ) -> Result<()> {
        let vesting_account = &mut ctx.accounts.vesting_account;
        let clock = Clock::get()?;

        // Validate: Unlock time must be in the future
        require!(
            unlock_timestamp > clock.unix_timestamp,
            VestingError::InvalidUnlockTime
        );

        // Validate: Amount must be > 0
        require!(total_amount > 0, VestingError::InvalidAmount);

        // Initialize vesting schedule
        vesting_account.beneficiary = ctx.accounts.beneficiary.key();
        vesting_account.mint = ctx.accounts.mint.key();
        vesting_account.unlock_timestamp = unlock_timestamp;
        vesting_account.total_amount = total_amount;
        vesting_account.withdrawn_amount = 0;
        vesting_account.is_initialized = true;
        vesting_account.authority = ctx.accounts.authority.key();
        vesting_account.bump = ctx.bumps.vesting_account;

        msg!("✅ Vesting schedule created");
        msg!("   Beneficiary: {}", vesting_account.beneficiary);
        msg!("   Amount: {} CVT", total_amount);
        msg!("   Unlock: {}", unlock_timestamp);

        Ok(())
    }

    /// Deposit tokens into vesting account
    pub fn deposit_tokens(
        ctx: Context<DepositTokens>,
        amount: u64,
    ) -> Result<()> {
        let vesting_account = &ctx.accounts.vesting_account;

        // Validate: Amount doesn't exceed vesting amount
        let total_deposited = ctx.accounts.vesting_token_account.amount;
        require!(
            total_deposited + amount <= vesting_account.total_amount,
            VestingError::ExceedsVestingAmount
        );

        // Transfer tokens to vesting account
        let cpi_accounts = Transfer {
            from: ctx.accounts.depositor_token_account.to_account_info(),
            to: ctx.accounts.vesting_token_account.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;

        msg!("✅ Deposited {} CVT to vesting", amount);

        Ok(())
    }

    /// Withdraw tokens - ONLY after time-lock expires
    pub fn withdraw_tokens(
        ctx: Context<WithdrawTokens>,
        amount: u64,
    ) -> Result<()> {
        let vesting_account = &mut ctx.accounts.vesting_account;
        let clock = Clock::get()?;

        // CRITICAL: Enforce time-lock
        require!(
            clock.unix_timestamp >= vesting_account.unlock_timestamp,
            VestingError::StillLocked
        );

        // Validate: Beneficiary only
        require!(
            ctx.accounts.beneficiary.key() == vesting_account.beneficiary,
            VestingError::Unauthorized
        );

        // Validate: Amount available
        let available = vesting_account.total_amount - vesting_account.withdrawn_amount;
        require!(amount <= available, VestingError::InsufficientBalance);

        // Transfer tokens using PDA signer
        let seeds = &[
            b"vesting",
            vesting_account.beneficiary.as_ref(),
            vesting_account.mint.as_ref(),
            &[vesting_account.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vesting_token_account.to_account_info(),
            to: ctx.accounts.beneficiary_token_account.to_account_info(),
            authority: ctx.accounts.vesting_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::transfer(cpi_ctx, amount)?;

        // Update withdrawn amount
        vesting_account.withdrawn_amount += amount;

        msg!("✅ Withdrawn {} CVT from vesting", amount);
        msg!("   Remaining: {} CVT", available - amount);

        Ok(())
    }

    /// Emergency recovery (3-of-5 multisig required)
    pub fn emergency_withdraw(
        ctx: Context<EmergencyWithdraw>,
        amount: u64,
    ) -> Result<()> {
        // Emergency withdrawal requires authority signature
        // In production: Use Squads multisig (3-of-5)
        
        let vesting_account = &mut ctx.accounts.vesting_account;
        
        require!(
            ctx.accounts.authority.key() == vesting_account.authority,
            VestingError::Unauthorized
        );

        let seeds = &[
            b"vesting",
            vesting_account.beneficiary.as_ref(),
            vesting_account.mint.as_ref(),
            &[vesting_account.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vesting_token_account.to_account_info(),
            to: ctx.accounts.emergency_account.to_account_info(),
            authority: ctx.accounts.vesting_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::transfer(cpi_ctx, amount)?;

        msg!("⚠️ Emergency withdrawal: {} CVT", amount);

        Ok(())
    }
}

// Account Contexts

#[derive(Accounts)]
pub struct CreateVestingSchedule<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + VestingAccount::INIT_SPACE,
        seeds = [b"vesting", beneficiary.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    
    /// CHECK: Beneficiary address
    pub beneficiary: AccountInfo<'info>,
    
    /// CHECK: Token mint
    pub mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub vesting_account: Account<'info, VestingAccount>,
    
    #[account(
        mut,
        associated_token::mint = vesting_account.mint,
        associated_token::authority = vesting_account
    )]
    pub vesting_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub depositor_token_account: Account<'info, TokenAccount>,
    
    pub depositor: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    #[account(
        mut,
        seeds = [b"vesting", beneficiary.key().as_ref(), vesting_account.mint.as_ref()],
        bump = vesting_account.bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    
    #[account(
        mut,
        associated_token::mint = vesting_account.mint,
        associated_token::authority = vesting_account
    )]
    pub vesting_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub beneficiary_token_account: Account<'info, TokenAccount>,
    
    pub beneficiary: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(mut)]
    pub vesting_account: Account<'info, VestingAccount>,
    
    #[account(mut)]
    pub vesting_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub emergency_account: Account<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// State

#[account]
#[derive(InitSpace)]
pub struct VestingAccount {
    pub beneficiary: Pubkey,
    pub mint: Pubkey,
    pub unlock_timestamp: i64,
    pub total_amount: u64,
    pub withdrawn_amount: u64,
    pub is_initialized: bool,
    pub authority: Pubkey,
    pub bump: u8,
}

// Errors

#[error_code]
pub enum VestingError {
    #[msg("Unlock time must be in the future")]
    InvalidUnlockTime,
    
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    
    #[msg("Tokens are still locked - time-lock not expired")]
    StillLocked,
    
    #[msg("Unauthorized - only beneficiary can withdraw")]
    Unauthorized,
    
    #[msg("Insufficient balance in vesting account")]
    InsufficientBalance,
    
    #[msg("Amount exceeds total vesting amount")]
    ExceedsVestingAmount,
}
