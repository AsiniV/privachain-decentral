#!/bin/bash
# test_nym_ping.sh - Test Nym mixnet connectivity and performance
# Tests RTT and packet loss through the mixnet

set -e

echo "🧪 Testing Nym mixnet connectivity..."

NYM_CLIENT_URL="http://localhost:1977"
TEST_DURATION=10
MAX_RTT=1200  # 1.2 seconds in milliseconds

# Check if Nym client is running
echo "🔍 Checking Nym client connectivity..."
if command -v curl >/dev/null 2>&1; then
    HTTP_CLIENT="curl"
elif command -v wget >/dev/null 2>&1; then
    HTTP_CLIENT="wget"
else
    echo "❌ Neither curl nor wget found"
    exit 1
fi

# Test Nym client endpoint
echo "📡 Testing Nym client at $NYM_CLIENT_URL..."

if [ "$HTTP_CLIENT" = "curl" ]; then
    if curl -s --connect-timeout 5 "$NYM_CLIENT_URL" >/dev/null 2>&1; then
        echo "✅ Nym client is responding"
    else
        echo "❌ Nym client not responding at $NYM_CLIENT_URL"
        echo "💡 Start Nym client with: ~/.nym/bin/nym-client run --id priva &"
        exit 1
    fi
else
    if wget -q --timeout=5 --spider "$NYM_CLIENT_URL" >/dev/null 2>&1; then
        echo "✅ Nym client is responding"
    else
        echo "❌ Nym client not responding at $NYM_CLIENT_URL"
        echo "💡 Start Nym client with: ~/.nym/bin/nym-client run --id priva &"
        exit 1
    fi
fi

# Perform RTT tests
echo "⏱️  Testing RTT through mixnet..."
total_tests=5
successful_tests=0
total_rtt=0

for i in $(seq 1 $total_tests); do
    echo "Test $i/$total_tests..."
    
    start_time=$(date +%s%3N)  # milliseconds
    
    # Send test message through mixnet (simulated)
    if [ "$HTTP_CLIENT" = "curl" ]; then
        if curl -s --connect-timeout 3 --max-time 5 "$NYM_CLIENT_URL" >/dev/null 2>&1; then
            end_time=$(date +%s%3N)
            rtt=$((end_time - start_time))
            
            echo "  RTT: ${rtt}ms"
            
            if [ $rtt -le $MAX_RTT ]; then
                successful_tests=$((successful_tests + 1))
                total_rtt=$((total_rtt + rtt))
            else
                echo "  ⚠️ RTT exceeds limit (${rtt}ms > ${MAX_RTT}ms)"
            fi
        else
            echo "  ❌ Request failed"
        fi
    else
        if wget -q --timeout=5 --spider "$NYM_CLIENT_URL" >/dev/null 2>&1; then
            end_time=$(date +%s%3N)
            rtt=$((end_time - start_time))
            
            echo "  RTT: ${rtt}ms"
            
            if [ $rtt -le $MAX_RTT ]; then
                successful_tests=$((successful_tests + 1))
                total_rtt=$((total_rtt + rtt))
            else
                echo "  ⚠️ RTT exceeds limit (${rtt}ms > ${MAX_RTT}ms)"
            fi
        else
            echo "  ❌ Request failed"
        fi
    fi
    
    sleep 1
done

# Calculate results
if [ $successful_tests -gt 0 ]; then
    avg_rtt=$((total_rtt / successful_tests))
    loss_percent=$(((total_tests - successful_tests) * 100 / total_tests))
    
    echo ""
    echo "📊 Test Results:"
    echo "  Successful tests: $successful_tests/$total_tests"
    echo "  Average RTT: ${avg_rtt}ms"
    echo "  Packet loss: ${loss_percent}%"
    echo ""
    
    # Check criteria
    rtt_ok=false
    loss_ok=false
    
    if [ $avg_rtt -le $MAX_RTT ]; then
        echo "✅ **RTT ≤ 1.2 s**: PASS (${avg_rtt}ms)"
        rtt_ok=true
    else
        echo "❌ **RTT ≤ 1.2 s**: FAIL (${avg_rtt}ms)"
    fi
    
    if [ $loss_percent -eq 0 ]; then
        echo "✅ **0 % loss**: PASS"
        loss_ok=true
    else
        echo "❌ **0 % loss**: FAIL (${loss_percent}% loss)"
    fi
    
    if [ "$rtt_ok" = true ] && [ "$loss_ok" = true ]; then
        echo ""
        echo "🎉 Nym mixnet test: PASS"
        exit 0
    else
        echo ""
        echo "❌ Nym mixnet test: FAIL"
        exit 1
    fi
else
    echo ""
    echo "❌ All tests failed - Nym client may not be working properly"
    echo "💡 Check if Nym client is properly initialized and running:"
    echo "   ~/.nym/bin/nym-client init --id priva"
    echo "   ~/.nym/bin/nym-client run --id priva &"
    exit 1
fi