#!/bin/bash

# PrivaChain Dependency Checker
# Ensures npm dependencies are installed before running commands

set -e

# Check if node_modules exists and has content
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi