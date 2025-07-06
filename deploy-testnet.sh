#!/bin/bash

# Deploy Chronos Vault to Testnets
# This script handles the deployment of all smart contracts to their respective testnets

# Set colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Chronos Vault Testnet Deployment${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if required environment variables are set
check_required_env() {
  local missing=0
  for var in "$@"; do
    if [ -z "${!var}" ]; then
      echo -e "${RED}Missing required environment variable: ${var}${NC}"
      missing=1
    fi
  done
  
  if [ $missing -eq 1 ]; then
    echo -e "${YELLOW}\nPlease set all required environment variables before running this script.${NC}"
    echo -e "${YELLOW}See DEPLOYMENT_GUIDE.md for more information.${NC}"
    exit 1
  fi
}

# Required environment variables
check_required_env ETHEREUM_PRIVATE_KEY TON_API_KEY SOLANA_RPC_URL ETHEREUM_RPC_URL

# Install required dependencies
echo -e "\n${BLUE}Installing dependencies...${NC}"
npm install chalk ts-node ethers @ton-community/sandbox @solana/web3.js

# Run the deployment script
echo -e "\n${BLUE}Deploying smart contracts to testnets...${NC}"
npx tsx scripts/deploy-testnet.ts

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "\n${GREEN}Deployment completed successfully!${NC}"
  
  # Run cross-chain tests
  echo -e "\n${BLUE}Running cross-chain tests...${NC}"
  npx mocha -r ts-node/register tests/integration/cross-chain-bridge.test.ts
  
  TESTS_EXIT_CODE=$?
  
  if [ $TESTS_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}Cross-chain tests passed!${NC}"
    echo -e "${GREEN}The deployment is complete and verified.${NC}"
    echo -e "\n${BLUE}Next steps:${NC}"
    echo -e "1. Update the frontend configuration with the new contract addresses"
    echo -e "2. Deploy the frontend application"
    echo -e "3. Monitor the deployed contracts for any issues"
  else
    echo -e "\n${RED}Cross-chain tests failed.${NC}"
    echo -e "${YELLOW}Please check the test output and fix any issues.${NC}"
  fi
else
  echo -e "\n${RED}Deployment failed.${NC}"
  echo -e "${YELLOW}Please check the output above for errors.${NC}"
fi

echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}Deployment process completed${NC}"
echo -e "${BLUE}================================================${NC}"

exit $EXIT_CODE