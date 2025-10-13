# Chronos Vault Smart Contracts

Smart contract implementations for Chronos Vault across multiple blockchains.

## Networks

### Arbitrum Sepolia (Live)
- **CVT Token**: `0xFb419D8E32c14F774279a4dEEf330dc893257147`
- **CVT Bridge**: `0x21De95EbA01E31173Efe1b9c4D57E58bb840bA86`
- **ChronosVault**: `0x99444B0B1d6F7b21e9234229a2AC2bC0150B9d91`
- **CrossChainBridge**: `0x13dc7df46c2e87E8B2010A28F13404580158Ed9A`

### TON Testnet (Live)
- **ChronosVault**: `EQDJAnXDPT-NivritpEhQeP0XmG20NdeUtxgh4nUiWH-DF7M`
- **CVT Bridge**: `EQAOJxa1WDjGZ7f3n53JILojhZoDdTOKWl6h41_yOWX3v0tq`

### Solana (Code Ready)
See `contracts/solana/` for implementation details.

## Development

### Ethereum/Arbitrum
```bash
cd contracts/ethereum
npm install
npx hardhat test
```

### Solana
```bash
cd contracts/solana
anchor build
anchor test
```

### TON
```bash
cd contracts/ton
npm install
npm test
```

## Contact

- Website: https://chronosvault.org
- Email: chronosvault@chronosvault.org

## License

MIT
