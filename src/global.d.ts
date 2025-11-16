import { Keplr, KeplrSignOptions } from '@keplr-wallet/types';
import { OfflineAminoSigner, OfflineDirectSigner } from '@keplr-wallet/types';
import { SecretUtils } from '@keplr-wallet/types';

declare global {
  interface Window {
    keplr?: Keplr;
    getOfflineSigner?: (chainId: string, signOptions?: KeplrSignOptions) => OfflineAminoSigner & OfflineDirectSigner;
    getOfflineSignerOnlyAmino?: (chainId: string, signOptions?: KeplrSignOptions) => OfflineAminoSigner;
    getOfflineSignerAuto?: (chainId: string, signOptions?: KeplrSignOptions) => Promise<OfflineAminoSigner | OfflineDirectSigner>;
    getEnigmaUtils?: (chainId: string) => SecretUtils;
  }
}

export {};
