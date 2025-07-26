#!/bin/bash

# PrivaChain Local Testing Validation Script
# Validates that all requirements for local testing are met

set -e

echo "🧪 PrivaChain Local Testing Validation"
echo "====================================="
echo ""

ERRORS=0
WARNINGS=0

# Helper functions
check_success() {
    echo "✅ $1"
}

check_warning() {
    echo "⚠️  $1"
    ((WARNINGS++))
}

check_error() {
    echo "❌ $1"
    ((ERRORS++))
}

# Check system requirements
echo "🔍 Checking system requirements..."

# Node.js check
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        check_success "Node.js $(node --version) installed"
    else
        check_error "Node.js version $NODE_VERSION is too old (requires v18+)"
    fi
else
    check_error "Node.js not found"
fi

# npm check
if command -v npm &> /dev/null; then
    check_success "npm $(npm --version) installed"
else
    check_error "npm not found"
fi

# Rust/Cargo check
if command -v cargo &> /dev/null; then
    check_success "Cargo $(cargo --version | cut -d' ' -f2) installed"
else
    check_error "Rust/Cargo not found"
fi

# wasm32 target check
if rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    check_success "wasm32-unknown-unknown target installed"
else
    check_warning "wasm32-unknown-unknown target not installed (auto-installable)"
fi

echo ""

# Check project structure
echo "📁 Checking project structure..."

if [ -f "package.json" ]; then
    check_success "package.json found"
else
    check_error "package.json not found - are you in the project root?"
fi

if [ -d "contracts/mail" ]; then
    check_success "Smart contract directory found"
else
    check_error "contracts/mail directory not found"
fi

if [ -f "src/main.tsx" ]; then
    check_success "Frontend source files found"
else
    check_error "Frontend source files not found"
fi

echo ""

# Check dependencies
echo "📦 Checking dependencies..."

if [ -d "node_modules" ]; then
    check_success "Node modules installed"
else
    check_warning "Node modules not found - run 'npm install'"
fi

# Check for key npm scripts
if grep -q '"dev"' package.json; then
    check_success "npm run dev script available"
else
    check_error "npm run dev script not found"
fi

if grep -q '"test"' package.json; then
    check_success "npm run test script available"
else
    check_error "npm run test script not found"
fi

echo ""

# Test builds
echo "🔨 Testing builds..."

# Test TypeScript compilation
if npm run test:build &> /dev/null; then
    check_success "TypeScript compilation works"
else
    check_error "TypeScript compilation failed"
fi

# Test contract build
if [ -d "contracts/mail" ]; then
    cd contracts/mail
    if cargo check &> /dev/null; then
        check_success "Smart contract compiles"
    else
        check_error "Smart contract compilation failed"
    fi
    cd ../..
fi

echo ""

# Test key functionality
echo "🧪 Testing key functionality..."

# Test linting
if npm run test:lint &> /tmp/lint_output.txt; then
    check_success "Code linting passes"
else
    LINT_ERRORS=$(grep -c "error" /tmp/lint_output.txt || echo "0")
    LINT_WARNINGS=$(grep -c "warning" /tmp/lint_output.txt || echo "0")
    
    if [ "$LINT_ERRORS" -gt 0 ]; then
        check_error "Code linting has $LINT_ERRORS error(s)"
    else
        check_warning "Code linting has $LINT_WARNINGS warning(s) (acceptable for development)"
    fi
fi

# Test contract tests
if npm run test:contracts &> /dev/null; then
    check_success "Smart contract tests pass"
else
    check_error "Smart contract tests failed"
fi

echo ""

# Summary
echo "📊 Validation Summary"
echo "===================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 All checks passed! Your environment is ready for local testing."
    echo ""
    echo "Next steps:"
    echo "  npm run dev    # Start development server"
    echo "  npm run test   # Run test suite"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "✅ Environment is functional with $WARNINGS warning(s)"
    echo "You can proceed with development, but consider addressing the warnings."
    exit 0
else
    echo "❌ Found $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    echo "Please fix the errors before proceeding:"
    echo "  - Install missing dependencies"
    echo "  - Ensure you're in the correct directory"
    echo "  - Check the LOCAL_TESTING.md guide for help"
    exit 1
fi