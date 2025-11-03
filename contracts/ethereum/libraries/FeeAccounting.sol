// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FeeAccounting Library
 * @notice Handles fee calculation, distribution, and epoch management
 * @dev Extracted from CrossChainBridgeOptimized v3.1 for bytecode optimization
 * 
 * OPTIMIZATION IMPACT:
 * - Reduces main contract bytecode by ~400-600 bytes
 * - Fee calculation logic extracted
 * - Validator reward distribution optimized
 * 
 * FUNCTIONS:
 * - calculateOperationFee: Computes fee with priority multipliers
 * - calculateValidatorShares: Splits fee between validators and protocol
 * - calculateValidatorReward: Computes individual validator reward
 * - calculateCancellationRefund: Computes refund with penalty
 */
library FeeAccounting {
    
    uint256 public constant BASE_FEE = 0.001 ether;
    uint256 public constant MAX_FEE = 0.1 ether;
    uint256 public constant SPEED_PRIORITY_MULTIPLIER = 15000;  // 150%
    uint256 public constant SECURITY_PRIORITY_MULTIPLIER = 12000; // 120%
    uint256 public constant CANCELLATION_PENALTY = 20; // 20% penalty
    
    /**
     * @notice Calculates operation fee with priority multipliers
     * @dev Applies speed/security multipliers and enforces max fee cap
     * @param baseFee Base fee amount (0.001 ETH)
     * @param prioritizeSpeed Apply speed multiplier (150%)
     * @param prioritizeSecurity Apply security multiplier (120%)
     * @return fee Final fee amount (capped at MAX_FEE)
     */
    function calculateOperationFee(
        uint256 baseFee,
        bool prioritizeSpeed,
        bool prioritizeSecurity
    ) internal pure returns (uint256 fee) {
        fee = baseFee;
        
        if (prioritizeSpeed) {
            fee = (fee * SPEED_PRIORITY_MULTIPLIER) / 10000;
        }
        
        if (prioritizeSecurity) {
            fee = (fee * SECURITY_PRIORITY_MULTIPLIER) / 10000;
        }
        
        // Enforce maximum fee cap
        if (fee > MAX_FEE) {
            fee = MAX_FEE;
        }
        
        return fee;
    }
    
    /**
     * @notice Splits fee between validators (80%) and protocol (20%)
     * @dev Trinity Protocol economics - validators earn majority of fees
     * @param totalFee Total fee collected
     * @return validatorShare Amount for validators (80%)
     * @return protocolShare Amount for protocol (20%)
     */
    function calculateValidatorShares(
        uint256 totalFee
    ) internal pure returns (uint256 validatorShare, uint256 protocolShare) {
        validatorShare = (totalFee * 80) / 100;
        protocolShare = (totalFee * 20) / 100;
        
        return (validatorShare, protocolShare);
    }
    
    /**
     * @notice Calculates individual validator reward from total validator share
     * @dev Divides validator share equally among all participating validators
     * @param validatorShare Total amount for validators
     * @param validatorCount Number of validators participating
     * @return rewardPerValidator Amount each validator receives
     */
    function calculateValidatorReward(
        uint256 validatorShare,
        uint256 validatorCount
    ) internal pure returns (uint256) {
        if (validatorCount == 0) {
            return 0;
        }
        
        return validatorShare / validatorCount;
    }
    
    /**
     * @notice Calculates refund amount with cancellation penalty
     * @dev Users who cancel pay 20% penalty, validators receive penalty as compensation
     * @param originalFee Original fee paid
     * @return refundAmount Amount to refund to user (80%)
     * @return penaltyAmount Amount kept as penalty (20%)
     */
    function calculateCancellationRefund(
        uint256 originalFee
    ) internal pure returns (uint256 refundAmount, uint256 penaltyAmount) {
        refundAmount = originalFee * (100 - CANCELLATION_PENALTY) / 100;
        penaltyAmount = originalFee - refundAmount;
        
        return (refundAmount, penaltyAmount);
    }
    
    /**
     * @notice Calculates validator rewards from unclaimed epochs
     * @dev Used in pull-based fee distribution to prevent gas limit DoS
     * @param epochFeePool Total fees collected in an epoch
     * @param validatorProofCount Number of proofs validator submitted
     * @param totalProofsInEpoch Total proofs submitted by all validators
     * @return validatorReward Proportional reward for validator
     */
    function calculateEpochValidatorReward(
        uint256 epochFeePool,
        uint256 validatorProofCount,
        uint256 totalProofsInEpoch
    ) internal pure returns (uint256) {
        if (totalProofsInEpoch == 0) {
            return 0;
        }
        
        // Validator's share = (their proofs / total proofs) * 80% of epoch fees
        uint256 validatorShare = (epochFeePool * 80) / 100;
        return (validatorShare * validatorProofCount) / totalProofsInEpoch;
    }
    
    /**
     * @notice Validates fee amount meets minimum requirement
     * @dev Ensures user paid enough to cover operation costs
     * @param paidFee Amount user sent
     * @param requiredFee Amount required for operation
     * @return sufficient True if user paid enough
     */
    function validateFeeSufficient(
        uint256 paidFee,
        uint256 requiredFee
    ) internal pure returns (bool) {
        return paidFee >= requiredFee;
    }
}
