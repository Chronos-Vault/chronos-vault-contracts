// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CrossChainBridgeBaseline
 * @notice UNOPTIMIZED baseline matching CrossChainBridgeOptimized features
 * @dev Same functionality as optimized version but WITHOUT gas optimizations:
 * - NO storage packing (each field uses full slot)
 * - NO tiered checking (all anomaly checks every tx)
 * - NO Merkle caching
 */
contract CrossChainBridgeBaseline is ReentrancyGuard {
    
    address public immutable emergencyController;
    uint256 public immutable baseFee;
    uint256 public immutable speedPriorityMultiplier;
    uint256 public immutable securityPriorityMultiplier;
    uint256 public immutable maxFee;
    
    mapping(string => bool) public supportedChains;
    mapping(address => bytes32[]) public userOperations;
    
    enum OperationType { TRANSFER, SWAP, BRIDGE }
    enum OperationStatus { PENDING, PROCESSING, COMPLETED, CANCELED, FAILED }
    
    // UNOPTIMIZED: Every field in separate storage slot (NO PACKING)
    struct Operation {
        bytes32 id;                     // Slot 0
        address user;                   // Slot 1
        OperationType operationType;    // Slot 2 (wastes 31 bytes)
        OperationStatus status;         // Slot 3 (wastes 31 bytes)
        bool prioritizeSpeed;           // Slot 4 (wastes 31 bytes)
        bool prioritizeSecurity;        // Slot 5 (wastes 31 bytes)
        uint256 validProofCount;        // Slot 6
        string sourceChain;             // Slot 7+
        string destinationChain;        // Slot 8+
        address tokenAddress;           // Slot 9
        uint256 amount;                 // Slot 10
        uint256 fee;                    // Slot 11
        uint256 timestamp;              // Slot 12
        uint256 slippageTolerance;      // Slot 13
    }
    
    // UNOPTIMIZED: Metrics not packed
    struct AnomalyMetrics {
        uint256 totalVolume24h;         // Slot 0 (could be uint128)
        uint256 lastVolumeReset;        // Slot 1 (could be uint128)
        uint256 failedProofs1h;         // Slot 2 (could be uint64)
        uint256 totalProofs1h;          // Slot 3 (could be uint64)
        uint256 lastProofReset;         // Slot 4 (could be uint64)
        uint256 operationsInBlock;      // Slot 5 (could be uint64)
        uint256 lastBlockNumber;        // Slot 6
    }
    
    // UNOPTIMIZED: Circuit breaker not packed
    struct CircuitBreakerState {
        bool active;                    // Slot 0 (wastes 31 bytes)
        bool emergencyPause;            // Slot 1 (wastes 31 bytes)
        uint256 resumeChainConsensus;   // Slot 2 (could be uint8)
        uint256 triggeredAt;            // Slot 3
        string reason;                  // Slot 4+
    }
    
    mapping(bytes32 => Operation) public operations;
    AnomalyMetrics public metrics;
    CircuitBreakerState public circuitBreaker;
    
    uint256 public constant VOLUME_SPIKE_THRESHOLD = 500;
    uint256 public constant MAX_SAME_BLOCK_OPS = 10;
    
    modifier whenNotPaused() {
        require(!circuitBreaker.active && !circuitBreaker.emergencyPause, "Paused");
        _;
    }
    
    constructor(
        address _emergencyController,
        address[] memory,
        address[] memory,
        address[] memory
    ) {
        emergencyController = _emergencyController;
        baseFee = 0.001 ether;
        speedPriorityMultiplier = 15000;
        securityPriorityMultiplier = 12000;
        maxFee = 0.01 ether;
        
        supportedChains["ethereum"] = true;
        supportedChains["solana"] = true;
        supportedChains["ton"] = true;
        supportedChains["arbitrum"] = true;
        
        metrics.lastBlockNumber = block.number;
    }
    
    function createOperation(
        OperationType operationType,
        string calldata destinationChain,
        address tokenAddress,
        uint256 amount,
        bool prioritizeSpeed,
        bool prioritizeSecurity,
        uint256 slippageTolerance
    ) external payable nonReentrant whenNotPaused returns (bytes32 operationId) {
        require(amount > 0, "Invalid amount");
        require(supportedChains[destinationChain], "Invalid chain");
        
        // UNOPTIMIZED: Run ALL checks EVERY transaction (no tiering)
        _checkAllAnomalies(amount);
        
        string memory sourceChain = "ethereum";
        
        // Calculate fee
        uint256 fee = baseFee;
        if (prioritizeSpeed) {
            fee = (fee * speedPriorityMultiplier) / 10000;
        }
        if (prioritizeSecurity) {
            fee = (fee * securityPriorityMultiplier) / 10000;
        }
        if (fee > maxFee) fee = maxFee;
        require(msg.value >= fee, "Insufficient fee");
        
        // ETH transfer
        if (tokenAddress == address(0)) {
            require(msg.value >= fee + amount, "Insufficient balance");
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
        
        // UNOPTIMIZED: Write to ALL fields separately (14 SSTOREs!)
        Operation storage newOperation = operations[operationId];
        newOperation.id = operationId;
        newOperation.user = msg.sender;
        newOperation.operationType = operationType;
        newOperation.status = OperationStatus.PENDING;
        newOperation.prioritizeSpeed = prioritizeSpeed;
        newOperation.prioritizeSecurity = prioritizeSecurity;
        newOperation.validProofCount = 0;
        newOperation.sourceChain = sourceChain;
        newOperation.destinationChain = destinationChain;
        newOperation.tokenAddress = tokenAddress;
        newOperation.amount = amount;
        newOperation.fee = fee;
        newOperation.timestamp = block.timestamp;
        newOperation.slippageTolerance = slippageTolerance;
        
        userOperations[msg.sender].push(operationId);
        
        // UNOPTIMIZED: Update metrics (separate SSTOREs)
        metrics.totalVolume24h += amount;
        
        // Refund excess ETH
        uint256 refund = msg.value - fee;
        if (tokenAddress == address(0)) {
            refund -= amount;
        }
        if (refund > 0) {
            (bool success, ) = msg.sender.call{value: refund}("");
            require(success, "Refund failed");
        }
    }
    
    // UNOPTIMIZED: All anomaly checks run every time
    function _checkAllAnomalies(uint256 amount) internal {
        // Check 1: Same-block spam (EXPENSIVE - every tx)
        if (metrics.lastBlockNumber == block.number) {
            metrics.operationsInBlock++;
            if (metrics.operationsInBlock > MAX_SAME_BLOCK_OPS) {
                circuitBreaker.active = true;
                circuitBreaker.triggeredAt = block.timestamp;
                circuitBreaker.reason = "Same-block spam detected";
            }
        } else {
            metrics.operationsInBlock = 1;
            metrics.lastBlockNumber = block.number;
        }
        
        // Check 2: Volume spike (EXPENSIVE - every tx)
        if (metrics.totalVolume24h + amount > VOLUME_SPIKE_THRESHOLD * 1 ether) {
            circuitBreaker.active = true;
            circuitBreaker.triggeredAt = block.timestamp;
            circuitBreaker.reason = "Volume spike detected";
        }
        
        // Check 3: Cleanup (EXPENSIVE - every tx)
        if (block.timestamp - metrics.lastVolumeReset >= 24 hours) {
            metrics.totalVolume24h = 0;
            metrics.lastVolumeReset = block.timestamp;
        }
        
        if (block.timestamp - metrics.lastProofReset >= 1 hours) {
            metrics.failedProofs1h = 0;
            metrics.totalProofs1h = 0;
            metrics.lastProofReset = block.timestamp;
        }
    }
}
