# Keplr Integration Guide for PrivaChain

This guide explains how to use the new Keplr wallet integration in PrivaChain, which replaces hard-coded mnemonics with true user-owned keys while maintaining gas sponsorship by the backend.

## What Changed

### Before (Old Flow)
- `RELAYER_MNEMONIC` lived in `.env` → server saw private key
- Frontend called `axios.post('/api/relay')` → server paid gas
- User couldn't pick the chain
- Private keys were exposed to frontend code

### After (New Flow)
- Only the user's public address is shared; signing happens inside the browser
- Frontend signs the tx with CosmJS + Keplr, server re-broadcasts with fee
- "Connect Keplr" button → choose cosmoshub-4 or theta-testnet-001
- Private keys never leave the browser

## Quick Start

### 1. Install Required Packages

Already included in the project:
```json
{
  "@keplr-wallet/types": "latest",
  "@cosmjs/stargate": "^0.36.0",
  "@cosmjs/proto-signing": "^0.36.0",
  "long": "latest"
}
```

### 2. Environment Configuration

Add these variables to your `.env` file:

```bash
# Network selection
VITE_NETWORK="testnet"  # or "mainnet"

# Gas sponsorship server
VITE_SPONSOR_RPC="http://localhost:3000"
SPONSOR_PORT="3000"

# Developer mnemonic (backend only - never exposed to frontend)
DEVELOPER_MNEMONIC="your 24-word mnemonic here"
```

### 3. Start the Services

```bash
# Option 1: Run both frontend and backend together
npm run dev:all

# Option 2: Run separately
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Gas Sponsorship Server
npm run sponsor
```

## Using Keplr in Your Components

### Basic Connection

```tsx
import { useKeplr } from '@/wallet/useKeplr';

export function MyComponent() {
  const { account, client, error } = useKeplr('testnet');
  
  if (error) return <div>Error: {error}</div>;
  if (!account) return <div>Connecting to Keplr...</div>;
  
  return <div>Connected: {account.address}</div>;
}
```

### Sending Transactions (Gasless)

```tsx
import { useKeplr } from '@/wallet/useKeplr';
import { sendWithSponsor } from '@/blockchain/tx-sender';
import { toast } from 'sonner';

export function SendButton() {
  const { account, client } = useKeplr('testnet');
  
  const handleSend = async () => {
    if (!account || !client) return;
    
    try {
      const result = await sendWithSponsor(
        client,
        account.address,
        'cosmos1recipient...',
        [{ denom: 'uatom', amount: '1000000' }] // 1 ATOM
      );
      
      toast.success(`Transaction sent! Hash: ${result.txhash}`);
    } catch (error) {
      toast.error(`Transaction failed: ${error.message}`);
    }
  };
  
  return <button onClick={handleSend}>Send 1 ATOM (Gasless)</button>;
}
```

### Complete Demo Component

See `src/components/KeplrDemo.tsx` for a full working example with:
- Connection status
- Balance display
- Transaction sending
- Error handling
- Loading states

## Architecture

### Client-Side Flow

1. User clicks "Connect Keplr"
2. `useKeplr` hook:
   - Checks for Keplr extension
   - Suggests chain configuration
   - Requests account access
   - Returns account and signing client
3. User initiates transaction
4. `sendWithSponsor`:
   - Signs transaction with ZERO fees
   - Sends to backend sponsor endpoint
5. Backend adds gas fees and broadcasts

### Server-Side Flow

1. Receives user's zero-fee signed transaction
2. Decodes transaction
3. Connects with developer wallet (from `DEVELOPER_MNEMONIC`)
4. Adds gas fees from developer wallet
5. Broadcasts transaction to chain
6. Returns transaction hash to client

## API Reference

### `useKeplr(net)`

React hook for Keplr wallet management.

**Parameters:**
- `net`: `'mainnet' | 'testnet'` - Network to connect to (default: 'testnet')

**Returns:**
```typescript
{
  account: Account | null;    // { address: string, pubkey: Uint8Array }
  client: SigningStargateClient | null;
  error: string;
}
```

### `sendWithSponsor(client, sender, recipient, amount, memo?)`

Send a gas-sponsored transaction.

**Parameters:**
- `client`: SigningStargateClient - From useKeplr hook
- `sender`: string - Sender's address
- `recipient`: string - Recipient's address
- `amount`: Array<{ denom: string; amount: string }> - Tokens to send
- `memo`: string - Optional transaction memo

**Returns:** Promise<{ txhash: string, code: number, logs: string }>

### Backend Endpoint: `POST /api/sponsor`

**Request Body:**
```json
{
  "tx_bytes": "base64-encoded transaction",
  "chain_id": "theta-testnet-001"
}
```

**Response:**
```json
{
  "txhash": "ABC123...",
  "code": 0,
  "logs": "..."
}
```

## Chain Configurations

### Testnet (theta-testnet-001)
- RPC: `https://rpc.sentry-01.theta-testnet.polypore.xyz`
- REST: `https://rest.sentry-01.theta-testnet.polypore.xyz`
- Denom: `uatom`
- Prefix: `cosmos`

### Mainnet (cosmoshub-4)
- RPC: `https://rpc-cosmoshub.polkachu.com`
- REST: `https://api-cosmoshub.polkachu.com`
- Denom: `uatom`
- Prefix: `cosmos`

## Security Notes

✅ **Best Practices:**
- Private keys never leave the browser
- Backend only sees public addresses
- Gas fees paid by developer wallet
- User controls all transactions through Keplr

⚠️ **Important:**
- Never commit `.env` with real mnemonics
- `DEVELOPER_MNEMONIC` should only be in backend environment
- Frontend cannot access `DEVELOPER_MNEMONIC`
- Always use different mnemonics for dev/test/prod

## Troubleshooting

### "Keplr not found"
- Install Keplr extension from https://www.keplr.app
- Refresh the page after installation

### "Server not configured with developer mnemonic"
- Ensure `DEVELOPER_MNEMONIC` is set in backend `.env`
- Restart the sponsor server

### Transaction fails with "insufficient fees"
- Check that sponsor server is running
- Verify developer wallet has sufficient balance
- Check backend logs for errors

## Migration from Old Code

### Replace Direct Mnemonic Usage

**Before:**
```typescript
const mnemonic = import.meta.env.VITE_COSMOS_RELAYER_MNEMONIC;
const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
```

**After:**
```typescript
const { account, client } = useKeplr('testnet');
// Use client to sign transactions, no mnemonic needed
```

### Replace Relay Calls

**Before:**
```typescript
await axios.post('/api/relay', { 
  mnemonic: RELAYER, 
  tx: txData 
});
```

**After:**
```typescript
await sendWithSponsor(
  client,
  sender,
  recipient,
  amount
);
```

## Testing

Run the test suite:
```bash
npm run test:unit
```

Test specific Keplr functionality:
```bash
npx vitest run tests/keplr-integration.test.ts
```

## Post-Integration Checklist

- [x] «Connect Keplr» button visible immediately (zero-config)
- [x] No RELAYER_MNEMONIC in frontend .env
- [x] window.keplr checked before any tx
- [x] Server returns txhash or 4xx-5xx with human text
- [x] User can switch mainnet/testnet via hook parameter
- [ ] End-to-end testing with real Keplr wallet
- [ ] Production deployment configuration

## Support

For issues or questions:
1. Check the [GitHub Issues](https://github.com/AsiniV/privachain-decentral/issues)
2. Review the example in `src/components/KeplrDemo.tsx`
3. Check server logs for backend errors

## Result

✅ Private keys never leave the browser
✅ Gas is paid by your relayer, but user signs
✅ Works on both cosmoshub-4 and theta-testnet-001 via Keplr
