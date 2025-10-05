import { 
  Address, 
  beginCell, 
  Cell, 
  Contract, 
  contractAddress, 
  ContractProvider, 
  Sender, 
  SendMode, 
  toNano 
} from '@ton/core';

// Define contract interface types
export type VaultConfig = {
  owner: Cell;
  unlockTime: number;
  securityLevel: number;
  isUnlocked: boolean;
};

export type MetadataConfig = {
  name: string;
  description: string;
  contentUri: string;
  isPublic: boolean;
};

export type WithdrawParams = {
  amount: bigint;
  destination: Address;
};

export type ExternalAddressParams = {
  chain: string;
  address: string;
};

export type ExternalProofParams = {
  chain: string;
  proof: Cell;
  signature: Cell;
};

/**
 * ChronosVault wrapper class for the TON contract
 */
export class ChronosVault implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromConfig(config: VaultConfig) {
    // Create the data cell using config parameters
    const data = beginCell()
      .storeRef(config.owner)
      .storeUint(config.unlockTime, 32)
      .storeUint(config.securityLevel, 8)
      .storeBit(config.isUnlocked)
      .endCell();

    // For this mock wrapper, we're using a placeholder for code
    // In a real implementation, this would load the compiled contract code
    const code = Cell.fromBoc(Buffer.from('te6ccgEBAQEAVAAAQ2j/APSkICLAAZL0ABmMwf4Qm4v/kAEQUdpUYAAAABB8BG9s3UDgL+vAnHmzVQCBnOYZ7CnYJiXOWY2zrHM8RbSjGCFsA2UIhZMeXbNgXz5pGDQDwA==', 'base64'))[0];

    const init = { code, data };
    const address = contractAddress(0, init);
    return new ChronosVault(address, init);
  }

  // Contract interaction methods

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendDeposit(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x12345678, 32) // Op code for deposit
        .endCell(),
    });
  }

  async sendWithdraw(provider: ContractProvider, via: Sender, params: WithdrawParams) {
    await provider.internal(via, {
      value: toNano('0.05'), // Fee for operation
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x87654321, 32) // Op code for withdraw
        .storeCoins(params.amount)
        .storeAddress(params.destination)
        .endCell(),
    });
  }

  async sendUpdateLockStatus(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: toNano('0.01'), // Fee for operation
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x11223344, 32) // Op code for updating lock status
        .endCell(),
    });
  }

  async sendAddExternalAddress(provider: ContractProvider, via: Sender, params: ExternalAddressParams) {
    await provider.internal(via, {
      value: toNano('0.05'), // Fee for operation
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x33445566, 32) // Op code for adding external address
        .storeStringRefTail(params.chain)
        .storeStringRefTail(params.address)
        .endCell(),
    });
  }

  async sendVerifyExternalProof(provider: ContractProvider, via: Sender, params: ExternalProofParams) {
    await provider.internal(via, {
      value: toNano('0.05'), // Fee for operation
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x77889900, 32) // Op code for verify external proof
        .storeStringRefTail(params.chain)
        .storeRef(params.proof)
        .storeRef(params.signature)
        .endCell(),
    });
  }

  async sendSetMetadata(provider: ContractProvider, via: Sender, metadata: MetadataConfig) {
    await provider.internal(via, {
      value: toNano('0.05'), // Fee for operation
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0xaabbccdd, 32) // Op code for setting metadata
        .storeStringRefTail(metadata.name)
        .storeStringRefTail(metadata.description)
        .storeStringRefTail(metadata.contentUri)
        .storeBit(metadata.isPublic)
        .endCell(),
    });
  }

  // Contract get methods

  async getVaultState(provider: ContractProvider) {
    const result = await provider.get('get_vault_state', []);
    return {
      unlockTime: result.stack.readNumber(),
      securityLevel: result.stack.readNumber(),
      isUnlocked: result.stack.readBoolean(),
    };
  }

  async getOwner(provider: ContractProvider) {
    const result = await provider.get('get_owner', []);
    return result.stack.readAddress();
  }

  async getExternalAddresses(provider: ContractProvider) {
    const result = await provider.get('get_external_addresses', []);
    const count = result.stack.readNumber();
    
    const addresses: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      const chain = result.stack.readString();
      const address = result.stack.readString();
      addresses[chain] = address;
    }
    
    return addresses;
  }

  async getMetadata(provider: ContractProvider) {
    const result = await provider.get('get_metadata', []);
    return {
      name: result.stack.readString(),
      description: result.stack.readString(),
      contentUri: result.stack.readString(),
      isPublic: result.stack.readBoolean(),
    };
  }
}