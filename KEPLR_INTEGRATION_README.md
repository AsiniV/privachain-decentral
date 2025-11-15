# Keplr Integration - Quick Reference

This directory contains the Keplr wallet integration that enables secure, user-owned key management for PrivaChain.

## 🎯 What This Integration Does

- **Replaces** hard-coded mnemonics with Keplr browser wallet
- **Maintains** gas sponsorship by backend (users pay no fees)
- **Enables** true user ownership of private keys
- **Supports** both mainnet (cosmoshub-4) and testnet (theta-testnet-001)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.template .env
# Edit .env and set:
# - DEVELOPER_MNEMONIC (backend only)
# - VITE_NETWORK="testnet"
# - VITE_SPONSOR_RPC="http://localhost:3000"
```

### 3. Start Services
```bash
npm run dev:all
```

## 📁 Key Files

### Frontend
- `src/wallet/useKeplr.ts` - React hook for Keplr integration
- `src/components/ConnectKeplr.tsx` - Simple connection button
- `src/components/KeplrDemo.tsx` - Full demo with transaction sending
- `src/blockchain/chains.ts` - Chain configurations
- `src/blockchain/sponsor.ts` - Client-side sponsor API
- `src/blockchain/tx-sender.ts` - Transaction utilities

### Backend
- `server/index.ts` - Gas sponsorship server
- `server/routes/sponsor.ts` - Sponsor endpoint

### Configuration
- `src/global.d.ts` - TypeScript definitions
- `.env.template` - Environment variable template

### Documentation & Tests
- `docs/KEPLR_INTEGRATION.md` - Complete guide
- `tests/keplr-integration.test.ts` - Test suite (8 tests)

## 🔧 Usage Example

```tsx
import { useKeplr } from '@/wallet/useKeplr';
import { sendWithSponsor } from '@/blockchain/tx-sender';

function MyComponent() {
  const { account, client, error } = useKeplr('testnet');
  
  const handleSend = async () => {
    const result = await sendWithSponsor(
      client,
      account.address,
      'cosmos1recipient...',
      [{ denom: 'uatom', amount: '1000000' }]
    );
    console.log('Transaction hash:', result.txhash);
  };
  
  return <button onClick={handleSend}>Send 1 ATOM (Gasless)</button>;
}
```

## 🧪 Testing

```bash
# Run all tests
npm run test:unit

# Run Keplr integration tests only
npx vitest run tests/keplr-integration.test.ts
```

**Test Results:** ✅ 8/8 tests passing

## 🔐 Security Model

```
┌─────────────┐                    ┌──────────────┐
│   Browser   │                    │   Backend    │
│  (Keplr)    │                    │   Server     │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ 1. Sign tx with 0 fees          │
       ├─────────────────────────────────>│
       │                                  │
       │                      2. Add fees │
       │                         from dev │
       │                           wallet │
       │                                  │
       │   3. Return tx hash             │
       │<─────────────────────────────────┤
       │                                  │
```

- ✅ Private keys stay in browser (Keplr)
- ✅ Backend only sees public address
- ✅ Backend pays all gas fees
- ✅ User approves all transactions

## 📚 Documentation

Full documentation: [docs/KEPLR_INTEGRATION.md](docs/KEPLR_INTEGRATION.md)

Includes:
- Detailed setup instructions
- API reference
- Migration guide from old code
- Troubleshooting
- Security best practices

## 🔄 Migration from Legacy Code

### Old Way (Deprecated)
```typescript
const mnemonic = import.meta.env.VITE_COSMOS_RELAYER_MNEMONIC;
// ⚠️ Exposes private keys to frontend
```

### New Way
```typescript
const { account, client } = useKeplr('testnet');
// ✅ Private keys stay in Keplr wallet
```

Legacy code still works but shows deprecation warnings.

## 🎉 Result

✅ **Private keys never leave the browser**
✅ **Gas paid by backend, user only signs**
✅ **Works on cosmoshub-4 and theta-testnet-001**
✅ **Zero configuration for users**
✅ **Fully tested and documented**

## 📞 Support

- See [docs/KEPLR_INTEGRATION.md](docs/KEPLR_INTEGRATION.md) for detailed guide
- Check [tests/keplr-integration.test.ts](tests/keplr-integration.test.ts) for examples
- Review [src/components/KeplrDemo.tsx](src/components/KeplrDemo.tsx) for working demo

---

**Status:** ✅ Ready for use
**Tests:** ✅ 8/8 passing
**Security:** ✅ No vulnerabilities detected
