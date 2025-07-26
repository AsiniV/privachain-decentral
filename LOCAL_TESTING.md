# 🧪 Local Testing Guide for PrivaChain Decentral

This guide provides detailed instructions for setting up and testing the PrivaChain Decentral project locally.

## 📋 Prerequisites

Before starting local testing, ensure you have the following installed:

### Required Software

1. **Node.js** (v18.0.0 or higher)
   ```bash
   node --version  # Should show v18+ 
   npm --version   # Should show v9+
   ```

2. **Rust and Cargo** (for smart contracts)
   ```bash
   cargo --version  # Should show cargo 1.70+
   ```

3. **Git** (for repository management)
   ```bash
   git --version
   ```

### System Requirements
- **Operating System**: Linux, macOS, or Windows with WSL2
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: At least 2GB free space

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/AsiniV/privachain-decentral.git
cd privachain-decentral
npm install
```

### 2. Run All Tests
```bash
npm run test:all
```

### 3. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 🧩 Testing Components

### Frontend Testing

#### Basic Tests
```bash
# Run linting
npm run test:lint

# Test TypeScript compilation
npm run test:build

# Test development server
npm run test:dev-server
```

#### Manual Testing
1. Start the dev server: `npm run dev`
2. Open browser to `http://localhost:5173`
3. Test key features:
   - UI components load correctly
   - Navigation works
   - No console errors

### Smart Contract Testing

#### Rust Contract Tests
```bash
# Run all contract tests
npm run test:contracts

# Or run directly in contracts directory
cd contracts
./scripts/test.sh
```

#### Contract Build Verification
```bash
# Build contracts
npm run contracts:build

# Verify WASM files are generated
ls -la contracts/mail/target/wasm32-unknown-unknown/release/
```

### Integration Testing

#### Full Test Suite
```bash
# Run complete test suite (includes all components)
npm run test:all
```

This will run:
1. Smart contract tests
2. Code linting
3. TypeScript compilation
4. Development server validation

## 🔗 Blockchain/Testnet Setup

### Local Development Mode

For basic frontend development, no blockchain connection is needed. The app runs with mock data.

### Testnet Connection (Optional)

To test with a live testnet:

1. **Check deployment scripts**:
   ```bash
   # This prepares contracts for deployment
   bash ./scripts/deploy-contracts.sh
   ```

2. **Deploy to local testnet** (requires running testnet):
   ```bash
   npm run deploy:local
   ```

**Note**: Full testnet deployment requires:
- A running Cosmos SDK blockchain node
- Proper wallet configuration
- Test tokens for gas fees

### Mock Testing Mode

For development and testing, the application uses mock blockchain responses:
- Test wallet addresses
- Simulated transaction responses
- Mock contract interactions

## 🛠️ Troubleshooting

### Common Issues

#### "vite: not found"
```bash
# Solution: Install dependencies
npm install
```

#### "cargo: not found"
```bash
# Solution: Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### Contract build fails
```bash
# Add wasm target
rustup target add wasm32-unknown-unknown

# Clean and rebuild
cd contracts/mail
cargo clean
cargo build --release --target wasm32-unknown-unknown
```

#### Port 5173 already in use
```bash
# Kill existing process
npm run kill

# Or use different port
npm run dev -- --port 3000
```

### Debugging Steps

1. **Check Prerequisites**:
   ```bash
   node --version
   npm --version
   cargo --version
   ```

2. **Clean Install**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Build**:
   ```bash
   npm run test:build
   ```

4. **Verify Contracts**:
   ```bash
   cd contracts && ./scripts/test.sh
   ```

## 📊 Test Coverage

### What's Tested

✅ **Smart Contracts**
- Unit tests for mail contract
- Proof-of-Work verification
- Contract instantiation

✅ **Frontend Build**
- TypeScript compilation
- Code linting (ESLint)
- Development server startup

✅ **Integration**
- Full build process
- Dependencies resolution

### What's NOT Tested (Future Improvements)

❌ **Unit Tests** - Component testing with Jest/Vitest
❌ **E2E Tests** - Browser automation testing
❌ **API Tests** - Backend service testing
❌ **Performance Tests** - Load and stress testing

## 🎯 Development Workflow

### Daily Development
```bash
# Start development
npm run dev

# Run tests before committing
npm run test
```

### Before Pull Request
```bash
# Run full test suite
npm run test:all

# Fix any linting issues
npm run lint

# Verify build
npm run build
```

### Adding New Features
1. Write code
2. Add/update tests
3. Run `npm run test:all`
4. Commit changes

## 📚 Additional Resources

- [Cosmos SDK Documentation](https://docs.cosmos.network/)
- [CosmWasm Docs](https://docs.cosmwasm.com/)
- [Vite Documentation](https://vitejs.dev/)
- [React Testing Best Practices](https://react.dev/learn/testing)

## 🤝 Contributing

When contributing to the project:

1. Ensure all tests pass: `npm run test:all`
2. Follow the existing code style
3. Add tests for new features
4. Update documentation as needed

## 📧 Support

If you encounter issues not covered in this guide:

1. Check the project issues on GitHub
2. Review the troubleshooting section
3. Create a new issue with:
   - Your environment details
   - Steps to reproduce
   - Error messages
   - Expected vs actual behavior