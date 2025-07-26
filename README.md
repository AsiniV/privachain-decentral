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
- **[USER_WORKFLOW_GUIDE.md](./USER_WORKFLOW_GUIDE.md)** - User interaction workflows
- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Development progress

## 🧪 Testing Commands

```bash
npm run test           # Run core tests (contracts, lint, build)
npm run test:all       # Run complete test suite including dev server
npm run test:contracts # Test smart contracts only
npm run dev            # Start development server
```

## 🛠️ Development

This project uses:
- **Frontend**: React + TypeScript + Vite
- **Smart Contracts**: CosmWasm (Rust)
- **Blockchain**: Cosmos SDK
- **Styling**: Tailwind CSS

For detailed setup instructions, testing procedures, and troubleshooting, see [LOCAL_TESTING.md](./LOCAL_TESTING.md).

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.