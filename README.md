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

# Cosmos Hub Testnet Examples (NEW)
npm run example:cosmos-connection    # TypeScript example
npm run example:cosmos-connection:js # JavaScript example
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
- **Cosmos Hub Testnet**: Connect to theta-testnet-001 without running your own node
- **Public RPC Access**: Use `https://rpc.theta-testnet.polypore.xyz` for network access
- **Generous Quotas**: 200 messages, 50 emails, 2h video daily for free users
- **Instant Access**: No barriers - install and use immediately
- **Fully Functional Search**: 1000+ documents indexed with OrbitDB hybrid search
- **Bang Commands**: DuckDuckGo-style search (!prv, !mail, !video, etc.)
- **16 Verified Features**: All core features from technical specification verified
- **Testnet Ready**: Deployable to Cosmos testnet

For detailed setup instructions, testing procedures, and troubleshooting, see [LOCAL_TESTING.md](./LOCAL_TESTING.md).

## 🔒 Privacy & Security Compliance

**Compliance Statement**: "Spark does not simulate privacy layers. If a critical privacy dependency (mixnet, Tor, ZK prover, key infrastructure) is unavailable, the application degrades explicitly and warns users; it never silently emulates cryptographic or network protections."

### ✅ NO STUB / NO SIMULATION POLICY

PrivaChain adheres to strict "NO STUB / NO SIMULATION" rules:

- **Real Cryptography Only**: All ZK proofs, signatures, and encryption use genuine cryptographic libraries
- **Explicit Failures**: Missing dependencies cause clear error messages, never silent fallbacks
- **Dependency Validation**: Boot-time validation ensures all required services are available
- **Structured Errors**: When services are unavailable, users receive specific remediation guidance
- **Health Status Degradation**: System shows 'degraded' status when privacy components are unavailable

### 🛡️ Privacy Guarantees

- **Metadata Mitigation**: Configurable padding, batching, and dummy traffic
- **Anonymity Layers**: Real Tor/Nym integration (no simulation)
- **End-to-End Encryption**: Mandatory encryption with no plaintext fallbacks
- **ZK Domain Registry**: Real zero-knowledge proofs for .prv domain ownership
- **Gas Sponsorship Isolation**: Developer keys secured in KMS/TEE, never in memory dumps

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.