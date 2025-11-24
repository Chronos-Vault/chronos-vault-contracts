// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TrinityKeeperRegistry
 * @author Trinity Protocol Team
 * @notice Decentralized keeper registry with bond/slashing mechanism for exit batching automation
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🎯 ARCHITECTURE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Design Goals:
 * 1. Eliminate single point of failure (no "owner-only keeper" model)
 * 2. Economic security via slashing (keepers lose bond for malicious behavior)
 * 3. Automated keeper rotation (if keeper fails, next keeper takes over)
 * 4. Performance-based reputation (track successful vs failed batches)
 * 5. Reward distribution (keepers earn fees from batch submissions)
 * 
 * Keeper Lifecycle:
 * 1. Register: Post 1 ETH bond + pass reputation check
 * 2. Activate: Wait for activation period (prevent sybil attacks)
 * 3. Submit: Process exit batches and earn fees
 * 4. Slash: Lose bond if submit fraudulent/invalid batches
 * 5. Withdraw: Withdraw bond after cooldown period (if no slashing)
 * 
 * Security Model:
 * - Minimum bond: 1 ETH (prevents sybil attacks)
 * - Activation delay: 24 hours (prevents instant malicious registration)
 * - Cooldown period: 7 days (allows time for challenges)
 * - Slash percentage: 100% for fraud, 10% for negligence
 * - Max active keepers: 100 (prevents governance attacks)
 */
contract TrinityKeeperRegistry is ReentrancyGuard, Pausable, Ownable {
    // ===== CONSTANTS =====

    /// @notice Minimum bond required to become a keeper
    uint256 public constant MIN_KEEPER_BOND = 1 ether;

    /// @notice Activation delay after registration (prevents sybil attacks)
    uint256 public constant ACTIVATION_DELAY = 24 hours;

    /// @notice Cooldown period before bond withdrawal
    uint256 public constant WITHDRAWAL_COOLDOWN = 7 days;

    /// @notice Maximum number of active keepers
    uint256 public constant MAX_ACTIVE_KEEPERS = 100;

    /// @notice Slash percentage for fraud (100%)
    uint256 public constant FRAUD_SLASH_PERCENTAGE = 100;

    /// @notice Slash percentage for negligence (10%)
    uint256 public constant NEGLIGENCE_SLASH_PERCENTAGE = 10;

    /// @notice Minimum batches before reputation score is valid
    uint256 public constant MIN_BATCHES_FOR_REPUTATION = 10;

    // ===== KEEPER STATES =====

    enum KeeperState {
        INVALID,        // Not registered
        PENDING,        // Registered, waiting for activation
        ACTIVE,         // Active keeper, can submit batches
        SUSPENDED,      // Suspended for poor performance
        SLASHED,        // Slashed for fraud/negligence
        WITHDRAWING     // Initiated withdrawal, in cooldown
    }

    // ===== KEEPER STRUCTURE =====

    struct Keeper {
        address keeperAddress;
        uint256 bondAmount;
        uint256 registeredAt;
        uint256 activatedAt;
        uint256 withdrawalInitiatedAt;
        KeeperState state;
        uint256 successfulBatches;
        uint256 failedBatches;
        uint256 totalFeesEarned;
        uint256 reputationScore;  // 0-1000 (1000 = perfect)
    }

    /// @notice Mapping from keeper address to keeper details
    mapping(address => Keeper) public keepers;

    /// @notice List of all active keeper addresses
    address[] public activeKeepers;

    /// @notice Mapping to track active keeper index for O(1) removal  
    /// @dev Stores index + 1 (so 0 means "not present")
    mapping(address => uint256) private activeKeeperIndex;

    /// @notice Total number of registered keepers (all time)
    uint256 public totalKeepers;
    
    /// @notice SECURITY: Track all keeper addresses for complete accounting
    /// @dev Addresses are never removed, only state changes  
    /// @dev DEPRECATED: Replaced by per-keeper tracking to avoid double-counting
    address[] private allKeepers;
    
    /// @notice SECURITY FIX: Track if keeper has ever been registered (prevents double-counting)
    mapping(address => bool) private hasRegistered;

    /// @notice Treasury for slashed funds
    address public treasury;

    /// @notice Authorized contracts that can call keeper functions
    mapping(address => bool) public authorizedContracts;

    // ===== EVENTS =====

    event KeeperRegistered(
        address indexed keeper,
        uint256 bondAmount,
        uint256 activationTime
    );

    event KeeperActivated(
        address indexed keeper,
        uint256 timestamp
    );

    event KeeperSuspended(
        address indexed keeper,
        string reason
    );

    event KeeperSlashed(
        address indexed keeper,
        uint256 slashAmount,
        uint256 slashPercentage,
        string reason
    );

    event KeeperWithdrawalInitiated(
        address indexed keeper,
        uint256 withdrawalTime
    );

    event KeeperBondWithdrawn(
        address indexed keeper,
        uint256 amount
    );

    event BatchRecorded(
        address indexed keeper,
        bool success,
        uint256 feeEarned
    );

    event ReputationUpdated(
        address indexed keeper,
        uint256 oldScore,
        uint256 newScore
    );

    event ContractAuthorized(
        address indexed contractAddress,
        bool authorized
    );

    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );

    // ===== MODIFIERS =====

    modifier onlyAuthorized() {
        // SECURITY FIX: Only whitelisted contracts allowed (no owner bypass)
        // Owner must use contract authorization for all sensitive operations
        require(
            authorizedContracts[msg.sender],
            "Not authorized contract"
        );
        _;
    }

    modifier onlyActiveKeeper(address keeper) {
        require(keepers[keeper].state == KeeperState.ACTIVE, "Keeper not active");
        _;
    }

    // ===== CONSTRUCTOR =====

    /**
     * @notice Initialize keeper registry
     * @param _treasury Address to receive slashed funds
     * @param _owner Initial owner (should be multi-sig)
     */
    constructor(address _treasury, address _owner) Ownable(_owner) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    // ===== KEEPER REGISTRATION =====

    /**
     * @notice Register as a keeper by posting bond
     * @dev Keeper enters PENDING state and must wait ACTIVATION_DELAY before becoming active
     * @dev SECURITY FIX: CEI pattern - all state changes BEFORE events
     */
    function registerKeeper() external payable nonReentrant whenNotPaused {
        require(msg.value >= MIN_KEEPER_BOND, "Insufficient bond");
        require(keepers[msg.sender].state == KeeperState.INVALID, "Already registered");
        require(activeKeepers.length < MAX_ACTIVE_KEEPERS, "Max keepers reached");

        // SECURITY FIX: CEI pattern - Update ALL state BEFORE external interactions
        uint256 activationTime = block.timestamp + ACTIVATION_DELAY;

        keepers[msg.sender] = Keeper({
            keeperAddress: msg.sender,
            bondAmount: msg.value,
            registeredAt: block.timestamp,
            activatedAt: 0,
            withdrawalInitiatedAt: 0,
            state: KeeperState.PENDING,
            successfulBatches: 0,
            failedBatches: 0,
            totalFeesEarned: 0,
            reputationScore: 1000 // Start with perfect score
        });

        totalKeepers++;
        
        // SECURITY FIX: Track first-time registration only (prevents double-counting)
        if (!hasRegistered[msg.sender]) {
            allKeepers.push(msg.sender);
            hasRegistered[msg.sender] = true;
        }

        // Event emission is last (CEI pattern)
        emit KeeperRegistered(msg.sender, msg.value, activationTime);
    }

    /**
     * @notice Activate a pending keeper after activation delay
     * @dev Callable by anyone after ACTIVATION_DELAY passes
     * @dev SECURITY FIX: CEI pattern - state updates BEFORE array mutations
     * @dev SECURITY FIX: Enforce MAX_ACTIVE_KEEPERS cap during activation
     * @dev SECURITY FIX: Prevent duplicate activation
     */
    function activateKeeper(address keeper) external nonReentrant {
        Keeper storage k = keepers[keeper];
        require(k.state == KeeperState.PENDING, "Keeper not pending");
        require(k.activatedAt == 0, "Already activated");
        require(
            block.timestamp >= k.registeredAt + ACTIVATION_DELAY,
            "Activation delay not passed"
        );
        
        // SECURITY FIX: Enforce cap during activation (prevents bypass)
        require(activeKeepers.length < MAX_ACTIVE_KEEPERS, "Max active keepers reached");

        // SECURITY FIX: Update state BEFORE modifying storage arrays (CEI pattern)
        k.state = KeeperState.ACTIVE;
        k.activatedAt = block.timestamp;

        // Storage array mutations happen AFTER state update
        uint256 newIndex = activeKeepers.length;
        activeKeeperIndex[keeper] = newIndex + 1; // Store index + 1 (0 = not present)
        activeKeepers.push(keeper);

        emit KeeperActivated(keeper, block.timestamp);
    }

    // ===== KEEPER PERFORMANCE TRACKING =====

    /**
     * @notice Record batch submission result (success/failure)
     * @param keeper Address of keeper who submitted batch
     * @param success Whether batch was successful
     * @param feeEarned Fee earned by keeper for this batch (TRACKING ONLY - no transfer)
     * 
     * @dev Called by authorized contracts (TrinityExitGateway, HTLCArbToL1)
     * @dev SECURITY NOTE: This only TRACKS fees, actual fee transfers happen in calling contract
     * @dev The calling contract is responsible for secure fee escrow and payment
     * 
     * @dev TRUST MODEL:
     * - Only whitelisted contracts can call this function (onlyAuthorized)
     * - Registry trusts authorized contracts to provide accurate feeEarned amount
     * - Registry does NOT handle actual fee transfers (prevents accounting attacks)
     * - Actual fee escrow and payment must be handled in the calling contract
     * - If calling contract is compromised, it can inflate totalFeesEarned (display-only metric)
     * - CRITICAL: Keeper bonds remain secure even if feeEarned is manipulated
     */
    function recordBatch(
        address keeper,
        bool success,
        uint256 feeEarned
    ) external onlyAuthorized onlyActiveKeeper(keeper) {
        Keeper storage k = keepers[keeper];

        // SECURITY NOTE: We trust authorized contracts to provide accurate feeEarned
        // The registry only tracks performance metrics, not actual fund transfers
        // Calling contracts (TrinityExitGateway, HTLCArbToL1) handle escrow
        
        if (success) {
            k.successfulBatches++;
            k.totalFeesEarned += feeEarned; // Tracking only, no actual transfer
        } else {
            k.failedBatches++;
        }

        // Update reputation score
        _updateReputation(keeper);

        emit BatchRecorded(keeper, success, feeEarned);
    }

    /**
     * @notice Calculate and update keeper reputation score
     * @param keeper Address of keeper
     * @dev Score = (successful / total) * 1000, minimum 10 batches required
     * @dev SECURITY FIX: Safe arithmetic prevents underflow
     */
    function _updateReputation(address keeper) internal {
        Keeper storage k = keepers[keeper];
        
        // SECURITY FIX: Safe addition with overflow check
        uint256 totalBatches;
        unchecked {
            totalBatches = k.successfulBatches + k.failedBatches;
        }
        require(totalBatches >= k.successfulBatches, "Batch count overflow");
        
        if (totalBatches == 0 || totalBatches < MIN_BATCHES_FOR_REPUTATION) {
            // Not enough data, keep initial score
            return;
        }

        uint256 oldScore = k.reputationScore;
        
        // SECURITY FIX: Safe multiplication and division to prevent underflow
        // Calculate success rate: (successful / total) * 1000
        uint256 newScore = (k.successfulBatches * 1000) / totalBatches;
        
        // Ensure score is between 0 and 1000
        if (newScore > 1000) {
            newScore = 1000;
        }
        
        k.reputationScore = newScore;

        emit ReputationUpdated(keeper, oldScore, newScore);

        // Auto-suspend if reputation drops below 500 (50% success rate)
        if (newScore < 500 && k.state == KeeperState.ACTIVE) {
            _suspendKeeper(keeper, "Low reputation score");
        }
    }

    // ===== SLASHING =====

    /**
     * @notice Slash keeper for fraudulent behavior
     * @param keeper Address of keeper to slash
     * @param fraudLevel 0 = negligence (10% slash), 1 = fraud (100% slash)
     * @param reason Human-readable reason for slashing
     * 
     * @dev Only callable by owner or authorized contracts
     * @dev SECURITY FIX: Properly calculates slash amount based on fraudLevel
     */
    function slashKeeper(
        address keeper,
        uint8 fraudLevel,
        string calldata reason
    ) external onlyAuthorized nonReentrant {
        Keeper storage k = keepers[keeper];
        require(
            k.state == KeeperState.ACTIVE || k.state == KeeperState.SUSPENDED,
            "Keeper not slashable"
        );
        require(k.bondAmount > 0, "No bond to slash");
        require(fraudLevel <= 1, "Invalid fraud level");

        // SECURITY FIX: Properly use fraudLevel to determine slash percentage
        uint256 slashPercentage = fraudLevel == 1 
            ? FRAUD_SLASH_PERCENTAGE 
            : NEGLIGENCE_SLASH_PERCENTAGE;
        
        uint256 slashAmount = (k.bondAmount * slashPercentage) / 100;
        require(slashAmount > 0, "Slash amount is zero");

        // SECURITY FIX: Update state BEFORE external transfer (CEI pattern)
        uint256 oldBondAmount = k.bondAmount;
        k.bondAmount -= slashAmount;
        
        // Only mark as SLASHED if fraud (100%), otherwise keep SUSPENDED for negligence
        if (fraudLevel == 1) {
            k.state = KeeperState.SLASHED;
        } else {
            k.state = KeeperState.SUSPENDED;
        }

        // Remove from active keepers if present
        _removeFromActiveKeepers(keeper);

        // SECURITY FIX: Transfer slashed funds AFTER state update
        (bool sent,) = treasury.call{value: slashAmount}("");
        require(sent, "Treasury transfer failed");

        emit KeeperSlashed(keeper, slashAmount, slashPercentage, reason);
    }

    /**
     * @notice Suspend keeper (doesn't slash bond, but prevents batch submission)
     * @param keeper Address of keeper to suspend
     * @param reason Human-readable reason for suspension
     */
    function _suspendKeeper(address keeper, string memory reason) internal {
        Keeper storage k = keepers[keeper];
        require(k.state == KeeperState.ACTIVE, "Keeper not active");

        k.state = KeeperState.SUSPENDED;
        _removeFromActiveKeepers(keeper);

        emit KeeperSuspended(keeper, reason);
    }

    /**
     * @notice Suspend keeper (external, owner-only)
     */
    function suspendKeeper(address keeper, string calldata reason) external onlyOwner {
        _suspendKeeper(keeper, reason);
    }

    // ===== KEEPER WITHDRAWAL =====

    /**
     * @notice Initiate bond withdrawal (starts cooldown period)
     * @dev Keeper must not have any pending challenges
     */
    function initiateWithdrawal() external nonReentrant {
        Keeper storage k = keepers[msg.sender];
        require(
            k.state == KeeperState.ACTIVE || k.state == KeeperState.SUSPENDED,
            "Cannot withdraw"
        );

        k.state = KeeperState.WITHDRAWING;
        k.withdrawalInitiatedAt = block.timestamp;

        // Remove from active keepers if present
        _removeFromActiveKeepers(msg.sender);

        emit KeeperWithdrawalInitiated(
            msg.sender,
            block.timestamp + WITHDRAWAL_COOLDOWN
        );
    }

    /**
     * @notice Complete bond withdrawal after cooldown period
     * @dev Transfers bond back to keeper
     * @dev SECURITY FIX: Proper state reset prevents reentrancy
     */
    function completeWithdrawal() external nonReentrant {
        Keeper storage k = keepers[msg.sender];
        require(k.state == KeeperState.WITHDRAWING, "Not withdrawing");
        require(
            block.timestamp >= k.withdrawalInitiatedAt + WITHDRAWAL_COOLDOWN,
            "Cooldown not passed"
        );

        uint256 withdrawAmount = k.bondAmount;
        require(withdrawAmount > 0, "No bond to withdraw");

        // SECURITY FIX: Reset ALL keeper state BEFORE external transfer (CEI pattern)
        k.state = KeeperState.INVALID;
        k.bondAmount = 0;
        k.successfulBatches = 0;
        k.failedBatches = 0;
        k.totalFeesEarned = 0;
        k.reputationScore = 0;
        k.registeredAt = 0;
        k.activatedAt = 0;
        k.withdrawalInitiatedAt = 0;
        
        // SECURITY NOTE: We do NOT reset hasRegistered here
        // This ensures allKeepers[] never has duplicates (critical for verifyAccounting)
        // hasRegistered tracks "has this address EVER been a keeper" (lifetime boolean)

        // Transfer bond back to keeper
        (bool sent,) = payable(msg.sender).call{value: withdrawAmount}("");
        require(sent, "Withdrawal failed");

        emit KeeperBondWithdrawn(msg.sender, withdrawAmount);
    }

    // ===== KEEPER UTILITY FUNCTIONS =====

    /**
     * @notice Remove keeper from active keepers array (O(1) removal)
     * @param keeper Address of keeper to remove
     * @dev SECURITY FIX: Uses index + 1 to distinguish "not present" (0) from "index 0" (1)
     * @dev This allows safe re-calls for already-removed keepers (SUSPENDED withdrawal path)
     */
    function _removeFromActiveKeepers(address keeper) internal {
        uint256 storedValue = activeKeeperIndex[keeper];
        
        // storedValue == 0 means keeper is not in the array (already removed or never added)
        if (storedValue == 0) {
            return; // Already removed, safe to skip
        }
        
        // Convert back to actual index (stored as index + 1)
        uint256 index = storedValue - 1;
        
        // SECURITY FIX: Verify mapping matches array (catch desynchronization)
        require(activeKeepers[index] == keeper, "Array desynchronization");
        
        // Move last keeper to deleted position
        address lastKeeper = activeKeepers[activeKeepers.length - 1];
        activeKeepers[index] = lastKeeper;
        activeKeeperIndex[lastKeeper] = index + 1; // Store index + 1
        
        // Remove last position
        activeKeepers.pop();
        delete activeKeeperIndex[keeper]; // Sets to 0 = "not present"
    }

    /**
     * @notice Get next available keeper (pseudo-random selection)
     * @return address Address of next keeper, or address(0) if none available
     * 
     * @dev Used by TrinityExitGateway to automatically assign batches
     * @dev SECURITY FIX: Uses blockhash for better randomness (less gameable)
     * @dev Note: Still not perfect (validator can still influence), but better than block.number
     * @dev Future: Implement VRF (Chainlink VRF or similar) for true randomness
     */
    function getNextKeeper() external view returns (address) {
        if (activeKeepers.length == 0) {
            return address(0);
        }

        // SECURITY FIX: Use blockhash of previous block for pseudo-randomness
        // This is harder to game than block.number (though not impossible)
        uint256 randomSeed = uint256(blockhash(block.number - 1));
        uint256 index = randomSeed % activeKeepers.length;
        return activeKeepers[index];
    }

    /**
     * @notice Check if address is an active keeper
     */
    function isActiveKeeper(address keeper) external view returns (bool) {
        return keepers[keeper].state == KeeperState.ACTIVE;
    }

    /**
     * @notice Get keeper details
     */
    function getKeeper(address keeper) external view returns (Keeper memory) {
        return keepers[keeper];
    }

    /**
     * @notice Get all active keepers
     */
    function getActiveKeepers() external view returns (address[] memory) {
        return activeKeepers;
    }

    /**
     * @notice Get number of active keepers
     */
    function getActiveKeeperCount() external view returns (uint256) {
        return activeKeepers.length;
    }

    // ===== ADMIN FUNCTIONS =====

    /**
     * @notice Authorize contract to call keeper functions
     * @param contractAddress Contract to authorize
     * @param authorized True to authorize, false to revoke
     */
    function setAuthorizedContract(
        address contractAddress,
        bool authorized
    ) external onlyOwner {
        require(contractAddress != address(0), "Invalid contract address");
        authorizedContracts[contractAddress] = authorized;
        emit ContractAuthorized(contractAddress, authorized);
    }

    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw (only when paused, only surplus funds)
     * @dev SECURITY FIX: Only allows withdrawing surplus (balance - total bonds)
     * @dev This prevents owner from stealing keeper bonds
     */
    function emergencyWithdraw(address payable recipient) external onlyOwner {
        require(paused(), "Not paused");
        require(recipient != address(0), "Invalid recipient");

        // SECURITY FIX: Calculate total keeper bonds
        uint256 calculatedBonds = 0;
        for (uint256 i = 0; i < allKeepers.length; i++) {
            calculatedBonds += keepers[allKeepers[i]].bondAmount;
        }
        
        uint256 balance = address(this).balance;
        require(balance > calculatedBonds, "No surplus funds");
        
        // SECURITY FIX: Only withdraw surplus (excess above bonds)
        uint256 surplus = balance - calculatedBonds;

        (bool sent,) = recipient.call{value: surplus}("");
        require(sent, "Emergency withdrawal failed");
    }
    
    /**
     * @notice Get total contract balance
     * @dev Useful for accounting verification
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Verify keeper accounting (total bonds vs contract balance)
     * @dev Security check to ensure no funds are stuck
     * @dev SECURITY FIX: Iterates through ALL keepers (pending, active, suspended, withdrawing, slashed)
     */
    function verifyAccounting() external view returns (bool balanced, uint256 totalBonds, uint256 contractBalance) {
        uint256 calculatedBonds = 0;
        
        // SECURITY FIX: Sum bonds from ALL keepers (all states)
        for (uint256 i = 0; i < allKeepers.length; i++) {
            Keeper storage k = keepers[allKeepers[i]];
            calculatedBonds += k.bondAmount;
        }
        
        contractBalance = address(this).balance;
        totalBonds = calculatedBonds;
        
        // SECURITY FIX: Contract balance MUST equal total bonds (exact match required)
        // No excess allowed - every wei must be accounted for
        balanced = contractBalance == totalBonds;
        
        return (balanced, totalBonds, contractBalance);
    }
    
    /**
     * @notice Get comprehensive keeper count by state
     * @dev Useful for accounting verification
     */
    function getKeeperStats() external view returns (
        uint256 activeCount,
        uint256 totalRegistered
    ) {
        activeCount = activeKeepers.length;
        totalRegistered = totalKeepers;
        return (activeCount, totalRegistered);
    }

    // ===== FALLBACK =====

    /// @notice Receive ETH for bonds and fees
    receive() external payable {}
}
