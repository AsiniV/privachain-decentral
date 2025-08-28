#!/bin/bash

# PrivaChain Monitoring Test Script
# Tests all monitoring endpoints and functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
TIMEOUT=10

echo -e "${BLUE}🧪 PrivaChain Monitoring Test Suite${NC}"
echo "========================================"
echo "Testing monitoring endpoints at: $BASE_URL"
echo ""

# Function to make HTTP request and check response
test_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local description="$3"
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL$endpoint" || echo "000")
    status_code="${response: -3}"
    body="${response%???}"
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status_code, expected $expected_status)"
        if [ "$status_code" != "000" ]; then
            echo "Response: $body"
        fi
        return 1
    fi
}

# Function to test JSON response structure
test_json_structure() {
    local endpoint="$1"
    local required_fields="$2"
    local description="$3"
    
    echo -n "Testing $description JSON structure... "
    
    response=$(curl -s --max-time $TIMEOUT "$BASE_URL$endpoint" || echo "{}")
    
    # Check if response is valid JSON
    if ! echo "$response" | jq . >/dev/null 2>&1; then
        echo -e "${RED}✗ FAIL${NC} (Invalid JSON)"
        return 1
    fi
    
    # Check required fields
    missing_fields=""
    for field in $required_fields; do
        if ! echo "$response" | jq -e ".$field" >/dev/null 2>&1; then
            missing_fields="$missing_fields $field"
        fi
    done
    
    if [ -z "$missing_fields" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Missing fields:$missing_fields)"
        return 1
    fi
}

# Function to test Prometheus metrics format
test_metrics_format() {
    echo -n "Testing Prometheus metrics format... "
    
    response=$(curl -s --max-time $TIMEOUT "$BASE_URL/metrics" || echo "")
    
    if [ -z "$response" ]; then
        echo -e "${RED}✗ FAIL${NC} (No response)"
        return 1
    fi
    
    # Check for basic Prometheus metric format
    if echo "$response" | grep -q "^# HELP\|^# TYPE\|^[a-zA-Z_:][a-zA-Z0-9_:]*"; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Invalid Prometheus format)"
        return 1
    fi
}

# Function to test metric presence
test_metric_presence() {
    local metric_pattern="$1"
    local description="$2"
    
    echo -n "Testing $description metric presence... "
    
    response=$(curl -s --max-time $TIMEOUT "$BASE_URL/metrics" || echo "")
    
    if echo "$response" | grep -q "$metric_pattern"; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Metric not found: $metric_pattern)"
        return 1
    fi
}

# Test counters
test_count=0
pass_count=0
fail_count=0

# Helper function to track test results
track_result() {
    test_count=$((test_count + 1))
    if [ $? -eq 0 ]; then
        pass_count=$((pass_count + 1))
    else
        fail_count=$((fail_count + 1))
    fi
}

echo -e "${YELLOW}📋 Basic Endpoint Tests${NC}"
echo "------------------------"

# Test basic endpoints
test_endpoint "/ping" 200 "Ping endpoint"
track_result

test_endpoint "/health" 200 "Health check endpoint"
track_result

test_endpoint "/status" 200 "Status endpoint"
track_result

test_endpoint "/metrics" 200 "Metrics endpoint"
track_result

test_endpoint "/ready" 200 "Readiness probe"
track_result

echo ""
echo -e "${YELLOW}🔍 JSON Structure Tests${NC}"
echo "-------------------------"

# Test JSON response structures
test_json_structure "/health" "status timestamp uptime version checks dependencies" "Health endpoint"
track_result

test_json_structure "/status" "status version uptime environment features" "Status endpoint"
track_result

test_json_structure "/ping" "status timestamp" "Ping endpoint"
track_result

test_json_structure "/ready" "status timestamp" "Ready endpoint"
track_result

echo ""
echo -e "${YELLOW}📊 Metrics Format Tests${NC}"
echo "------------------------"

# Test Prometheus metrics format
test_metrics_format
track_result

echo ""
echo -e "${YELLOW}🎯 Specific Metrics Tests${NC}"
echo "---------------------------"

# Test for specific metrics
test_metric_presence "privachain_http_requests_total" "HTTP requests counter"
track_result

test_metric_presence "privachain_http_request_duration_seconds" "HTTP request duration histogram"
track_result

test_metric_presence "privachain_errors_total" "Error counter"
track_result

test_metric_presence "privachain_operations_total" "Operations counter"
track_result

test_metric_presence "privachain_active_connections" "Active connections gauge"
track_result

test_metric_presence "privachain_dummy_real_ratio" "Privacy dummy/real ratio"
track_result

test_metric_presence "privachain_proof_generation_time_seconds" "Proof generation time"
track_result

test_metric_presence "process_" "Node.js process metrics"
track_result

test_metric_presence "nodejs_" "Node.js runtime metrics"
track_result

echo ""
echo -e "${YELLOW}🏥 Health Check Details${NC}"
echo "------------------------"

echo -n "Checking health status details... "
health_response=$(curl -s --max-time $TIMEOUT "$BASE_URL/health" || echo "{}")

if echo "$health_response" | jq -e '.checks[]' >/dev/null 2>&1; then
    check_count=$(echo "$health_response" | jq '.checks | length')
    echo -e "${GREEN}✓ PASS${NC} ($check_count health checks found)"
    
    # Show check details
    echo "Health check services:"
    echo "$health_response" | jq -r '.checks[] | "  - \(.name): \(.status) (\(.message))"' | head -10
else
    echo -e "${RED}✗ FAIL${NC} (No health checks found)"
    fail_count=$((fail_count + 1))
fi
test_count=$((test_count + 1))

echo ""
echo -n "Checking dependency status... "
if echo "$health_response" | jq -e '.dependencies[]' >/dev/null 2>&1; then
    dep_count=$(echo "$health_response" | jq '.dependencies | length')
    echo -e "${GREEN}✓ PASS${NC} ($dep_count dependencies checked)"
    
    # Show dependency details
    echo "Dependencies:"
    echo "$health_response" | jq -r '.dependencies[] | "  - \(.name): \(.status) (\(.responseTime)ms)"'
else
    echo -e "${YELLOW}⚠ WARN${NC} (No dependencies found)"
fi
test_count=$((test_count + 1))

echo ""
echo -e "${YELLOW}🔒 Security Tests${NC}"
echo "------------------"

echo -n "Testing for exposed secrets in logs... "
# This would check if any secrets are exposed (simplified test)
if curl -s --max-time $TIMEOUT "$BASE_URL/health" | grep -q -i "password\|secret\|key\|token" && ! curl -s --max-time $TIMEOUT "$BASE_URL/health" | grep -q "REDACTED"; then
    echo -e "${RED}✗ FAIL${NC} (Potential secrets exposed)"
    fail_count=$((fail_count + 1))
else
    echo -e "${GREEN}✓ PASS${NC} (No obvious secrets exposed)"
    pass_count=$((pass_count + 1))
fi
test_count=$((test_count + 1))

echo ""
echo -e "${YELLOW}⚡ Performance Tests${NC}"
echo "---------------------"

echo -n "Testing response time... "
start_time=$(date +%s%N)
curl -s --max-time $TIMEOUT "$BASE_URL/health" >/dev/null
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

if [ $duration -lt 1000 ]; then
    echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
    pass_count=$((pass_count + 1))
elif [ $duration -lt 5000 ]; then
    echo -e "${YELLOW}⚠ WARN${NC} (${duration}ms - acceptable but slow)"
    pass_count=$((pass_count + 1))
else
    echo -e "${RED}✗ FAIL${NC} (${duration}ms - too slow)"
    fail_count=$((fail_count + 1))
fi
test_count=$((test_count + 1))

echo ""
echo -e "${YELLOW}🔧 Configuration Tests${NC}"
echo "------------------------"

echo -n "Testing environment detection... "
status_response=$(curl -s --max-time $TIMEOUT "$BASE_URL/status" || echo "{}")
environment=$(echo "$status_response" | jq -r '.environment // "unknown"')

if [ "$environment" != "unknown" ] && [ "$environment" != "null" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Environment: $environment)"
    pass_count=$((pass_count + 1))
else
    echo -e "${RED}✗ FAIL${NC} (Environment not detected)"
    fail_count=$((fail_count + 1))
fi
test_count=$((test_count + 1))

echo ""
echo "========================================"
echo -e "${BLUE}📋 Test Results Summary${NC}"
echo "========================================"

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "Total tests: $test_count"
    echo -e "Passed: ${GREEN}$pass_count${NC}"
    echo -e "Failed: ${GREEN}$fail_count${NC}"
    exit 0
elif [ $pass_count -gt $fail_count ]; then
    echo -e "${YELLOW}⚠ MOST TESTS PASSED${NC}"
    echo -e "Total tests: $test_count"
    echo -e "Passed: ${GREEN}$pass_count${NC}"
    echo -e "Failed: ${RED}$fail_count${NC}"
    exit 1
else
    echo -e "${RED}❌ MANY TESTS FAILED${NC}"
    echo -e "Total tests: $test_count"
    echo -e "Passed: ${GREEN}$pass_count${NC}"
    echo -e "Failed: ${RED}$fail_count${NC}"
    exit 2
fi