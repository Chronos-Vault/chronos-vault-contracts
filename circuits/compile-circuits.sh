#!/bin/bash
# Circuit Compilation Script for Chronos Vault Mathematical Defense Layer
# Compiles Circom circuits and generates proving/verification keys

set -e

echo "🔧 Compiling Chronos Vault Zero-Knowledge Circuits..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create build directory
mkdir -p contracts/circuits/build
cd contracts/circuits

# Circuit 1: Vault Ownership Verifier
echo -e "${BLUE}📋 Compiling vault_ownership.circom...${NC}"
npx circom vault_ownership.circom --r1cs --wasm --sym -o build/

# Circuit 2: Multi-Signature Verifier  
echo -e "${BLUE}📋 Compiling multisig_verification.circom...${NC}"
npx circom multisig_verification.circom --r1cs --wasm --sym -o build/

echo ""
echo -e "${GREEN}✅ Circuit compilation complete!${NC}"
echo ""

# Generate trusted setup (Powers of Tau ceremony simulation)
echo -e "${BLUE}🔐 Generating trusted setup (Powers of Tau)...${NC}"

cd build

# Download or generate Powers of Tau file
if [ ! -f "pot12_final.ptau" ]; then
  echo "Downloading Powers of Tau (12)..."
  curl -O https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
  mv powersOfTau28_hez_final_12.ptau pot12_final.ptau
fi

# Generate zkey for vault_ownership
if [ -f "vault_ownership.r1cs" ]; then
  echo -e "${BLUE}Generating proving key for vault_ownership...${NC}"
  npx snarkjs groth16 setup vault_ownership.r1cs pot12_final.ptau vault_ownership_0000.zkey
  
  # Contribute to ceremony (simulation)
  echo "test-random-entropy" | npx snarkjs zkey contribute vault_ownership_0000.zkey vault_ownership_final.zkey --name="Chronos Vault" -v
  
  # Export verification key
  npx snarkjs zkey export verificationkey vault_ownership_final.zkey vault_ownership_verification_key.json
  
  echo -e "${GREEN}✅ vault_ownership proving key generated${NC}"
fi

# Generate zkey for multisig_verification
if [ -f "multisig_verification.r1cs" ]; then
  echo -e "${BLUE}Generating proving key for multisig_verification...${NC}"
  npx snarkjs groth16 setup multisig_verification.r1cs pot12_final.ptau multisig_verification_0000.zkey
  
  # Contribute to ceremony (simulation)
  echo "test-random-entropy" | npx snarkjs zkey contribute multisig_verification_0000.zkey multisig_verification_final.zkey --name="Chronos Vault" -v
  
  # Export verification key
  npx snarkjs zkey export verificationkey multisig_verification_final.zkey multisig_verification_verification_key.json
  
  echo -e "${GREEN}✅ multisig_verification proving key generated${NC}"
fi

cd ../..

echo ""
echo -e "${GREEN}🎉 Zero-Knowledge Proof System Ready!${NC}"
echo ""
echo "Generated files:"
echo "  📁 contracts/circuits/build/vault_ownership_final.zkey"
echo "  📁 contracts/circuits/build/vault_ownership_verification_key.json"
echo "  📁 contracts/circuits/build/multisig_verification_final.zkey"
echo "  📁 contracts/circuits/build/multisig_verification_verification_key.json"
echo ""
echo "✨ Mathematical proof generation enabled!"
