#!/bin/bash
# Script to check for secrets in client bundle
# Prevents TURN secrets from being exposed in the frontend build

echo "🔍 Checking client bundle for exposed secrets..."

BUILD_DIR="dist"
ERRORS=0

# Check if build directory exists
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Build directory '$BUILD_DIR' not found. Run 'npm run build' first."
    exit 1
fi

# Define sensitive patterns to search for
SENSITIVE_PATTERNS=(
    "METERED_TURN_SECRET"
    "METERED_API_KEY"
    "cb4e537c8daa78b39585ef06"  # Old exposed username
    "OTzH3vBKW7iEnYxb"          # Old exposed credential
    "b15ef1e4a92aa5421bffbd4d41822942362d"  # Old exposed API key
)

echo "📦 Scanning build artifacts in $BUILD_DIR..."

# Check each pattern
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    echo "🔍 Checking for pattern: $pattern"
    
    # Search in all files in build directory
    matches=$(find "$BUILD_DIR" -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec grep -l "$pattern" {} \; 2>/dev/null)
    
    if [ -n "$matches" ]; then
        echo "❌ SECURITY ISSUE: Pattern '$pattern' found in:"
        echo "$matches"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ Pattern '$pattern' not found in bundle"
    fi
done

# Check for any environment variable references that shouldn't be there
echo "🔍 Checking for exposed environment variables..."
env_vars=$(find "$BUILD_DIR" -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec grep -l "VITE_METERED_" {} \; 2>/dev/null)

if [ -n "$env_vars" ]; then
    echo "❌ SECURITY ISSUE: VITE_METERED_ environment variables found in:"
    echo "$env_vars"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ No exposed VITE_METERED_ environment variables found"
fi

# Summary
echo ""
echo "📊 Security scan summary:"
if [ $ERRORS -eq 0 ]; then
    echo "✅ No secrets found in client bundle - PASS"
    exit 0
else
    echo "❌ $ERRORS security issue(s) found in client bundle - FAIL"
    echo ""
    echo "🔧 To fix these issues:"
    echo "  1. Remove any VITE_ prefixed sensitive environment variables"
    echo "  2. Ensure secrets are only used server-side"
    echo "  3. Use the /api/ice endpoint instead of direct API calls"
    exit 1
fi