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
    // 🔐 ACCESS CONTROL ERRORS (21) - Updated in v3.3
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error Unauthorized();
    error NotAuthorizedValidator();
    error UnauthorizedValidator(address validator); // v3.3: With parameter
    error UnauthorizedSolanaValidator();
    error UnauthorizedTONValidator();
    error NotOperationOwner();
    error InvalidAddress();
    error ZeroAddress(); // v3.3: Validator rotation
    error InvalidEmergencyController();
    error InvalidVaultAddress();
    error InvalidValidatorAddress(); // v3.3: Validator rotation
    error NoEthereumValidators();
    error NoSolanaValidators();
    error NoTONValidators();
    error ValidatorAlreadyAuthorized(); // v3.3: Validator rotation
    error ValidatorNotFound(); // v3.3: Validator rotation
    error ValidatorMismatch(address provided, address expected); // v3.3
    error AlreadyConfirmed(address validator); // v3.3: Proposal confirmation
    error OnlyEmergencyController(address caller, address controller); // v3.3
    error InvalidValidatorSignature(address signer, address expected); // v3.3
    error ProofAlreadySubmitted(bytes32 operationId, uint8 chainId); // v3.3
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⚙️  OPERATION LIFECYCLE ERRORS (15) - Updated in v3.3
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error InvalidAmount(uint256 amount); // v3.3: With parameter
    error InsufficientBalance();
    error OperationNotFound(bytes32 operationId); // v3.3: With parameter
    error OperationAlreadyExecuted(bytes32 operationId); // v3.3: With parameter
    error OperationAlreadyCanceled();
    error OperationExpired(uint256 deadline, uint256 currentTime); // v3.3: New
    error OperationNotPending();
    error CannotCancelNonPendingOperation();
    error MustWait24Hours();
    error RecentProofActivity();
    error AmountExceedsMax();
    error AmountExceedsUint128();
    error VolumeOverflow();
    error RefundFailed();
    error InsufficientFee(uint256 provided, uint256 required); // v3.3: With parameters
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 PROOF VALIDATION ERRORS (21) - Updated in v3.3
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error InvalidProof();
    error InvalidTimestamp();
    error InsufficientProofs();
    error ProofExpired();
    error InvalidBlockNumber();
    error InvalidBlockHash();
    error InvalidMerkleRoot();
    error InvalidMerkleProof(bytes32 operationId, uint8 chainId); // v3.3: With parameters
    error InvalidNonceSequence();
    error SignatureAlreadyUsed();
    error NoProofsSubmitted();
    error ChainAlreadyVerified();
    error ChainAlreadyApproved();
    error ApprovalAlreadyUsed();
    error ProofTooDeep();
    error NoTrustedRoot();
    error MerkleProofInvalid();
    error ProposalNotFound(bytes32 proposalId); // v3.3: With parameter
    error ProposalExpired(uint256 proposedAt); // v3.3: With parameter
    error ProposalAlreadyExecuted(bytes32 proposalId); // v3.3: New
    error InvalidNonce(uint256 provided, uint256 expected); // v3.4: Nonce replay protection
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💰 FEE MANAGEMENT ERRORS (7) - Moved InsufficientFee to Operation Lifecycle
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error FeeTooHigh();
    error NoFeesToDistribute();
    error FeeMismatch();
    error NoFeesToClaim();
    error NoFeesToWithdraw();
    error FutureTimestamp();
    error RateLimitExceeded();
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🏦 VAULT SECURITY ERRORS (5) - Updated in v3.4
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error InsufficientSecurityLevel();
    error UnsupportedChain();
    error InvalidVault(address vault); // v3.4: Vault validation
    error InvalidVaultInterface(address vault); // v3.4: Vault interface check
    error LowSecurityVault(); // v3.4: Vault security level check
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚨 CIRCUIT BREAKER ERRORS (5)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error CircuitBreakerActive();
    error CircuitBreakerNotActive();
    error AnomalyDetected();
    error EmergencyPauseActive();
    error InvalidChain();
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔱 CONSENSUS VALIDATION ERRORS (7) - NEW IN v3.1, Updated in v3.3
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    error InsufficientValidators();
    error ValidatorSignatureMismatch();
    error ValidatorMerkleMismatch();
    error DuplicateSignature();
    error InsufficientConsensus();
    error InsufficientConfirmations(uint8 current, uint8 required); // v3.3: New
    error InvalidChainID();
}
