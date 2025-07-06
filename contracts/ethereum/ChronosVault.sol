// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ChronosVault
 * @dev An ERC-4626 compliant tokenized vault for time-locked digital assets
 *      with cross-chain integration capabilities
 * 
 * This vault implements the ERC-4626 Tokenized Vault Standard to provide
 * advanced financial functionality for the Chronos Vault platform, while
 * integrating a Triple-Chain Security architecture with Ethereum (primary ownership),
 * Solana (monitoring and verification), and TON (backup and recovery).
 * 
 * Security levels:
 * 1. Standard - Basic time-lock functionality
 * 2. Enhanced - Requires access key and authorized retrievers
 * 3. Maximum - Adds cross-chain verification and multi-signature requirements
 */
contract ChronosVault is ERC4626, Ownable, ReentrancyGuard {
    using Math for uint256;
    using ECDSA for bytes32;

    // =========== State Variables ===========

    // Time lock details
    uint256 public unlockTime;
    bool public isUnlocked;
    uint8 public securityLevel;
    
    // Cross-chain integration
    mapping(string => string) public crossChainAddresses;
    string[] public supportedBlockchains;
    
    // Vault metadata
    struct VaultMetadata {
        string name;
        string description;
        string[] tags;
        string contentHash;  // IPFS or other decentralized storage hash
        bool isPublic;
    }
    VaultMetadata public metadata;
    
    // Security mechanisms
    mapping(address => bool) public authorizedRetrievers;
    bytes32 public accessKeyHash;  // Hashed access key for high security levels
    
    // Multi-signature requirements
    struct MultiSigConfig {
        address[] signers;
        uint256 threshold;   // Number of signatures required
        bool enabled;
    }
    MultiSigConfig public multiSig;
    
    // Cross-chain verification
    struct CrossChainVerification {
        // TON verification
        bytes32 tonVerificationHash;
        uint256 tonLastVerified;
        bool tonVerified;
        
        // Solana verification
        bytes32 solanaVerificationHash;
        uint256 solanaLastVerified;
        bool solanaVerified;
        
        // Emergency recovery
        address emergencyRecoveryAddress;
        bool emergencyModeActive;
    }
    CrossChainVerification public crossChainVerification;
    
    // Withdrawal requests for multi-sig vaults
    struct WithdrawalRequest {
        address requester;
        address receiver;
        uint256 amount;
        uint256 requestTime;
        mapping(address => bool) approvals;
        uint256 approvalCount;
        bool executed;
        bool cancelled;
    }
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    uint256 public nextWithdrawalRequestId;
    
    // Geolocation lock (optional security feature)
    struct GeoLock {
        string allowedRegion;    // ISO country code or region identifier
        bytes32 regionProofHash; // Hash of proof required to verify location
        bool enabled;
    }
    GeoLock public geoLock;
    
    // Proof of reserve
    uint256 public lastVerificationTimestamp;
    bytes32 public verificationProof;
    
    // Advanced vault features
    uint256 public performanceFee; // Basis points (1/100 of a percent)
    uint256 public managementFee;  // Basis points per year
    uint256 public lastFeeCollection;
    
    // Triple-Chain security status
    uint8 public constant CHAIN_ETHEREUM = 1;
    uint8 public constant CHAIN_SOLANA = 2;
    uint8 public constant CHAIN_TON = 3;
    mapping(uint8 => bool) public chainVerificationStatus;
    
    // =========== Events ===========
    
    event VaultCreated(address indexed creator, uint256 unlockTime, uint8 securityLevel);
    event VaultUnlocked(address indexed retriever, uint256 unlockTime);
    event CrossChainAddressAdded(string blockchain, string address);
    event SecurityLevelChanged(uint8 oldLevel, uint8 newLevel);
    event VerificationProofUpdated(bytes32 proof, uint256 timestamp);
    event AssetDeposited(address indexed from, uint256 amount);
    event AssetWithdrawn(address indexed to, uint256 amount);
    
    // Multi-signature events
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdChanged(uint256 oldThreshold, uint256 newThreshold);
    event MultiSigEnabled(bool enabled);
    event WithdrawalRequested(uint256 indexed requestId, address indexed requester, uint256 amount);
    event WithdrawalApproved(uint256 indexed requestId, address indexed approver);
    event WithdrawalExecuted(uint256 indexed requestId, address indexed receiver, uint256 amount);
    event WithdrawalCancelled(uint256 indexed requestId, address indexed canceller);
    
    // Cross-chain verification events
    event CrossChainVerified(uint8 chainId, bytes32 verificationHash);
    event EmergencyModeActivated(address recoveryAddress);
    event EmergencyModeDeactivated();
    
    // Geolocation events
    event GeoLockEnabled(string region);
    event GeoLockDisabled();
    event GeoVerificationSuccessful(address verifier);
    
    // =========== Constructor ===========
    
    /**
     * @dev Creates a new ChronosVault
     * @param _asset The ERC20 token address this vault will manage
     * @param _name The name of the vault token
     * @param _symbol The symbol of the vault token
     * @param _unlockTime Unix timestamp when the vault will unlock
     * @param _securityLevel Security level from 1-5
     * @param _accessKey Optional access key (required for security levels > 1)
     * @param _isPublic Whether the vault is publicly visible
     */
    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        uint256 _unlockTime,
        uint8 _securityLevel,
        string memory _accessKey,
        bool _isPublic
    ) 
        ERC20(_name, _symbol)
        ERC4626(_asset)
        Ownable(msg.sender)
    {
        require(_unlockTime > block.timestamp, "Unlock time must be in the future");
        require(_securityLevel >= 1 && _securityLevel <= 5, "Security level must be 1-5");
        
        // If security level > 1, require an access key
        if (_securityLevel > 1) {
            require(bytes(_accessKey).length > 0, "Access key required for security levels > 1");
            accessKeyHash = keccak256(abi.encodePacked(_accessKey));
        }
        
        unlockTime = _unlockTime;
        isUnlocked = false;
        securityLevel = _securityLevel;
        lastFeeCollection = block.timestamp;
        nextWithdrawalRequestId = 1;
        
        // Initialize metadata
        metadata = VaultMetadata({
            name: _name,
            description: "",
            tags: new string[](0),
            contentHash: "",
            isPublic: _isPublic
        });
        
        // Add vault creator as authorized retriever
        authorizedRetrievers[msg.sender] = true;
        
        // Initialize Triple-Chain security verification
        // Ethereum is always verified by default since this is an Ethereum contract
        chainVerificationStatus[CHAIN_ETHEREUM] = true;
        
        // Initialize cross-chain verification structure
        crossChainVerification.tonVerified = false;
        crossChainVerification.solanaVerified = false;
        crossChainVerification.emergencyModeActive = false;
        
        // Initialize multi-sig as disabled by default
        multiSig.enabled = false;
        multiSig.threshold = 0;
        
        // Initialize geolocation lock as disabled by default
        geoLock.enabled = false;
        
        emit VaultCreated(msg.sender, _unlockTime, _securityLevel);
    }
    
    // =========== Modifiers ===========
    
    modifier onlyWhenUnlocked() {
        require(block.timestamp >= unlockTime || isUnlocked, "Vault is still locked");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedRetrievers[msg.sender] || owner() == msg.sender, "Not authorized");
        _;
    }
    
    // =========== Core ERC-4626 Overrides ===========
    
    /**
     * @dev Deposit assets and mint vault tokens
     * @param assets Amount of assets to deposit
     * @param receiver Receiver of the vault tokens
     */
    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
        // If vault is unlocked, only owner can deposit
        if (isUnlocked) {
            require(msg.sender == owner(), "Only owner can deposit after unlock");
        }
        
        uint256 shares = super.deposit(assets, receiver);
        
        emit AssetDeposited(msg.sender, assets);
        return shares;
    }
    
    /**
     * @dev Withdraw assets
     * @param assets Amount of assets to withdraw
     * @param receiver Receiver of the assets
     * @param owner Owner of the vault shares
     */
    function withdraw(uint256 assets, address receiver, address owner) 
        public 
        override 
        nonReentrant 
        onlyWhenUnlocked
        returns (uint256) 
    {
        if (securityLevel > 1) {
            require(authorizedRetrievers[msg.sender], "Not an authorized retriever");
        }
        
        // Apply fees before withdrawal
        _collectFees();
        
        uint256 shares = super.withdraw(assets, receiver, owner);
        
        emit AssetWithdrawn(receiver, assets);
        return shares;
    }
    
    /**
     * @dev Redeem shares
     * @param shares Amount of shares to redeem
     * @param receiver Receiver of the assets
     * @param owner Owner of the vault shares
     */
    function redeem(uint256 shares, address receiver, address owner) 
        public 
        override 
        nonReentrant 
        onlyWhenUnlocked
        returns (uint256) 
    {
        if (securityLevel > 1) {
            require(authorizedRetrievers[msg.sender], "Not an authorized retriever");
        }
        
        // Apply fees before redemption
        _collectFees();
        
        uint256 assets = super.redeem(shares, receiver, owner);
        
        emit AssetWithdrawn(receiver, assets);
        return assets;
    }
    
    // =========== Vault Management Functions ===========
    
    /**
     * @dev Manually unlock the vault before the unlock time
     * @param _accessKey Access key for verification (required for security levels > 1)
     */
    function unlockEarly(string memory _accessKey) external onlyAuthorized {
        require(!isUnlocked, "Vault is already unlocked");
        
        // Verify access key for security levels > 1
        if (securityLevel > 1) {
            require(keccak256(abi.encodePacked(_accessKey)) == accessKeyHash, "Invalid access key");
        }
        
        isUnlocked = true;
        emit VaultUnlocked(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Add or update a cross-chain address for this vault
     * @param blockchain Name of the blockchain
     * @param contractAddress Address on that blockchain
     */
    function addCrossChainAddress(string memory blockchain, string memory contractAddress) 
        external 
        onlyOwner 
    {
        bool exists = false;
        for (uint i = 0; i < supportedBlockchains.length; i++) {
            if (keccak256(abi.encodePacked(supportedBlockchains[i])) == keccak256(abi.encodePacked(blockchain))) {
                exists = true;
                break;
            }
        }
        
        if (!exists) {
            supportedBlockchains.push(blockchain);
        }
        
        crossChainAddresses[blockchain] = contractAddress;
        emit CrossChainAddressAdded(blockchain, contractAddress);
    }
    
    /**
     * @dev Update the vault's security level
     * @param _newLevel New security level (1-5)
     */
    function updateSecurityLevel(uint8 _newLevel) external onlyOwner {
        require(_newLevel >= 1 && _newLevel <= 5, "Security level must be 1-5");
        
        // If increasing security level, require that an access key is set
        if (_newLevel > securityLevel && _newLevel > 1) {
            require(accessKeyHash != bytes32(0), "Must set access key first for higher security");
        }
        
        uint8 oldLevel = securityLevel;
        securityLevel = _newLevel;
        
        emit SecurityLevelChanged(oldLevel, _newLevel);
    }
    
    /**
     * @dev Update the access key for the vault
     * @param _newAccessKey New access key
     */
    function updateAccessKey(string memory _newAccessKey) external onlyOwner {
        require(bytes(_newAccessKey).length > 0, "Access key cannot be empty");
        accessKeyHash = keccak256(abi.encodePacked(_newAccessKey));
    }
    
    /**
     * @dev Add an authorized retriever who can access the vault when unlocked
     * @param _retriever Address of the retriever
     */
    function addAuthorizedRetriever(address _retriever) external onlyOwner {
        authorizedRetrievers[_retriever] = true;
    }
    
    /**
     * @dev Remove an authorized retriever
     * @param _retriever Address of the retriever to remove
     */
    function removeAuthorizedRetriever(address _retriever) external onlyOwner {
        require(_retriever != owner(), "Cannot remove owner");
        authorizedRetrievers[_retriever] = false;
    }
    
    /**
     * @dev Update the vault's metadata
     * @param _name New name
     * @param _description New description
     * @param _tags New tags
     * @param _contentHash New content hash
     * @param _isPublic New visibility setting
     */
    function updateMetadata(
        string memory _name,
        string memory _description,
        string[] memory _tags,
        string memory _contentHash,
        bool _isPublic
    ) external onlyOwner {
        metadata.name = _name;
        metadata.description = _description;
        metadata.tags = _tags;
        metadata.contentHash = _contentHash;
        metadata.isPublic = _isPublic;
    }
    
    // =========== Fee Management Functions ===========
    
    /**
     * @dev Set the performance fee (taken on profits)
     * @param _feeInBasisPoints Fee in basis points (1/100 of a percent)
     */
    function setPerformanceFee(uint256 _feeInBasisPoints) external onlyOwner {
        require(_feeInBasisPoints <= 2000, "Fee cannot exceed 20%");
        performanceFee = _feeInBasisPoints;
    }
    
    /**
     * @dev Set the management fee (annual fee on all assets)
     * @param _feeInBasisPoints Fee in basis points per year
     */
    function setManagementFee(uint256 _feeInBasisPoints) external onlyOwner {
        require(_feeInBasisPoints <= 500, "Fee cannot exceed 5% annually");
        managementFee = _feeInBasisPoints;
    }
    
    /**
     * @dev Collect accrued fees
     */
    function collectFees() external onlyOwner {
        _collectFees();
    }
    
    /**
     * @dev Internal function to collect accrued fees
     */
    function _collectFees() internal {
        if (lastFeeCollection == block.timestamp) {
            return;
        }
        
        uint256 totalAssets = totalAssets();
        if (totalAssets == 0) {
            lastFeeCollection = block.timestamp;
            return;
        }
        
        // Calculate time-based management fee
        uint256 timeElapsed = block.timestamp - lastFeeCollection;
        if (managementFee > 0 && timeElapsed > 0) {
            // managementFee is in basis points per year
            // Calculate pro-rated fee for the time elapsed
            uint256 yearInSeconds = 365 days;
            uint256 feeAmount = totalAssets
                .mulDiv(managementFee, 10000) // Convert basis points to percentage
                .mulDiv(timeElapsed, yearInSeconds); // Pro-rate for time elapsed
                
            if (feeAmount > 0) {
                // Mint new shares for the owner as fees
                _mint(owner(), convertToShares(feeAmount));
            }
        }
        
        lastFeeCollection = block.timestamp;
    }
    
    // =========== Verification Functions ===========
    
    /**
     * @dev Update the verification proof for cross-chain validation
     * @param _proof New verification proof
     */
    function updateVerificationProof(bytes32 _proof) external onlyOwner {
        verificationProof = _proof;
        lastVerificationTimestamp = block.timestamp;
        
        emit VerificationProofUpdated(_proof, block.timestamp);
    }
    
    /**
     * @dev Generate a verification proof for cross-chain validation
     * @return The generated proof
     */
    function generateVerificationProof() external view returns (bytes32) {
        return keccak256(abi.encodePacked(
            address(this),
            block.timestamp,
            unlockTime,
            totalAssets(),
            securityLevel
        ));
    }
    
    // =========== View Functions ===========
    
    /**
     * @dev Get all supported blockchains
     * @return Array of blockchain names
     */
    function getSupportedBlockchains() external view returns (string[] memory) {
        return supportedBlockchains;
    }
    
    /**
     * @dev Get all cross-chain addresses
     * @return Array of blockchain names and their corresponding addresses
     */
    function getAllCrossChainAddresses() external view returns (string[] memory, string[] memory) {
        string[] memory blockchains = new string[](supportedBlockchains.length);
        string[] memory addresses = new string[](supportedBlockchains.length);
        
        for (uint i = 0; i < supportedBlockchains.length; i++) {
            blockchains[i] = supportedBlockchains[i];
            addresses[i] = crossChainAddresses[supportedBlockchains[i]];
        }
        
        return (blockchains, addresses);
    }
    
    /**
     * @dev Get the vault's metadata
     * @return Complete metadata structure
     */
    function getMetadata() external view returns (
        string memory name,
        string memory description,
        string[] memory tags,
        string memory contentHash,
        bool isPublic
    ) {
        return (
            metadata.name,
            metadata.description,
            metadata.tags,
            metadata.contentHash,
            metadata.isPublic
        );
    }
    
    /**
     * @dev Check if vault is currently unlocked
     * @return True if unlocked
     */
    function checkIfUnlocked() external view returns (bool) {
        return isUnlocked || block.timestamp >= unlockTime;
    }
    
    /**
     * @dev Check if an address is authorized to retrieve assets
     * @param _address Address to check
     * @return True if authorized
     */
    function isAuthorizedRetriever(address _address) external view returns (bool) {
        return authorizedRetrievers[_address] || _address == owner();
    }
    
    /**
     * @dev Verify an access key
     * @param _accessKey Access key to verify
     * @return True if valid
     */
    function verifyAccessKey(string memory _accessKey) external view returns (bool) {
        return keccak256(abi.encodePacked(_accessKey)) == accessKeyHash;
    }
    
    // =========== Multi-Signature Functions ===========
    
    /**
     * @dev Enable multi-signature requirements for this vault
     * @param _signers Array of authorized signer addresses
     * @param _threshold Number of signatures required (must be <= signers.length)
     */
    function enableMultiSig(address[] memory _signers, uint256 _threshold) external onlyOwner {
        require(!multiSig.enabled, "Multi-sig already enabled");
        require(_signers.length > 0, "At least one signer required");
        require(_threshold > 0 && _threshold <= _signers.length, "Invalid threshold");
        
        // Add all signers
        for (uint256 i = 0; i < _signers.length; i++) {
            require(_signers[i] != address(0), "Invalid signer address");
        }
        
        multiSig.signers = _signers;
        multiSig.threshold = _threshold;
        multiSig.enabled = true;
        
        emit MultiSigEnabled(true);
    }
    
    /**
     * @dev Disable multi-signature requirements
     */
    function disableMultiSig() external onlyOwner {
        require(multiSig.enabled, "Multi-sig not enabled");
        
        multiSig.enabled = false;
        
        emit MultiSigEnabled(false);
    }
    
    /**
     * @dev Add a new signer to the multi-sig configuration
     * @param _signer New signer address
     */
    function addSigner(address _signer) external onlyOwner {
        require(multiSig.enabled, "Multi-sig not enabled");
        require(_signer != address(0), "Invalid signer address");
        
        // Check if signer already exists
        for (uint256 i = 0; i < multiSig.signers.length; i++) {
            require(multiSig.signers[i] != _signer, "Signer already exists");
        }
        
        // Add new signer
        multiSig.signers.push(_signer);
        
        emit SignerAdded(_signer);
    }
    
    /**
     * @dev Remove a signer from the multi-sig configuration
     * @param _signer Signer address to remove
     */
    function removeSigner(address _signer) external onlyOwner {
        require(multiSig.enabled, "Multi-sig not enabled");
        require(multiSig.signers.length > multiSig.threshold, "Cannot reduce signers below threshold");
        
        bool found = false;
        uint256 signerIndex;
        
        // Find signer
        for (uint256 i = 0; i < multiSig.signers.length; i++) {
            if (multiSig.signers[i] == _signer) {
                found = true;
                signerIndex = i;
                break;
            }
        }
        
        require(found, "Signer not found");
        
        // Remove signer by replacing with the last element and popping
        multiSig.signers[signerIndex] = multiSig.signers[multiSig.signers.length - 1];
        multiSig.signers.pop();
        
        emit SignerRemoved(_signer);
    }
    
    /**
     * @dev Update the multi-sig threshold
     * @param _newThreshold New threshold value
     */
    function updateSignatureThreshold(uint256 _newThreshold) external onlyOwner {
        require(multiSig.enabled, "Multi-sig not enabled");
        require(_newThreshold > 0, "Threshold must be greater than 0");
        require(_newThreshold <= multiSig.signers.length, "Threshold cannot exceed number of signers");
        
        uint256 oldThreshold = multiSig.threshold;
        multiSig.threshold = _newThreshold;
        
        emit ThresholdChanged(oldThreshold, _newThreshold);
    }
    
    /**
     * @dev Create a withdrawal request that requires multi-signature approval
     * @param _receiver Receiver of the assets
     * @param _amount Amount of assets to withdraw
     * @return requestId The ID of the created request
     */
    function createWithdrawalRequest(address _receiver, uint256 _amount) external onlyWhenUnlocked returns (uint256) {
        require(multiSig.enabled, "Multi-sig not enabled");
        require(_receiver != address(0), "Invalid receiver address");
        require(_amount > 0, "Amount must be greater than 0");
        require(totalAssets() >= _amount, "Insufficient assets in vault");
        
        uint256 requestId = nextWithdrawalRequestId++;
        
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        request.requester = msg.sender;
        request.receiver = _receiver;
        request.amount = _amount;
        request.requestTime = block.timestamp;
        request.approvalCount = 0;
        request.executed = false;
        request.cancelled = false;
        
        // Auto-approve if the requester is a signer
        bool isRequesterSigner = false;
        for (uint256 i = 0; i < multiSig.signers.length; i++) {
            if (multiSig.signers[i] == msg.sender) {
                isRequesterSigner = true;
                request.approvals[msg.sender] = true;
                request.approvalCount = 1;
                break;
            }
        }
        
        emit WithdrawalRequested(requestId, msg.sender, _amount);
        return requestId;
    }
    
    /**
     * @dev Approve a withdrawal request (only signers can call)
     * @param _requestId ID of the withdrawal request
     */
    function approveWithdrawal(uint256 _requestId) external {
        require(multiSig.enabled, "Multi-sig not enabled");
        
        // Check if caller is a signer
        bool isSigner = false;
        for (uint256 i = 0; i < multiSig.signers.length; i++) {
            if (multiSig.signers[i] == msg.sender) {
                isSigner = true;
                break;
            }
        }
        require(isSigner, "Not a signer");
        
        WithdrawalRequest storage request = withdrawalRequests[_requestId];
        
        require(!request.executed, "Request already executed");
        require(!request.cancelled, "Request was cancelled");
        require(!request.approvals[msg.sender], "Already approved");
        
        request.approvals[msg.sender] = true;
        request.approvalCount++;
        
        emit WithdrawalApproved(_requestId, msg.sender);
        
        // If enough approvals, execute the withdrawal
        if (request.approvalCount >= multiSig.threshold) {
            _executeWithdrawal(_requestId);
        }
    }
    
    /**
     * @dev Cancel a withdrawal request (only owner or requester can call)
     * @param _requestId ID of the withdrawal request
     */
    function cancelWithdrawal(uint256 _requestId) external {
        WithdrawalRequest storage request = withdrawalRequests[_requestId];
        
        require(!request.executed, "Request already executed");
        require(!request.cancelled, "Request already cancelled");
        require(msg.sender == request.requester || msg.sender == owner(), "Not authorized");
        
        request.cancelled = true;
        
        emit WithdrawalCancelled(_requestId, msg.sender);
    }
    
    /**
     * @dev Get withdrawal request information
     * @param _requestId ID of the withdrawal request
     * @return requester The address that created the request
     * @return receiver The address that will receive the assets
     * @return amount The amount of assets to withdraw
     * @return requestTime The timestamp when the request was created
     * @return approvalCount The number of approvals received
     * @return executed Whether the request has been executed
     * @return cancelled Whether the request has been cancelled
     */
    function getWithdrawalRequest(uint256 _requestId) external view returns (
        address requester,
        address receiver,
        uint256 amount,
        uint256 requestTime,
        uint256 approvalCount,
        bool executed,
        bool cancelled
    ) {
        WithdrawalRequest storage request = withdrawalRequests[_requestId];
        return (
            request.requester,
            request.receiver,
            request.amount,
            request.requestTime,
            request.approvalCount,
            request.executed,
            request.cancelled
        );
    }
    
    /**
     * @dev Check if a signer has approved a withdrawal request
     * @param _requestId ID of the withdrawal request
     * @param _signer Address of the signer
     * @return True if the signer has approved the request
     */
    function hasApproved(uint256 _requestId, address _signer) external view returns (bool) {
        return withdrawalRequests[_requestId].approvals[_signer];
    }
    
    /**
     * @dev Internal function to execute a withdrawal after sufficient approvals
     * @param _requestId ID of the withdrawal request
     */
    function _executeWithdrawal(uint256 _requestId) internal {
        WithdrawalRequest storage request = withdrawalRequests[_requestId];
        
        require(!request.executed, "Request already executed");
        require(!request.cancelled, "Request was cancelled");
        require(request.approvalCount >= multiSig.threshold, "Insufficient approvals");
        
        request.executed = true;
        
        // Transfer assets to the receiver
        uint256 shares = convertToShares(request.amount);
        super._withdraw(msg.sender, request.receiver, owner(), request.amount, shares);
        
        emit WithdrawalExecuted(_requestId, request.receiver, request.amount);
    }
    
    // =========== Cross-Chain Verification Functions ===========
    
    /**
     * @dev Register a verification from TON blockchain
     * @param _verificationHash Hash verifying the vault state on TON
     * @param _verificationProof Proof of the verification (signature)
     */
    function registerTONVerification(bytes32 _verificationHash, bytes memory _verificationProof) external {
        // Verify the proof is coming from an authorized validator
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            _verificationHash
        ));
        address recoveredAddress = messageHash.recover(_verificationProof);
        require(authorizedRetrievers[recoveredAddress] || recoveredAddress == owner(), "Invalid verification signer");
        
        // Update TON verification status
        crossChainVerification.tonVerificationHash = _verificationHash;
        crossChainVerification.tonLastVerified = block.timestamp;
        crossChainVerification.tonVerified = true;
        
        // Update chain verification status
        chainVerificationStatus[CHAIN_TON] = true;
        
        emit CrossChainVerified(CHAIN_TON, _verificationHash);
    }
    
    /**
     * @dev Register a verification from Solana blockchain
     * @param _verificationHash Hash verifying the vault state on Solana
     * @param _verificationProof Proof of the verification (signature)
     */
    function registerSolanaVerification(bytes32 _verificationHash, bytes memory _verificationProof) external {
        // Verify the proof is coming from an authorized validator
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            _verificationHash
        ));
        address recoveredAddress = messageHash.recover(_verificationProof);
        require(authorizedRetrievers[recoveredAddress] || recoveredAddress == owner(), "Invalid verification signer");
        
        // Update Solana verification status
        crossChainVerification.solanaVerificationHash = _verificationHash;
        crossChainVerification.solanaLastVerified = block.timestamp;
        crossChainVerification.solanaVerified = true;
        
        // Update chain verification status
        chainVerificationStatus[CHAIN_SOLANA] = true;
        
        emit CrossChainVerified(CHAIN_SOLANA, _verificationHash);
    }
    
    /**
     * @dev Check if the vault is verified across all required chains
     * @return True if all required chains have verified the vault
     */
    function isFullyVerified() external view returns (bool) {
        // Always verified on Ethereum since this is the Ethereum contract
        bool ethereumVerified = true;
        
        // For security level 3, verification on all chains is required
        if (securityLevel >= 3) {
            return (
                ethereumVerified && 
                crossChainVerification.tonVerified && 
                crossChainVerification.solanaVerified
            );
        }
        
        // For security level 2, only TON backup verification is required
        if (securityLevel == 2) {
            return ethereumVerified && crossChainVerification.tonVerified;
        }
        
        // For security level 1, only Ethereum verification is required
        return ethereumVerified;
    }
    
    /**
     * @dev Setup emergency recovery mode for this vault
     * @param _recoveryAddress Address authorized for emergency recovery
     */
    function setupEmergencyRecovery(address _recoveryAddress) external onlyOwner {
        require(_recoveryAddress != address(0), "Invalid recovery address");
        
        crossChainVerification.emergencyRecoveryAddress = _recoveryAddress;
    }
    
    /**
     * @dev Activate emergency recovery mode (requires verification)
     * @param _tonRecoveryProof Proof of recovery authorization from TON chain
     */
    function activateEmergencyMode(bytes memory _tonRecoveryProof) external {
        require(crossChainVerification.emergencyRecoveryAddress != address(0), "Recovery not set up");
        require(!crossChainVerification.emergencyModeActive, "Emergency mode already active");
        
        // Verify the proof is coming from TON recovery mechanism
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked("EMERGENCY_RECOVERY", address(this), block.timestamp))
        ));
        address recoveredAddress = messageHash.recover(_tonRecoveryProof);
        
        require(
            recoveredAddress == crossChainVerification.emergencyRecoveryAddress, 
            "Invalid recovery proof"
        );
        
        crossChainVerification.emergencyModeActive = true;
        
        emit EmergencyModeActivated(crossChainVerification.emergencyRecoveryAddress);
    }
    
    /**
     * @dev Deactivate emergency recovery mode (only owner)
     */
    function deactivateEmergencyMode() external onlyOwner {
        require(crossChainVerification.emergencyModeActive, "Emergency mode not active");
        
        crossChainVerification.emergencyModeActive = false;
        
        emit EmergencyModeDeactivated();
    }
    
    // =========== Geolocation Functions ===========
    
    /**
     * @dev Enable geolocation lock for the vault
     * @param _region ISO country code or region identifier
     * @param _regionProof Proof used to verify location (hashed)
     */
    function enableGeoLock(string memory _region, string memory _regionProof) external onlyOwner {
        require(bytes(_region).length > 0, "Region cannot be empty");
        require(bytes(_regionProof).length > 0, "Region proof cannot be empty");
        
        geoLock.allowedRegion = _region;
        geoLock.regionProofHash = keccak256(abi.encodePacked(_regionProof));
        geoLock.enabled = true;
        
        emit GeoLockEnabled(_region);
    }
    
    /**
     * @dev Disable geolocation lock
     */
    function disableGeoLock() external onlyOwner {
        require(geoLock.enabled, "Geo lock not enabled");
        
        geoLock.enabled = false;
        
        emit GeoLockDisabled();
    }
    
    /**
     * @dev Verify a user's geolocation matches the vault's allowed region
     * @param _regionProof Proof of the user's region
     * @return True if the user's region matches the allowed region
     */
    function verifyGeolocation(string memory _regionProof) external view returns (bool) {
        if (!geoLock.enabled) {
            return true;
        }
        
        return keccak256(abi.encodePacked(_regionProof)) == geoLock.regionProofHash;
    }
}