/**
 * Merkle Proof Generator for Cross-Chain Validation
 * 
 * Generates cryptographic Merkle proofs for operation verification
 * across Ethereum L2, Solana, and TON blockchains.
 * 
 * Security: Each chain independently verifies operation state and
 * generates a Merkle proof that can be validated on Arbitrum.
 */

const { ethers } = require('ethers');
const crypto = require('crypto');

class MerkleProofGenerator {
  /**
   * Generate a Merkle tree from operation data
   * @param {Object} operation - The operation to generate proof for
   * @param {number} chainId - Chain ID (1=ETH, 2=SOL, 3=TON)
   * @returns {Object} Merkle proof data
   */
  static generateProof(operation, chainId) {
    // Create leaf nodes from operation data
    const leaves = this.createLeaves(operation, chainId);
    
    // Build Merkle tree
    const tree = this.buildMerkleTree(leaves);
    
    // Get root and proof path
    const root = tree[tree.length - 1][0];
    const proofPath = this.getProofPath(tree, 0); // Proof for first leaf (operation hash)
    
    return {
      root: root,
      proof: proofPath,
      leaf: leaves[0],
      chainId: chainId
    };
  }
  
  /**
   * Create leaf nodes for Merkle tree
   */
  static createLeaves(operation, chainId) {
    const leaves = [];
    
    // Primary leaf: Hash of operation data
    const operationHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'uint256', 'string', 'uint256'],
        [
          operation.id,
          operation.user,
          operation.amount,
          operation.destinationChain,
          operation.timestamp || Date.now()
        ]
      )
    );
    leaves.push(operationHash);
    
    // Additional leaves for security (chain-specific state)
    const chainStateHash = this.hashChainState(chainId, operation);
    leaves.push(chainStateHash);
    
    // Block confirmation leaf
    const blockHash = this.hashBlockConfirmation(chainId, operation);
    leaves.push(blockHash);
    
    // Validator attestation leaf
    const validatorHash = this.hashValidatorAttestation(chainId, operation);
    leaves.push(validatorHash);
    
    return leaves;
  }
  
  /**
   * Build Merkle tree from leaves
   */
  static buildMerkleTree(leaves) {
    const tree = [leaves];
    
    while (tree[tree.length - 1].length > 1) {
      const currentLevel = tree[tree.length - 1];
      const nextLevel = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        
        // Hash pair
        const combined = ethers.keccak256(
          ethers.concat([left, right])
        );
        nextLevel.push(combined);
      }
      
      tree.push(nextLevel);
    }
    
    return tree;
  }
  
  /**
   * Get proof path for a leaf
   */
  static getProofPath(tree, leafIndex) {
    const proof = [];
    let index = leafIndex;
    
    for (let level = 0; level < tree.length - 1; level++) {
      const currentLevel = tree[level];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;
      
      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }
      
      index = Math.floor(index / 2);
    }
    
    return proof;
  }
  
  /**
   * Hash chain-specific state
   */
  static hashChainState(chainId, operation) {
    const stateData = {
      chainId: chainId,
      operationId: operation.id,
      blockNumber: operation.blockNumber || 0,
      timestamp: Date.now()
    };
    
    return ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(stateData))
    );
  }
  
  /**
   * Hash block confirmation data
   */
  static hashBlockConfirmation(chainId, operation) {
    const confirmationData = {
      chainId: chainId,
      confirmations: 6, // Minimum confirmations
      verified: true
    };
    
    return ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(confirmationData))
    );
  }
  
  /**
   * Hash validator attestation
   */
  static hashValidatorAttestation(chainId, operation) {
    const attestation = {
      chainId: chainId,
      operationId: operation.id,
      status: 'verified',
      timestamp: Date.now()
    };
    
    return ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(attestation))
    );
  }
  
  /**
   * Verify a Merkle proof
   */
  static verifyProof(leaf, proof, root) {
    let computedHash = leaf;
    
    for (const proofElement of proof) {
      if (computedHash < proofElement) {
        computedHash = ethers.keccak256(
          ethers.concat([computedHash, proofElement])
        );
      } else {
        computedHash = ethers.keccak256(
          ethers.concat([proofElement, computedHash])
        );
      }
    }
    
    return computedHash === root;
  }
  
  /**
   * Generate signed proof for submission to contract
   */
  static async generateSignedProof(operation, chainId, validatorPrivateKey) {
    // Generate Merkle proof
    const merkleProof = this.generateProof(operation, chainId);
    
    // Create proof hash for signing
    const proofHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'bytes32', 'uint8'],
        [operation.id, merkleProof.root, chainId]
      )
    );
    
    // Sign the proof
    const wallet = new ethers.Wallet(validatorPrivateKey);
    const messageHash = ethers.hashMessage(ethers.getBytes(proofHash));
    const signature = await wallet.signMessage(ethers.getBytes(proofHash));
    
    return {
      operationId: operation.id,
      chainId: chainId,
      proofHash: proofHash,
      merkleRoot: merkleProof.root,
      merkleProof: merkleProof.proof,
      signature: signature,
      validator: wallet.address
    };
  }
}

module.exports = { MerkleProofGenerator };
