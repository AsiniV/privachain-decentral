#!/bin/bash

# PrivaChain Search Data Population Runner
# Handles TypeScript execution with proper ESM configuration

echo "🚀 Starting PrivaChain search data population..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run TypeScript with proper ESM configuration
npx tsx scripts/populate-search-data.ts "$@"