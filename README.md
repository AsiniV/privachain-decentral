# ⚡ PrivaChain Decentral

A decentralized blockchain platform for private communication and digital identity management.

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Rust & Cargo
- Git

### Setup & Testing
```bash
git clone https://github.com/AsiniV/privachain-decentral.git
cd privachain-decentral
npm install
npm run test:all
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 📖 Documentation

- **[LOCAL_TESTING.md](./LOCAL_TESTING.md)** - Comprehensive guide for local development and testing
- **[TESTNET_SETUP_GUIDE.md](./TESTNET_SETUP_GUIDE.md)** - Complete Cosmos testnet deployment guide
- **[USER_WORKFLOW_GUIDE.md](./USER_WORKFLOW_GUIDE.md)** - User interaction workflows
- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Development progress

## 🧪 Testing Commands

```bash
npm run test                    # Run core tests (contracts, lint, build)
npm run test:all               # Run complete test suite including dev server
npm run test:contracts         # Test smart contracts only
npm run dev                    # Start development server

# Search Engine Population (NEW)
npm run populate-search        # Populate with 1000+ documents
npm run populate-search:full   # Verbose population with 1000 entries
npm run populate-search:testnet # Testnet-specific population

# Feature Verification (NEW)
npm run verify-features        # Verify all 16 core features
npm run verify-features:json   # JSON output for CI/CD
npm run verify-features:verbose # Detailed verification report
```

## 🛠️ Development

This project uses:
- **Frontend**: React + TypeScript + Vite
- **Smart Contracts**: CosmWasm (Rust)
- **Blockchain**: Cosmos SDK (ATOM gas payments)
- **Styling**: Tailwind CSS
- **Gas Model**: Developer-sponsored (users pay nothing)

### 🚀 Key Features:
- **Zero Crypto Friction**: Users can start immediately without wallets or tokens
- **Developer-Sponsored Gas**: All ATOM gas fees paid automatically by developer wallet
- **Generous Quotas**: 200 messages, 50 emails, 2h video daily for free users
- **Instant Access**: No barriers - install and use immediately
- **Fully Functional Search**: 1000+ documents indexed with OrbitDB hybrid search
- **Bang Commands**: DuckDuckGo-style search (!prv, !mail, !video, etc.)
- **16 Verified Features**: All core features from technical specification verified
- **Testnet Ready**: Complete Cosmos testnet deployment guide available

For detailed setup instructions, testing procedures, and troubleshooting, see [LOCAL_TESTING.md](./LOCAL_TESTING.md).

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.