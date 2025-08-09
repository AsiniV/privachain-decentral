# WebRTC TURN/STUN Server Integration

This document describes the secure implementation of TURN/STUN server integration for PrivaChain video calling.

## Architecture Overview

The WebRTC integration follows a secure server-side pattern:

```
Client → /api/ice (Backend) → (Cache?fresh) → (else expired) → Metered API → Cache store → Return iceServers → Client
```

## Security Features

- ✅ **No secrets in client bundle**: All API keys and credentials are server-side only
- ✅ **Dynamic credentials**: Short-lived TURN credentials fetched on-demand
- ✅ **Fallback strategy**: Graceful degradation to static servers if API fails
- ✅ **Caching with TTL**: Reduces API calls and improves performance
- ✅ **Rate limiting**: Prevents abuse of the ICE endpoint
- ✅ **Structured logging**: Comprehensive monitoring and debugging

## Environment Configuration

### Server-side (Backend) Variables

```bash
# Required: Metered.ca configuration
METERED_DOMAIN="privachain.metered.live"
METERED_TURN_SECRET="your_actual_secret_here"

# Optional: Static fallback servers (JSON format)
TURN_STATIC_SERVERS_JSON='[{"urls":"stun:stun.relay.metered.ca:80"}]'

# Optional: Caching and rate limiting
ICE_CACHE_TTL_OFFSET_SECONDS=15
ENABLE_ICE_RATE_LIMIT=true
LOG_LEVEL=info
```

### Client-side Variables

**IMPORTANT**: No TURN-related environment variables should be prefixed with `VITE_` or `NEXT_PUBLIC_` as this exposes them in the client bundle.

## Usage

### Client-side (Frontend)

```typescript
import { fetchIceConfiguration } from '../lib/cosmos-utils'

// Get ICE servers securely from server endpoint
const iceServers = await fetchIceConfiguration()

// Create WebRTC peer connection
const peerConnection = new RTCPeerConnection({
  iceServers: iceServers.map(server => ({
    urls: server.url,
    username: server.username,
    credential: server.credential
  }))
})
```

### Server-side (Backend)

```typescript
import { initializeServerServices, setupExpressServer } from './src/server'

// Initialize TURN provider
initializeServerServices()

// Add to Express app
const app = express()
setupExpressServer(app)

// Or for Next.js API routes
import { nextIceHandler } from './src/server/routes/ice'
export default nextIceHandler
```

## API Endpoints

### GET /api/ice

Returns ICE server configuration with dynamic TURN credentials.

**Response:**
```json
{
  "iceServers": [
    {
      "urls": "stun:stun.relay.metered.ca:80"
    },
    {
      "urls": "turn:global.relay.metered.ca:80",
      "username": "dynamic_username",
      "credential": "dynamic_password",
      "credentialType": "password"
    }
  ],
  "source": "dynamic",
  "expiresAt": 1640995200000
}
```

**Query Parameters:**
- `force=1` - Force cache refresh (for debugging)

**Rate Limiting:**
- 30 requests per 30 seconds per IP (configurable)

## Security Checks

A CI script checks for exposed secrets in client bundles:

```bash
npm run test:secrets
```

This script will fail the build if any of these patterns are found in client code:
- `METERED_TURN_SECRET`
- `METERED_API_KEY` 
- Previously exposed credentials
- `VITE_METERED_*` environment variables

## Monitoring

The system logs structured JSON events for monitoring:

```json
{
  "timestamp": 1640995200000,
  "level": "info",
  "event": "ice_fetch_success",
  "source": "turn_provider",
  "detail": {
    "ttl": 300,
    "renewInMs": 300000,
    "latencyMs": 150,
    "serverCount": 3
  }
}
```

## Migration from Old System

1. **Remove client-side API calls**: No more direct calls to Metered API from frontend
2. **Update environment variables**: Remove `VITE_` prefixed TURN secrets
3. **Deploy server endpoint**: Implement `/api/ice` endpoint in your backend
4. **Update client code**: Use `fetchIceConfiguration()` instead of direct API calls
5. **Rotate secrets**: Update Metered.ca credentials that may have been exposed

## Testing

Unit tests are available for the TURN provider:

```bash
cd src/tests/server
# Run with your preferred test runner (Jest, Vitest, etc.)
```

## Troubleshooting

### Common Issues

1. **No ICE servers returned**: Check server logs for Metered API errors
2. **Fallback servers used**: Usually indicates Metered API is down or credentials are invalid
3. **Rate limiting**: Reduce request frequency or increase rate limits
4. **Cache issues**: Use `?force=1` parameter to bypass cache

### Debug Logging

Set `LOG_LEVEL=debug` to see detailed logging of ICE fetch operations.