// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ITrinityConsensusVerifier
 * @notice Interface for Trinity Protocol v3.5.4 - Multi-Chain Consensus Verification
 * @author Chronos Vault Team
 * @dev Implements 2-of-3 consensus across Arbitrum, Solana, and TON blockchains
 * 
 * SECURITY MODEL:
 * - Requires 2 out of 3 independent blockchain validators to agree
 * - Prevents single point of failure in cross-chain operations
 * - Provides ~10^-18 attack probability (combined with HTLC ~10^-50 total)
 */
interface ITrinityConsensusVerifier {
    /**
     * @notice Types of operations supported by Trinity Protocol
     * @dev Each operation type may have different validation rules
     */
    enum OperationType { 
        DEPOSIT,                // Deposit into vault
        WITHDRAWAL,             // Withdraw from vault
        TRANSFER,               // Transfer between vaults
        EMERGENCY_WITHDRAWAL    // Emergency recovery operation
    }
    
    /**
     * @notice Create a new Trinity Protocol operation requiring 2-of-3 consensus
     * @param vault Address of the vault performing the operation
     * @param operationType Type of operation (DEPOSIT, WITHDRAWAL, TRANSFER, EMERGENCY_WITHDRAWAL)
     * @param amount Amount of tokens involved in the operation
     * @param token ERC20 token contract address (or wrapped native token)
     * @param deadline Unix timestamp after which operation expires
     * @return operationId Unique identifier for tracking this operation across chains
     * 
     * @dev MUST be payable to accept Trinity verification fee
     * @dev Operation will be monitored by validators on Arbitrum, Solana, and TON
     * @dev Requires msg.value to cover cross-chain verification costs
     */
    function createOperation(
        address vault,
        OperationType operationType,
        uint256 amount,
        IERC20 token,
        uint256 deadline
    ) external payable returns (bytes32 operationId);
    
    /**
     * @notice Get the current state of a Trinity Protocol operation
     * @param operationId The unique operation identifier
     * @return user Address that initiated the operation
     * @return vault Address of the vault for this operation
     * @return amount Amount of tokens in the operation
     * @return chainConfirmations Number of chains that have confirmed (0-3)
     * @return expiresAt Unix timestamp when operation expires
     * @return executed Whether the operation has been executed on destination
     * 
     * @dev chainConfirmations >= 2 means consensus achieved (2-of-3)
     * @dev executed = true means operation completed on destination chain
     * @dev SECURITY: Check executed flag to prevent double-spend attacks
     * @dev INTEGRATION FIX: Added vault address to return values for proper validation
     */
    function getOperation(bytes32 operationId)
        external
        view
        returns (
            address user,
            address vault,     // INTEGRATION FIX: Added vault address
            uint256 amount, 
            uint8 chainConfirmations, 
            uint256 expiresAt, 
            bool executed
        );

    /**
     * @notice Get the authorized Trinity validator for a specific chain
     * @param chainId Chain ID (1=Arbitrum, 2=Solana, 3=TON)
     * @return address Ethereum address of the authorized validator for this chain
     * 
     * @dev Used by cross-chain message relay to verify signatures are from authorized validators
     * @dev Each chain has exactly one authorized validator address at any given time
     * @dev SECURITY: Only signatures from authorized validators should be accepted
     */
    function getValidator(uint8 chainId) external view returns (address);
}
