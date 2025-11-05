// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Errors Library
 * @notice Centralized custom errors for CrossChainBridgeOptimized v3.1
 * @dev Organized by semantic groups for better developer experience
 * 
 * OPTIMIZATION IMPACT:
 * - 61 custom errors vs string reverts: ~3-4KB bytecode savings
 * - Gas savings: ~50-100 gas per revert (no string ABI encoding)
 * - Developer experience: Clear error naming conventions
 * 
 * ERROR NAMING CONVENTIONS:
 * - Access: Unauthorized*, Invalid*Address, Not*
 * - Operation: Operation*, Cannot*
 * - Proof: *Proof*, Invalid*Hash, *Merkle*
 * - Fee: *Fee*, Amount*
 * - Vault: Vault*, *SecurityLevel
 * - CircuitBreaker: CircuitBreaker*, *Pause*
 * - Consensus: Insufficient*, *Mismatch, *Consensus*
 */
library Errors {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔐 ACCESS CONTROL ERRORS (15) - Updated in v3.3
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error Unauthorized();
    error NotAuthorizedValidator();
    error UnauthorizedSolanaValidator();
    error UnauthorizedTONValidator();
    error NotOperationOwner();
    error InvalidAddress();
    error ZeroAddress(); // v3.3: Validator rotation
    error InvalidEmergencyController();
    error InvalidVaultAddress();
    error NoEthereumValidators();
    error NoSolanaValidators();
    error NoTONValidators();
    error ValidatorAlreadyAuthorized(); // v3.3: Validator rotation
    error ValidatorNotFound(); // v3.3: Validator rotation
    error AlreadyConfirmed(); // v3.3: Proposal confirmation
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⚙️  OPERATION LIFECYCLE ERRORS (13)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error InvalidAmount();
    error InsufficientBalance();
    error OperationNotFound();
    error OperationAlreadyExecuted();
    error OperationAlreadyCanceled();
    error OperationNotPending();
    error CannotCancelNonPendingOperation();
    error MustWait24Hours();
    error RecentProofActivity();
    error AmountExceedsMax();
    error AmountExceedsUint128();
    error VolumeOverflow();
    error RefundFailed();
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 PROOF VALIDATION ERRORS (18) - Updated in v3.3
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error InvalidProof();
    error InvalidTimestamp();
    error InsufficientProofs();
    error ProofExpired();
    error InvalidBlockNumber();
    error InvalidBlockHash();
    error InvalidMerkleRoot();
    error InvalidNonceSequence();
    error SignatureAlreadyUsed();
    error NoProofsSubmitted();
    error ChainAlreadyVerified();
    error ChainAlreadyApproved();
    error ApprovalAlreadyUsed();
    error ProofTooDeep();
    error NoTrustedRoot();
    error MerkleProofInvalid();
    error ProposalNotFound(); // v3.3: Proposal management
    error ProposalExpired(); // v3.3: Proposal management
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💰 FEE MANAGEMENT ERRORS (8)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error InsufficientFee();
    error FeeTooHigh();
    error NoFeesToDistribute();
    error FeeMismatch();
    error NoFeesToClaim();
    error NoFeesToWithdraw();
    error FutureTimestamp();
    error RateLimitExceeded();
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🏦 VAULT SECURITY ERRORS (2)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error InsufficientSecurityLevel();
    error UnsupportedChain();
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚨 CIRCUIT BREAKER ERRORS (5)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error CircuitBreakerActive();
    error CircuitBreakerNotActive();
    error AnomalyDetected();
    error EmergencyPauseActive();
    error InvalidChain();
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔱 CONSENSUS VALIDATION ERRORS (6) - NEW IN v3.1
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error InsufficientValidators();
    error ValidatorSignatureMismatch();
    error ValidatorMerkleMismatch();
    error DuplicateSignature();
    error InsufficientConsensus();
    error InvalidChainID();
}
