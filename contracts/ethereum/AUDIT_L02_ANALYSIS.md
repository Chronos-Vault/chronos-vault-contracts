# L-02 Analysis: ERC-4626 _withdraw owner() Parameter Usage

## Issue
In `_executeWithdrawal()` (line 1023), the function calls:
```solidity
super._withdraw(msg.sender, request.receiver, owner(), request.amount, shares);
```

The third parameter (`owner()`) represents the address whose shares will be burned. The audit questions whether using `owner()` is correct for multi-sig withdrawals.

## ERC-4626 Standard Definition

According to OpenZeppelin's ERC4626 implementation:
```solidity
function _withdraw(
    address caller,    // Who is calling withdraw
    address receiver,  // Who receives the assets
    address owner,     // WHO OWNS THE SHARES BEING BURNED
    uint256 assets,    // Amount of assets to withdraw
    uint256 shares     // Amount of shares to burn
) internal virtual
```

## Analysis

### Share Ownership Model in ChronosVault

When users call `deposit()`:
```solidity
function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
    if (isUnlocked) {
        require(msg.sender == owner(), "Only owner can deposit after unlock");
    }
    
    uint256 shares = super.deposit(assets, receiver);  // Shares minted to receiver
    return shares;
}
```

**Key Finding**: Shares are minted to the `receiver` parameter in `deposit()`, NOT to the vault owner.

### Problem with Current Implementation

In multi-sig withdrawal:
1. User requests withdrawal → `createWithdrawalRequest(receiver, amount)`
2. Signers approve → `approveWithdrawal(requestId)`
3. When threshold met → `_executeWithdrawal()` is called
4. `_executeWithdrawal()` calls `super._withdraw(msg.sender, request.receiver, owner(), ...)`

**Issue**: This attempts to burn shares from `owner()`, but the shares actually belong to individual depositors, not the vault owner.

### Possible Scenarios

#### Scenario A: Single Owner Vault
If the vault is designed such that ONLY the owner deposits (and users can't deposit directly), then:
- All shares belong to `owner()`
- Using `owner()` parameter is CORRECT
- Multi-sig is for managing the owner's assets

#### Scenario B: Multi-User Vault
If multiple users can deposit (each receiving their own shares), then:
- Shares belong to individual users
- Using `owner()` parameter is INCORRECT
- Should track which user's shares are being withdrawn

## Current Deposit Logic Analysis

```solidity
function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
    if (isUnlocked) {
        require(msg.sender == owner(), "Only owner can deposit after unlock");
    }
    // ...
}
```

**Observation**: Once unlocked, only `owner()` can deposit. Before unlock, anyone can deposit.

This suggests a **hybrid model**:
- **Locked phase**: Multiple users can deposit → shares distributed among users
- **Unlocked phase**: Only owner can deposit → all shares belong to owner

## Recommendation

### Option 1: Track Share Owner in Withdrawal Request (RECOMMENDED)

Modify the withdrawal request system to track whose shares are being withdrawn:

```solidity
struct WithdrawalRequest {
    address requester;
    address receiver;
    address shareOwner;  // ADD THIS: Whose shares to burn
    uint256 amount;
    // ...
}

function createWithdrawalRequest(address _receiver, uint256 _amount) external onlyWhenUnlocked returns (uint256) {
    // ...
    request.shareOwner = msg.sender;  // Track who owns the shares
    // ...
}

function _executeWithdrawal(uint256 _requestId) internal {
    WithdrawalRequest storage request = withdrawalRequests[_requestId];
    
    // Burn shares from the actual owner
    uint256 shares = convertToShares(request.amount);
    super._withdraw(msg.sender, request.receiver, request.shareOwner, request.amount, shares);
}
```

### Option 2: Document Owner-Only Model (IF INTENTIONAL)

If ChronosVault is designed for single-owner usage with multi-sig for governance:

Add documentation:
```solidity
/**
 * @dev Execute withdrawal request
 * @notice DESIGN: ChronosVault is designed for single-owner vaults where
 * the contract owner holds all shares. Multi-sig is used for governance
 * over the owner's assets, not for managing multiple depositors.
 * 
 * In the locked phase, only owner() should deposit to maintain this model.
 * The isUnlocked check enforces this after vault creation.
 */
function _executeWithdrawal(uint256 _requestId) internal {
    // ...
    super._withdraw(msg.sender, request.receiver, owner(), request.amount, shares);
}
```

### Option 3: Enforce Owner-Only Deposits (SIMPLEST FIX)

If the design is owner-only, enforce it consistently:

```solidity
function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
    // ENFORCE: Only owner can deposit (always)
    require(msg.sender == owner(), "Only owner can deposit in ChronosVault");
    require(receiver == owner(), "Shares can only be minted to owner");
    
    uint256 shares = super.deposit(assets, receiver);
    return shares;
}
```

## Current Status

**UNCLEAR**: The design intent is ambiguous. Need to clarify:
1. Is this a single-owner vault with multi-sig governance?
2. Or a multi-user vault with shared access control?

**Action Required**: Choose one of the options above based on intended use case.

---

**Audit Reference**: Manus AI L-02  
**Date**: October 30, 2025  
**Status**: ANALYSIS COMPLETE - DECISION NEEDED
