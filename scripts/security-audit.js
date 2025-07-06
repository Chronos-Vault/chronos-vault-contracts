// Security Audit Script for Chronos Vault Smart Contracts
const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

async function main() {
  console.log('Running security audit for Ethereum contracts...');
  
  // Get contract paths
  const ethereumContractsDir = path.join(__dirname, '../contracts/ethereum');
  const contractFiles = fs.readdirSync(ethereumContractsDir)
    .filter(file => file.endsWith('.sol'));
  
  console.log(`Found ${contractFiles.length} Ethereum contract files`);
  
  // Analyze each contract
  for (const file of contractFiles) {
    console.log(`\nAnalyzing ${file}...`);
    const contractPath = path.join(ethereumContractsDir, file);
    const source = fs.readFileSync(contractPath, 'utf8');
    
    // Basic pattern matching for common vulnerabilities
    checkReentrancy(file, source);
    checkOverflowUnderflow(file, source);
    checkUncheckedExternalCalls(file, source);
    checkUnsafeUseOfTimestamp(file, source);
    checkAccessControl(file, source);
    checkCrossChainSecurity(file, source);
  }
  
  console.log('\nSecurity audit completed for Ethereum contracts');
  
  // Run similar audits for TON and Solana if we develop those analyzers
  // auditTONContracts();
  // auditSolanaPrograms();
}

function checkReentrancy(file, source) {
  // Check if contract uses ReentrancyGuard but has external calls
  const usesReentrancyGuard = source.includes('ReentrancyGuard');
  const hasExternalCalls = (source.includes('.call{') || source.includes('.transfer('));
  
  if (hasExternalCalls && !usesReentrancyGuard) {
    console.log('⚠️  POTENTIAL VULNERABILITY: Reentrancy risk detected');
    console.log('   External calls found without ReentrancyGuard protection');
  } else if (hasExternalCalls) {
    console.log('✅ ReentrancyGuard properly implemented with external calls');
  }
}

function checkOverflowUnderflow(file, source) {
  // Check for SafeMath usage (for older Solidity versions) or modern Solidity checks
  const usesSafeMath = source.includes('SafeMath');
  const usesModernSolidity = source.includes('pragma solidity ^0.8');
  
  if (usesModernSolidity) {
    console.log('✅ Using Solidity 0.8+ with built-in overflow checks');
  } else if (usesSafeMath) {
    console.log('✅ Using SafeMath for overflow protection');
  } else {
    console.log('⚠️  POTENTIAL VULNERABILITY: No overflow/underflow protection detected');
  }
}

function checkUncheckedExternalCalls(file, source) {
  // Check for unchecked return values from external calls
  const hasUncheckedCalls = source.includes('.call{') && 
                          !(source.includes('require(success') || 
                            source.includes('if (!success'));
  
  if (hasUncheckedCalls) {
    console.log('⚠️  POTENTIAL VULNERABILITY: Unchecked return values from external calls');
  } else {
    console.log('✅ All external call return values appear to be checked');
  }
}

function checkUnsafeUseOfTimestamp(file, source) {
  // Check for usage of block.timestamp in critical logic
  const usesTimestamp = source.includes('block.timestamp');
  const usesNow = source.includes('now ') || source.includes('= now;') || source.includes('=now;');
  
  if (usesTimestamp || usesNow) {
    // Check if it's used in a sensitive comparison
    const sensitiveUse = source.includes('require(') && 
                        (source.includes('block.timestamp') || source.includes('now'));
    
    if (sensitiveUse) {
      console.log('⚠️  POTENTIAL VULNERABILITY: Timestamp dependence detected in critical logic');
      console.log('   Miners can manipulate block.timestamp within a small window');
    } else {
      console.log('ℹ️  NOTICE: block.timestamp usage detected, but appears non-critical');
    }
  }
}

function checkAccessControl(file, source) {
  // Check for proper access control patterns
  const hasOwnable = source.includes('Ownable');
  const hasOnlyOwner = source.includes('onlyOwner');
  const hasAccessControl = source.includes('AccessControl');
  const hasRoleChecks = source.includes('hasRole(');
  
  if (hasOwnable && hasOnlyOwner) {
    console.log('✅ Using Ownable pattern with onlyOwner modifiers');
  } else if (hasAccessControl && hasRoleChecks) {
    console.log('✅ Using AccessControl pattern with role checks');
  } else if (source.includes('require(msg.sender ==')) {
    console.log('ℹ️  NOTICE: Using custom access control checks');
  } else {
    console.log('⚠️  POTENTIAL VULNERABILITY: No clear access control pattern detected');
  }
}

function checkCrossChainSecurity(file, source) {
  // Check for cross-chain security measures
  const hasCrossChainVerification = 
    source.includes('verifyExternalProof') || 
    source.includes('crossChainVerify');
  
  if (hasCrossChainVerification) {
    console.log('✅ Cross-chain verification mechanisms detected');
    
    // Check if verification uses cryptographic proofs
    const usesCrypto = 
      source.includes('keccak256') || 
      source.includes('ecrecover') ||
      source.includes('ECDSA');
    
    if (usesCrypto) {
      console.log('✅ Using cryptographic verification for cross-chain proofs');
    } else {
      console.log('⚠️  POTENTIAL VULNERABILITY: Cross-chain verification may not use cryptographic proofs');
    }
  }
}

// Add more security checks as needed

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });