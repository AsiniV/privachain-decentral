#!/usr/bin/env bash
# Legacy wrapper for v2.0 smoke tests
# This script redirects to the new v2.0 smoke test scripts

set -euo pipefail

echo "🕸️ NYM Mixnet Smoke Test (v2.0)"
echo "==============================="
echo ""
echo "⚠️  This is the legacy test script."
echo "    In v2.0, mixnet is now the default transport."
echo ""
echo "Running v2.0 smoke tests..."
echo ""

# Run mixnet-default test
echo "1️⃣  Testing mixnet-default (default build)..."
./scripts/smoke-mixnet-default.sh
echo ""

# Run fallback-tor test
echo "2️⃣  Testing fallback-tor (optional feature)..."
./scripts/smoke-fallback-tor.sh
echo ""

echo "==============================="
echo "✅ All v2.0 smoke tests passed!"
echo "==============================="
