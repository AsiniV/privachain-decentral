import { useKeplr } from '../wallet/useKeplr';
import { sendWithSponsor } from '../blockchain/tx-sender';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export function KeplrDemo() {
  const network = (import.meta.env.VITE_NETWORK as 'testnet' | 'mainnet') || 'testnet';
  const { account, client, error } = useKeplr(network);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('1');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!account || !client) return;
    if (!recipient.trim()) {
      toast.error('Please enter a recipient address');
      return;
    }

    setSending(true);
    try {
      const res = await sendWithSponsor(
        client,
        account.address,
        recipient,
        [{ denom: 'uatom', amount: (parseFloat(amount) * 1_000_000).toString() }]
      );
      toast.success(`Transaction sent! Hash: ${res.txhash}`);
      setRecipient('');
      setAmount('1');
    } catch (e: unknown) { 
      const message = e instanceof Error ? e.message : 'Transaction failed';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keplr Wallet</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.open('https://www.keplr.app')} variant="outline">
            Install Keplr Extension
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keplr Wallet</CardTitle>
          <CardDescription>Connect your Keplr wallet to send transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Connecting to Keplr...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keplr Wallet - Gasless Transactions</CardTitle>
        <CardDescription>
          Connected: {account.address.slice(0, 10)}...{account.address.slice(-6)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            placeholder="cosmos1..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={sending}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (ATOM)</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={sending}
          />
        </div>

        <Button 
          onClick={handleSend} 
          disabled={sending || !recipient.trim()}
          className="w-full"
        >
          {sending ? 'Sending...' : 'Send ATOM (Gasless)'}
        </Button>

        <p className="text-xs text-muted-foreground">
          🎉 Gas fees are sponsored by the developer wallet!
        </p>
      </CardContent>
    </Card>
  );
}
