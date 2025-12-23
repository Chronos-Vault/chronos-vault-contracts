// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Groth16Verifier
 * @author Chronos Vault Team
 * @notice On-chain Groth16 proof verifier for Trinity Protocol ZK circuits
 * @dev Generated for multisig_verification.circom and vault_ownership.circom
 * 
 * This contract verifies zero-knowledge proofs that prove:
 * 1. Multi-sig threshold met without revealing which signers participated
 * 2. Vault ownership without revealing private keys
 * 
 * Security: 128-bit (BN254 curve)
 * Proof size: 128 bytes (3 curve points)
 * Verification gas: ~200k
 * 
 * Trust Math, Not Humans
 */
contract Groth16Verifier {
    
    // ===== BN254 CURVE PARAMETERS =====
    
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    
    // ===== VERIFICATION KEY (from trusted setup) =====
    // These are placeholder values - replace with actual ceremony output
    
    struct VerifyingKey {
        uint256[2] alpha1;
        uint256[2][2] beta2;
        uint256[2][2] gamma2;
        uint256[2][2] delta2;
        uint256[2][] IC;
    }
    
    struct Proof {
        uint256[2] A;
        uint256[2][2] B;
        uint256[2] C;
    }
    
    // Verification key for multisig_verification circuit
    VerifyingKey public multisigVK;
    
    // Verification key for vault_ownership circuit  
    VerifyingKey public vaultVK;
    
    // Admin for updating verification keys
    address public admin;
    
    // ===== EVENTS =====
    
    event MultisigProofVerified(bytes32 indexed operationId, uint256 threshold);
    event VaultOwnershipVerified(bytes32 indexed vaultId, bytes32 ownerHash);
    event VerificationKeyUpdated(string circuit, address updater);
    
    // ===== ERRORS =====
    
    error InvalidProof();
    error InvalidPublicInputs();
    error OnlyAdmin();
    error ProofElementOutOfRange();
    
    // ===== CONSTRUCTOR =====
    
    constructor() {
        admin = msg.sender;
        _initializeDefaultVK();
    }
    
    // ===== MODIFIERS =====
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }
    
    // ===== CORE VERIFICATION FUNCTIONS =====
    
    /**
     * @notice Verify a multi-signature ZK proof
     * @param proof The Groth16 proof (A, B, C points)
     * @param publicInputs Public inputs: [message, threshold, operationId, ...]
     * @return valid True if proof is valid
     */
    function verifyMultisigProof(
        uint256[8] calldata proof,
        uint256[] calldata publicInputs
    ) external view returns (bool valid) {
        // Validate public inputs length
        if (publicInputs.length < 3) revert InvalidPublicInputs();
        
        // Validate all inputs are in field
        for (uint256 i = 0; i < publicInputs.length; i++) {
            if (publicInputs[i] >= SNARK_SCALAR_FIELD) revert ProofElementOutOfRange();
        }
        
        // Verify the proof
        return _verifyProof(proof, publicInputs, multisigVK);
    }
    
    /**
     * @notice Verify a vault ownership ZK proof
     * @param proof The Groth16 proof
     * @param ownerPublicKeyHash Hash of owner's public key
     * @param vaultRoot Merkle root of vault state
     * @param challengeHash Challenge hash for replay protection
     * @return valid True if proof is valid
     */
    function verifyVaultOwnership(
        uint256[8] calldata proof,
        uint256 ownerPublicKeyHash,
        uint256 vaultRoot,
        uint256 challengeHash
    ) external view returns (bool valid) {
        // Validate inputs are in field
        if (ownerPublicKeyHash >= SNARK_SCALAR_FIELD) revert ProofElementOutOfRange();
        if (vaultRoot >= SNARK_SCALAR_FIELD) revert ProofElementOutOfRange();
        if (challengeHash >= SNARK_SCALAR_FIELD) revert ProofElementOutOfRange();
        
        uint256[] memory publicInputs = new uint256[](3);
        publicInputs[0] = ownerPublicKeyHash;
        publicInputs[1] = vaultRoot;
        publicInputs[2] = challengeHash;
        
        return _verifyProof(proof, publicInputs, vaultVK);
    }
    
    /**
     * @notice Batch verify multiple proofs (gas optimization)
     * @param proofs Array of proofs
     * @param publicInputsArray Array of public inputs per proof
     * @return allValid True if all proofs are valid
     */
    function batchVerifyMultisigProofs(
        uint256[8][] calldata proofs,
        uint256[][] calldata publicInputsArray
    ) external view returns (bool allValid) {
        if (proofs.length != publicInputsArray.length) revert InvalidPublicInputs();
        
        for (uint256 i = 0; i < proofs.length; i++) {
            if (!_verifyProof(proofs[i], publicInputsArray[i], multisigVK)) {
                return false;
            }
        }
        return true;
    }
    
    // ===== INTERNAL VERIFICATION =====
    
    function _verifyProof(
        uint256[8] memory proof,
        uint256[] memory publicInputs,
        VerifyingKey storage vk
    ) internal view returns (bool) {
        // Extract proof points
        uint256[2] memory a = [proof[0], proof[1]];
        uint256[2][2] memory b = [[proof[2], proof[3]], [proof[4], proof[5]]];
        uint256[2] memory c = [proof[6], proof[7]];
        
        // Validate proof elements are on curve
        if (!_isOnCurve(a[0], a[1])) return false;
        if (!_isOnCurve(c[0], c[1])) return false;
        
        // Compute linear combination of public inputs
        uint256[2] memory vk_x = vk.IC[0];
        
        for (uint256 i = 0; i < publicInputs.length; i++) {
            if (i + 1 >= vk.IC.length) break;
            
            uint256[2] memory scaledIC = _scalarMul(vk.IC[i + 1], publicInputs[i]);
            vk_x = _pointAdd(vk_x, scaledIC);
        }
        
        // Pairing check: e(A, B) = e(alpha, beta) * e(vk_x, gamma) * e(C, delta)
        return _pairingCheck(
            a, b,
            vk.alpha1, vk.beta2,
            vk_x, vk.gamma2,
            c, vk.delta2
        );
    }
    
    // ===== ELLIPTIC CURVE OPERATIONS =====
    
    function _isOnCurve(uint256 x, uint256 y) internal pure returns (bool) {
        if (x >= PRIME_Q || y >= PRIME_Q) return false;
        
        // y^2 = x^3 + 3 (BN254 curve equation)
        uint256 lhs = mulmod(y, y, PRIME_Q);
        uint256 rhs = addmod(
            mulmod(mulmod(x, x, PRIME_Q), x, PRIME_Q),
            3,
            PRIME_Q
        );
        return lhs == rhs;
    }
    
    function _scalarMul(uint256[2] memory p, uint256 s) internal view returns (uint256[2] memory r) {
        uint256[3] memory input;
        input[0] = p[0];
        input[1] = p[1];
        input[2] = s;
        
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x60, r, 0x40)
        }
        require(success, "scalar mul failed");
    }
    
    function _pointAdd(uint256[2] memory p1, uint256[2] memory p2) internal view returns (uint256[2] memory r) {
        uint256[4] memory input;
        input[0] = p1[0];
        input[1] = p1[1];
        input[2] = p2[0];
        input[3] = p2[1];
        
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0x80, r, 0x40)
        }
        require(success, "point add failed");
    }
    
    function _pairingCheck(
        uint256[2] memory a1, uint256[2][2] memory b1,
        uint256[2] memory a2, uint256[2][2] memory b2,
        uint256[2] memory a3, uint256[2][2] memory b3,
        uint256[2] memory a4, uint256[2][2] memory b4
    ) internal view returns (bool) {
        uint256[24] memory input;
        
        // Pairing 1: -A, B
        input[0] = a1[0];
        input[1] = PRIME_Q - (a1[1] % PRIME_Q); // Negate y
        input[2] = b1[0][1];
        input[3] = b1[0][0];
        input[4] = b1[1][1];
        input[5] = b1[1][0];
        
        // Pairing 2: alpha, beta
        input[6] = a2[0];
        input[7] = a2[1];
        input[8] = b2[0][1];
        input[9] = b2[0][0];
        input[10] = b2[1][1];
        input[11] = b2[1][0];
        
        // Pairing 3: vk_x, gamma
        input[12] = a3[0];
        input[13] = a3[1];
        input[14] = b3[0][1];
        input[15] = b3[0][0];
        input[16] = b3[1][1];
        input[17] = b3[1][0];
        
        // Pairing 4: C, delta
        input[18] = a4[0];
        input[19] = a4[1];
        input[20] = b4[0][1];
        input[21] = b4[0][0];
        input[22] = b4[1][1];
        input[23] = b4[1][0];
        
        uint256[1] memory out;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 8, input, 0x300, out, 0x20)
        }
        
        return success && out[0] == 1;
    }
    
    // ===== ADMIN FUNCTIONS =====
    
    function updateMultisigVK(
        uint256[2] calldata alpha1,
        uint256[2][2] calldata beta2,
        uint256[2][2] calldata gamma2,
        uint256[2][2] calldata delta2,
        uint256[2][] calldata IC
    ) external onlyAdmin {
        multisigVK.alpha1 = alpha1;
        multisigVK.beta2 = beta2;
        multisigVK.gamma2 = gamma2;
        multisigVK.delta2 = delta2;
        delete multisigVK.IC;
        for (uint256 i = 0; i < IC.length; i++) {
            multisigVK.IC.push(IC[i]);
        }
        emit VerificationKeyUpdated("multisig", msg.sender);
    }
    
    function updateVaultVK(
        uint256[2] calldata alpha1,
        uint256[2][2] calldata beta2,
        uint256[2][2] calldata gamma2,
        uint256[2][2] calldata delta2,
        uint256[2][] calldata IC
    ) external onlyAdmin {
        vaultVK.alpha1 = alpha1;
        vaultVK.beta2 = beta2;
        vaultVK.gamma2 = gamma2;
        vaultVK.delta2 = delta2;
        delete vaultVK.IC;
        for (uint256 i = 0; i < IC.length; i++) {
            vaultVK.IC.push(IC[i]);
        }
        emit VerificationKeyUpdated("vault", msg.sender);
    }
    
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin");
        admin = newAdmin;
    }
    
    // ===== INITIALIZATION =====
    
    function _initializeDefaultVK() internal {
        // Placeholder verification key - replace after trusted setup ceremony
        // These values are for testing only
        
        multisigVK.alpha1 = [uint256(1), uint256(2)];
        multisigVK.beta2 = [[uint256(1), uint256(0)], [uint256(0), uint256(1)]];
        multisigVK.gamma2 = [[uint256(1), uint256(0)], [uint256(0), uint256(1)]];
        multisigVK.delta2 = [[uint256(1), uint256(0)], [uint256(0), uint256(1)]];
        multisigVK.IC.push([uint256(1), uint256(2)]);
        
        vaultVK.alpha1 = [uint256(1), uint256(2)];
        vaultVK.beta2 = [[uint256(1), uint256(0)], [uint256(0), uint256(1)]];
        vaultVK.gamma2 = [[uint256(1), uint256(0)], [uint256(0), uint256(1)]];
        vaultVK.delta2 = [[uint256(1), uint256(0)], [uint256(0), uint256(1)]];
        vaultVK.IC.push([uint256(1), uint256(2)]);
    }
}
