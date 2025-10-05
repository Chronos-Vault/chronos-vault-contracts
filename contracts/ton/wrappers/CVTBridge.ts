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

export type BridgeConfig = {
  admin: Address;
  ethConfirmations: number;
  solConfirmations: number;
};

export class CVTBridge implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromConfig(config: BridgeConfig, code: Cell): CVTBridge {
    const data = beginCell()
      .storeDict(null) // ethereum_relayers
      .storeDict(null) // solana_relayers
      .storeUint(0, 8) // eth_relayer_count
      .storeUint(0, 8) // sol_relayer_count
      .storeUint(config.ethConfirmations, 8)
      .storeUint(config.solConfirmations, 8)
      .storeAddress(config.admin)
      .storeDict(null) // verified_vaults
      .storeDict(null) // last_relay
      .storeUint(1, 1) // bridge_active
      .endCell();

    const init = { code, data };
    const address = contractAddress(0, init);
    return new CVTBridge(address, init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async getBridgeInfo(provider: ContractProvider) {
    const result = await provider.get('get_bridge_info', []);
    return {
      ethRelayers: result.stack.readNumber(),
      solRelayers: result.stack.readNumber(),
      ethConfirmations: result.stack.readNumber(),
      solConfirmations: result.stack.readNumber(),
      isActive: result.stack.readBoolean(),
    };
  }
}
