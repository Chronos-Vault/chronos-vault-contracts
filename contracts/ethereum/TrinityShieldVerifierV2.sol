// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title TrinityShieldVerifier V2.2
 * @author ChronosVault (chronosvault.org)
 * @notice Extended attestation verifier supporting both Intel SGX and AMD SEV-SNP
 * @dev Phase 4: Multi-TEE support for Trinity Protocol validators
 * 
 * V2.2 Security Fixes:
 * - H-01/H-02: Fixed attestation hijack via secure keccak256(validator, chainId) binding
 * - M-01: Renamed checkAttestationValid to checkAttestationValidForRenewal
 * - L-01: Added chainId validation in verifyAttestedVote
 * 
 * V2.1 Security Fixes:
 * - Cross-chain replay protection (quoteHash + chainId)
 * - Constructor initialization for approved values
 * - Missing event for SevIdKeyDigestApproval
 * - Batch operations for approvals
 * - Updateable consensus verifier
 * - Zero address validation
 */
contract TrinityShieldVerifierV2 is AccessControl, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Roles
    bytes32 public constant TRUSTED_RELAYER_ROLE = keccak256("TRUSTED_RELAYER");
    bytes32 public constant TEE_ADMIN_ROLE = keccak256("TEE_ADMIN");

    // TEE Types
    enum TEEType { SGX, SEV_SNP }

    // Attestation data structure
    struct Attestation {
        TEEType teeType;
        bool isValid;
        uint256 attestedAt;
        uint256 expiresAt;
        bytes32 measurement;
        bytes32 mrsigner;
        bytes32 reportData;
        uint8 chainId;
        bytes attestationReport;
    }

    // SGX-specific approved values
    mapping(bytes32 => bool) public approvedMrenclave;
    mapping(bytes32 => bool) public approvedMrsigner;
    
    // SEV-SNP specific approved values
    mapping(bytes32 => bool) public approvedSevMeasurement;
    mapping(bytes32 => bool) public approvedSevIdKeyDigest;

    // Validator attestations
    mapping(address => Attestation) public validatorAttestations;
    
    // Quote hash tracking for replay protection (v2.1: includes chainId)
    mapping(bytes32 => mapping(uint8 => bool)) public usedQuoteHashes;

    // Configuration
    uint256 public attestationValidityPeriod = 24 hours;
    uint256 public constant MAX_QUOTE_AGE = 10 minutes;
    uint256 public constant GRACE_PERIOD = 5 minutes; // v2.1: Grace period for re-attestation

    // Linked consensus verifier (v2.1: now updateable)
    address public trinityConsensusVerifier;

    // Events
    event ValidatorAttested(
        address indexed validator,
        TEEType teeType,
        bytes32 measurement,
        uint256 timestamp
    );
    event AttestationExpired(address indexed validator, uint256 timestamp);
    event MrenclaveApproved(bytes32 indexed mrenclave, bool approved);
    event MrsignerApproved(bytes32 indexed mrsigner, bool approved); // v2.1: Added
    event SevMeasurementApproved(bytes32 indexed measurement, bool approved);
    event SevIdKeyDigestApproved(bytes32 indexed idKeyDigest, bool approved); // v2.1: Added
    event TeeTypeUpdated(address indexed validator, TEEType oldType, TEEType newType);
    event ConsensusVerifierUpdated(address indexed oldVerifier, address indexed newVerifier); // v2.1: Added

    /**
     * @notice Constructor with initialization for approved values
     * @param _consensusVerifier Address of the Trinity Consensus Verifier contract
     * @param initialMrenclaves Initial approved MRENCLAVE values
     * @param initialMrsigners Initial approved MRSIGNER values
     */
    constructor(
        address _consensusVerifier,
        bytes32[] memory initialMrenclaves,
        bytes32[] memory initialMrsigners
    ) {
        require(_consensusVerifier != address(0), "Invalid consensus verifier");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TEE_ADMIN_ROLE, msg.sender);
        trinityConsensusVerifier = _consensusVerifier;
        
        // Initialize approved MRENCLAVE values
        for (uint i = 0; i < initialMrenclaves.length; i++) {
            approvedMrenclave[initialMrenclaves[i]] = true;
            emit MrenclaveApproved(initialMrenclaves[i], true);
        }
        
        // Initialize approved MRSIGNER values
        for (uint i = 0; i < initialMrsigners.length; i++) {
            approvedMrsigner[initialMrsigners[i]] = true;
            emit MrsignerApproved(initialMrsigners[i], true);
        }
    }

    // ========== SGX ATTESTATION ==========

    /**
     * @notice Submit SGX attestation via trusted relayer
     * @param validator Validator address being attested
     * @param quoteHash Hash of the DCAP quote
     * @param mrenclave MRENCLAVE value from quote
     * @param mrsigner MRSIGNER value from quote
     * @param reportData First 32 bytes of report data
     * @param timestamp Quote generation timestamp
     * @param chainId Chain ID for multi-chain binding (1=Arbitrum, 2=Solana, 3=TON)
     * @param relayerSignature Relayer's signature
     */
    function submitSGXAttestation(
        address validator,
        bytes32 quoteHash,
        bytes32 mrenclave,
        bytes32 mrsigner,
        bytes32 reportData,
        uint256 timestamp,
        uint8 chainId,
        bytes calldata relayerSignature
    ) external nonReentrant {
        require(hasRole(TRUSTED_RELAYER_ROLE, msg.sender), "Not authorized relayer");
        // v2.1: Cross-chain replay protection
        require(!usedQuoteHashes[quoteHash][chainId], "Quote already used on this chain");
        require(block.timestamp - timestamp <= MAX_QUOTE_AGE, "Quote too old");
        require(approvedMrenclave[mrenclave], "MRENCLAVE not approved");
        require(approvedMrsigner[mrsigner], "MRSIGNER not approved");
        
        // V2.2 FIX (H-01): Secure binding using keccak256 hash of validator + chainId
        // This prevents attestation hijack by ensuring the TEE signed a commitment 
        // that includes both the validator identity AND the target chain
        bytes32 expectedReportData = keccak256(abi.encodePacked(validator, chainId));
        require(expectedReportData == reportData, "Report data binding mismatch");
        
        // Verify relayer signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            validator,
            quoteHash,
            mrenclave,
            mrsigner,
            reportData,
            timestamp,
            chainId,
            block.chainid
        ));
        address signer = messageHash.toEthSignedMessageHash().recover(relayerSignature);
        require(hasRole(TRUSTED_RELAYER_ROLE, signer), "Invalid relayer signature");
        
        // Record attestation (v2.1: mark used per chainId)
        usedQuoteHashes[quoteHash][chainId] = true;
        validatorAttestations[validator] = Attestation({
            teeType: TEEType.SGX,
            isValid: true,
            attestedAt: block.timestamp,
            expiresAt: block.timestamp + attestationValidityPeriod,
            measurement: mrenclave,
            mrsigner: mrsigner,
            reportData: reportData,
            chainId: chainId,
            attestationReport: ""
        });
        
        emit ValidatorAttested(validator, TEEType.SGX, mrenclave, block.timestamp);
    }

    // ========== AMD SEV-SNP ATTESTATION ==========

    /**
     * @notice Submit AMD SEV-SNP attestation via trusted relayer
     */
    function submitSEVAttestation(
        address validator,
        bytes32 reportHash,
        bytes32 measurement,
        bytes32 hostData,
        uint256 timestamp,
        bytes32 idKeyDigest,
        uint8 chainId,
        bytes calldata relayerSignature
    ) external nonReentrant {
        require(hasRole(TRUSTED_RELAYER_ROLE, msg.sender), "Not authorized relayer");
        // v2.1: Cross-chain replay protection
        require(!usedQuoteHashes[reportHash][chainId], "Report already used on this chain");
        require(block.timestamp - timestamp <= MAX_QUOTE_AGE, "Report too old");
        require(approvedSevMeasurement[measurement], "MEASUREMENT not approved");
        require(approvedSevIdKeyDigest[idKeyDigest], "ID key digest not approved");
        
        // V2.2 FIX (H-02): Secure binding using keccak256 hash of validator + chainId
        // This prevents attestation hijack by ensuring the TEE signed a commitment 
        // that includes both the validator identity AND the target chain
        bytes32 expectedHostData = keccak256(abi.encodePacked(validator, chainId));
        require(expectedHostData == hostData, "Host data binding mismatch");
        
        // Verify relayer signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            validator,
            reportHash,
            measurement,
            hostData,
            timestamp,
            idKeyDigest,
            chainId,
            block.chainid
        ));
        address signer = messageHash.toEthSignedMessageHash().recover(relayerSignature);
        require(hasRole(TRUSTED_RELAYER_ROLE, signer), "Invalid relayer signature");
        
        // Record attestation (v2.1: mark used per chainId)
        usedQuoteHashes[reportHash][chainId] = true;
        validatorAttestations[validator] = Attestation({
            teeType: TEEType.SEV_SNP,
            isValid: true,
            attestedAt: block.timestamp,
            expiresAt: block.timestamp + attestationValidityPeriod,
            measurement: measurement,
            mrsigner: bytes32(0),
            reportData: hostData,
            chainId: chainId,
            attestationReport: ""
        });
        
        emit ValidatorAttested(validator, TEEType.SEV_SNP, measurement, block.timestamp);
    }

    // ========== UNIFIED VALIDATION ==========

    /**
     * @notice Check if validator can submit a renewal attestation (includes grace period)
     * @dev V2.2 FIX (M-01): Renamed from checkAttestationValid to clarify purpose
     * @dev This function should ONLY be used for determining renewal eligibility,
     *      NOT for consensus voting validation. Use isAttested() for voting checks.
     */
    function checkAttestationValidForRenewal(address validator) external view returns (bool) {
        Attestation storage att = validatorAttestations[validator];
        if (!att.isValid) return false;
        return block.timestamp <= att.expiresAt + GRACE_PERIOD;
    }

    /**
     * @notice Get validator attestation details
     */
    function getValidatorAttestation(address validator) external view returns (
        TEEType teeType,
        bool isValidAttestation,
        uint256 attestedAt,
        bytes32 measurement,
        uint256 expiresAt
    ) {
        Attestation storage att = validatorAttestations[validator];
        bool valid = att.isValid && block.timestamp <= att.expiresAt;
        return (
            att.teeType,
            valid,
            att.attestedAt,
            att.measurement,
            att.expiresAt
        );
    }

    /**
     * @notice Count attested validators for consensus check
     * @dev v2.1: Added bounds check recommendation - use with reasonable array sizes
     */
    function countAttestedValidators(address[] calldata validators) external view returns (uint256 count) {
        require(validators.length <= 100, "Too many validators"); // v2.1: Gas protection
        for (uint i = 0; i < validators.length; i++) {
            Attestation storage att = validatorAttestations[validators[i]];
            if (att.isValid && block.timestamp <= att.expiresAt) {
                count++;
            }
        }
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Approve/revoke SGX MRENCLAVE value
     */
    function setMrenclaveApproval(bytes32 mrenclave, bool approved) 
        external 
        onlyRole(TEE_ADMIN_ROLE) 
    {
        approvedMrenclave[mrenclave] = approved;
        emit MrenclaveApproved(mrenclave, approved);
    }

    /**
     * @notice Approve/revoke SGX MRSIGNER value
     */
    function setMrsignerApproval(bytes32 mrsigner, bool approved) 
        external 
        onlyRole(TEE_ADMIN_ROLE) 
    {
        approvedMrsigner[mrsigner] = approved;
        emit MrsignerApproved(mrsigner, approved);
    }

    /**
     * @notice Approve/revoke AMD SEV MEASUREMENT value
     */
    function setSevMeasurementApproval(bytes32 measurement, bool approved)
        external
        onlyRole(TEE_ADMIN_ROLE)
    {
        approvedSevMeasurement[measurement] = approved;
        emit SevMeasurementApproved(measurement, approved);
    }

    /**
     * @notice Approve/revoke AMD SEV ID key digest
     * @dev v2.1: Added missing event emission
     */
    function setSevIdKeyDigestApproval(bytes32 idKeyDigest, bool approved)
        external
        onlyRole(TEE_ADMIN_ROLE)
    {
        approvedSevIdKeyDigest[idKeyDigest] = approved;
        emit SevIdKeyDigestApproved(idKeyDigest, approved);
    }

    // ========== BATCH OPERATIONS (v2.1) ==========

    /**
     * @notice Batch approve/revoke MRENCLAVE values
     */
    function batchSetMrenclaveApproval(bytes32[] calldata mrenclaves, bool approved)
        external
        onlyRole(TEE_ADMIN_ROLE)
    {
        for (uint i = 0; i < mrenclaves.length; i++) {
            approvedMrenclave[mrenclaves[i]] = approved;
            emit MrenclaveApproved(mrenclaves[i], approved);
        }
    }

    /**
     * @notice Batch approve/revoke MRSIGNER values
     */
    function batchSetMrsignerApproval(bytes32[] calldata mrsigners, bool approved)
        external
        onlyRole(TEE_ADMIN_ROLE)
    {
        for (uint i = 0; i < mrsigners.length; i++) {
            approvedMrsigner[mrsigners[i]] = approved;
            emit MrsignerApproved(mrsigners[i], approved);
        }
    }

    /**
     * @notice Batch approve/revoke SEV measurements
     */
    function batchSetSevMeasurementApproval(bytes32[] calldata measurements, bool approved)
        external
        onlyRole(TEE_ADMIN_ROLE)
    {
        for (uint i = 0; i < measurements.length; i++) {
            approvedSevMeasurement[measurements[i]] = approved;
            emit SevMeasurementApproved(measurements[i], approved);
        }
    }

    // ========== CONFIGURATION (v2.1) ==========

    /**
     * @notice Update consensus verifier address
     * @dev v2.1: Allows upgrading without contract redeployment
     */
    function updateConsensusVerifier(address newVerifier) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newVerifier != address(0), "Invalid verifier address");
        address oldVerifier = trinityConsensusVerifier;
        trinityConsensusVerifier = newVerifier;
        emit ConsensusVerifierUpdated(oldVerifier, newVerifier);
    }

    /**
     * @notice Update attestation validity period
     */
    function setAttestationValidityPeriod(uint256 newPeriod)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newPeriod >= 1 hours && newPeriod <= 7 days, "Invalid period");
        attestationValidityPeriod = newPeriod;
    }

    /**
     * @notice Add trusted relayer
     */
    function addTrustedRelayer(address relayer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(relayer != address(0), "Invalid relayer address");
        _grantRole(TRUSTED_RELAYER_ROLE, relayer);
    }

    /**
     * @notice Remove trusted relayer
     */
    function removeTrustedRelayer(address relayer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(TRUSTED_RELAYER_ROLE, relayer);
    }

    /**
     * @notice Invalidate validator attestation (emergency)
     */
    function invalidateAttestation(address validator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        validatorAttestations[validator].isValid = false;
        emit AttestationExpired(validator, block.timestamp);
    }
    
    // ========== INTERFACE COMPATIBILITY ==========
    
    struct AttestationData {
        bytes32 mrenclave;
        bytes32 mrsigner;
        bytes32 reportDataHash;
        uint256 attestedAt;
        uint256 expiresAt;
        uint8 chainId;
        bool valid;
    }
    
    /**
     * @notice Check if validator has valid attestation
     */
    function isAttested(address validator) external view returns (bool) {
        Attestation storage att = validatorAttestations[validator];
        return att.isValid && block.timestamp <= att.expiresAt;
    }
    
    /**
     * @notice Get attestation data
     */
    function getAttestation(address validator) external view returns (AttestationData memory data) {
        Attestation storage att = validatorAttestations[validator];
        return AttestationData({
            mrenclave: att.measurement,
            mrsigner: att.mrsigner,
            reportDataHash: att.reportData,
            attestedAt: att.attestedAt,
            expiresAt: att.expiresAt,
            chainId: att.chainId,
            valid: att.isValid && block.timestamp <= att.expiresAt
        });
    }
    
    /**
     * @notice Verify attested vote signature with chain scope validation
     * @dev V2.2 FIX (L-01): Added chainId parameter to enforce attestation scope
     * @param validator The validator address
     * @param operationHash The hash of the operation being voted on
     * @param signature The validator's signature
     * @param expectedChainId The chain ID where this vote should be valid (1=Arbitrum, 2=Solana, 3=TON)
     */
    function verifyAttestedVote(
        address validator, 
        bytes32 operationHash, 
        bytes calldata signature,
        uint8 expectedChainId
    ) external view returns (bool) {
        Attestation storage att = validatorAttestations[validator];
        if (!att.isValid || block.timestamp > att.expiresAt) {
            return false;
        }
        
        // V2.2 FIX (L-01): Ensure attestation is scoped to the correct chain
        if (att.chainId != expectedChainId) {
            return false;
        }
        
        address signer = operationHash.toEthSignedMessageHash().recover(signature);
        return signer == validator;
    }
    
    /**
     * @notice Legacy vote verification without chain scope (for backward compatibility)
     * @dev DEPRECATED: Use verifyAttestedVote with chainId parameter instead
     */
    function verifyAttestedVoteLegacy(
        address validator, 
        bytes32 operationHash, 
        bytes calldata signature
    ) external view returns (bool) {
        Attestation storage att = validatorAttestations[validator];
        if (!att.isValid || block.timestamp > att.expiresAt) {
            return false;
        }
        
        address signer = operationHash.toEthSignedMessageHash().recover(signature);
        return signer == validator;
    }
}
