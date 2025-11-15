import { ChainInfo } from '@keplr-wallet/types';

export const mainnetChain: ChainInfo = {
  chainId: 'cosmoshub-4',
  chainName: 'Cosmos Hub',
  rpc: 'https://rpc-cosmoshub.polkachu.com',
  rest: 'https://api-cosmoshub.polkachu.com',
  bip44: { coinType: 118 },
  bech32Config: {
    bech32PrefixAccAddr: 'cosmos',
    bech32PrefixAccPub: 'cosmospub',
    bech32PrefixValAddr: 'cosmosvaloper',
    bech32PrefixValPub: 'cosmosvaloperpub',
    bech32PrefixConsAddr: 'cosmosvalcons',
    bech32PrefixConsPub: 'cosmosvalconspub',
  },
  currencies: [{ coinDenom: 'ATOM', coinMinimalDenom: 'uatom', coinDecimals: 6 }],
  feeCurrencies: [{ 
    coinDenom: 'ATOM', 
    coinMinimalDenom: 'uatom', 
    coinDecimals: 6, 
    gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 } 
  }],
  stakeCurrency: { coinDenom: 'ATOM', coinMinimalDenom: 'uatom', coinDecimals: 6 },
  features: ['stargate', 'ibc-transfer'],
};

export const testnetChain: ChainInfo = {
  ...mainnetChain,
  chainId: 'theta-testnet-001',
  chainName: 'Cosmos Hub Testnet',
  rpc: 'https://rpc.sentry-01.theta-testnet.polypore.xyz',
  rest: 'https://rest.sentry-01.theta-testnet.polypore.xyz',
};
