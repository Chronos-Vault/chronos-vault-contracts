// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:36.873Z
import { 
  Address, 
  beginCell, 
  Cell, 
  Contract, 
  contractAddress, 
  ContractProvider, 
  Sender, 
  SendMode,
  toNano,
  Slice
} from '@ton/core';

export type TrinityConsensusConfig = {
  ethereumBridgeAddress: string;
  validatorEthereumAddress: string;
  arbitrumRpcUrl: string;
  authority: Address;
  mlKemPublicKey: bigint;
  dilithiumPublicKey: bigint;
};

export type ValidatorConfig = {
  ethereumBridgeAddress: bigint;
  validatorEthereumAddress: bigint;
  arbitrumRpcUrl: string;
  authority: Address;
  totalProofsSubmitted: number;
  lastProcessedOperation: number;
  isActive: boolean;
};

export type ProofSubmission = {
  operationId: bigint;
  merkleProof: Cell;
  tonBlockHash: bigint;
  tonTxHash: bigint;
  tonBlockNumber: bigint;
};

export class TrinityConsensus implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static async fromInit(data: Cell): Promise<TrinityConsensus> {
    // Load compiled code
    const code = Cell.fromBoc(Buffer.from('te6ccgEBAQEAVAAAQ2j/APSkICLAAZL0ABmMwf4Qm4v/kAEQUdpUYAAAABB8BG9s3UDgL+vAnHmzVQCBnOYZ7CnYJiXOWY2zrHM8RbSjGCFsA2UIhZMeXbNgXz5pGDQDwA==', 'base64'))[0];
    const init = { code, data };
    const address = contractAddress(0, init);
    return new TrinityConsensus(address, init);
  }

  static createFromConfig(config: TrinityConsensusConfig, code: Cell): TrinityConsensus {
    // Convert Ethereum addresses from hex to bits
    const ethereumBridgeBits = beginCell()
      .storeBuffer(Buffer.from(config.ethereumBridgeAddress.replace("0x", ""), "hex"))
      .endCell()
      .beginParse()
      .loadBits(160);

    const validatorEthBits = beginCell()
      .storeBuffer(Buffer.from(config.validatorEthereumAddress.replace("0x", ""), "hex"))
      .endCell()
      .beginParse()
      .loadBits(160);

    // Encode Arbitrum RPC URL
    const arbitrumRpcCell = beginCell()
      .storeStringTail(config.arbitrumRpcUrl)
      .endCell();

    const data = beginCell()
      .storeBits(ethereumBridgeBits)
      .storeBits(validatorEthBits)
      .storeRef(arbitrumRpcCell)
      .storeAddress(config.authority)
      .storeUint(0, 64)  // total_proofs_submitted
      .storeUint(0, 64)  // last_processed_operation
      .storeUint(1, 1)   // is_active
      .storeDict(null)   // proof_records
      .storeDict(null)   // vault_verifications
      .storeUint(config.mlKemPublicKey, 256)
      .storeUint(config.dilithiumPublicKey, 256)
      .endCell();

    const init = { code, data };
    const address = contractAddress(0, init);
    return new TrinityConsensus(address, init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendInitialize(
    provider: ContractProvider, 
    via: Sender,
    ethBridge: string,
    validatorEth: string,
    arbitrumRpc: string,
    mlKem: bigint,
    dilithium: bigint
  ) {
    const ethereumBridgeBits = beginCell()
      .storeBuffer(Buffer.from(ethBridge.replace("0x", ""), "hex"))
      .endCell()
      .beginParse()
      .loadBits(160);

    const validatorEthBits = beginCell()
      .storeBuffer(Buffer.from(validatorEth.replace("0x", ""), "hex"))
      .endCell()
      .beginParse()
      .loadBits(160);

    const rpcCell = beginCell().storeStringTail(arbitrumRpc).endCell();

    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x01, 32)  // op: initialize
        .storeBits(ethereumBridgeBits)
        .storeBits(validatorEthBits)
        .storeRef(rpcCell)
        .storeUint(mlKem, 256)
        .storeUint(dilithium, 256)
        .endCell(),
    });
  }

  async sendSubmitProof(
    provider: ContractProvider,
    via: Sender,
    params: ProofSubmission
  ) {
    await provider.internal(via, {
      value: toNano('0.1'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x02, 32)  // op: submit_consensus_proof
        .storeUint(params.operationId, 256)
        .storeRef(params.merkleProof)
        .storeUint(params.tonBlockHash, 256)
        .storeUint(params.tonTxHash, 256)
        .storeUint(params.tonBlockNumber, 64)
        .endCell(),
    });
  }

  async sendConfirmEthereumSubmission(
    provider: ContractProvider,
    via: Sender,
    operationId: bigint,
    ethereumTxHash: bigint
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x03, 32)  // op: confirm_ethereum_submission
        .storeUint(operationId, 256)
        .storeUint(ethereumTxHash, 256)
        .endCell(),
    });
  }

  async sendVerifyVaultOperation(
    provider: ContractProvider,
    via: Sender,
    vaultId: bigint,
    operationType: number,
    amount: bigint,
    userAddress: Address
  ) {
    await provider.internal(via, {
      value: toNano('0.1'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x04, 32)  // op: verify_vault_operation
        .storeUint(vaultId, 64)
        .storeUint(operationType, 8)
        .storeUint(amount, 64)
        .storeAddress(userAddress)
        .endCell(),
    });
  }

  async sendUpdateValidator(
    provider: ContractProvider,
    via: Sender,
    newRpc?: string,
    newBridge?: string,
    isActive?: boolean
  ) {
    const rpcCell = newRpc ? beginCell().storeStringTail(newRpc).endCell() : beginCell().endCell();
    const bridgeBits = newBridge 
      ? beginCell().storeBuffer(Buffer.from(newBridge.replace("0x", ""), "hex")).endCell().beginParse().loadBits(160)
      : beginCell().storeBit(0).endCell().beginParse().loadBits(160);

    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x05, 32)  // op: update_validator
        .storeRef(rpcCell)
        .storeBits(bridgeBits)
        .storeUint(isActive !== undefined ? (isActive ? 1 : 0) : 1, 1)
        .endCell(),
    });
  }

  async getValidatorConfig(provider: ContractProvider): Promise<any> {
    const result = await provider.get('get_validator_config', []);
    return {
      ethereumBridgeAddress: result.stack.readBigNumber(),
      validatorEthereumAddress: result.stack.readBigNumber(),
      arbitrumRpcUrl: result.stack.readCell(),
      totalProofsSubmitted: result.stack.readNumber(),
      lastProcessedOperation: result.stack.readNumber(),
      isActive: result.stack.readBoolean(),
    };
  }

  async getProofRecord(provider: ContractProvider, operationId: bigint): Promise<any> {
    const result = await provider.get('get_proof_record', [
      { type: 'int', value: operationId }
    ]);
    return {
      operationId: result.stack.readBigNumber(),
      merkleRoot: result.stack.readBigNumber(),
      merkleProof: result.stack.readCell(),
      tonBlockHash: result.stack.readBigNumber(),
      tonTxHash: result.stack.readBigNumber(),
      tonBlockNumber: result.stack.readBigNumber(),
      timestamp: result.stack.readBigNumber(),
      submitted: result.stack.readBoolean(),
      ethereumTxHash: result.stack.readBigNumber(),
    };
  }

  async getTotalProofs(provider: ContractProvider): Promise<number> {
    const result = await provider.get('get_total_proofs', []);
    return result.stack.readNumber();
  }

  async getIsActive(provider: ContractProvider): Promise<boolean> {
    const result = await provider.get('get_is_active', []);
    return result.stack.readBoolean();
  }

  async getQuantumKeys(provider: ContractProvider): Promise<{ mlKem: bigint; dilithium: bigint }> {
    const result = await provider.get('get_quantum_keys', []);
    return {
      mlKem: result.stack.readBigNumber(),
      dilithium: result.stack.readBigNumber(),
    };
  }
}
