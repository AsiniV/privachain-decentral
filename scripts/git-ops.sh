#!/bin/bash

# PrivaChain Simple Git Operations
# Direct wrapper for basic git add, commit, push operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [OPERATION] [OPTIONS]

Simple git operations for PrivaChain development

OPERATIONS:
    add         Run 'git add -A' with security validation
    commit      Run 'git commit -m' with message prompt
    push        Run 'git push' to current branch
    full        Run complete add + commit + push workflow

EXAMPLES:
    $0 add                          # Add all changes
    $0 commit "Fix bug"             # Commit with message
    $0 push                         # Push to remote
    $0 full "Complete feature"      # Add, commit, and push

For advanced options, use scripts/git-workflow.sh directly.
EOF
}

# Execute git add with validation
do_git_add() {
    print_status "Running git add -A with security validation..."
    
    cd "$PROJECT_ROOT"
    
    # Run security scan first
    if [[ -f "scripts/precommit/secret-scan.cjs" ]]; then
        print_status "Running security scan..."
        if ! node scripts/precommit/secret-scan.cjs; then
            print_error "Security scan failed! Please remove sensitive information."
            exit 1
        fi
    fi
    
    # Show what will be added
    echo
    print_status "Files to be added:"
    git status --porcelain
    echo
    
    read -p "Continue with git add -A? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Operation cancelled"
        exit 1
    fi
    
    git add -A
    print_success "All changes added to staging"
}

# Execute git commit
do_git_commit() {
    local message="$1"
    
    cd "$PROJECT_ROOT"
    
    if [[ -z "$message" ]]; then
        read -p "Enter commit message: " message
        if [[ -z "$message" ]]; then
            print_error "Commit message is required"
            exit 1
        fi
    fi
    
    if ! git diff --cached --quiet; then
        git commit -m "$message"
        print_success "Changes committed: $message"
    else
        print_error "No staged changes to commit. Run 'git add' first."
        exit 1
    fi
}

# Execute git push
do_git_push() {
    cd "$PROJECT_ROOT"
    
    local current_branch
    current_branch=$(git branch --show-current)
    
    if [[ -z "$current_branch" ]]; then
        print_error "Unable to determine current branch"
        exit 1
    fi
    
    print_status "Pushing to branch: $current_branch"
    git push origin "$current_branch"
    print_success "Changes pushed to $current_branch"
}

# Main execution
main() {
    local operation="$1"
    shift || true
    
    case "$operation" in
        add)
            do_git_add
            ;;
        commit)
            do_git_commit "$*"
            ;;
        push)
            do_git_push
            ;;
        full)
            local message="$*"
            if [[ -z "$message" ]]; then
                read -p "Enter commit message: " message
                if [[ -z "$message" ]]; then
                    print_error "Commit message is required"
                    exit 1
                fi
            fi
            do_git_add
            do_git_commit "$message"
            do_git_push
            ;;
        -h|--help|help|"")
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown operation: $operation"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"