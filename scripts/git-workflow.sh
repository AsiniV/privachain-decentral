#!/bin/bash

# PrivaChain Git Workflow Automation
# Safely handles git add, commit, and push operations with security validation

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMMIT_MESSAGE=""
SHOULD_PUSH=false
FORCE_MODE=false
SKIP_TESTS=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage information
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] "commit message"

PrivaChain Git Workflow Automation - Safely handles git operations

OPTIONS:
    -p, --push          Push changes to remote after commit
    -f, --force         Force operations (skip some safety checks)
    -s, --skip-tests    Skip running tests before commit
    -h, --help          Show this help message

EXAMPLES:
    $0 "Fix authentication bug"
    $0 --push "Add new feature implementation"
    $0 -p -s "Quick documentation update"

SECURITY:
    - Automatically runs secret scanning before commit
    - Validates staged files for sensitive information
    - Runs basic tests unless --skip-tests is specified
    - Checks for uncommitted changes before pushing

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--push)
                SHOULD_PUSH=true
                shift
                ;;
            -f|--force)
                FORCE_MODE=true
                shift
                ;;
            -s|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                if [[ -z "$COMMIT_MESSAGE" ]]; then
                    COMMIT_MESSAGE="$1"
                else
                    print_error "Multiple commit messages provided. Use quotes for messages with spaces."
                    exit 1
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$COMMIT_MESSAGE" ]]; then
        print_error "Commit message is required"
        show_usage
        exit 1
    fi
}

# Check if git repository is clean enough for operations
check_git_status() {
    print_status "Checking git repository status..."
    
    cd "$PROJECT_ROOT"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Check for untracked files that might be important
    local untracked_files
    untracked_files=$(git ls-files --others --exclude-standard)
    
    if [[ -n "$untracked_files" ]] && [[ "$FORCE_MODE" = false ]]; then
        print_warning "Untracked files found:"
        echo "$untracked_files" | head -10
        echo
        read -p "Continue with git add -A? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Operation cancelled by user"
            exit 1
        fi
    fi
}

# Run security scanning on staged files
run_security_scan() {
    print_status "Running security scan..."
    
    cd "$PROJECT_ROOT"
    
    # Run secret scanning if the script exists
    if [[ -f "scripts/precommit/secret-scan.cjs" ]]; then
        if ! node scripts/precommit/secret-scan.cjs; then
            print_error "Security scan failed - secrets detected!"
            print_error "Please remove sensitive information before committing"
            exit 1
        fi
        print_success "Security scan passed"
    else
        print_warning "Secret scan script not found, skipping security check"
    fi
}

# Run basic validation tests
run_validation_tests() {
    if [[ "$SKIP_TESTS" = true ]]; then
        print_warning "Skipping tests as requested"
        return 0
    fi
    
    print_status "Running validation tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run linting if available
    if npm run test:lint &>/dev/null; then
        print_success "Linting passed"
    else
        print_warning "Linting failed or not available"
        if [[ "$FORCE_MODE" = false ]]; then
            read -p "Continue despite linting issues? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_error "Operation cancelled due to linting issues"
                exit 1
            fi
        fi
    fi
    
    # Run build test if available
    if npm run test:build &>/dev/null; then
        print_success "Build test passed"
    else
        print_warning "Build test failed or not available"
        if [[ "$FORCE_MODE" = false ]]; then
            read -p "Continue despite build issues? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_error "Operation cancelled due to build issues"
                exit 1
            fi
        fi
    fi
}

# Execute git add -A
git_add_all() {
    print_status "Adding all changes to staging..."
    
    cd "$PROJECT_ROOT"
    
    # Show what will be added
    print_status "Files to be added:"
    git status --porcelain | head -20
    
    if ! git add -A; then
        print_error "Failed to add files to staging"
        exit 1
    fi
    
    # Show staged changes summary
    local staged_count
    staged_count=$(git diff --cached --name-only | wc -l)
    print_success "Added $staged_count files to staging"
}

# Execute git commit
git_commit() {
    print_status "Committing changes..."
    
    cd "$PROJECT_ROOT"
    
    # Check if there are staged changes
    if ! git diff --cached --quiet; then
        if git commit -m "$COMMIT_MESSAGE"; then
            print_success "Changes committed successfully"
            git log --oneline -1
        else
            print_error "Failed to commit changes"
            exit 1
        fi
    else
        print_warning "No staged changes to commit"
        return 1
    fi
}

# Execute git push
git_push() {
    if [[ "$SHOULD_PUSH" = false ]]; then
        return 0
    fi
    
    print_status "Pushing changes to remote..."
    
    cd "$PROJECT_ROOT"
    
    # Get current branch
    local current_branch
    current_branch=$(git branch --show-current)
    
    if [[ -z "$current_branch" ]]; then
        print_error "Unable to determine current branch"
        exit 1
    fi
    
    print_status "Pushing to branch: $current_branch"
    
    # Check if remote exists
    if ! git remote get-url origin &>/dev/null; then
        print_error "No remote 'origin' configured"
        exit 1
    fi
    
    # Push with verbose output
    if git push -v origin "$current_branch"; then
        print_success "Changes pushed successfully to $current_branch"
    else
        print_error "Failed to push changes"
        exit 1
    fi
}

# Main execution flow
main() {
    print_status "PrivaChain Git Workflow Automation"
    echo "============================================"
    
    parse_arguments "$@"
    
    print_status "Commit message: '$COMMIT_MESSAGE'"
    if [[ "$SHOULD_PUSH" = true ]]; then
        print_status "Will push changes after commit"
    fi
    if [[ "$FORCE_MODE" = true ]]; then
        print_warning "Force mode enabled - some safety checks will be skipped"
    fi
    echo
    
    # Execute workflow steps
    check_git_status
    git_add_all
    run_security_scan
    run_validation_tests
    
    if git_commit; then
        git_push
        echo
        print_success "Git workflow completed successfully!"
        
        # Show final status
        print_status "Repository status:"
        cd "$PROJECT_ROOT"
        git status --short
    else
        print_warning "No changes were committed"
    fi
}

# Run main function with all arguments
main "$@"