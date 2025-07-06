// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CrossChainBridgeV1
 * @dev Contract to handle cross-chain transfers, bridges, and swaps for Ethereum network
 * Part of Chronos Vault's Triple-Chain Security Architecture
 */
contract CrossChainBridgeV1 is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Custom errors
    error InvalidAmount();
    error InsufficientBalance();
    error InvalidChain();
    error OperationNotFound();
    error OperationAlreadyExecuted();
    error OperationAlreadyCanceled();
    error InsufficientFee();
    error FeeTooHigh();
    error Unauthorized();
    error InvalidProof();
    error InvalidTimestamp();
    
    // Roles
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // Supported chains (mapped to their chain IDs)
    mapping(string => bool) public supportedChains;
    
    // Operation types
    enum OperationType { TRANSFER, SWAP, BRIDGE }
    
    // Operation status
    enum OperationStatus { PENDING, PROCESSING, COMPLETED, CANCELED, FAILED }
    
    // Cross-chain operation structure
    struct Operation {
        bytes32 id;
        address user;
        OperationType operationType;
        string sourceChain;
        string destinationChain;
        address tokenAddress;
        uint256 amount;
        uint256 fee;
        uint256 timestamp;
        OperationStatus status;
        bytes32 targetTxHash;
        bytes signature;
        bool prioritizeSpeed;
        bool prioritizeSecurity;
        uint256 slippageTolerance; // in basis points (1/100 of a percent)
    }
    
    // Mapping from operation ID to Operation
    mapping(bytes32 => Operation) public operations;
    
    // Mapping from user address to their operation IDs
    mapping(address => bytes32[]) public userOperations;
    
    // Contract variables
    address public feeCollector;
    uint256 public baseFee;
    uint256 public speedPriorityMultiplier;
    uint256 public securityPriorityMultiplier;
    uint256 public maxFee;
    
    // Events
    event OperationCreated(
        bytes32 indexed operationId,
        address indexed user,
        OperationType operationType,
        string sourceChain,
        string destinationChain,
        address tokenAddress,
        uint256 amount,
        uint256 fee
    );
    
    event OperationStatusUpdated(
        bytes32 indexed operationId,
        OperationStatus status,
        bytes32 targetTxHash
    );
    
    event ChainSupportUpdated(
        string chain,
        bool supported
    );
    
    event FeeUpdated(
        uint256 baseFee,
        uint256 speedPriorityMultiplier,
        uint256 securityPriorityMultiplier,
        uint256 maxFee
    );
    
    // Modifiers
    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert Unauthorized();
        _;
    }
    
    modifier onlyOperator() {
        if (!hasRole(OPERATOR_ROLE, msg.sender)) revert Unauthorized();
        _;
    }
    
    modifier onlyValidator() {
        if (!hasRole(VALIDATOR_ROLE, msg.sender)) revert Unauthorized();
        _;
    }
    
    modifier operationExists(bytes32 operationId) {
        if (operations[operationId].id != operationId) revert OperationNotFound();
        _;
    }
    
    modifier operationNotExecuted(bytes32 operationId) {
        if (operations[operationId].status == OperationStatus.COMPLETED) 
            revert OperationAlreadyExecuted();
        if (operations[operationId].status == OperationStatus.CANCELED) 
            revert OperationAlreadyCanceled();
        _;
    }
    
    // Constructor
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        
        feeCollector = msg.sender;
        baseFee = 0.001 ether;
        speedPriorityMultiplier = 15000; // 1.5x as basis points
        securityPriorityMultiplier = 12000; // 1.2x as basis points
        maxFee = 0.1 ether;
        
        // Add Ethereum as a supported chain (this contract's chain)
        supportedChains["ethereum"] = true;
        
        // Add other supported chains
        supportedChains["solana"] = true;
        supportedChains["ton"] = true;
        supportedChains["bitcoin"] = true;
    }
    
    /**
     * @dev Create a cross-chain transfer/bridge/swap operation
     * @param operationType Type of operation (TRANSFER, SWAP, BRIDGE)
     * @param destinationChain Target blockchain
     * @param tokenAddress Address of token to transfer/swap
     * @param amount Amount of tokens to transfer/swap
     * @param prioritizeSpeed Whether to prioritize speed over cost
     * @param prioritizeSecurity Whether to prioritize security over cost
     * @param slippageTolerance Max allowable slippage for swaps in basis points
     * @return operationId The unique ID of the created operation
     */
    function createOperation(
        OperationType operationType,
        string calldata destinationChain,
        address tokenAddress,
        uint256 amount,
        bool prioritizeSpeed,
        bool prioritizeSecurity,
        uint256 slippageTolerance
    ) external payable nonReentrant returns (bytes32 operationId) {
        // Validate inputs
        if (amount == 0) revert InvalidAmount();
        if (!supportedChains[destinationChain]) revert InvalidChain();
        
        // Check if the source chain is supported (always true for Ethereum on this contract)
        string memory sourceChain = "ethereum";
        
        // Calculate fee based on preferences
        uint256 fee = baseFee;
        if (prioritizeSpeed) {
            fee = (fee * speedPriorityMultiplier) / 10000;
        }
        if (prioritizeSecurity) {
            fee = (fee * securityPriorityMultiplier) / 10000;
        }
        
        // Ensure fee is within limits
        if (fee > maxFee) fee = maxFee;
        if (msg.value < fee) revert InsufficientFee();
        
        // Transfer tokens from user to contract
        if (tokenAddress != address(0)) {
            // For ERC20 tokens
            IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);
        } else {
            // For native ETH, ensure sufficient value was sent
            if (msg.value < fee + amount) revert InsufficientBalance();
        }
        
        // Generate operation ID
        operationId = keccak256(abi.encodePacked(
            msg.sender, 
            block.timestamp, 
            sourceChain, 
            destinationChain, 
            tokenAddress, 
            amount
        ));
        
        // Create operation
        Operation memory newOperation = Operation({
            id: operationId,
            user: msg.sender,
            operationType: operationType,
            sourceChain: sourceChain,
            destinationChain: destinationChain,
            tokenAddress: tokenAddress,
            amount: amount,
            fee: fee,
            timestamp: block.timestamp,
            status: OperationStatus.PENDING,
            targetTxHash: bytes32(0),
            signature: bytes(""),
            prioritizeSpeed: prioritizeSpeed,
            prioritizeSecurity: prioritizeSecurity,
            slippageTolerance: slippageTolerance
        });
        
        // Store operation
        operations[operationId] = newOperation;
        userOperations[msg.sender].push(operationId);
        
        // Transfer fee to fee collector
        (bool sent, ) = feeCollector.call{value: fee}("");
        require(sent, "Failed to send fee");
        
        // Refund excess ETH if any
        uint256 refund = msg.value - fee;
        if (tokenAddress != address(0)) {
            refund -= amount;
        }
        if (refund > 0) {
            (bool refundSent, ) = msg.sender.call{value: refund}("");
            require(refundSent, "Failed to refund excess ETH");
        }
        
        // Emit event
        emit OperationCreated(
            operationId,
            msg.sender,
            operationType,
            sourceChain,
            destinationChain,
            tokenAddress,
            amount,
            fee
        );
        
        return operationId;
    }
    
    /**
     * @dev Update operation status by operators
     * @param operationId ID of the operation to update
     * @param status New status of the operation
     * @param targetTxHash Hash of the transaction on the destination chain (if applicable)
     */
    function updateOperationStatus(
        bytes32 operationId,
        OperationStatus status,
        bytes32 targetTxHash
    ) external onlyOperator operationExists(operationId) operationNotExecuted(operationId) {
        Operation storage operation = operations[operationId];
        operation.status = status;
        
        if (targetTxHash != bytes32(0)) {
            operation.targetTxHash = targetTxHash;
        }
        
        emit OperationStatusUpdated(operationId, status, targetTxHash);
    }
    
    /**
     * @dev Verify and complete a cross-chain operation with validator signature
     * @param operationId ID of the operation to verify
     * @param signature Validator signature proving operation completion
     */
    function verifyAndCompleteOperation(
        bytes32 operationId,
        bytes calldata signature
    ) external onlyOperator operationExists(operationId) operationNotExecuted(operationId) {
        Operation storage operation = operations[operationId];
        require(operation.status == OperationStatus.PROCESSING, "Operation not in processing state");
        
        // Store signature for verification
        operation.signature = signature;
        operation.status = OperationStatus.COMPLETED;
        
        emit OperationStatusUpdated(operationId, OperationStatus.COMPLETED, operation.targetTxHash);
    }
    
    /**
     * @dev Cancel an operation (only by admin or the user who created it)
     * @param operationId ID of the operation to cancel
     */
    function cancelOperation(bytes32 operationId) 
        external 
        operationExists(operationId) 
        operationNotExecuted(operationId) 
    {
        Operation storage operation = operations[operationId];
        
        // Only the user who created the operation or an admin can cancel it
        if (operation.user != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        
        // Only pending operations can be canceled
        require(operation.status == OperationStatus.PENDING, "Operation not in pending state");
        
        // Update status
        operation.status = OperationStatus.CANCELED;
        
        // Return tokens to user
        if (operation.tokenAddress != address(0)) {
            IERC20(operation.tokenAddress).safeTransfer(operation.user, operation.amount);
        } else {
            // Return native ETH
            (bool sent, ) = operation.user.call{value: operation.amount}("");
            require(sent, "Failed to return ETH");
        }
        
        emit OperationStatusUpdated(operationId, OperationStatus.CANCELED, bytes32(0));
    }
    
    /**
     * @dev Add or remove supported chain
     * @param chain Chain identifier
     * @param supported Whether the chain is supported
     */
    function updateChainSupport(string calldata chain, bool supported) external onlyAdmin {
        supportedChains[chain] = supported;
        emit ChainSupportUpdated(chain, supported);
    }
    
    /**
     * @dev Update fee parameters
     * @param newBaseFee Base fee amount
     * @param newSpeedPriorityMultiplier Multiplier for speed priority (in basis points)
     * @param newSecurityPriorityMultiplier Multiplier for security priority (in basis points)
     * @param newMaxFee Maximum fee amount
     */
    function updateFeeParameters(
        uint256 newBaseFee,
        uint256 newSpeedPriorityMultiplier,
        uint256 newSecurityPriorityMultiplier,
        uint256 newMaxFee
    ) external onlyAdmin {
        if (newMaxFee < newBaseFee) revert FeeTooHigh();
        
        baseFee = newBaseFee;
        speedPriorityMultiplier = newSpeedPriorityMultiplier;
        securityPriorityMultiplier = newSecurityPriorityMultiplier;
        maxFee = newMaxFee;
        
        emit FeeUpdated(
            baseFee,
            speedPriorityMultiplier,
            securityPriorityMultiplier,
            maxFee
        );
    }
    
    /**
     * @dev Set fee collector address
     * @param newFeeCollector Address to collect fees
     */
    function setFeeCollector(address newFeeCollector) external onlyAdmin {
        require(newFeeCollector != address(0), "Invalid fee collector");
        feeCollector = newFeeCollector;
    }
    
    /**
     * @dev Get all operations for a user
     * @param user Address of the user
     * @return operationIds Array of operation IDs
     */
    function getUserOperations(address user) external view returns (bytes32[] memory) {
        return userOperations[user];
    }
    
    /**
     * @dev Get operation details
     * @param operationId ID of the operation
     * @return operation Operation details
     */
    function getOperation(bytes32 operationId) external view operationExists(operationId) returns (Operation memory) {
        return operations[operationId];
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {}
}