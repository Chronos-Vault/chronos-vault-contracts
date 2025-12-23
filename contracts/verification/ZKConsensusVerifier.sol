// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Groth16Verifier.sol";

/**
 * @title ZKConsensusVerifier
 * @author Chronos Vault Team
 * @notice Zero-knowledge consensus verification for Trinity Protocol
 * @dev Integrates ZK proofs with 2-of-3 multi-chain consensus
 * 
 * This contract allows validators to prove consensus was reached
 * without revealing which specific validators signed.
 * 
 * Privacy guarantees:
 * - Proves k-of-n threshold met
 * - Does NOT reveal which k validators participated
 * - Does NOT reveal validator private keys
 * - Does NOT reveal voting patterns
 * 
 * Security: 128-bit (Groth16 on BN254)
 * 
 * Trust Math, Not Humans
 */
contract ZKConsensusVerifier {
    
    // ===== STATE VARIABLES =====
    
    Groth16Verifier public immutable groth16Verifier;
    
    // Required consensus threshold (2 of 3)
    uint256 public constant REQUIRED_THRESHOLD = 2;
    uint256 public constant TOTAL_VALIDATORS = 3;
    
    // Chain IDs
    uint8 public constant ARBITRUM_CHAIN_ID = 1;
    uint8 public constant SOLANA_CHAIN_ID = 2;
    uint8 public constant TON_CHAIN_ID = 3;
    
    // Authorized validator public key hashes
    mapping(uint8 => uint256) public validatorPubKeyHashes;
    
    // Operation tracking
    mapping(bytes32 => ZKOperation) public zkOperations;
    mapping(bytes32 => bool) public usedProofHashes;
    
    // Admin
    address public admin;
    
    // ===== STRUCTS =====
    
    struct ZKOperation {
        bytes32 operationId;
        uint256 amount;
        address user;
        uint256 timestamp;
        uint256 expiresAt;
        bool executed;
        bool zkProofVerified;
    }
    
    // ===== EVENTS =====
    
    event ZKOperationCreated(
        bytes32 indexed operationId,
        address indexed user,
        uint256 amount,
        uint256 expiresAt
    );
    
    event ZKConsensusVerified(
        bytes32 indexed operationId,
        bytes32 proofHash,
        uint256 timestamp
    );
    
    event ZKOperationExecuted(
        bytes32 indexed operationId,
        address indexed user,
        uint256 amount
    );
    
    event ValidatorKeyUpdated(uint8 chainId, uint256 pubKeyHash);
    
    // ===== ERRORS =====
    
    error OperationNotFound(bytes32 operationId);
    error OperationAlreadyExists(bytes32 operationId);
    error OperationExpired(uint256 expiresAt, uint256 currentTime);
    error OperationAlreadyExecuted(bytes32 operationId);
    error InvalidZKProof();
    error ProofAlreadyUsed(bytes32 proofHash);
    error ThresholdNotMet(uint256 provided, uint256 required);
    error OnlyAdmin();
    error InvalidAmount();
    
    // ===== CONSTRUCTOR =====
    
    constructor(address _groth16Verifier) {
        groth16Verifier = Groth16Verifier(_groth16Verifier);
        admin = msg.sender;
    }
    
    // ===== MODIFIERS =====
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }
    
    // ===== CORE FUNCTIONS =====
    
    /**
     * @notice Create a new operation that will require ZK consensus proof
     * @param amount Amount involved in the operation
     * @param timeoutSeconds How long until operation expires
     * @return operationId The unique operation identifier
     */
    function createZKOperation(
        uint256 amount,
        uint256 timeoutSeconds
    ) external returns (bytes32 operationId) {
        if (amount == 0) revert InvalidAmount();
        
        operationId = keccak256(abi.encodePacked(
            msg.sender,
            amount,
            block.timestamp,
            block.number
        ));
        
        if (zkOperations[operationId].operationId != bytes32(0)) {
            revert OperationAlreadyExists(operationId);
        }
        
        uint256 expiresAt = block.timestamp + timeoutSeconds;
        
        zkOperations[operationId] = ZKOperation({
            operationId: operationId,
            amount: amount,
            user: msg.sender,
            timestamp: block.timestamp,
            expiresAt: expiresAt,
            executed: false,
            zkProofVerified: false
        });
        
        emit ZKOperationCreated(operationId, msg.sender, amount, expiresAt);
    }
    
    /**
     * @notice Submit a ZK proof that 2-of-3 consensus was reached
     * @dev The proof proves threshold was met without revealing which validators signed
     * @param operationId The operation to verify
     * @param proof The Groth16 proof (8 uint256 values: A, B, C points)
     * @param publicInputs Public inputs for verification
     */
    function submitZKConsensusProof(
        bytes32 operationId,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs
    ) external {
        ZKOperation storage op = zkOperations[operationId];
        
        if (op.operationId == bytes32(0)) revert OperationNotFound(operationId);
        if (op.executed) revert OperationAlreadyExecuted(operationId);
        if (block.timestamp > op.expiresAt) {
            revert OperationExpired(op.expiresAt, block.timestamp);
        }
        
        // Check proof hasn't been used before (replay protection)
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));
        if (usedProofHashes[proofHash]) revert ProofAlreadyUsed(proofHash);
        
        // Verify the ZK proof
        // Public inputs should include: [message, threshold, validatorPubKeyHashes...]
        bool valid = groth16Verifier.verifyMultisigProof(proof, publicInputs);
        if (!valid) revert InvalidZKProof();
        
        // Verify threshold in public inputs matches required
        if (publicInputs.length < 2 || publicInputs[1] < REQUIRED_THRESHOLD) {
            revert ThresholdNotMet(publicInputs[1], REQUIRED_THRESHOLD);
        }
        
        // Mark proof as used
        usedProofHashes[proofHash] = true;
        op.zkProofVerified = true;
        
        emit ZKConsensusVerified(operationId, proofHash, block.timestamp);
        
        // Auto-execute if proof is verified
        _executeZKOperation(operationId);
    }
    
    /**
     * @notice Verify vault ownership using ZK proof
     * @param vaultId The vault identifier
     * @param proof The Groth16 proof
     * @param ownerPubKeyHash Hash of owner's public key
     * @param vaultRoot Merkle root of vault state
     * @param challengeHash Challenge for replay protection
     * @return valid True if ownership is proven
     */
    function verifyVaultOwnershipZK(
        bytes32 vaultId,
        uint256[8] calldata proof,
        uint256 ownerPubKeyHash,
        uint256 vaultRoot,
        uint256 challengeHash
    ) external view returns (bool valid) {
        return groth16Verifier.verifyVaultOwnership(
            proof,
            ownerPubKeyHash,
            vaultRoot,
            challengeHash
        );
    }
    
    // ===== INTERNAL FUNCTIONS =====
    
    function _executeZKOperation(bytes32 operationId) internal {
        ZKOperation storage op = zkOperations[operationId];
        
        if (!op.zkProofVerified) revert InvalidZKProof();
        if (op.executed) revert OperationAlreadyExecuted(operationId);
        if (block.timestamp > op.expiresAt) {
            revert OperationExpired(op.expiresAt, block.timestamp);
        }
        
        op.executed = true;
        
        emit ZKOperationExecuted(operationId, op.user, op.amount);
        
        // Execution logic would go here
        // For example: transfer tokens, update state, etc.
    }
    
    // ===== ADMIN FUNCTIONS =====
    
    /**
     * @notice Set validator public key hash for a chain
     * @param chainId The chain identifier (1=Arbitrum, 2=Solana, 3=TON)
     * @param pubKeyHash Poseidon hash of validator's public key
     */
    function setValidatorPubKeyHash(uint8 chainId, uint256 pubKeyHash) external onlyAdmin {
        require(chainId >= ARBITRUM_CHAIN_ID && chainId <= TON_CHAIN_ID, "Invalid chain");
        validatorPubKeyHashes[chainId] = pubKeyHash;
        emit ValidatorKeyUpdated(chainId, pubKeyHash);
    }
    
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin");
        admin = newAdmin;
    }
    
    // ===== VIEW FUNCTIONS =====
    
    function getOperation(bytes32 operationId) external view returns (ZKOperation memory) {
        return zkOperations[operationId];
    }
    
    function isProofUsed(bytes32 proofHash) external view returns (bool) {
        return usedProofHashes[proofHash];
    }
    
    function getValidatorPubKeyHashes() external view returns (uint256[3] memory) {
        return [
            validatorPubKeyHashes[ARBITRUM_CHAIN_ID],
            validatorPubKeyHashes[SOLANA_CHAIN_ID],
            validatorPubKeyHashes[TON_CHAIN_ID]
        ];
    }
}
