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

# Start dev server in background
echo "🚀 Starting development server..."
npm run dev &
DEV_PID=$!

# Wait for server to start (with timeout)
echo "⏳ Waiting for server to start..."
sleep 12

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
kill $DEV_PID 2>/dev/null || pkill -f vite 2>/dev/null || true

if [ "$SERVER_FOUND" = true ]; then
    exit 0
else
    echo "❌ Dev server test failed - no response on any port"
    exit 1
fi