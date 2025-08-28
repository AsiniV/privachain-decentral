# PrivaChain Monitoring and Observability

This document provides comprehensive setup and usage instructions for the PrivaChain monitoring infrastructure.

## Overview

The PrivaChain monitoring system provides:

- **Health Check Endpoints** - Real-time system health status
- **Centralized Logging** - Structured logs with PII scrubbing
- **Error Tracking** - Sentry integration for error monitoring
- **Performance Metrics** - Prometheus metrics for all services
- **Alerting** - Critical system failure notifications
- **Dashboards** - Grafana visualizations for operational insight

## Quick Start

### 1. Environment Setup

Create a `.env` file with the required configuration:

```bash
# Logging Configuration
LOG_LEVEL=info

# Error Tracking (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1

# Alerting (Optional)
SMTP_HOST=smtp.gmail.com:587
SMTP_USERNAME=alerts@yourdomain.com
SMTP_PASSWORD=your-smtp-password
ALERT_FROM_EMAIL=alerts@yourdomain.com
ONCALL_EMAIL=oncall@yourdomain.com

# Slack Integration (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### 2. Start the Server

```bash
npm install
npm run dev
```

### 3. Verify Health Endpoints

```bash
# Basic health check
curl http://localhost:3001/health

# Detailed status
curl http://localhost:3001/status

# Prometheus metrics
curl http://localhost:3001/metrics

# Simple ping
curl http://localhost:3001/ping

# Readiness probe
curl http://localhost:3001/ready
```

## Health Check Endpoints

### `/health` - Comprehensive Health Check

Returns detailed health status including:

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": [
    {
      "name": "API_SERVICE",
      "status": "pass|warn|fail",
      "message": "Service status message",
      "responseTime": 50,
      "remediation": "Fix instructions if failed"
    }
  ],
  "dependencies": [
    {
      "name": "IPFS",
      "status": "available|degraded|unavailable",
      "responseTime": 100,
      "lastCheck": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### `/status` - System Status Summary

Returns high-level system information:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "production",
  "features": ["TURN/STUN services", "Health monitoring", ...],
  "dependencies": [...]
}
```

### `/metrics` - Prometheus Metrics

Returns metrics in Prometheus format for scraping:

```
# HELP privachain_http_requests_total Total HTTP requests
# TYPE privachain_http_requests_total counter
privachain_http_requests_total{method="GET",endpoint="/health",status_code="200"} 42

# HELP privachain_dummy_real_ratio Privacy dummy/real traffic ratio
# TYPE privachain_dummy_real_ratio gauge
privachain_dummy_real_ratio{component="messaging"} 0.8
```

### `/ping` - Liveness Probe

Simple endpoint for container liveness checks:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `/ready` - Readiness Probe

Checks if the service is ready to accept traffic:

```json
{
  "status": "ready|not_ready",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Logging Configuration

### Log Levels

- `debug` - Detailed debugging information
- `info` - General operational messages
- `warn` - Warning conditions
- `error` - Error conditions
- `fatal` - Critical errors requiring immediate attention

### Log Format

All logs are structured in JSON format:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "HTTP request processed",
  "correlationId": "privachain-1234567890-abc123",
  "component": "api",
  "action": "request_processing",
  "method": "GET",
  "path": "/health",
  "statusCode": 200,
  "duration": "0.05s"
}
```

### PII Scrubbing

The logging service automatically scrubs sensitive data:

- Email addresses → `[REDACTED-hash]`
- Private keys → `[REDACTED-hash]`
- Wallet addresses → `[REDACTED-hash]`
- Environment secrets → `[REDACTED-hash]`

## Error Tracking Setup

### Sentry Integration

1. Create a Sentry project at https://sentry.io
2. Add your DSN to the environment variables:
   ```bash
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```
3. Errors will automatically be reported with context

### Error Context

All errors include:

- Correlation ID for request tracing
- Component and action information
- User context (if available)
- Environment and release information
- Breadcrumbs for debugging

## Metrics Collection

### Available Metrics

#### HTTP Metrics
- `privachain_http_requests_total` - Total HTTP requests
- `privachain_http_request_duration_seconds` - Request duration

#### Error Metrics
- `privachain_errors_total` - Total errors by type and severity
- `privachain_errors_by_component_total` - Errors by component

#### Performance Metrics
- `privachain_operation_duration_seconds` - Operation duration
- `privachain_operations_total` - Total operations

#### Privacy Metrics
- `privachain_dummy_real_ratio` - Dummy/real traffic ratio
- `privachain_proof_generation_time_seconds` - ZK proof generation time
- `privachain_batch_fill_ratio` - Privacy batch fill ratio

#### Storage Metrics
- `privachain_ipfs_operations_total` - IPFS operations
- `privachain_stored_data_size_bytes` - Stored data size

#### Network Metrics
- `privachain_network_latency_seconds` - Network latency
- `privachain_connected_peers` - Connected peers

### Custom Metrics

Create custom metrics using the MetricsService:

```typescript
import { metricsService } from './services/MetricsService'

// Create custom counter
const customCounter = metricsService.createCounter(
  'custom_events_total',
  'Total custom events',
  ['event_type']
)

// Record metric
customCounter.inc({ event_type: 'user_action' })
```

## Prometheus Setup

### 1. Install Prometheus

Download from https://prometheus.io/download/ or use Docker:

```bash
docker run -p 9090:9090 -v $(pwd)/config/prometheus:/etc/prometheus prom/prometheus
```

### 2. Configuration

Use the provided `config/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'privachain'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### 3. Verify Metrics

1. Open http://localhost:9090
2. Query `privachain_http_requests_total`
3. Verify metrics are being scraped

## Alerting Configuration

### 1. Alertmanager Setup

Use the provided `config/alerting/alertmanager.yml`:

```bash
docker run -p 9093:9093 -v $(pwd)/config/alerting:/etc/alertmanager prom/alertmanager
```

### 2. Alert Rules

The system includes pre-configured alerts:

#### Critical Alerts
- **SystemUnhealthy** - System health status is unhealthy
- **HighErrorRate** - Error rate exceeds threshold
- **ServiceDown** - Service is not responding
- **CriticalMemoryUsage** - Memory usage critical

#### Privacy Alerts
- **PrivacyDegradation** - Dummy/real ratio below threshold
- **SlowProofGeneration** - ZK proof generation too slow

#### Performance Alerts
- **HighLatency** - API latency too high
- **HighNetworkLatency** - Network latency issues

### 3. Notification Channels

Configure notifications via:

- **Email** - SMTP configuration
- **Slack** - Webhook integration
- **PagerDuty** - Service key configuration

## Grafana Dashboard

### 1. Import Dashboard

1. Install Grafana: https://grafana.com/get
2. Import `config/grafana/dashboard.json`
3. Configure Prometheus data source: http://localhost:9090

### 2. Dashboard Panels

The dashboard includes:

- **System Health Overview** - Overall health status
- **HTTP Request Metrics** - Request rate and duration
- **Error Tracking** - Error rates by component
- **Privacy Metrics** - Dummy/real ratios and proof times
- **Resource Usage** - Memory and CPU usage
- **Network Status** - Latency and peer connections

### 3. Alerts in Grafana

Configure dashboard alerts for:
- Health status changes
- Privacy threshold violations
- Performance degradation

## Operational Procedures

### 1. Health Check Monitoring

Set up monitoring to check health endpoints:

```bash
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /ping
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

# Kubernetes readiness probe  
readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

### 2. Log Analysis

Query logs for issues:

```bash
# Find errors in last hour
grep -E '"level":"error"' logs/combined.log | jq 'select(.timestamp > "2024-01-01T12:00:00Z")'

# Find high latency requests
grep -E '"duration"' logs/combined.log | jq 'select(.duration | tonumber > 1)'
```

### 3. Metrics Analysis

Use Prometheus queries:

```promql
# Error rate by component
rate(privachain_errors_by_component_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(privachain_http_request_duration_seconds_bucket[5m]))

# Privacy degradation check
privachain_dummy_real_ratio < 0.7
```

## Troubleshooting

### Common Issues

1. **Metrics not appearing**
   - Check `/metrics` endpoint is accessible
   - Verify Prometheus scrape configuration
   - Check service logs for errors

2. **Alerts not firing**
   - Verify alert rules syntax
   - Check Prometheus rules evaluation
   - Confirm Alertmanager configuration

3. **High memory usage**
   - Check logs for memory leaks
   - Review metric collection intervals
   - Monitor garbage collection

4. **Privacy metrics anomalies**
   - Verify dummy traffic generation
   - Check mixnet connectivity
   - Review batch processing logic

### Debug Commands

```bash
# Check service health
curl -s http://localhost:3001/health | jq '.checks[] | select(.status != "pass")'

# Verify metrics collection
curl -s http://localhost:3001/metrics | grep privachain_

# Check correlation ID in logs
grep "correlation-123" logs/combined.log

# Monitor error trends
grep '"level":"error"' logs/combined.log | tail -n 20
```

## Best Practices

### 1. Monitoring

- Monitor all critical paths and dependencies
- Set appropriate alert thresholds
- Use correlation IDs for request tracing
- Regular health check validation

### 2. Privacy

- Monitor dummy/real traffic ratios
- Alert on privacy threshold violations
- Track proof generation performance
- Validate anonymity set sizes

### 3. Performance

- Track latency percentiles, not just averages
- Monitor resource utilization trends
- Set up capacity planning alerts
- Regular performance testing

### 4. Security

- Scrub all PII from logs
- Secure monitoring endpoints
- Rotate monitoring credentials
- Audit access to monitoring data

## Security Considerations

### 1. Log Security

- All PII is automatically scrubbed
- Correlation IDs enable tracing without exposing user data
- Logs are stored with appropriate access controls

### 2. Metrics Security

- Metrics endpoints should be secured in production
- No sensitive data included in metric labels
- Access to Prometheus/Grafana should be restricted

### 3. Alert Security

- Alert notifications may contain sensitive operational data
- Secure all notification channels
- Limit alert recipient access

## Support

For issues with the monitoring system:

1. Check service logs: `logs/combined.log`
2. Verify health endpoints: `/health`, `/status`
3. Review Prometheus targets: http://localhost:9090/targets
4. Check Grafana dashboard for anomalies

Contact the operations team for critical monitoring issues.