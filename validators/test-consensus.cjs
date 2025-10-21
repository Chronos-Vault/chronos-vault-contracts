/**
 * Chronos Vault - 2-of-3 Consensus Test
 * Creates cross-chain operations and validates Trinity Protocol consensus
 */

const hre = require('hardhat');

const BRIDGE_ADDRESS = '0xf24e41980ed48576Eb379D2116C1AaD075B342C4';
const TEST_AMOUNT = hre.ethers.parseEther("0.0001"); // 0.0001 ETH for testing
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

async function waitForConsensus(bridge, operationId, maxWait = 60000) {
  console.log(`\n⏳ Waiting for 2-of-3 consensus (max ${maxWait/1000}s)...`);
  
  const startTime = Date.now();
  let lastProofCount = 0n;
  
  while (Date.now() - startTime < maxWait) {
    const operation = await bridge.operations(operationId);
    
    if (operation.validProofCount !== lastProofCount) {
      lastProofCount = operation.validProofCount;
      console.log(`   Valid Proofs: ${operation.validProofCount}/2`);
      
      if (operation.validProofCount >= 2n) {
        console.log(`   ✅ 2-of-3 CONSENSUS REACHED!`);
        return true;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`   ❌ Consensus not reached within ${maxWait/1000}s`);
  return false;
}

async function createTestOperation(bridge, deployer, testNum) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`TEST ${testNum}: Create Cross-Chain Operation`);
  console.log('═'.repeat(60));
  
  console.log('\n📝 Creating operation:');
  console.log(`   Amount: ${hre.ethers.formatEther(TEST_AMOUNT)} ETH`);
  console.log(`   Destination: solana`);
  console.log(`   Security: Prioritized`);
  
  const tx = await bridge.createOperation(
    0, // OperationType.TRANSFER
    "solana",
    ETH_ADDRESS,
    TEST_AMOUNT,
    false, // prioritizeSpeed
    true,  // prioritizeSecurity
    100,   // 1% slippage
    { value: TEST_AMOUNT, gasLimit: 1000000 }
  );
  
  console.log(`\n📡 Transaction submitted: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ Confirmed! Gas used: ${receipt.gasUsed.toString()}`);
  
  // Get operation ID from event
  const operationEvent = receipt.logs.find(log => {
    try {
      const parsed = bridge.interface.parseLog(log);
      return parsed && parsed.name === 'OperationCreated';
    } catch {
      return false;
    }
  });
  
  if (operationEvent) {
    const parsed = bridge.interface.parseLog(operationEvent);
    const operationId = parsed.args.operationId;
    console.log(`\n🆔 Operation ID: ${operationId}`);
    
    const operation = await bridge.operations(operationId);
    console.log(`\n📊 Operation Details:`);
    console.log(`   Amount: ${hre.ethers.formatEther(operation.amount)} ETH`);
    console.log(`   Destination: ${operation.destinationChain}`);
    console.log(`   Valid Proofs: ${operation.validProofCount}/2`);
    console.log(`   Status: Waiting for validator proofs...`);
    
    return operationId;
  }
  
  throw new Error('Failed to get operation ID from event');
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Chronos Vault - Trinity Protocol Consensus Test     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log('🔐 Test Account:');
  console.log(`   Address: ${deployer.address}`);
  console.log(`   Balance: ${hre.ethers.formatEther(balance)} ETH\n`);
  
  if (balance < TEST_AMOUNT * 10n) {
    console.log('⚠️  Warning: Low balance for testing');
    console.log(`   Need at least ${hre.ethers.formatEther(TEST_AMOUNT * 10n)} ETH`);
    console.log('   Get testnet ETH from: https://sepoliafaucet.com/\n');
  }
  
  // Connect to bridge
  const bridge = await hre.ethers.getContractAt(
    'CrossChainBridgeOptimized',
    BRIDGE_ADDRESS,
    deployer
  );
  
  console.log('📍 Connected to CrossChainBridgeOptimized');
  console.log(`   Address: ${BRIDGE_ADDRESS}`);
  console.log(`   Network: Arbitrum Sepolia\n`);
  
  // Verify validators are running
  console.log('⚠️  IMPORTANT: Make sure validators are running!');
  console.log('   Run in another terminal: node validators/orchestrator.cjs\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 1: Single operation - 2-of-3 consensus
  const operationId1 = await createTestOperation(bridge, deployer, 1);
  const consensus1 = await waitForConsensus(bridge, operationId1, 30000);
  
  if (consensus1) {
    const operation1 = await bridge.operations(operationId1);
    console.log(`\n✅ TEST 1 PASSED - 2-of-3 Consensus Achieved`);
    console.log(`   Final Proof Count: ${operation1.validProofCount}/2`);
  } else {
    console.log(`\n❌ TEST 1 FAILED - Consensus timeout`);
    console.log(`   Make sure validators are running!`);
  }
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test 2: Second operation to verify repeatability
  const operationId2 = await createTestOperation(bridge, deployer, 2);
  const consensus2 = await waitForConsensus(bridge, operationId2, 30000);
  
  if (consensus2) {
    const operation2 = await bridge.operations(operationId2);
    console.log(`\n✅ TEST 2 PASSED - 2-of-3 Consensus Achieved`);
    console.log(`   Final Proof Count: ${operation2.validProofCount}/2`);
  } else {
    console.log(`\n❌ TEST 2 FAILED - Consensus timeout`);
  }
  
  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log('TRINITY PROTOCOL TEST SUMMARY');
  console.log('═'.repeat(60));
  
  console.log(`\n📊 Test Results:`);
  console.log(`   Test 1 (Operation ${operationId1}): ${consensus1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Test 2 (Operation ${operationId2}): ${consensus2 ? '✅ PASSED' : '❌ FAILED'}`);
  
  const successRate = ((consensus1 ? 1 : 0) + (consensus2 ? 1 : 0)) / 2 * 100;
  console.log(`\n   Success Rate: ${successRate}%`);
  
  if (successRate === 100) {
    console.log(`\n🎉 ALL TESTS PASSED!`);
    console.log(`   Trinity Protocol 2-of-3 consensus is working correctly.`);
    console.log(`   Cross-chain proofs are being submitted and verified.`);
  } else if (successRate > 0) {
    console.log(`\n⚠️  PARTIAL SUCCESS`);
    console.log(`   Some tests passed, check validator logs for details.`);
  } else {
    console.log(`\n❌ ALL TESTS FAILED`);
    console.log(`   Ensure validators are running: node validators/orchestrator.cjs`);
    console.log(`   Check validator logs for errors.`);
  }
  
  console.log(`\n📍 Contract: ${BRIDGE_ADDRESS}`);
  console.log(`   Explorer: https://sepolia.arbiscan.io/address/${BRIDGE_ADDRESS}`);
  console.log(`\n✅ Testing complete!\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
