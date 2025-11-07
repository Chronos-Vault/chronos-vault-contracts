"""
Trinity Protocol Custom Slither Detectors
Verifies Trinity-specific security properties
"""

from slither.detectors.abstract_detector import AbstractDetector, DetectorClassification


class TrinityConsensusDetector(AbstractDetector):
    """
    Detects if 2-of-3 consensus is properly enforced
    """
    
    ARGUMENT = 'trinity-consensus'
    HELP = 'Trinity 2-of-3 consensus not enforced'
    IMPACT = DetectorClassification.HIGH
    CONFIDENCE = DetectorClassification.HIGH

    WIKI = 'https://github.com/Chronos-Vault/trinity-protocol/wiki/Consensus-Verification'
    WIKI_TITLE = 'Trinity Consensus Enforcement'
    WIKI_DESCRIPTION = 'Operations must require 2 of 3 chain confirmations'
    WIKI_EXPLOIT_SCENARIO = 'Operation executes with less than 2 confirmations'
    WIKI_RECOMMENDATION = 'Ensure chainConfirmations >= 2 before execution'

    def _detect(self):
        results = []
        
        for contract in self.compilation_unit.contracts_derived:
            if contract.name == "TrinityConsensusVerifier":
                # Check _executeOperation function
                execute_func = contract.get_function_from_signature('_executeOperation(bytes32)')
                
                if execute_func:
                    # Verify consensus check exists
                    has_consensus_check = False
                    
                    for node in execute_func.nodes:
                        if 'chainConfirmations' in str(node) and '>=' in str(node) and '2' in str(node):
                            has_consensus_check = True
                            break
                    
                    if not has_consensus_check:
                        info = ['Trinity consensus check missing in ', execute_func, '\n']
                        res = self.generate_result(info)
                        results.append(res)
        
        return results


class ValidatorUniquenessDetector(AbstractDetector):
    """
    Detects if validator uniqueness is enforced
    """
    
    ARGUMENT = 'trinity-validator-uniqueness'
    HELP = 'Validator uniqueness not enforced'
    IMPACT = DetectorClassification.HIGH
    CONFIDENCE = DetectorClassification.HIGH

    WIKI = 'https://github.com/Chronos-Vault/trinity-protocol/wiki/Validator-Uniqueness'
    WIKI_TITLE = 'Validator Uniqueness'
    WIKI_DESCRIPTION = 'All 3 validators must have unique addresses'
    WIKI_EXPLOIT_SCENARIO = 'Single entity controls multiple validators'
    WIKI_RECOMMENDATION = 'Check validator uniqueness in constructor and rotation'

    def _detect(self):
        results = []
        
        for contract in self.compilation_unit.contracts_derived:
            if contract.name == "TrinityConsensusVerifier":
                # Check constructor
                constructor = contract.constructor
                
                if constructor:
                    has_uniqueness_check = False
                    
                    for node in constructor.nodes:
                        if '_validateUniqueValidators' in str(node):
                            has_uniqueness_check = True
                            break
                    
                    if not has_uniqueness_check:
                        info = ['Validator uniqueness check missing in constructor of ', contract, '\n']
                        res = self.generate_result(info)
                        results.append(res)
        
        return results


class FeeAccountingDetector(AbstractDetector):
    """
    Detects fee accounting issues
    """
    
    ARGUMENT = 'trinity-fee-accounting'
    HELP = 'Fee accounting may be incorrect'
    IMPACT = DetectorClassification.MEDIUM
    CONFIDENCE = DetectorClassification.MEDIUM

    WIKI = 'https://github.com/Chronos-Vault/trinity-protocol/wiki/Fee-Accounting'
    WIKI_TITLE = 'Fee Accounting'
    WIKI_DESCRIPTION = 'collectedFees must be properly tracked'
    WIKI_EXPLOIT_SCENARIO = 'Fee accounting desync leads to locked funds'
    WIKI_RECOMMENDATION = 'Track failedFeePortions separately'

    def _detect(self):
        results = []
        
        for contract in self.compilation_unit.contracts_derived:
            if contract.name == "TrinityConsensusVerifier":
                # Check if failedFeePortions mapping exists
                has_fee_portions = False
                
                for var in contract.state_variables:
                    if var.name == 'failedFeePortions':
                        has_fee_portions = True
                        break
                
                if not has_fee_portions:
                    info = ['Fee portions tracking missing in ', contract, '\n']
                    res = self.generate_result(info)
                    results.append(res)
        
        return results


class MerkleDepthDetector(AbstractDetector):
    """
    Detects if Merkle proof depth limit is enforced
    """
    
    ARGUMENT = 'trinity-merkle-depth'
    HELP = 'Merkle proof depth limit not enforced'
    IMPACT = DetectorClassification.LOW
    CONFIDENCE = DetectorClassification.HIGH

    WIKI = 'https://github.com/Chronos-Vault/trinity-protocol/wiki/Merkle-Depth'
    WIKI_TITLE = 'Merkle Proof Depth Limit'
    WIKI_DESCRIPTION = 'Merkle proofs must be limited to prevent gas griefing'
    WIKI_EXPLOIT_SCENARIO = 'Attacker submits massive merkle proof'
    WIKI_RECOMMENDATION = 'Limit proof depth to 32'

    def _detect(self):
        results = []
        
        for contract in self.compilation_unit.contracts_derived:
            if contract.name == "ProofValidation":
                # Check verifyMerkleProofWithNonce
                verify_func = contract.get_function_from_signature('verifyMerkleProofWithNonce(bytes32,bytes32[],bytes32,uint256)')
                
                if verify_func:
                    has_depth_check = False
                    
                    for node in verify_func.nodes:
                        if 'proof.length' in str(node) and '<=' in str(node) and '32' in str(node):
                            has_depth_check = True
                            break
                    
                    if not has_depth_check:
                        info = ['Merkle proof depth check missing in ', verify_func, '\n']
                        res = self.generate_result(info)
                        results.append(res)
        
        return results


class ExpiryEnforcementDetector(AbstractDetector):
    """
    Detects if operation expiry is enforced before execution
    """
    
    ARGUMENT = 'trinity-expiry'
    HELP = 'Operation expiry not enforced before execution'
    IMPACT = DetectorClassification.MEDIUM
    CONFIDENCE = DetectorClassification.HIGH

    WIKI = 'https://github.com/Chronos-Vault/trinity-protocol/wiki/Expiry'
    WIKI_TITLE = 'Operation Expiry'
    WIKI_DESCRIPTION = 'Expired operations must not execute'
    WIKI_EXPLOIT_SCENARIO = 'Late consensus allows expired operation'
    WIKI_RECOMMENDATION = 'Check expiry before state changes'

    def _detect(self):
        results = []
        
        for contract in self.compilation_unit.contracts_derived:
            if contract.name == "TrinityConsensusVerifier":
                execute_func = contract.get_function_from_signature('_executeOperation(bytes32)')
                
                if execute_func:
                    has_expiry_check = False
                    
                    for node in execute_func.nodes:
                        if 'expiresAt' in str(node) and 'revert' in str(node):
                            has_expiry_check = True
                            break
                    
                    if not has_expiry_check:
                        info = ['Expiry check missing in ', execute_func, '\n']
                        res = self.generate_result(info)
                        results.append(res)
        
        return results
