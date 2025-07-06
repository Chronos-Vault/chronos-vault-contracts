// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title CVTBridge
 * @dev Bridge contract for the ChronosToken (CVT) on Ethereum
 * Handles bridging between TON, Ethereum, and Solana
 */
contract CVTBridge is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Supported chains
    uint8 public constant CHAIN_TON = 0;
    uint8 public constant CHAIN_ETHEREUM = 1;
    uint8 public constant CHAIN_SOLANA = 2;

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

    // State variables
    IERC20 public cvtToken;
    uint256 public bridgeFee; // Fee in basis points (1 = 0.01%)
    uint256 public minAmount; // Minimum amount to bridge
    uint256 public threshold; // Minimum signatures required to complete a bridge
    
    // Bridge state tracking
    uint256 public bridgeNonce;
    mapping(bytes32 => bool) public processedBridges;
    
    // Validators
    mapping(address => bool) public validators;
    uint256 public validatorCount;
    
    // Used for signature verification
    mapping(bytes32 => mapping(address => bool)) public bridgeSignatures;
    mapping(bytes32 => uint256) public bridgeSignatureCount;

    /**
     * @dev Constructor initializes the bridge
     * @param _cvtToken CVT token contract address
     * @param _bridgeFee Fee in basis points (1 = 0.01%)
     * @param _minAmount Minimum amount to bridge
     * @param _initialValidators Array of initial validator addresses
     * @param _threshold Minimum signatures required
     */
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
        
        // Add initial validators
        for (uint256 i = 0; i < _initialValidators.length; i++) {
            validators[_initialValidators[i]] = true;
        }
        validatorCount = _initialValidators.length;
        
        // Set threshold
        require(_threshold > 0 && _threshold <= _initialValidators.length, "Invalid threshold");
        threshold = _threshold;
    }

    /**
     * @dev Bridge tokens from Ethereum to another chain
     * @param targetChain Target chain ID (0=TON, 2=Solana)
     * @param targetAddress Target address on the destination chain
     * @param amount Amount of tokens to bridge
     */
    function bridgeOut(
        uint8 targetChain,
        bytes calldata targetAddress,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        // Validate parameters
        require(amount >= minAmount, "Amount below minimum");
        require(targetChain == CHAIN_TON || targetChain == CHAIN_SOLANA, "Invalid target chain");
        require(targetAddress.length > 0, "Invalid target address");
        
        // Calculate fee
        uint256 fee = (amount * bridgeFee) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        // Generate bridge nonce
        uint256 nonce = ++bridgeNonce;
        
        // Transfer tokens to bridge contract
        cvtToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Emit event for bridge listeners (validators)
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
     * @dev Complete a bridge from another chain to Ethereum
     * Validators call this function with their signatures
     * @param sourceChain Source chain ID (0=TON, 2=Solana)
     * @param sourceAddress Source address on the origin chain
     * @param recipient Recipient address on Ethereum
     * @param amount Amount of tokens to bridge
     * @param nonce Bridge operation nonce
     * @param signatures Array of validator signatures
     */
    function bridgeIn(
        uint8 sourceChain,
        bytes calldata sourceAddress,
        address recipient,
        uint256 amount,
        uint256 nonce,
        bytes[] calldata signatures
    ) external nonReentrant whenNotPaused {
        // Validate parameters
        require(sourceChain == CHAIN_TON || sourceChain == CHAIN_SOLANA, "Invalid source chain");
        require(sourceAddress.length > 0, "Invalid source address");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        // Compute bridge operation hash
        bytes32 bridgeHash = keccak256(
            abi.encodePacked(
                sourceChain,
                sourceAddress,
                recipient,
                amount,
                nonce
            )
        );
        
        // Check if bridge has already been processed
        require(!processedBridges[bridgeHash], "Bridge already processed");
        
        // Verify signatures
        uint256 validSignatures = 0;
        
        for (uint256 i = 0; i < signatures.length; i++) {
            // Recover signer from signature
            bytes32 messageHash = keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", bridgeHash)
            );
            address signer = messageHash.recover(signatures[i]);
            
            // Check if signer is a validator and hasn't signed already
            if (validators[signer] && !bridgeSignatures[bridgeHash][signer]) {
                bridgeSignatures[bridgeHash][signer] = true;
                validSignatures++;
            }
        }
        
        // Update signature count
        bridgeSignatureCount[bridgeHash] += validSignatures;
        
        // Check if threshold is reached
        require(bridgeSignatureCount[bridgeHash] >= threshold, "Insufficient signatures");
        
        // Mark bridge as processed
        processedBridges[bridgeHash] = true;
        
        // Transfer tokens to recipient
        cvtToken.safeTransfer(recipient, amount);
        
        // Emit event
        emit BridgeCompleted(
            recipient,
            sourceChain,
            sourceAddress,
            amount,
            nonce
        );
    }

    /**
     * @dev Add a new validator (owner only)
     * @param validator Address of the new validator
     */
    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "Invalid validator address");
        require(!validators[validator], "Validator already exists");
        
        validators[validator] = true;
        validatorCount++;
        
        emit ValidatorAdded(validator);
    }

    /**
     * @dev Remove a validator (owner only)
     * @param validator Address of the validator to remove
     */
    function removeValidator(address validator) external onlyOwner {
        require(validators[validator], "Validator does not exist");
        require(validatorCount > threshold, "Cannot remove validator below threshold");
        
        validators[validator] = false;
        validatorCount--;
        
        emit ValidatorRemoved(validator);
    }

    /**
     * @dev Update signature threshold (owner only)
     * @param newThreshold New threshold value
     */
    function updateThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold must be greater than 0");
        require(newThreshold <= validatorCount, "Threshold cannot exceed validator count");
        
        uint256 oldThreshold = threshold;
        threshold = newThreshold;
        
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @dev Update bridge fee (owner only)
     * @param newFee New fee in basis points
     */
    function updateFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high (max 10%)");
        
        uint256 oldFee = bridgeFee;
        bridgeFee = newFee;
        
        emit FeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Update minimum bridge amount (owner only)
     * @param newMinAmount New minimum amount
     */
    function updateMinAmount(uint256 newMinAmount) external onlyOwner {
        minAmount = newMinAmount;
    }

    /**
     * @dev Pause bridge operations (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause bridge operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraw tokens in case of emergency (owner only)
     * @param token Token address
     * @param recipient Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(recipient, amount);
    }

    /**
     * @dev Check if a bridge has been processed
     * @param sourceChain Source chain ID
     * @param sourceAddress Source address
     * @param recipient Recipient address
     * @param amount Amount of tokens
     * @param nonce Bridge operation nonce
     * @return True if the bridge has been processed
     */
    function isBridgeProcessed(
        uint8 sourceChain,
        bytes calldata sourceAddress,
        address recipient,
        uint256 amount,
        uint256 nonce
    ) external view returns (bool) {
        bytes32 bridgeHash = keccak256(
            abi.encodePacked(
                sourceChain,
                sourceAddress,
                recipient,
                amount,
                nonce
            )
        );
        
        return processedBridges[bridgeHash];
    }

    /**
     * @dev Get the current signature count for a bridge operation
     * @param sourceChain Source chain ID
     * @param sourceAddress Source address
     * @param recipient Recipient address
     * @param amount Amount of tokens
     * @param nonce Bridge operation nonce
     * @return Number of valid signatures
     */
    function getBridgeSignatureCount(
        uint8 sourceChain,
        bytes calldata sourceAddress,
        address recipient,
        uint256 amount,
        uint256 nonce
    ) external view returns (uint256) {
        bytes32 bridgeHash = keccak256(
            abi.encodePacked(
                sourceChain,
                sourceAddress,
                recipient,
                amount,
                nonce
            )
        );
        
        return bridgeSignatureCount[bridgeHash];
    }

    /**
     * @dev Check if an address is a validator
     * @param validator Address to check
     * @return True if the address is a validator
     */
    function isValidator(address validator) external view returns (bool) {
        return validators[validator];
    }
}