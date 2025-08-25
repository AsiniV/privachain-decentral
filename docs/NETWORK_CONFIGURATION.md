# Network Configuration and Troubleshooting

This document provides network configuration details and troubleshooting steps for connecting PrivaChain to Cosmos testnet endpoints.

## Network Endpoints

### Primary Cosmos Hub Testnet Endpoints

Due to the dynamic nature of testnets, endpoints may change over time. Here are the most reliable endpoints:

1. **Primary Endpoint (theta-testnet-001)**:
   - RPC: `https://rpc.theta-testnet.polypore.xyz`
   - REST: `https://rest.theta-testnet.polypore.xyz:1317`

2. **Alternative Endpoints**:
   - RPC: `https://rpc-cosmoshub-testnet.cosmos.directory`
   - RPC: `https://cosmos-testnet-rpc.allthatnode.com:26657`
   - RPC: `https://rpc.state-sync-01.theta-testnet.polypore.xyz`

### Testing Endpoint Connectivity

Use the provided test script to check which endpoints are currently working:

```bash
npx tsx examples/test-cosmos-endpoints.ts
```

This script will:
- Test multiple known testnet endpoints
- Report which ones are currently accessible
- Provide a working wallet address for testing

### Environment-Specific Connectivity Issues

#### Restricted Networks
Some deployment environments (CI/CD, corporate networks, etc.) may have limited external network access. In such cases:

1. **Use Environment Variables**:
   ```bash
   export COSMOS_RPC_OVERRIDE="http://your-internal-endpoint:26657"
   ```

2. **Mock Mode for Testing**:
   The application includes mock mode for development environments without network access:
   ```bash
   export COSMOS_MOCK_MODE=true
   npm run dev
   ```

3. **Local Testnet**:
   For complete offline development, consider running a local Cosmos chain:
   ```bash
   # This would require additional setup
   docker run -p 26657:26657 cosmos/gaia:latest
   ```

## Connection Validation

### Basic Connectivity Test

```bash
# Test RPC endpoint
curl -s https://rpc.theta-testnet.polypore.xyz/status

# Expected response should include:
# - network: "theta-testnet-001"
# - latest_block_height: [current height]
# - catching_up: false
```

### Wallet and Balance Test

```bash
# Using the fixed demo wallet
npm run example:cosmos-connection

# Expected output:
# ✅ Wallet created successfully
# ✅ Connected to chain: theta-testnet-001
# ✅ Balance query successful
```

### Troubleshooting Common Issues

#### DNS Resolution Failures
```
Error: getaddrinfo ENOTFOUND rpc.theta-testnet.polypore.xyz
```

**Solutions**:
1. Check DNS settings
2. Try alternative endpoints
3. Use IP addresses directly (if known)
4. Check firewall/proxy settings

#### Connection Timeouts
```
Error: request to https://rpc.theta-testnet.polypore.xyz/ failed, reason: timeout
```

**Solutions**:
1. Increase timeout values in client configuration
2. Check network stability
3. Try different endpoints
4. Use local/internal endpoints if available

#### CORS Issues (Browser Environment)
```
Error: CORS policy: No 'Access-Control-Allow-Origin' header
```

**Solutions**:
1. Use CORS proxy for development
2. Configure proper backend endpoints
3. Use local development server with proxy

### Network Configuration for Production

When deploying to production, ensure:

1. **Endpoint Redundancy**:
   ```typescript
   const endpoints = [
     process.env.COSMOS_RPC_PRIMARY,
     process.env.COSMOS_RPC_BACKUP,
     process.env.COSMOS_RPC_FALLBACK
   ].filter(Boolean);
   ```

2. **Health Checks**:
   ```typescript
   async function validateEndpoint(url: string): Promise<boolean> {
     try {
       const response = await fetch(`${url}/status`);
       const data = await response.json();
       return data.result?.sync_info?.catching_up === false;
     } catch {
       return false;
     }
   }
   ```

3. **Circuit Breaker Pattern**:
   Implement circuit breakers to handle endpoint failures gracefully.

### Test Wallets and Faucets

#### Demo Wallet (Safe for Testing)
```
Mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
Address: cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4
```

#### Pre-funded Test Wallet
```
Address: cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k
Purpose: Reference wallet with test ATOM tokens
```

#### Getting Test Tokens
1. **Cosmos Discord**: Ask in #testnet-faucet channel
2. **Faucet Websites**: Check official Cosmos Hub documentation for current faucets
3. **Alternative Testnets**: Consider using other Cosmos testnets if main testnet is unavailable

### Monitoring and Alerts

For production deployments, monitor:
- Endpoint availability and response times
- Block height progression
- Transaction success rates
- Gas price fluctuations

Example monitoring script:
```bash
#!/bin/bash
# Simple endpoint monitoring
curl -sf https://rpc.theta-testnet.polypore.xyz/status > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Testnet endpoint healthy"
else
  echo "❌ Testnet endpoint down - switching to backup"
fi
```

---

This configuration should help ensure reliable connectivity to Cosmos testnet for development and testing purposes.