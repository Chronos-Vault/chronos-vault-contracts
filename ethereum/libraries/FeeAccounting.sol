// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FeeAccounting Library - v3.2 (Balancer Attack Analysis Applied)
 * @notice Handles fee calculation, distribution, and epoch management
 * @dev Extracted from CrossChainBridgeOptimized v3.1 for bytecode optimization
 * 
 * SECURITY FIXES (November 3, 2025 - Balancer-Inspired):
 * 🟡 MEDIUM-03: Added invariant validation for fee splits
 * 🟡 MEDIUM-04: Added dust tracking for transparency
 * 🟢 INFO: Documented rounding direction policy (always favors protocol)
 * 
 * OPTIMIZATION IMPACT:
 * - Reduces main contract bytecode by ~400-600 bytes
 * - Fee calculation logic extracted
 * - Validator reward distribution optimized
 * - Mathematical invariants validated
 * 
 * FUNCTIONS:
 * - calculateOperationFee: Computes fee with priority multipliers
 * - calculateValidatorShares: Splits fee between validators and protocol (with invariant)
 * - calculateValidatorReward: Computes individual validator reward (with dust tracking)
 * - calculateCancellationRefund: Computes refund with penalty (with invariant)
 * - calculateEpochValidatorReward: Computes proportional reward from epoch pool
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
     * 
     * MEDIUM-03 FIX: Added invariant validation
     * - Ensures split doesn't exceed total (prevents overflow bugs)
     * - Allows max 2 wei rounding error (dust from division)
     * 
     * ROUNDING DIRECTION: Both round DOWN (favors protocol, keeps dust)
     * 
     * @param totalFee Total fee collected
     * @return validatorShare Amount for validators (80%, rounded down)
     * @return protocolShare Amount for protocol (20%, rounded down)
     */
    function calculateValidatorShares(
        uint256 totalFee
    ) internal pure returns (uint256 validatorShare, uint256 protocolShare) {
        validatorShare = (totalFee * 80) / 100;  // Round DOWN (favors protocol)
        protocolShare = (totalFee * 20) / 100;   // Round DOWN (favors protocol)
        
        // MEDIUM-03 FIX: Invariant validation (Balancer-inspired)
        uint256 distributed = validatorShare + protocolShare;
        require(distributed <= totalFee, "Fee split exceeds total");
        require(totalFee - distributed < 3, "Fee split rounding error too large");
        
        return (validatorShare, protocolShare);
    }
    
    /**
     * @notice Calculates individual validator reward from total validator share
     * @dev Divides validator share equally among all participating validators
     * 
     * MEDIUM-04 FIX: Now returns dust amount for transparency
     * - Dust = validatorShare - (rewardPerValidator * validatorCount)
     * - Enables tracking of lost precision over time
     * 
     * ROUNDING DIRECTION: Rounds DOWN (favors protocol, each validator gets floor)
     * 
     * @param validatorShare Total amount for validators
     * @param validatorCount Number of validators participating
     * @return rewardPerValidator Amount each validator receives (rounded down)
     * @return dust Amount lost to rounding (stays in contract)
     */
    function calculateValidatorReward(
        uint256 validatorShare,
        uint256 validatorCount
    ) internal pure returns (uint256 rewardPerValidator, uint256 dust) {
        if (validatorCount == 0) {
            return (0, 0);
        }
        
        rewardPerValidator = validatorShare / validatorCount;  // Round DOWN (favors protocol)
        
        // MEDIUM-04 FIX: Calculate dust lost to rounding
        uint256 totalDistributed = rewardPerValidator * validatorCount;
        dust = validatorShare - totalDistributed;
        
        return (rewardPerValidator, dust);
    }
    
    /**
     * @notice Calculates refund amount with cancellation penalty
     * @dev Users who cancel pay 20% penalty, validators receive penalty as compensation
     * 
     * MEDIUM-03 FIX: Added invariant validation
     * - Ensures refund + penalty = originalFee (no precision loss)
     * 
     * ROUNDING DIRECTION: refund rounds DOWN (favors protocol), penalty = remainder
     * 
     * @param originalFee Original fee paid
     * @return refundAmount Amount to refund to user (80%, rounded down)
     * @return penaltyAmount Amount kept as penalty (remainder)
     */
    function calculateCancellationRefund(
        uint256 originalFee
    ) internal pure returns (uint256 refundAmount, uint256 penaltyAmount) {
        refundAmount = originalFee * (100 - CANCELLATION_PENALTY) / 100;  // Round DOWN
        penaltyAmount = originalFee - refundAmount;  // Penalty = remainder (no dust loss!)
        
        // MEDIUM-03 FIX: Invariant validation (exact equality enforced)
        require(refundAmount + penaltyAmount == originalFee, "Refund calculation error");
        
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
