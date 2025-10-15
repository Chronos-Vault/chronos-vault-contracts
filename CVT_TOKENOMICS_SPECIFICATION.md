# ChronosToken (CVT) Tokenomics Specification

## Token Fundamentals

### Token Metrics
- **Name**: ChronosToken
- **Symbol**: CVT
- **Blockchain**: Primary token on TON, wrapped versions on Ethereum and Solana
- **Token Standard**: TON Jetton standard, ERC-20 (Ethereum), SPL (Solana)
- **Total Supply**: 21,000,000 CVT (fixed)
- **Decimals**: 9 (TON standard)

### Token Distribution
- **Initial Circulation**: 6,300,000 CVT (30%)
- **Time-Locked**: 14,700,000 CVT (70%)
- **Initial Distribution Breakdown**:
  - Private Sale: 1,050,000 CVT (5%)
  - Ecosystem Fund: 3,150,000 CVT (15%)
  - Team & Advisors: 2,100,000 CVT (10%)

### Time-Lock Release Schedule
The 14,700,000 time-locked tokens are released according to this schedule:
- **Year 4**: 7,350,000 CVT (50% of locked tokens)
- **Year 8**: 3,675,000 CVT (25% of locked tokens)
- **Year 12**: 1,837,500 CVT (12.5% of locked tokens)
- **Year 16**: 918,750 CVT (6.25% of locked tokens)
- **Year 21**: 918,750 CVT (6.25% of locked tokens)

## Value Accrual Mechanisms

### Fee Capture System
- **Platform Fees**: 0.1-0.5% on all time capsule creations
- **Premium Features**: Higher fees for advanced features
- **Fee Allocation**:
  - 60% to Treasury for token buybacks and burns
  - 40% to platform development and operations

### Deflationary Mechanisms
- **Token Burning**: Automated smart contract buys CVT from market and burns them
- **Burn Frequency**: Weekly buyback and burn events
- **Burn Transparency**: All burns publicly verifiable on-chain
- **Burn Target**: Average of 2% of circulating supply annually

### Supply Projection (Conservative Estimate)
- **Year 4**: ~13,153,000 CVT (after ~497,000 burned)
- **Year 8**: ~15,771,000 CVT (after ~1,554,000 cumulative burn)
- **Year 12**: ~16,345,500 CVT (after ~2,817,000 cumulative burn)
- **Year 16**: ~15,956,250 CVT (after ~4,125,000 cumulative burn)
- **Year 21**: ~15,279,375 CVT (after ~5,720,625 cumulative burn)
- **Year 30**: ~12,530,000 CVT (after ~8,470,000 cumulative burn)

## Utility & Staking Model

### Token Utility
- **Platform Fee Payment**: Required for all platform services
- **Governance Rights**: Voting weight based on stake amount and duration
- **Feature Access**: Premium features require token holdings
- **Chain-Specific Utility**:
  - TON: Primary fee token, vault security
  - Ethereum: DeFi strategy access, yield optimization
  - Solana: High-speed features, asset transfers
  - Arweave: Storage credits for permanent data

### Advanced Staking System

#### Staking Tiers
1. **Vault Guardian (1,000+ CVT)**
   - **Fee Benefits**: 15% reduction on platform fees
   - **Platform Access**: Basic portfolio analytics, up to 10 time capsules
   - **Voting Power**: 1x base voting weight
   - **Reward Multiplier**: 1.1x base rewards
   - **Minimum Stake**: 1,000 CVT

2. **Vault Architect (10,000+ CVT)**
   - **Fee Benefits**: 30% reduction on platform fees
   - **Platform Access**: Advanced analytics, AI insights, up to 50 time capsules, early feature access
   - **Voting Power**: 3x base voting weight
   - **Reward Multiplier**: 1.25x base rewards
   - **Minimum Stake**: 10,000 CVT

3. **Vault Sovereign (100,000+ CVT)**
   - **Fee Benefits**: 50% reduction on platform fees
   - **Platform Access**: Premium AI optimization, unlimited capsules, concierge service
   - **Voting Power**: 10x base voting weight
   - **Reward Multiplier**: 1.5x base rewards
   - **Minimum Stake**: 100,000 CVT

#### Dynamic Time-Based Multipliers
Staking rewards increase based on lock duration, compounding with tier multipliers:
- **3 months**: 1.0x base rewards
- **6 months**: 1.25x base rewards
- **1 year**: 1.5x base rewards
- **2+ years**: 2.0x base rewards

#### Reward Sources
- **Fee Sharing**: 40% of all platform transaction fees directed to staking rewards
- **Ecosystem Reserve**: 10% of total token supply allocated to staking incentives
- **Deflation Benefit**: Automatic value accrual as tokens are burned from supply

#### Governance Power Calculation
Voting power = Token Amount × Tier Multiplier × (1 + (Lock Duration in Months / 24))

#### Composable Benefits System
Benefits from each tier stack with the previous tier's benefits:
- All stakers receive platform notifications for new features
- Higher tiers receive priority processing for cross-chain transfers
- Sovereign tier receives exclusive quarterly strategy sessions with team

#### Smart Staking Pools
- Users can join collective staking pools to reach higher tiers together
- Minimum contribution: 100 CVT per user
- Pool rewards distributed proportionally to contribution
- Pool administration by elected managers (top 3 contributors)

#### Anti-Dilution Protection
- Long-term stakers (1+ year) receive bonus tokens during inflationary periods
- Protection calculated as: (Inflation Rate × Stake Duration Multiplier)
- Maximum protection of 2x inflation rate for 2+ year stakers

#### Cross-Chain Staking Benefits
- Reduced cross-chain transfer fees (15%/30%/50% by tier)
- Priority transaction processing across all supported chains
- Special access to cross-chain investment opportunities
- Cross-chain security score boost

#### Compounding Options
- **Auto-compound**: Rewards automatically added to stake (1.05x multiplier)
- **Periodic Claim**: Weekly, monthly, or quarterly reward distribution
- **Strategic Direction**: Redirect rewards to specific wallets or time capsules

### Staking Security

#### Implementation Architecture
- Separate staking contracts with upgrade paths
- Multi-signature requirements for parameter changes
- Time-locked execution for critical updates
- Emergency pause functionality with DAO oversight

#### Staking Safeguards
- Maximum stake limit of 500,000 CVT per address
- Cooldown period of 72 hours for unstaking requests
- Gradual unstaking for large positions (>50,000 CVT)
- Slashing conditions for attempted exploits

## Cross-Chain Implementation

### Bridge Mechanics
- **Wrapping Mechanism**: Lock on source chain, mint on destination chain
- **Unwrapping**: Burn on destination chain, unlock on source chain
- **Bridge Security**: Multi-sig validators with economic security bonds
- **Cross-Chain Accounting**: Total supply consistent across all chains

### Chain-Specific Implementation

**TON Implementation**:
- Native Jetton standard
- Primary token with all features
- Base layer for time-lock mechanics

**Ethereum Implementation**:
- ERC-20 standard with EIP-2612 permit extension
- Compatible with DeFi protocols
- Gas optimization for Ethereum mainnet

**Solana Implementation**:
- SPL Token standard
- High-throughput transaction capability
- Metaplex metadata extension

## Governance Model

### Transition to Decentralization
- **Stage 1 (Years 1-2)**: Core team governance
  - Community feedback through proposals
  - Transparent decision-making process
  - Quarterly governance reports

- **Stage 2 (Years 3-4)**: Limited token holder voting
  - Vote on pre-defined proposals
  - Parameter adjustments
  - Feature prioritization

- **Stage 3 (Year 5+)**: Full DAO governance
  - Token holders propose and vote on all changes
  - Treasury management
  - Protocol upgrades

### Governance Parameters
- **Proposal Threshold**: 100,000 CVT to submit proposal
- **Quorum Requirement**: 10% of staked tokens must vote
- **Approval Threshold**: >50% approval required for standard proposals
- **Super-Majority**: >66% approval required for critical changes
- **Execution Delay**: 48-hour timelock before implementation

## Security-Economic Model

### Economic Security
- **Attack Cost**: Making attacks economically irrational
- **Value Locked**: Requiring CVT stake for high-value vaults
- **Security Bond**: Validators must stake CVT as security guarantee

### Security Features
- **Multi-Signature Requirements**: Based on vault value
- **Security Score**: Dynamic security evaluation for all vaults
- **Threat Detection**: AI-powered anomaly detection
- **Audit Trail**: Immutable record of all interactions

## Token Launch Strategy

### Private Sale Structure
- **Round 1**: Strategic partners only (500,000 CVT)
- **Round 2**: Venture capital allocation (550,000 CVT)
- **Token Price**: Market-determined through Dutch auction
- **Vesting**: 6-month cliff, 18-month linear vesting

### Public Launch
- **Launch Method**: Initial DEX offering (IDO)
- **Launch Platforms**: Native TON DEX + major exchanges
- **Liquidity Bootstrapping**: 20% of raised funds allocated
- **Launch Price**: Determined via Liquidity Bootstrapping Pool

### Liquidity Strategy
- **Initial Liquidity**: 15% of circulating supply paired with stable tokens
- **Protocol-Owned Liquidity**: 20% of Treasury allocated to liquidity
- **Liquidity Mining**: Time-limited program for initial liquidity providers
- **Cross-Chain Liquidity**: Balanced across all supported chains

## Long-Term Sustainability

### Treasury Management
- **Asset Diversification**: Maximum 60% in CVT, remainder in stablecoins
- **Runway Requirement**: Minimum 36 months of operational costs
- **Spending Cap**: Maximum 10% of Treasury can be deployed in any quarter
- **Emergency Fund**: 10% of Treasury locked for contingencies

### Risk Management
- **Smart Contract Insurance**: Coverage for potential exploits
- **Auditing Schedule**: Quarterly security audits
- **Bug Bounty Program**: Up to $1M for critical vulnerabilities
- **Risk Committee**: External experts to assess system risks

---

## Technical Implementation Details

### TON Jetton Contract
```
jetton_contract_code = open('jetton-minter.cell', 'rb').read()
jetton_wallet_code = open('jetton-wallet.cell', 'rb').read()

def create_jetton_initial_state():
    wallet_code = Cell.from_boc(jetton_wallet_code)
    content = Cell.from_boc(encode_string('Chronos Vault Token'))
    return {
        'total_supply': 21000000000000000,  # 21M with 9 decimals
        'wallet_code': wallet_code,
        'content': content,
        'owner_address': owner_address
    }
```

### Ethereum ERC-20 Implementation
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ChronosToken is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    constructor(address initialOwner)
        ERC20("ChronosToken", "CVT")
        Ownable(initialOwner)
        ERC20Permit("ChronosToken")
    {
        _mint(initialOwner, 21000000 * 10 ** decimals());
    }

    // Additional functionality for bridge operations
    function bridgeMint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function bridgeBurn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
}
```

### Time-Lock Vault Implementation
```solidity
// Time-Lock Vault for CVT tokens
contract CVTTimeLock {
    using SafeERC20 for IERC20;
    
    IERC20 public cvtToken;
    
    struct TimeLock {
        uint256 amount;
        uint256 unlockTime;
        bool released;
    }
    
    mapping(uint256 => TimeLock) public timeLocks;
    uint256 public nextTimelock = 1;
    
    event TokensLocked(address indexed beneficiary, uint256 amount, uint256 unlockTime);
    event TokensReleased(address indexed beneficiary, uint256 amount);
    
    constructor(address _token) {
        cvtToken = IERC20(_token);
    }
    
    function lockTokens(address beneficiary, uint256 amount, uint256 unlockTime) external {
        cvtToken.safeTransferFrom(msg.sender, address(this), amount);
        
        timeLocks[nextTimelock] = TimeLock({
            amount: amount,
            unlockTime: unlockTime,
            released: false
        });
        
        emit TokensLocked(beneficiary, amount, unlockTime);
        nextTimelock++;
    }
    
    function releaseTokens(uint256 lockId) external {
        TimeLock storage timeLock = timeLocks[lockId];
        require(!timeLock.released, "Tokens already released");
        require(block.timestamp >= timeLock.unlockTime, "Tokens are still locked");
        
        timeLock.released = true;
        
        cvtToken.safeTransfer(msg.sender, timeLock.amount);
        emit TokensReleased(msg.sender, timeLock.amount);
    }
}
```

### Buyback and Burn Mechanism
```solidity
// Automated buyback and burn contract
contract CVTBuybackBurner {
    using SafeERC20 for IERC20;
    
    IERC20 public cvtToken;
    IERC20 public stablecoin;
    address public uniswapRouter;
    address public treasury;
    
    event TokensBurned(uint256 amount);
    
    constructor(address _cvtToken, address _stablecoin, address _uniswapRouter, address _treasury) {
        cvtToken = IERC20(_cvtToken);
        stablecoin = IERC20(_stablecoin);
        uniswapRouter = _uniswapRouter;
        treasury = _treasury;
    }
    
    function executeBuyback(uint256 stablecoinAmount) external {
        require(msg.sender == treasury, "Only treasury can execute buybacks");
        
        // Transfer stablecoins from treasury
        stablecoin.safeTransferFrom(treasury, address(this), stablecoinAmount);
        
        // Approve router to spend stablecoins
        stablecoin.approve(uniswapRouter, stablecoinAmount);
        
        // Execute swap to buy CVT tokens (simplified for illustration)
        uint256 cvtAmount = _swapStableForCVT(stablecoinAmount);
        
        // Burn the purchased CVT tokens
        cvtToken.burn(cvtAmount);
        
        emit TokensBurned(cvtAmount);
    }
    
    function _swapStableForCVT(uint256 stablecoinAmount) internal returns (uint256) {
        // Implementation depends on the specific DEX being used
        // This is a simplified placeholder
        return stablecoinAmount * currentRate;
    }
}
```

### Advanced Staking System Implementation
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CVTStakingVault
 * @dev Implementation of the advanced staking system for CVT tokens
 */
contract CVTStakingVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Stake info structure
    struct StakeInfo {
        uint256 amount;          // Amount of tokens staked
        uint256 lockedUntil;     // Timestamp when tokens unlock
        uint256 stakedAt;        // Timestamp when tokens were staked
        uint8 tier;              // Staking tier: 1=Guardian, 2=Architect, 3=Sovereign
        bool autoCompound;       // Whether rewards auto-compound
        address rewardsDestination; // Optional: Where to send rewards if not auto-compounding
    }

    // Staking pool structure
    struct StakingPool {
        address[] participants;  // Pool participants
        mapping(address => uint256) contributions; // Amount contributed by each participant
        uint256 totalStaked;     // Total amount in the pool
        uint8 tier;              // Pool tier level
        address[] managers;      // Pool managers (top 3 contributors)
    }

    // Tier thresholds and multipliers
    uint256 public guardianThreshold;    // 1,000 CVT
    uint256 public architectThreshold;   // 10,000 CVT
    uint256 public sovereignThreshold;   // 100,000 CVT
    
    uint256 public guardianMultiplier;   // 110 (1.1x)
    uint256 public architectMultiplier;  // 125 (1.25x)
    uint256 public sovereignMultiplier;  // 150 (1.5x)
    
    // Time-based multipliers (in basis points)
    uint256 public threeMonthMultiplier;  // 10000 (1.0x)
    uint256 public sixMonthMultiplier;    // 12500 (1.25x)
    uint256 public oneYearMultiplier;     // 15000 (1.5x)
    uint256 public twoYearMultiplier;     // 20000 (2.0x)
    
    // Staking limits and periods
    uint256 public maxStakePerAddress;    // 500,000 CVT
    uint256 public minStakeAmount;        // 100 CVT
    uint256 public unstakingCooldown;     // 72 hours
    uint256 public poolMinContribution;   // 100 CVT
    
    // Reward parameters
    uint256 public rewardRateBasisPoints; // Annual reward rate in basis points (1 bp = 0.01%)
    uint256 public autoCompoundBonus;     // 500 (1.05x)
    
    // Contract parameters
    IERC20 public cvtToken;
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    
    // User stakes
    mapping(address => StakeInfo) public userStakes;
    
    // Staking pools
    mapping(uint256 => StakingPool) public stakingPools;
    uint256 public nextPoolId = 1;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 lockDuration, uint8 tier);
    event Unstaked(address indexed user, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 amount);
    event PoolCreated(uint256 indexed poolId, address indexed creator);
    event PoolJoined(uint256 indexed poolId, address indexed participant, uint256 amount);
    event PoolLeft(uint256 indexed poolId, address indexed participant, uint256 amount);
    event TierThresholdUpdated(uint8 tier, uint256 newThreshold);
    event RewardRateUpdated(uint256 newRate);
    
    constructor(
        address _cvtToken,
        uint256 _guardianThreshold,
        uint256 _architectThreshold,
        uint256 _sovereignThreshold,
        uint256 _rewardRateBasisPoints
    ) {
        cvtToken = IERC20(_cvtToken);
        
        // Set tier thresholds (in token units)
        guardianThreshold = _guardianThreshold;
        architectThreshold = _architectThreshold;
        sovereignThreshold = _sovereignThreshold;
        
        // Set tier multipliers (in basis points)
        guardianMultiplier = 11000;    // 1.1x
        architectMultiplier = 12500;   // 1.25x
        sovereignMultiplier = 15000;   // 1.5x
        
        // Set time-based multipliers
        threeMonthMultiplier = 10000;  // 1.0x
        sixMonthMultiplier = 12500;    // 1.25x
        oneYearMultiplier = 15000;     // 1.5x
        twoYearMultiplier = 20000;     // 2.0x
        
        // Set staking limits
        maxStakePerAddress = 500000 * 10**18;  // 500,000 CVT
        minStakeAmount = 100 * 10**18;         // 100 CVT
        unstakingCooldown = 3 days;
        poolMinContribution = 100 * 10**18;    // 100 CVT
        
        // Set reward parameters
        rewardRateBasisPoints = _rewardRateBasisPoints;
        autoCompoundBonus = 500;       // 1.05x
    }
    
    /**
     * @dev Stake tokens with a specified lock duration
     * @param amount Amount of tokens to stake
     * @param lockDuration Duration to lock tokens in seconds
     * @param autoCompound Whether to auto-compound rewards
     * @param rewardsDestination Optional address to send rewards to (if not auto-compounding)
     */
    function stake(
        uint256 amount,
        uint256 lockDuration,
        bool autoCompound,
        address rewardsDestination
    ) external nonReentrant whenNotPaused {
        require(amount >= minStakeAmount, "Amount below minimum stake");
        require(amount + userStakes[msg.sender].amount <= maxStakePerAddress, "Exceeds max stake per address");
        
        // Determine tier based on amount
        uint8 tier = determineTier(amount);
        require(tier > 0, "Amount too low for any tier");
        
        // Calculate lock until timestamp
        uint256 lockUntil = block.timestamp + lockDuration;
        
        // Transfer tokens to contract
        cvtToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // If user already has a stake, calculate and add rewards
        if (userStakes[msg.sender].amount > 0) {
            // Calculate rewards
            uint256 rewards = calculateRewards(msg.sender);
            
            // Update stake with rewards
            amount += rewards;
            totalRewardsDistributed += rewards;
            
            // Re-determine tier based on new total
            tier = determineTier(amount);
        }
        
        // Store stake info
        userStakes[msg.sender] = StakeInfo({
            amount: amount,
            lockedUntil: lockUntil,
            stakedAt: block.timestamp,
            tier: tier,
            autoCompound: autoCompound,
            rewardsDestination: rewardsDestination
        });
        
        // Update total staked
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, lockDuration, tier);
    }
    
    /**
     * @dev Unstake tokens after lock period
     */
    function unstake() external nonReentrant {
        StakeInfo storage stakeInfo = userStakes[msg.sender];
        require(stakeInfo.amount > 0, "No stake found");
        require(block.timestamp >= stakeInfo.lockedUntil, "Tokens still locked");
        
        uint256 rewards = calculateRewards(msg.sender);
        uint256 totalAmount = stakeInfo.amount + rewards;
        
        // Update total tracking
        totalStaked -= stakeInfo.amount;
        totalRewardsDistributed += rewards;
        
        // Delete stake
        delete userStakes[msg.sender];
        
        // Transfer tokens back to user
        cvtToken.safeTransfer(msg.sender, totalAmount);
        
        emit Unstaked(msg.sender, stakeInfo.amount, rewards);
    }
    
    /**
     * @dev Claim rewards without unstaking
     */
    function claimRewards() external nonReentrant whenNotPaused {
        StakeInfo storage stakeInfo = userStakes[msg.sender];
        require(stakeInfo.amount > 0, "No stake found");
        require(!stakeInfo.autoCompound, "Auto-compound enabled");
        
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");
        
        // Reset staked timestamp to current time
        stakeInfo.stakedAt = block.timestamp;
        
        // Update total rewards distributed
        totalRewardsDistributed += rewards;
        
        // Transfer rewards
        address recipient = stakeInfo.rewardsDestination != address(0) 
            ? stakeInfo.rewardsDestination 
            : msg.sender;
            
        cvtToken.safeTransfer(recipient, rewards);
        
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    /**
     * @dev Create a new staking pool
     * @param initialContribution Initial amount to contribute
     * @return poolId The ID of the created pool
     */
    function createStakingPool(uint256 initialContribution) external nonReentrant whenNotPaused returns (uint256) {
        require(initialContribution >= poolMinContribution, "Initial contribution too low");
        
        // Create new pool
        uint256 poolId = nextPoolId++;
        StakingPool storage pool = stakingPools[poolId];
        
        // Initialize pool
        pool.participants.push(msg.sender);
        pool.contributions[msg.sender] = initialContribution;
        pool.totalStaked = initialContribution;
        pool.managers.push(msg.sender);
        
        // Determine tier
        pool.tier = determineTier(initialContribution);
        
        // Transfer tokens
        cvtToken.safeTransferFrom(msg.sender, address(this), initialContribution);
        
        emit PoolCreated(poolId, msg.sender);
        emit PoolJoined(poolId, msg.sender, initialContribution);
        
        return poolId;
    }
    
    /**
     * @dev Calculate rewards for a user
     * @param user Address of the user
     * @return rewards Amount of rewards
     */
    function calculateRewards(address user) public view returns (uint256) {
        StakeInfo storage stakeInfo = userStakes[user];
        if (stakeInfo.amount == 0) return 0;
        
        // Calculate time staked in seconds
        uint256 timeStaked = block.timestamp - stakeInfo.stakedAt;
        
        // Base annual reward rate (in basis points)
        uint256 baseReward = (stakeInfo.amount * rewardRateBasisPoints * timeStaked) / (365 days * 10000);
        
        // Apply tier multiplier
        uint256 tierMultiplier;
        if (stakeInfo.tier == 1) {
            tierMultiplier = guardianMultiplier;
        } else if (stakeInfo.tier == 2) {
            tierMultiplier = architectMultiplier;
        } else if (stakeInfo.tier == 3) {
            tierMultiplier = sovereignMultiplier;
        } else {
            tierMultiplier = 10000; // 1.0x as fallback
        }
        
        // Apply time multiplier based on lock duration
        uint256 lockDuration = stakeInfo.lockedUntil - stakeInfo.stakedAt;
        uint256 timeMultiplier;
        
        if (lockDuration >= 730 days) {
            timeMultiplier = twoYearMultiplier;
        } else if (lockDuration >= 365 days) {
            timeMultiplier = oneYearMultiplier;
        } else if (lockDuration >= 180 days) {
            timeMultiplier = sixMonthMultiplier;
        } else {
            timeMultiplier = threeMonthMultiplier;
        }
        
        // Apply auto-compound bonus if enabled
        if (stakeInfo.autoCompound) {
            baseReward = (baseReward * (10000 + autoCompoundBonus)) / 10000;
        }
        
        // Apply all multipliers to base reward
        uint256 rewards = (baseReward * tierMultiplier * timeMultiplier) / (10000 * 10000);
        
        return rewards;
    }
    
    /**
     * @dev Determine the tier for a given stake amount
     * @param amount Amount of tokens staked
     * @return tier Tier level (0=None, 1=Guardian, 2=Architect, 3=Sovereign)
     */
    function determineTier(uint256 amount) public view returns (uint8) {
        if (amount >= sovereignThreshold) {
            return 3; // Sovereign
        } else if (amount >= architectThreshold) {
            return 2; // Architect
        } else if (amount >= guardianThreshold) {
            return 1; // Guardian
        } else {
            return 0; // None
        }
    }
    
    /**
     * @dev Update tier thresholds (owner only)
     */
    function updateTierThresholds(
        uint256 _guardianThreshold,
        uint256 _architectThreshold,
        uint256 _sovereignThreshold
    ) external onlyOwner {
        require(_guardianThreshold > 0, "Guardian threshold must be > 0");
        require(_architectThreshold > _guardianThreshold, "Architect must be > Guardian");
        require(_sovereignThreshold > _architectThreshold, "Sovereign must be > Architect");
        
        guardianThreshold = _guardianThreshold;
        architectThreshold = _architectThreshold;
        sovereignThreshold = _sovereignThreshold;
        
        emit TierThresholdUpdated(1, _guardianThreshold);
        emit TierThresholdUpdated(2, _architectThreshold);
        emit TierThresholdUpdated(3, _sovereignThreshold);
    }
    
    /**
     * @dev Update reward rate (owner only)
     * @param _rewardRateBasisPoints New annual reward rate in basis points
     */
    function updateRewardRate(uint256 _rewardRateBasisPoints) external onlyOwner {
        require(_rewardRateBasisPoints <= 2000, "Rate too high (max 20%)");
        rewardRateBasisPoints = _rewardRateBasisPoints;
        
        emit RewardRateUpdated(_rewardRateBasisPoints);
    }
    
    /**
     * @dev Pause staking functions in emergency (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause staking functions (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get user stake info
     * @param user Address of the user
     * @return amount Amount staked
     * @return lockedUntil Timestamp when tokens unlock
     * @return stakedAt Timestamp when tokens were staked
     * @return tier Staking tier
     * @return rewards Current rewards
     */
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 lockedUntil,
        uint256 stakedAt,
        uint8 tier,
        uint256 rewards
    ) {
        StakeInfo storage stakeInfo = userStakes[user];
        return (
            stakeInfo.amount,
            stakeInfo.lockedUntil,
            stakeInfo.stakedAt,
            stakeInfo.tier,
            calculateRewards(user)
        );
    }
    
    /**
     * @dev Get number of stakers for each tier
     * @return guardians Number of Guardian stakers
     * @return architects Number of Architect stakers
     * @return sovereigns Number of Sovereign stakers
     */
    function getTierCounts() external view returns (
        uint256 guardians,
        uint256 architects,
        uint256 sovereigns
    ) {
        // Iterate through all stakers and count by tier
        // Note: In a production environment, we would maintain counts in storage
        // This is a simplified implementation for the spec
        return (42, 15, 3); // Example values
    }
}
```

### TON Implementation of Staking Contract
```
;; FunC implementation of the staking contract for TON blockchain

const int GUARDIAN_THRESHOLD = 1000000000000;      ;; 1,000 CVT with 9 decimals
const int ARCHITECT_THRESHOLD = 10000000000000;    ;; 10,000 CVT
const int SOVEREIGN_THRESHOLD = 100000000000000;   ;; 100,000 CVT

const int REWARD_RATE_BP = 500;  ;; 5% annual reward rate in basis points

;; Calculate tier based on staked amount
int calculate_tier(int amount) {
    if (amount >= SOVEREIGN_THRESHOLD) {
        return 3; ;; Sovereign
    } 
    if (amount >= ARCHITECT_THRESHOLD) {
        return 2; ;; Architect
    }
    if (amount >= GUARDIAN_THRESHOLD) {
        return 1; ;; Guardian
    }
    return 0; ;; Below threshold
}

;; Calculate time-based multiplier
int calculate_time_multiplier(int lock_duration) {
    if (lock_duration >= 730 * 86400) {
        return 20000; ;; 2.0x for 2+ years
    }
    if (lock_duration >= 365 * 86400) {
        return 15000; ;; 1.5x for 1+ year
    }
    if (lock_duration >= 180 * 86400) {
        return 12500; ;; 1.25x for 6+ months
    }
    return 10000; ;; 1.0x base multiplier
}

;; Calculate tier multiplier
int calculate_tier_multiplier(int tier) {
    if (tier == 3) {
        return 15000; ;; 1.5x for Sovereign
    }
    if (tier == 2) {
        return 12500; ;; 1.25x for Architect
    }
    if (tier == 1) {
        return 11000; ;; 1.1x for Guardian
    }
    return 10000; ;; 1.0x base
}

;; Calculate rewards
int calculate_rewards(int amount, int time_staked, int tier, int lock_duration) {
    int seconds_per_year = 365 * 86400;
    
    ;; Base reward: amount * rate * time / (1 year in seconds * 10000)
    int base_reward = (amount * REWARD_RATE_BP * time_staked) / (seconds_per_year * 10000);
    
    ;; Apply multipliers
    int tier_mult = calculate_tier_multiplier(tier);
    int time_mult = calculate_time_multiplier(lock_duration);
    
    return (base_reward * tier_mult * time_mult) / (10000 * 10000);
}
```

This document serves as the definitive technical specification for the CVT token system and will be used as a reference for all implementation work.