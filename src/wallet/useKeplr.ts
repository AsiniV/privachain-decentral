import { useState, useEffect } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { GasPrice } from '@cosmjs/stargate';
import { mainnetChain, testnetChain } from '../blockchain/chains';

export interface Account {
  address: string;
  pubkey: Uint8Array;
}

export function useKeplr(net: 'mainnet' | 'testnet' = 'testnet') {
  const [account, setAccount] = useState<Account | null>(null);
  const [client, setClient] = useState<SigningStargateClient | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!window.keplr) { 
      setError('Keplr not found'); 
      return; 
    }
    
    (async () => {
      try {
        const keplr = window.keplr;
        if (!keplr) {
          setError('Keplr not found');
          return;
        }
        
        const chainInfo = net === 'testnet' ? testnetChain : mainnetChain;
        await keplr.experimentalSuggestChain(chainInfo);
        await keplr.enable(chainInfo.chainId);

        const offlineSigner = keplr.getOfflineSigner(chainInfo.chainId);
        const stargate = await SigningStargateClient.connectWithSigner(
          chainInfo.rpc,
          offlineSigner,
          { gasPrice: GasPrice.fromString('0.025uatom') }
        );
        setClient(stargate);

        const acc = await offlineSigner.getAccounts();
        setAccount({ address: acc[0].address, pubkey: acc[0].pubkey });
      } catch (e: unknown) { 
        setError(e instanceof Error ? e.message : 'Unknown error'); 
      }
    })();
  }, [net]);

  return { account, client, error };
}
