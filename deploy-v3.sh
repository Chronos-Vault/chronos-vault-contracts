#!/bin/bash

# Deploy Chronos Vault V3 to Arbitrum Sepolia
# V3 Features: Circuit Breakers, Emergency MultiSig, Enhanced Security

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Chronos Vault V3 Deployment (Arbitrum Sepolia)${NC}"
echo -e "${BLUE}================================================${NC}"

# Check required environment variables
check_env() {
  if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set${NC}"
    exit 1
  fi
  if [ -z "$ARBITRUM_RPC_URL" ]; then
    echo -e "${YELLOW}Warning: ARBITRUM_RPC_URL not set, using default${NC}"
    export ARBITRUM_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
  fi
}

check_env

echo -e "\n${BLUE}Network Configuration:${NC}"
echo -e "  Chain: Arbitrum Sepolia (421614)"
echo -e "  RPC: $ARBITRUM_RPC_URL"

# Deploy V3 contracts
echo -e "\n${BLUE}Deploying V3 contracts with circuit breakers...${NC}"
npx hardhat run scripts/deploy-v3-with-multisig.cjs --network arbitrumSepolia

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "\n${GREEN}V3 Deployment successful!${NC}"
  echo -e "${GREEN}Contract addresses saved to v3-deployment.json${NC}"
  
  echo -e "\n${BLUE}V3 Contract Addresses:${NC}"
  echo -e "  CrossChainBridgeV3: 0x39601883CD9A115Aba0228fe0620f468Dc710d54"
  echo -e "  CVTBridgeV3: 0x00d02550f2a8Fd2CeCa0d6b7882f05Beead1E5d0"
  echo -e "  EmergencyMultiSig: 0xFafCA23a7c085A842E827f53A853141C8243F924"
  
  echo -e "\n${BLUE}Verify on Arbiscan:${NC}"
  echo -e "  https://sepolia.arbiscan.io"
  
  echo -e "\n${BLUE}Next steps:${NC}"
  echo -e "  1. Verify contracts: npm run verify:arbitrum"
  echo -e "  2. Monitor circuit breakers: curl /api/bridge/circuit-breaker/status"
  echo -e "  3. Test Trinity Protocol: npm run test:trinity"
else
  echo -e "\n${RED}Deployment failed!${NC}"
  exit 1
fi

echo -e "\n${BLUE}================================================${NC}"
