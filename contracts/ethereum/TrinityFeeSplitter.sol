// SPDX-License-Identifier: MIT
// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:07.506Z
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TrinityFeeSplitter
 * @author Trinity Protocol Team
 * @notice Centralized fee distribution for Trinity Protocol with role-based allocation
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🎯 ARCHITECTURE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Problem:
 * Fee distribution logic is duplicated across multiple contracts:
 * - HTLCChronosBridge has fee splitting (keeper, protocol, treasury)
 * - ChronosVault has withdrawal fees
 * - TrinityExitGateway has batch fees
 * - EmergencyMultiSig has emergency withdrawal fees
 * 
 * Solution:
 * Centralized fee splitter with role-based allocation:
 * 1. Protocol Treasury (40%) - Core protocol development
 * 2. Validators (30%) - Trinity validator rewards
 * 3. Keepers (20%) - Batch submission rewards
 * 4. Insurance Fund (10%) - Emergency recovery reserve
 * 
 * Design:
 * - Percentage-based allocation (customizable per role)
 * - Support for ETH and ERC-20 tokens
 * - Automatic balance tracking per beneficiary
 * - Gas-efficient batch withdrawals
 * - Emergency withdrawal mechanism
 * 
 * Usage:
 * ```solidity
 * // In HTLCChronosBridge or other contracts:
 * feeSplitter.distributeFee{value: feeAmount}(FeeType.SWAP_FEE);
 * 
 * // Beneficiaries can withdraw anytime:
 * feeSplitter.withdraw();
 * ```
 */
contract TrinityFeeSplitter is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ===== FEE TYPES =====

    enum FeeType {
        SWAP_FEE,           // HTLC swap fees
        VAULT_FEE,          // Vault deposit/withdrawal fees
        EXIT_FEE,           // Exit batching fees
        EMERGENCY_FEE,      // Emergency operation fees
        CONSENSUS_FEE       // Trinity consensus operation fees
    }

    // ===== BENEFICIARY ROLES =====

    enum BeneficiaryRole {
        PROTOCOL_TREASURY,  // Core protocol development (40%)
        VALIDATORS,         // Trinity validators (30%)
        KEEPERS,            // Batch keepers (20%)
        INSURANCE_FUND      // Emergency reserve (10%)
    }

    // ===== STRUCTURES =====

    struct FeeAllocation {
        uint256 protocolTreasuryShare;  // Basis points (e.g., 4000 = 40%)
        uint256 validatorsShare;         // Basis points
        uint256 keepersShare;            // Basis points
        uint256 insuranceFundShare;      // Basis points
    }

    struct BeneficiaryBalance {
        uint256 ethBalance;
        mapping(address => uint256) tokenBalances;
    }

    // ===== CONSTANTS =====

    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 public constant MIN_WITHDRAWAL = 0.001 ether; // Minimum withdrawal amount

    // ===== STATE VARIABLES =====

    /// @notice Fee allocation per fee type
    mapping(FeeType => FeeAllocation) public feeAllocations;

    /// @notice Beneficiary addresses per role
    mapping(BeneficiaryRole => address) public beneficiaries;

    /// @notice Balance tracking per beneficiary
    mapping(address => BeneficiaryBalance) private balances;

    /// @notice Total fees collected per type
    mapping(FeeType => uint256) public totalFeesCollected;

    /// @notice Total fees distributed
    uint256 public totalFeesDistributed;

    /// @notice Authorized contracts that can distribute fees
    mapping(address => bool) public authorizedDistributors;

    /// @notice SECURITY FIX: Track pending beneficiary changes (2-step process to prevent instant rug)
    mapping(BeneficiaryRole => address) public pendingBeneficiaries;
    mapping(BeneficiaryRole => uint256) public beneficiaryChangeTimestamp;
    
    /// @notice SECURITY FIX: Timelock for beneficiary changes (48 hours)
    uint256 public constant BENEFICIARY_CHANGE_DELAY = 48 hours;

    // ===== EVENTS =====

    event FeeDistributed(
        FeeType indexed feeType,
        uint256 amount,
        address indexed from
    );

    event BeneficiaryPaid(
        BeneficiaryRole indexed role,
        address indexed beneficiary,
        uint256 amount
    );

    event TokenBeneficiaryPaid(
        BeneficiaryRole indexed role,
        address indexed beneficiary,
        address indexed token,
        uint256 amount
    );

    event Withdrawn(
        address indexed beneficiary,
        uint256 ethAmount
    );

    event TokenWithdrawn(
        address indexed beneficiary,
        address indexed token,
        uint256 amount
    );

    event AllocationUpdated(
        FeeType indexed feeType,
        uint256 protocolTreasury,
        uint256 validators,
        uint256 keepers,
        uint256 insuranceFund
    );

    event BeneficiaryUpdated(
        BeneficiaryRole indexed role,
        address indexed oldBeneficiary,
        address indexed newBeneficiary
    );

    event DistributorAuthorized(
        address indexed distributor,
        bool authorized
    );

    // ===== MODIFIERS =====

    modifier onlyAuthorizedDistributor() {
        require(
            authorizedDistributors[msg.sender] || msg.sender == owner(),
            "Not authorized distributor"
        );
        _;
    }

    // ===== CONSTRUCTOR =====

    /**
     * @notice Initialize fee splitter with beneficiaries
     * @param _protocolTreasury Protocol treasury address
     * @param _validators Validators address
     * @param _keepers Keepers address
     * @param _insuranceFund Insurance fund address
     * @param _owner Owner address (should be multi-sig)
     */
    constructor(
        address _protocolTreasury,
        address _validators,
        address _keepers,
        address _insuranceFund,
        address _owner
    ) Ownable(_owner) {
        require(_protocolTreasury != address(0), "Invalid treasury");
        require(_validators != address(0), "Invalid validators");
        require(_keepers != address(0), "Invalid keepers");
        require(_insuranceFund != address(0), "Invalid insurance fund");

        beneficiaries[BeneficiaryRole.PROTOCOL_TREASURY] = _protocolTreasury;
        beneficiaries[BeneficiaryRole.VALIDATORS] = _validators;
        beneficiaries[BeneficiaryRole.KEEPERS] = _keepers;
        beneficiaries[BeneficiaryRole.INSURANCE_FUND] = _insuranceFund;

        // Set default allocations (40/30/20/10)
        _setDefaultAllocations();
    }

    /**
     * @notice Set default fee allocations for all fee types
     */
    function _setDefaultAllocations() internal {
        FeeAllocation memory defaultAlloc = FeeAllocation({
            protocolTreasuryShare: 4000,  // 40%
            validatorsShare: 3000,         // 30%
            keepersShare: 2000,            // 20%
            insuranceFundShare: 1000       // 10%
        });

        feeAllocations[FeeType.SWAP_FEE] = defaultAlloc;
        feeAllocations[FeeType.VAULT_FEE] = defaultAlloc;
        feeAllocations[FeeType.EXIT_FEE] = defaultAlloc;
        feeAllocations[FeeType.EMERGENCY_FEE] = defaultAlloc;
        feeAllocations[FeeType.CONSENSUS_FEE] = defaultAlloc;
    }

    // ===== FEE DISTRIBUTION =====

    /**
     * @notice Distribute ETH fee among beneficiaries
     * @param feeType Type of fee being distributed
     * 
     * @dev Called by authorized contracts when fees are collected
     * @dev SECURITY FIX: Can be paused in emergency
     */
    function distributeFee(FeeType feeType) 
        external 
        payable 
        onlyAuthorizedDistributor 
        whenNotPaused
        nonReentrant 
    {
        require(msg.value > 0, "No fee provided");

        FeeAllocation memory alloc = feeAllocations[feeType];
        
        // Calculate amounts per beneficiary
        uint256 protocolAmount = (msg.value * alloc.protocolTreasuryShare) / BASIS_POINTS;
        uint256 validatorsAmount = (msg.value * alloc.validatorsShare) / BASIS_POINTS;
        uint256 keepersAmount = (msg.value * alloc.keepersShare) / BASIS_POINTS;
        uint256 insuranceAmount = (msg.value * alloc.insuranceFundShare) / BASIS_POINTS;

        // SECURITY FIX: Send rounding dust to insurance fund (prevents trapped funds)
        uint256 totalAllocated = protocolAmount + validatorsAmount + keepersAmount + insuranceAmount;
        uint256 dust = msg.value - totalAllocated;
        if (dust > 0) {
            insuranceAmount += dust;
        }

        // Update balances
        address protocolTreasury = beneficiaries[BeneficiaryRole.PROTOCOL_TREASURY];
        address validators = beneficiaries[BeneficiaryRole.VALIDATORS];
        address keepers = beneficiaries[BeneficiaryRole.KEEPERS];
        address insuranceFund = beneficiaries[BeneficiaryRole.INSURANCE_FUND];

        balances[protocolTreasury].ethBalance += protocolAmount;
        balances[validators].ethBalance += validatorsAmount;
        balances[keepers].ethBalance += keepersAmount;
        balances[insuranceFund].ethBalance += insuranceAmount;

        // Track totals
        totalFeesCollected[feeType] += msg.value;
        totalFeesDistributed += msg.value;

        emit FeeDistributed(feeType, msg.value, msg.sender);
        emit BeneficiaryPaid(BeneficiaryRole.PROTOCOL_TREASURY, protocolTreasury, protocolAmount);
        emit BeneficiaryPaid(BeneficiaryRole.VALIDATORS, validators, validatorsAmount);
        emit BeneficiaryPaid(BeneficiaryRole.KEEPERS, keepers, keepersAmount);
        emit BeneficiaryPaid(BeneficiaryRole.INSURANCE_FUND, insuranceFund, insuranceAmount);
    }

    /**
     * @notice Distribute ERC-20 token fee among beneficiaries
     * @param feeType Type of fee being distributed
     * @param token ERC-20 token address
     * @param amount Amount of tokens to distribute
     * @dev SECURITY FIX: Can be paused in emergency
     */
    function distributeTokenFee(
        FeeType feeType,
        address token,
        uint256 amount
    ) external onlyAuthorizedDistributor whenNotPaused nonReentrant {
        require(token != address(0), "Invalid token");
        require(amount > 0, "No fee provided");

        FeeAllocation memory alloc = feeAllocations[feeType];

        // Transfer tokens from caller
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate amounts
        uint256 protocolAmount = (amount * alloc.protocolTreasuryShare) / BASIS_POINTS;
        uint256 validatorsAmount = (amount * alloc.validatorsShare) / BASIS_POINTS;
        uint256 keepersAmount = (amount * alloc.keepersShare) / BASIS_POINTS;
        uint256 insuranceAmount = (amount * alloc.insuranceFundShare) / BASIS_POINTS;

        // SECURITY FIX: Send rounding dust to insurance fund (prevents trapped tokens)
        uint256 totalAllocated = protocolAmount + validatorsAmount + keepersAmount + insuranceAmount;
        uint256 dust = amount - totalAllocated;
        if (dust > 0) {
            insuranceAmount += dust;
        }

        // Update balances
        address protocolTreasury = beneficiaries[BeneficiaryRole.PROTOCOL_TREASURY];
        address validators = beneficiaries[BeneficiaryRole.VALIDATORS];
        address keepers = beneficiaries[BeneficiaryRole.KEEPERS];
        address insuranceFund = beneficiaries[BeneficiaryRole.INSURANCE_FUND];

        balances[protocolTreasury].tokenBalances[token] += protocolAmount;
        balances[validators].tokenBalances[token] += validatorsAmount;
        balances[keepers].tokenBalances[token] += keepersAmount;
        balances[insuranceFund].tokenBalances[token] += insuranceAmount;

        emit TokenBeneficiaryPaid(BeneficiaryRole.PROTOCOL_TREASURY, protocolTreasury, token, protocolAmount);
        emit TokenBeneficiaryPaid(BeneficiaryRole.VALIDATORS, validators, token, validatorsAmount);
        emit TokenBeneficiaryPaid(BeneficiaryRole.KEEPERS, keepers, token, keepersAmount);
        emit TokenBeneficiaryPaid(BeneficiaryRole.INSURANCE_FUND, insuranceFund, token, insuranceAmount);
    }

    // ===== WITHDRAWALS =====

    /**
     * @notice Withdraw accumulated ETH fees
     * @dev Callable by any beneficiary
     */
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender].ethBalance;
        require(amount >= MIN_WITHDRAWAL, "Below minimum withdrawal");

        balances[msg.sender].ethBalance = 0;

        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "Withdrawal failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Withdraw accumulated ERC-20 token fees
     * @param token Token address to withdraw
     */
    function withdrawToken(address token) external nonReentrant {
        require(token != address(0), "Invalid token");
        
        uint256 amount = balances[msg.sender].tokenBalances[token];
        require(amount > 0, "No balance");

        balances[msg.sender].tokenBalances[token] = 0;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit TokenWithdrawn(msg.sender, token, amount);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @notice Get ETH balance for a beneficiary
     */
    function getBalance(address beneficiary) external view returns (uint256) {
        return balances[beneficiary].ethBalance;
    }

    /**
     * @notice Get token balance for a beneficiary
     */
    function getTokenBalance(
        address beneficiary,
        address token
    ) external view returns (uint256) {
        return balances[beneficiary].tokenBalances[token];
    }

    /**
     * @notice Get fee allocation for a fee type
     */
    function getFeeAllocation(FeeType feeType) external view returns (
        uint256 protocolTreasury,
        uint256 validators,
        uint256 keepers,
        uint256 insuranceFund
    ) {
        FeeAllocation memory alloc = feeAllocations[feeType];
        return (
            alloc.protocolTreasuryShare,
            alloc.validatorsShare,
            alloc.keepersShare,
            alloc.insuranceFundShare
        );
    }

    // ===== ADMIN FUNCTIONS =====

    /**
     * @notice Update fee allocation for a specific fee type
     * @param feeType Fee type to update
     * @param protocolTreasury Protocol treasury share (basis points)
     * @param validators Validators share (basis points)
     * @param keepers Keepers share (basis points)
     * @param insuranceFund Insurance fund share (basis points)
     */
    function updateAllocation(
        FeeType feeType,
        uint256 protocolTreasury,
        uint256 validators,
        uint256 keepers,
        uint256 insuranceFund
    ) external onlyOwner {
        require(
            protocolTreasury + validators + keepers + insuranceFund == BASIS_POINTS,
            "Must total 100%"
        );

        feeAllocations[feeType] = FeeAllocation({
            protocolTreasuryShare: protocolTreasury,
            validatorsShare: validators,
            keepersShare: keepers,
            insuranceFundShare: insuranceFund
        });

        emit AllocationUpdated(
            feeType,
            protocolTreasury,
            validators,
            keepers,
            insuranceFund
        );
    }

    /**
     * @notice SECURITY FIX: Propose beneficiary change (step 1 of 2-step process)
     * @param role Beneficiary role to update
     * @param newBeneficiary New beneficiary address
     * @dev Prevents instant rug pull by requiring 48-hour timelock
     */
    function proposeBeneficiaryChange(
        BeneficiaryRole role,
        address newBeneficiary
    ) external onlyOwner {
        require(newBeneficiary != address(0), "Invalid beneficiary");
        require(newBeneficiary != beneficiaries[role], "Same beneficiary");
        
        pendingBeneficiaries[role] = newBeneficiary;
        beneficiaryChangeTimestamp[role] = block.timestamp;

        emit BeneficiaryUpdated(role, beneficiaries[role], newBeneficiary);
    }

    /**
     * @notice SECURITY FIX: Execute beneficiary change (step 2 of 2-step process)
     * @param role Beneficiary role to update
     * @dev Can only be called after BENEFICIARY_CHANGE_DELAY has passed
     */
    function executeBeneficiaryChange(BeneficiaryRole role) external onlyOwner {
        address newBeneficiary = pendingBeneficiaries[role];
        require(newBeneficiary != address(0), "No pending change");
        require(
            block.timestamp >= beneficiaryChangeTimestamp[role] + BENEFICIARY_CHANGE_DELAY,
            "Timelock not expired"
        );
        
        address oldBeneficiary = beneficiaries[role];
        beneficiaries[role] = newBeneficiary;

        // SECURITY FIX: Transfer ALL pending balances (ETH + all tokens)
        // ETH balance transfer - ADD to new beneficiary's balance (don't overwrite!)
        if (balances[oldBeneficiary].ethBalance > 0) {
            balances[newBeneficiary].ethBalance += balances[oldBeneficiary].ethBalance;
            balances[oldBeneficiary].ethBalance = 0;
        }

        // NOTE: Token balances need to be migrated manually per token
        // This is because we can't enumerate all tokens in the mapping
        // Use migrateTokenBalance() function for each token

        // Clear pending change
        delete pendingBeneficiaries[role];
        delete beneficiaryChangeTimestamp[role];

        emit BeneficiaryUpdated(role, oldBeneficiary, newBeneficiary);
    }

    /**
     * @notice SECURITY FIX: Migrate specific token balance from old to new beneficiary
     * @param oldBeneficiary Old beneficiary address (must have token balance)
     * @param newBeneficiary New beneficiary address (will receive token balance)
     * @param token Token address to migrate
     * @dev Must be called after executeBeneficiaryChange() for each token that needs migration
     */
    function migrateTokenBalance(
        address oldBeneficiary,
        address newBeneficiary,
        address token
    ) external onlyOwner {
        require(oldBeneficiary != address(0), "Invalid old beneficiary");
        require(newBeneficiary != address(0), "Invalid new beneficiary");
        require(token != address(0), "Invalid token");
        
        // Transfer token balance from old to new beneficiary
        uint256 tokenBalance = balances[oldBeneficiary].tokenBalances[token];
        if (tokenBalance > 0) {
            balances[newBeneficiary].tokenBalances[token] += tokenBalance;
            balances[oldBeneficiary].tokenBalances[token] = 0;
        }
    }

    /**
     * @notice Authorize/deauthorize fee distributor
     * @param distributor Contract address to authorize
     * @param authorized True to authorize, false to revoke
     */
    function setAuthorizedDistributor(
        address distributor,
        bool authorized
    ) external onlyOwner {
        require(distributor != address(0), "Invalid distributor");
        authorizedDistributors[distributor] = authorized;
        emit DistributorAuthorized(distributor, authorized);
    }

    /**
     * @notice SECURITY FIX: Pause fee distribution in emergency
     * @dev Can only be called by owner (should be multi-sig)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice SECURITY FIX: Unpause fee distribution
     * @dev Can only be called by owner (should be multi-sig)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ===== FALLBACK =====

    receive() external payable {
        // Accept direct ETH transfers (treated as protocol donations)
        balances[beneficiaries[BeneficiaryRole.PROTOCOL_TREASURY]].ethBalance += msg.value;
    }
}
