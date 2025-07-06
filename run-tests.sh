#!/bin/bash

# Run Security Integration Tests
# This script runs the comprehensive security integration test suite

# Set colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Chronos Vault Security Integration Test Runner${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run the tests.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install npm to run the tests.${NC}"
    exit 1
fi

echo -e "\n${BLUE}Installing dependencies...${NC}"
npm install chalk ts-node mocha @types/mocha chai ethers

# Parse command line arguments
TEST_TYPE="all"
if [ $# -gt 0 ]; then
    TEST_TYPE=$1
fi

echo -e "\n${BLUE}Running tests: ${TEST_TYPE}${NC}"
echo -e "${YELLOW}This may take a few minutes. Please be patient.${NC}"

run_all_tests() {
    echo -e "\n${BLUE}Running all tests...${NC}"
    
    # Run blockchain-specific tests first
    run_ethereum_tests
    run_ton_tests
    run_solana_tests
    
    # Run integration tests
    run_integration_tests
    
    # Run security audit
    run_security_audit
}

run_ethereum_tests() {
    echo -e "\n${BLUE}Running Ethereum contract tests...${NC}"
    npx hardhat test tests/ethereum/ChronosVault.test.ts
    npx hardhat test tests/ethereum/MultiSignatureFeature.test.ts
}

run_ton_tests() {
    echo -e "\n${BLUE}Running TON contract tests...${NC}"
    npx mocha -r ts-node/register tests/ton/ChronosVault.test.ts
}

run_solana_tests() {
    echo -e "\n${BLUE}Running Solana program tests...${NC}"
    npx mocha -r ts-node/register tests/solana/chronos_vault.test.ts
}

run_integration_tests() {
    echo -e "\n${BLUE}Running integration tests...${NC}"
    npx mocha -r ts-node/register tests/integration/zk-proof-integration.test.ts
    npx mocha -r ts-node/register tests/integration/quantum-resistant-encryption.test.ts
    npx mocha -r ts-node/register tests/integration/cross-chain-bridge.test.ts
}

run_security_audit() {
    echo -e "\n${BLUE}Running security audit...${NC}"
    node scripts/security-audit.js
}

# Main execution based on test type
case $TEST_TYPE in
    "all")
        run_all_tests
        ;;
    "ethereum")
        run_ethereum_tests
        ;;
    "ton")
        run_ton_tests
        ;;
    "solana")
        run_solana_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "security")
        run_security_audit
        ;;
    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo -e "${YELLOW}Available options: all, ethereum, ton, solana, integration, security${NC}"
        exit 1
        ;;
esac

# Check if any command failed
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed successfully!${NC}"
    if [ "$TEST_TYPE" == "all" ]; then
        echo -e "${GREEN}The Triple-Chain Security architecture is fully integrated and operational.${NC}"
    fi
else
    echo -e "\n${RED}Some tests failed.${NC}"
    echo -e "${YELLOW}Please review the test output and address any issues.${NC}"
fi

echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}Test execution completed${NC}"
echo -e "${BLUE}================================================${NC}"

exit $EXIT_CODE