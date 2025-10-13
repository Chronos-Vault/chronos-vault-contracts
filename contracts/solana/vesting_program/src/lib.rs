/**
 * CVT Vesting Program - Chronos Vault
 * REAL Cryptographic Time-Lock Enforcement
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("CVTvest11111111111111111111111111111111111");

#[program]
pub mod cvt_vesting {
    use super::*;

    /// Create vesting schedule with unique identifier
    pub fn create_vesting(
        ctx: Context<CreateVesting>,
        schedule_id: u64,
        unlock_timestamp: i64,
        amount: u64,
    ) -> Result<()> {
        let vesting = &mut ctx.accounts.vesting;
        let clock = Clock::get()?;

        require!(unlock_timestamp > clock.unix_timestamp, VestingError::InvalidUnlockTime);
        require!(amount > 0, VestingError::InvalidAmount);

        vesting.beneficiary = ctx.accounts.beneficiary.key();
        vesting.mint = ctx.accounts.mint.key();
        vesting.schedule_id = schedule_id;
        vesting.unlock_timestamp = unlock_timestamp;
        vesting.total_amount = amount;
        vesting.withdrawn = 0;
        vesting.bump = ctx.bumps.vesting;

        msg!("✅ Vesting schedule {} created", schedule_id);
        msg!("   Amount: {}", amount);
        msg!("   Unlock: {}", unlock_timestamp);

        Ok(())
    }

    /// Withdraw tokens ONLY after time-lock expires
    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
    ) -> Result<()> {
        let vesting = &mut ctx.accounts.vesting;
        let clock = Clock::get()?;

        // CRITICAL: Enforce time-lock
        require!(
            clock.unix_timestamp >= vesting.unlock_timestamp,
            VestingError::StillLocked
        );

        require!(
            ctx.accounts.beneficiary.key() == vesting.beneficiary,
            VestingError::Unauthorized
        );

        let available = vesting.total_amount.checked_sub(vesting.withdrawn)
            .ok_or(VestingError::Overflow)?;
        require!(amount <= available, VestingError::InsufficientBalance);

        // Transfer using PDA signer
        let seeds = &[
            b"vesting",
            vesting.beneficiary.as_ref(),
            vesting.mint.as_ref(),
            &vesting.schedule_id.to_le_bytes(),
            &[vesting.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vesting_ata.to_account_info(),
                    to: ctx.accounts.beneficiary_ata.to_account_info(),
                    authority: vesting.to_account_info(),
                },
                signer
            ),
            amount
        )?;

        vesting.withdrawn = vesting.withdrawn.checked_add(amount)
            .ok_or(VestingError::Overflow)?;

        msg!("✅ Withdrawn {} tokens", amount);

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(schedule_id: u64)]
pub struct CreateVesting<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Vesting::INIT_SPACE,
        seeds = [
            b"vesting",
            beneficiary.key().as_ref(),
            mint.key().as_ref(),
            &schedule_id.to_le_bytes()
        ],
        bump
    )]
    pub vesting: Account<'info, Vesting>,
    
    pub mint: Account<'info, Mint>,
    
    /// CHECK: Beneficiary address
    pub beneficiary: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [
            b"vesting",
            vesting.beneficiary.as_ref(),
            vesting.mint.as_ref(),
            &vesting.schedule_id.to_le_bytes()
        ],
        bump = vesting.bump,
        has_one = beneficiary,
        has_one = mint
    )]
    pub vesting: Account<'info, Vesting>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vesting
    )]
    pub vesting_ata: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = beneficiary
    )]
    pub beneficiary_ata: Account<'info, TokenAccount>,
    
    pub beneficiary: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[account]
#[derive(InitSpace)]
pub struct Vesting {
    pub beneficiary: Pubkey,
    pub mint: Pubkey,
    pub schedule_id: u64,
    pub unlock_timestamp: i64,
    pub total_amount: u64,
    pub withdrawn: u64,
    pub bump: u8,
}

#[error_code]
pub enum VestingError {
    #[msg("Unlock time must be in future")]
    InvalidUnlockTime,
    #[msg("Amount must be > 0")]
    InvalidAmount,
    #[msg("Tokens still locked")]
    StillLocked,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Overflow")]
    Overflow,
}
