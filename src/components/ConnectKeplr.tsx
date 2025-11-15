import { useKeplr } from '../wallet/useKeplr';

export const ConnectKeplr = () => {
  const network = (import.meta.env.VITE_NETWORK as 'testnet' | 'mainnet') || 'testnet';
  const { account, error } = useKeplr(network);

  if (error) return <button disabled>{error}</button>;
  if (!account) return <button onClick={() => window.open('https://www.keplr.app')}>Install Keplr</button>;

  return <div>Connected: {account.address.slice(0, 10)}…</div>;
};
