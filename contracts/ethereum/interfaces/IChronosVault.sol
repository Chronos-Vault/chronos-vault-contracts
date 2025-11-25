// SPDX-License-Identifier: MIT
// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:21.062Z
pragma solidity ^0.8.20;

/**
 * @title IChronosVault
 * @notice Interface for Chronos Vault integration with Trinity Protocol v3.5.4
 * @author Chronos Vault Team
 * @dev Defines vault types and authorization interface for secure vault operations
 */
interface IChronosVault {
    /**
     * @notice Enumeration of all supported vault types in Chronos ecosystem
     * @dev Each vault type implements specific security and access control mechanisms
     */
    enum VaultType {
        TIME_LOCK,              // Time-based access control
        MULTI_SIGNATURE,        // Multi-party approval required
        QUANTUM_RESISTANT,      // Post-quantum cryptography
        GEO_LOCATION,          // Location-based access control
        NFT_POWERED,           // NFT ownership-based access
        BIOMETRIC,             // Biometric authentication
        SOVEREIGN_FORTRESS,    // Maximum security configuration
        DEAD_MANS_SWITCH,      // Automated inheritance trigger
        INHERITANCE,           // Estate planning vault
        CONDITIONAL_RELEASE,   // Condition-based unlocking
        SOCIAL_RECOVERY,       // Social consensus recovery
        PROOF_OF_RESERVE,      // Reserve attestation vault
        ESCROW,                // Third-party escrow service
        CORPORATE_TREASURY,    // Enterprise treasury management
        LEGAL_COMPLIANCE,      // Regulatory compliance vault
        INSURANCE_BACKED,      // Insurance-protected vault
        STAKING_REWARDS,       // Staking yield accumulation
        LEVERAGE_VAULT,        // Leveraged position management
        PRIVACY_ENHANCED,      // Privacy-preserving vault
        MULTI_ASSET,           // Multi-token support
        TIERED_ACCESS,         // Role-based access levels
        DELEGATED_VOTING       // Governance participation vault
    }
    
    /**
     * @notice Get the vault type
     * @return VaultType The specific type of this vault
     */
    function vaultType() external view returns (VaultType);
    
    /**
     * @notice Get the security level (1-10 scale)
     * @return uint8 Security level where 10 is maximum security
     * @dev Higher levels may require additional confirmations or delays
     */
    function securityLevel() external view returns (uint8);
    
    /**
     * @notice Check if an address is authorized to access the vault
     * @param user Address to check authorization for
     * @return bool True if user is authorized, false otherwise
     * @dev Implementation varies by vault type (e.g., multi-sig checks signatures, time-lock checks deadlines)
     */
    function isAuthorized(address user) external view returns (bool);
}
