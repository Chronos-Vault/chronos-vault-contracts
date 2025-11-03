// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CircuitBreakerLib Library
 * @notice Handles anomaly detection, rate limiting, and circuit breaker logic
 * @dev Extracted from CrossChainBridgeOptimized v3.1 for bytecode optimization
 * 
 * OPTIMIZATION IMPACT:
 * - Reduces main contract bytecode by ~500-700 bytes
 * - Anomaly detection logic extracted
 * - Rolling window calculations optimized
 * 
 * FUNCTIONS:
 * - checkVolumeAnomaly: Detects volume spikes (3x normal)
 * - checkProofFailureRate: Detects high proof failure rates
 * - calculateNextRateLimitSlot: Computes next slot in circular buffer
 * - isWithinRateLimitWindow: Checks if operation within 24h window
 */
library CircuitBreakerLib {
    
    uint256 public constant RATE_LIMIT_WINDOW = 24 hours;
    uint8 public constant MAX_OPS_PER_WINDOW = 10;
    
    /**
     * @notice Detects volume spike anomaly (3x normal volume)
     * @dev Trinity Protocol defense layer - prevents sudden large operations
     * @param amount Current operation amount
     * @param totalVolume24h Rolling 24h volume
     * @param volumeSpikeThreshold Threshold multiplier (default: 3x)
     * @return isAnomaly True if volume spike detected
     */
    function checkVolumeAnomaly(
        uint256 amount,
        uint128 totalVolume24h,
        uint256 volumeSpikeThreshold
    ) internal pure returns (bool) {
        // Prevent division by zero - first operation is never anomalous
        if (totalVolume24h == 0) {
            return false;
        }
        
        // Calculate average operation size (approximation)
        // If current amount > threshold * average, it's an anomaly
        uint256 averageOp = uint256(totalVolume24h) / 10; // Assume ~10 ops/24h
        
        return amount > (averageOp * volumeSpikeThreshold);
    }
    
    /**
     * @notice Detects high proof failure rate (>30%)
     * @dev Trinity Protocol defense layer - prevents spam attacks
     * @param totalProofs Total proofs submitted in last hour
     * @param failedProofs Failed proofs in last hour
     * @return isAnomaly True if failure rate exceeds 30%
     */
    function checkProofFailureRate(
        uint128 totalProofs,
        uint128 failedProofs
    ) internal pure returns (bool) {
        // Need at least 10 proofs to detect anomaly
        if (totalProofs < 10) {
            return false;
        }
        
        // Calculate failure rate: failedProofs / totalProofs
        // If > 30%, it's an anomaly (multiply by 100 to avoid decimals)
        uint256 failureRatePercent = (uint256(failedProofs) * 100) / uint256(totalProofs);
        
        return failureRatePercent > 30;
    }
    
    /**
     * @notice Calculates next slot in circular rate limit buffer
     * @dev Rolling window implementation for rate limiting
     * @param currentIndex Current buffer position
     * @return nextIndex Next position in circular buffer (0-9)
     */
    function calculateNextRateLimitSlot(
        uint8 currentIndex
    ) internal pure returns (uint8) {
        return uint8((currentIndex + 1) % MAX_OPS_PER_WINDOW);
    }
    
    /**
     * @notice Checks if timestamp is within rate limit window
     * @dev Used to determine if rate limit should apply
     * @param timestamp Timestamp to check
     * @param currentTime Current block timestamp
     * @return withinWindow True if timestamp within 24h window
     */
    function isWithinRateLimitWindow(
        uint256 timestamp,
        uint256 currentTime
    ) internal pure returns (bool) {
        return currentTime < timestamp + RATE_LIMIT_WINDOW;
    }
    
    /**
     * @notice Checks if same-block operations indicate potential attack
     * @dev Multiple operations in same block can be flash loan attacks
     * @param lastBlockNumber Last operation block number
     * @param currentBlockNumber Current block number
     * @return isSameBlock True if operations in same block
     */
    function checkSameBlockAnomaly(
        uint64 lastBlockNumber,
        uint64 currentBlockNumber
    ) internal pure returns (bool) {
        return lastBlockNumber == currentBlockNumber;
    }
    
    /**
     * @notice Validates circuit breaker resume requirements (2-of-3 chains)
     * @dev Trinity Protocol consensus for circuit breaker recovery
     * @param ethereumApproved Ethereum chain approved resume
     * @param solanaApproved Solana chain approved resume
     * @param tonApproved TON chain approved resume
     * @return canResume True if 2 or more chains approved
     */
    function validateResumeConsensus(
        bool ethereumApproved,
        bool solanaApproved,
        bool tonApproved
    ) internal pure returns (bool) {
        uint8 approvalCount = 0;
        
        if (ethereumApproved) approvalCount++;
        if (solanaApproved) approvalCount++;
        if (tonApproved) approvalCount++;
        
        return approvalCount >= 2;
    }
}
