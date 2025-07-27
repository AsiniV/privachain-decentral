#!/bin/bash

# PrivaChain Dev Server Test Script
# Tests that the development server can start and respond to HTTP requests

set -e

echo "🧪 Testing development server..."

# Ensure dependencies are installed
bash scripts/ensure-deps.sh

# Kill any existing vite processes
pkill -f vite 2>/dev/null || true
sleep 2

# Global variable for dev server PID
DEV_PID=""

# Function to start dev server and check for rollup error
start_dev_server() {
    local attempt=$1
    echo "🚀 Starting development server (attempt $attempt)..."
    
    # Create a temporary file to capture output
    local temp_log=$(mktemp)
    
    # Start dev server in background and capture output
    npm run dev > "$temp_log" 2>&1 &
    DEV_PID=$!
    
    # Wait a bit to see if it starts successfully or fails quickly
    sleep 5
    
    # Check if the process is still running
    if ! kill -0 $DEV_PID 2>/dev/null; then
        # Process died, check for rollup error
        if grep -q "Cannot find module @rollup/rollup-darwin-arm64" "$temp_log"; then
            echo "🔧 Detected rollup darwin-arm64 dependency issue. Applying fix..."
            rm -f "$temp_log"
            DEV_PID=""  # Clear PID since process failed
            return 1  # Signal that we need to retry with fix
        else
            echo "❌ Dev server failed to start with unknown error:"
            cat "$temp_log"
            rm -f "$temp_log"
            DEV_PID=""  # Clear PID since process failed
            exit 1
        fi
    fi
    
    rm -f "$temp_log"
    return 0  # Success
}

# Try to start dev server, with automatic fix for rollup issue
if ! start_dev_server 1; then
    echo "🛠️  Applying npm optional dependency fix..."
    echo "   Removing package-lock.json and node_modules..."
    rm -rf package-lock.json node_modules
    echo "   Reinstalling dependencies..."
    npm install
    echo "✅ Dependencies reinstalled. Retrying dev server..."
    
    # Kill any remaining processes
    pkill -f vite 2>/dev/null || true
    sleep 2
    
    if ! start_dev_server 2; then
        echo "❌ Dev server failed to start even after applying fix"
        exit 1
    fi
fi

# Wait for server to fully initialize
echo "⏳ Waiting for server to fully start..."
sleep 7

# Try both common ports
PORTS=("5173" "5174")
SERVER_FOUND=false

for PORT in "${PORTS[@]}"; do
    echo "🔍 Testing server response on port $PORT..."
    if curl -f http://localhost:$PORT > /dev/null 2>&1; then
        echo "✅ Dev server test passed (port $PORT)"
        SERVER_FOUND=true
        break
    fi
done

# Cleanup
if [ -n "$DEV_PID" ]; then
    kill $DEV_PID 2>/dev/null || true
fi
pkill -f vite 2>/dev/null || true

if [ "$SERVER_FOUND" = true ]; then
    exit 0
else
    echo "❌ Dev server test failed - no response on any port"
    exit 1
fi