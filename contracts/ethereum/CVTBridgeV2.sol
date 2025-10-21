// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title CVTBridgeV2 - Enhanced with Mathematical Circuit Breaker
 * @author Chronos Vault Team
 * @notice CVT token bridge with automatic anomaly detection and circuit breaker protection
 * @dev Implements Trinity Protocol with automatic mathematical security enforcement
 * 
 * ENHANCED SECURITY FEATURES:
 * - Validator-based consensus (multi-signature verification)
 * - Mathematical circuit breaker (automatic triggers on anomalies)
 * - Volume spike detection (>500% increase)
 * - Failed signature rate monitoring (>20% failure rate)
 * - Auto-pause on detected anomalies
 * - Time-based auto-recovery OR validator consensus resume
 * 
 * SUPPORTED CHAINS:
 * - CHAIN_ETHEREUM (1) - Ethereum mainnet and L2s (Arbitrum)
 * - CHAIN_SOLANA (2) - Solana mainnet/devnet
 * - CHAIN_TON (0) - TON blockchain
 * 
 * Trinity Protocol: 2-of-3 consensus across all supported chains
 */
contract CVTBridgeV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Chain IDs
    uint8 public constant CHAIN_TON = 0;
    uint8 public constant CHAIN_ETHEREUM = 1;
    uint8 public constant CHAIN_SOLANA = 2;

    // CIRCUIT BREAKER: Mathematical thresholds (IMMUTABLE)
    uint256 public immutable VOLUME_SPIKE_THRESHOLD = 500; // 500% = 5x spike
    uint256 public immutable MAX_FAILED_SIG_RATE = 20; // 20% failure rate
    uint256 public immutable AUTO_RECOVERY_DELAY = 2 hours; // Auto-resume after 2 hours
    uint256 public immutable MAX_SAME_BLOCK_BRIDGES = 5; // Max bridges per block

    // Events
    event BridgeInitiated(
        address indexed sender,
        uint8 targetChain,
        bytes targetAddress,
        uint256 amount,
        uint256 fee,
        uint256 nonce
    );
    
    event BridgeCompleted(
        address indexed recipient,
        uint8 sourceChain,
        bytes sourceAddress,
        uint256 amount,
        uint256 nonce
    );
    
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    
    event CircuitBreakerTriggered(
        string reason,
        uint256 timestamp,
        uint256 metricValue
    );
    
    event CircuitBreakerResolved(
        string method,
        uint256 timestamp
    );

    // State variables
    IERC20 public cvtToken;
    uint256 public bridgeFee;
    uint256 public minAmount;
    uint256 public threshold;
    
    // Bridge state
    uint256 public bridgeNonce;
    mapping(bytes32 => bool) public processedBridges;
    
    // Validators
    mapping(address => bool) public validators;
    uint256 public validatorCount;
    
    // Signature tracking
    mapping(bytes32 => mapping(address => bool)) public bridgeSignatures;
    mapping(bytes32 => uint256) public bridgeSignatureCount;

    // Circuit breaker state
    struct CircuitBreakerState {
        bool active;
        uint256 triggeredAt;
        string reason;
        uint256 validatorApprovals;
        mapping(address => bool) validatorApproved;
    }
    
    CircuitBreakerState public circuitBreaker;
    
    // Anomaly detection metrics
    struct AnomalyMetrics {
        uint256 totalVolume24h;
        uint256 lastVolumeReset;
        uint256 failedSignatures1h;
        uint256 totalSignatures1h;
        uint256 lastSigReset;
        uint256 bridgesInBlock;
        uint256 lastBlockNumber;
    }
    
    AnomalyMetrics public metrics;

    // Custom errors
    error CircuitBreakerActive();
    error AnomalyDetected();
    
    // Modifiers
    modifier whenNotPaused() {
        if (circuitBreaker.active) {
            // Check auto-recovery
            if (block.timestamp >= circuitBreaker.triggeredAt + AUTO_RECOVERY_DELAY) {
                circuitBreaker.active = false;
                circuitBreaker.validatorApprovals = 0;
                emit CircuitBreakerResolved("Auto-recovery", block.timestamp);
            } else {
                revert CircuitBreakerActive();
            }
        }
        _;
    }

    constructor(
        address _cvtToken,
        uint256 _bridgeFee,
        uint256 _minAmount,
        address[] memory _initialValidators,
        uint256 _threshold
    ) Ownable(msg.sender) {
        cvtToken = IERC20(_cvtToken);
        bridgeFee = _bridgeFee;
        minAmount = _minAmount;
        
        // Add validators
        for (uint256 i = 0; i < _initialValidators.length; i++) {
            validators[_initialValidators[i]] = true;
        }
        validatorCount = _initialValidators.length;
        
        require(_threshold > 0 && _threshold <= _initialValidators.length, "Invalid threshold");
        threshold = _threshold;
        
        // Initialize metrics
        metrics.lastVolumeReset = block.timestamp;
        metrics.lastSigReset = block.timestamp;
        metrics.lastBlockNumber = block.number;
    }

    /**
     * @dev Bridge tokens out with anomaly detection
     */
    function bridgeOut(
        uint8 targetChain,
        bytes calldata targetAddress,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(amount >= minAmount, "Amount below minimum");
        require(targetChain == CHAIN_TON || targetChain == CHAIN_SOLANA, "Invalid target chain");
        require(targetAddress.length > 0, "Invalid target address");
        
        // ANOMALY DETECTION: Volume spike
        _checkVolumeAnomaly(amount);
        
        // ANOMALY DETECTION: Same-block spam
        _checkSameBlockAnomaly();
        
        // Calculate fee
        uint256 fee = (amount * bridgeFee) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        uint256 nonce = ++bridgeNonce;
        
        // Transfer tokens
        cvtToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update metrics
        metrics.totalVolume24h += amount;
        
        emit BridgeInitiated(
            msg.sender,
            targetChain,
            targetAddress,
            amountAfterFee,
            fee,
            nonce
        );
    }

    /**
     * @dev Bridge tokens in with signature verification and anomaly detection
     */
    function bridgeIn(
        uint8 sourceChain,
        bytes calldata sourceAddress,
        address recipient,
        uint256 amount,
        uint256 nonce,
        bytes[] calldata signatures
    ) external nonReentrant whenNotPaused {
        require(sourceChain == CHAIN_TON || sourceChain == CHAIN_SOLANA, "Invalid source chain");
        require(sourceAddress.length > 0, "Invalid source address");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        // SECURITY FIX: Include block.chainid to prevent cross-chain replay attacks
        bytes32 bridgeHash = keccak256(
            abi.encodePacked(
                block.chainid,      // CRITICAL: Binds signature to deployment chain
                sourceChain,
                sourceAddress,
                recipient,
                amount,
                nonce
            )
        );
        
        require(!processedBridges[bridgeHash], "Bridge already processed");
        
        // Verify signatures
        uint256 validSignatures = 0;
        
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = bridgeHash.toEthSignedMessageHash().recover(signatures[i]);
            
            if (validators[signer] && !bridgeSignatures[bridgeHash][signer]) {
                bridgeSignatures[bridgeHash][signer] = true;
                bridgeSignatureCount[bridgeHash]++;
                validSignatures++;
            }
        }
        
        // Update signature metrics
        metrics.totalSignatures1h += signatures.length;
        uint256 failedSigs = signatures.length - validSignatures;
        metrics.failedSignatures1h += failedSigs;
        
        // ANOMALY DETECTION: Failed signature rate
        _checkSignatureAnomaly();
        
        require(bridgeSignatureCount[bridgeHash] >= threshold, "Insufficient signatures");
        
        // Mark as processed
        processedBridges[bridgeHash] = true;
        
        // Transfer tokens
        cvtToken.safeTransfer(recipient, amount);
        
        emit BridgeCompleted(recipient, sourceChain, sourceAddress, amount, nonce);
    }

    /**
     * @dev Validator-based circuit breaker resume
     * Requires majority validator approval for early resume
     */
    function approveResume() external {
        require(circuitBreaker.active, "Circuit breaker not active");
        require(validators[msg.sender], "Not a validator");
        require(!circuitBreaker.validatorApproved[msg.sender], "Already approved");
        
        circuitBreaker.validatorApproved[msg.sender] = true;
        circuitBreaker.validatorApprovals++;
        
        // Resume if majority validators approve (>50%)
        if (circuitBreaker.validatorApprovals > validatorCount / 2) {
            circuitBreaker.active = false;
            circuitBreaker.validatorApprovals = 0;
            emit CircuitBreakerResolved("Validator consensus", block.timestamp);
        }
    }

    /**
     * ANOMALY DETECTION: Volume spike detector
     */
    function _checkVolumeAnomaly(uint256 newAmount) internal {
        // Reset 24h metrics
        if (block.timestamp >= metrics.lastVolumeReset + 24 hours) {
            metrics.totalVolume24h = 0;
            metrics.lastVolumeReset = block.timestamp;
        }
        
        // Calculate average
        uint256 avgVolume = metrics.totalVolume24h > 0 ? metrics.totalVolume24h / 50 : 1 ether;
        
        // Check for spike (>5x average)
        if (newAmount > avgVolume * VOLUME_SPIKE_THRESHOLD / 100) {
            circuitBreaker.active = true;
            circuitBreaker.triggeredAt = block.timestamp;
            circuitBreaker.reason = "Volume spike detected";
            emit CircuitBreakerTriggered("Volume spike", block.timestamp, newAmount);
            revert AnomalyDetected();
        }
    }

    /**
     * ANOMALY DETECTION: Same-block bridge detector
     */
    function _checkSameBlockAnomaly() internal {
        if (block.number == metrics.lastBlockNumber) {
            metrics.bridgesInBlock++;
            if (metrics.bridgesInBlock > MAX_SAME_BLOCK_BRIDGES) {
                circuitBreaker.active = true;
                circuitBreaker.triggeredAt = block.timestamp;
                circuitBreaker.reason = "Same-block spam detected";
                emit CircuitBreakerTriggered("Same-block spam", block.timestamp, metrics.bridgesInBlock);
                revert AnomalyDetected();
            }
        } else {
            metrics.lastBlockNumber = block.number;
            metrics.bridgesInBlock = 1;
        }
    }

    /**
     * ANOMALY DETECTION: Failed signature rate detector
     */
    function _checkSignatureAnomaly() internal {
        // Reset 1h metrics
        if (block.timestamp >= metrics.lastSigReset + 1 hours) {
            metrics.failedSignatures1h = 0;
            metrics.totalSignatures1h = 0;
            metrics.lastSigReset = block.timestamp;
        }
        
        // Check failure rate
        if (metrics.totalSignatures1h > 10) {
            uint256 failureRate = (metrics.failedSignatures1h * 100) / metrics.totalSignatures1h;
            if (failureRate > MAX_FAILED_SIG_RATE) {
                circuitBreaker.active = true;
                circuitBreaker.triggeredAt = block.timestamp;
                circuitBreaker.reason = "High signature failure rate";
                emit CircuitBreakerTriggered("Signature failure spike", block.timestamp, failureRate);
                revert AnomalyDetected();
            }
        }
    }

    /**
     * Admin functions
     */
    function addValidator(address validator) external onlyOwner {
        require(!validators[validator], "Already a validator");
        validators[validator] = true;
        validatorCount++;
        emit ValidatorAdded(validator);
    }

    function removeValidator(address validator) external onlyOwner {
        require(validators[validator], "Not a validator");
        require(validatorCount > threshold, "Cannot remove: would break threshold");
        validators[validator] = false;
        validatorCount--;
        emit ValidatorRemoved(validator);
    }

    function updateThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0 && newThreshold <= validatorCount, "Invalid threshold");
        uint256 oldThreshold = threshold;
        threshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    function updateFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        uint256 oldFee = bridgeFee;
        bridgeFee = newFee;
        emit FeeUpdated(oldFee, newFee);
    }
}
