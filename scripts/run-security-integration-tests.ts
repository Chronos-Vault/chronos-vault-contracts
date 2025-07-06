/**
 * Comprehensive Security Integration Test Runner
 * 
 * This script runs a comprehensive test suite for the security systems:
 * 1. Zero-Knowledge Proof System
 * 2. Quantum-Resistant Encryption
 * 3. Behavioral Analysis System
 * 
 * It provides detailed reporting on the test results and integration status.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as chalk from 'chalk';

// Define the test suites
const TEST_SUITES = [
  {
    name: 'Zero-Knowledge Proof System',
    path: 'tests/integration/zk-proof-integration.test.ts',
    description: 'Tests zero-knowledge proof generation, verification, and aggregation across chains'
  },
  {
    name: 'Quantum-Resistant Encryption',
    path: 'tests/integration/quantum-resistant-encryption.test.ts',
    description: 'Tests quantum-resistant encryption with progressive security tiers'
  },
  {
    name: 'Behavioral Analysis System',
    path: 'server/security/advanced-behavioral-analysis.ts',
    description: 'Tests behavioral analysis and anomaly detection for security threats',
    testCommand: 'npx mocha -r ts-node/register tests/security/behavioral-analysis.test.ts'
  }
];

// Test result interface
interface TestResult {
  name: string;
  passed: boolean;
  failureCount: number;
  duration: number;
  testCount: number;
  errorMessage?: string;
}

/**
 * Run a specific test suite
 */
async function runTestSuite(suite: typeof TEST_SUITES[0]): Promise<TestResult> {
  console.log(chalk.blue(`\n▶️ Running test suite: ${suite.name}`));
  console.log(chalk.gray(`   ${suite.description}`));

  const startTime = Date.now();
  let passed = false;
  let failureCount = 0;
  let testCount = 0;
  let errorMessage = '';

  try {
    // Check if file exists
    if (!fs.existsSync(suite.path)) {
      throw new Error(`Test file not found: ${suite.path}`);
    }

    // Use custom test command if provided, otherwise use default Mocha command
    const command = suite.testCommand || `npx mocha -r ts-node/register ${suite.path}`;
    
    // Run the test and capture output
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Parse the output to determine test results
    const passedMatch = output.match(/(\d+) passing/);
    const failedMatch = output.match(/(\d+) failing/);
    
    testCount = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    failureCount = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    passed = failureCount === 0 && testCount > 0;
    
    // Print the output
    console.log(output);
  } catch (error) {
    passed = false;
    failureCount = 1;
    errorMessage = error.message || 'Unknown error';
    console.error(chalk.red(`❌ Error running test suite: ${errorMessage}`));
    
    if (error.stdout) {
      console.log(error.stdout.toString());
    }
    
    if (error.stderr) {
      console.error(chalk.red(error.stderr.toString()));
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  
  // Print result summary
  if (passed) {
    console.log(chalk.green(`✅ ${suite.name} tests passed (${testCount} tests in ${duration.toFixed(2)}s)`));
  } else {
    console.log(chalk.red(`❌ ${suite.name} tests failed (${failureCount} failures)`));
  }
  
  return {
    name: suite.name,
    passed,
    failureCount,
    duration,
    testCount,
    errorMessage
  };
}

/**
 * Run all test suites
 */
async function runAllTests() {
  console.log(chalk.bold.blue('🔒 Running Comprehensive Security Integration Tests'));
  console.log(chalk.blue('=' .repeat(80)));
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  for (const suite of TEST_SUITES) {
    const result = await runTestSuite(suite);
    results.push(result);
  }
  
  const totalDuration = (Date.now() - startTime) / 1000;
  const totalTests = results.reduce((sum, r) => sum + r.testCount, 0);
  const totalFailures = results.reduce((sum, r) => sum + r.failureCount, 0);
  const allPassed = results.every(r => r.passed);
  
  // Print summary report
  console.log(chalk.blue('\n📊 Security Integration Test Summary'));
  console.log(chalk.blue('-'.repeat(80)));
  
  console.log(chalk.bold(`Total Duration: ${totalDuration.toFixed(2)}s`));
  console.log(chalk.bold(`Total Tests: ${totalTests}`));
  console.log(chalk.bold(`Total Failures: ${totalFailures}`));
  console.log(chalk.bold(`Overall Status: ${allPassed ? chalk.green('PASSED') : chalk.red('FAILED')}`));
  
  console.log(chalk.blue('\nIndividual Test Suite Results:'));
  results.forEach(result => {
    const statusIcon = result.passed ? chalk.green('✅') : chalk.red('❌');
    console.log(`${statusIcon} ${result.name}: ${result.testCount} tests, ${result.failureCount} failures`);
  });
  
  // Print integration status
  console.log(chalk.blue('\n🔗 Security Integration Status:'));
  
  // Zero-Knowledge Proof System status
  const zkStatus = results[0].passed;
  console.log(`${zkStatus ? chalk.green('✅') : chalk.red('❌')} Zero-Knowledge Proof System: ${zkStatus ? 'Fully operational' : 'Issues detected'}`);
  
  // Quantum-Resistant Encryption status
  const qreStatus = results[1].passed;
  console.log(`${qreStatus ? chalk.green('✅') : chalk.red('❌')} Quantum-Resistant Encryption: ${qreStatus ? 'Fully operational' : 'Issues detected'}`);
  
  // Behavioral Analysis System status
  const basStatus = results[2].passed;
  console.log(`${basStatus ? chalk.green('✅') : chalk.red('❌')} Behavioral Analysis System: ${basStatus ? 'Fully operational' : 'Issues detected'}`);
  
  // Overall integration status
  const integrationStatus = zkStatus && qreStatus && basStatus;
  console.log(chalk.bold(`\nTriple-Security Integration: ${integrationStatus ? chalk.green('FULLY INTEGRATED') : chalk.yellow('PARTIAL INTEGRATION')}`));
  
  if (!integrationStatus) {
    console.log(chalk.yellow('\n⚠️ Integration Issues Detected:'));
    if (!zkStatus) {
      console.log(chalk.yellow(' - Zero-Knowledge Proof System requires attention'));
    }
    if (!qreStatus) {
      console.log(chalk.yellow(' - Quantum-Resistant Encryption requires attention'));
    }
    if (!basStatus) {
      console.log(chalk.yellow(' - Behavioral Analysis System requires attention'));
    }
    
    console.log(chalk.yellow('\nRecommendation: Address the issues in the failed test suites to complete the integration.'));
  } else {
    console.log(chalk.green('\n🎉 All security systems are fully integrated and operational!'));
  }
  
  return allPassed;
}

// Run the tests
runAllTests()
  .then(passed => {
    if (!passed) {
      process.exit(1);
    }
  })
  .catch(err => {
    console.error(chalk.red(`Fatal error running tests: ${err.message}`));
    process.exit(1);
  });