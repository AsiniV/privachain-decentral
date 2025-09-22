# PrivaChain Git Workflow Automation

This document describes the automated git workflow tools available in PrivaChain.

## Overview

PrivaChain includes automated git workflow scripts that provide safe, validated git operations with built-in security scanning and testing.

## Quick Start

### Basic Git Operations

```bash
# Add all changes with security validation
npm run git:add

# Commit changes with security checks
npm run git:commit "Your commit message"

# Push to current branch
npm run git:push

# Complete workflow: add + commit + push
npm run git:full "Your commit message"
```

### Advanced Operations

```bash
# Commit and push in one command
npm run git:commit-push "Your commit message"

# Quick commit (skip tests)
npm run git:quick "Quick fix"

# Force commit and push (skip safety checks)
npm run git:force "Emergency commit"
```

## Scripts

### 1. `scripts/git-workflow.sh`

Advanced git automation with full validation pipeline.

**Features:**
- Comprehensive security scanning
- Automatic test validation
- Interactive safety prompts
- Customizable options

**Usage:**
```bash
./scripts/git-workflow.sh [OPTIONS] "commit message"

OPTIONS:
    -p, --push          Push changes to remote after commit
    -f, --force         Force operations (skip some safety checks)
    -s, --skip-tests    Skip running tests before commit
    -h, --help          Show help message
```

**Examples:**
```bash
./scripts/git-workflow.sh "Fix authentication bug"
./scripts/git-workflow.sh --push "Add new feature"
./scripts/git-workflow.sh -p -s "Quick docs update"
```

### 2. `scripts/git-ops.sh`

Simple git operations wrapper for basic workflows.

**Usage:**
```bash
./scripts/git-ops.sh [OPERATION] [OPTIONS]

OPERATIONS:
    add         Run 'git add -A' with security validation
    commit      Run 'git commit -m' with message prompt
    push        Run 'git push' to current branch
    full        Run complete add + commit + push workflow
```

**Examples:**
```bash
./scripts/git-ops.sh add
./scripts/git-ops.sh commit "Fix bug"
./scripts/git-ops.sh push
./scripts/git-ops.sh full "Complete feature"
```

## Security Features

### Automatic Secret Scanning

All git operations include automatic secret scanning using `scripts/precommit/secret-scan.cjs`:

- **Recovery Word Detection**: Identifies BIP39 wallet recovery words
- **API Key Detection**: Finds potential API keys and tokens
- **Credential Protection**: Prevents committing sensitive information
- **File Validation**: Scans staged files before commit

### Safety Checks

- **Untracked File Warning**: Alerts about untracked files before `git add -A`
- **Test Validation**: Runs linting and build tests before commit
- **Interactive Prompts**: Confirms operations when issues are detected
- **Branch Validation**: Ensures valid git state before operations

## NPM Scripts Reference

| Script | Description | Equivalent Command |
|--------|-------------|-------------------|
| `npm run git:add` | Add all changes with validation | `git add -A` + security scan |
| `npm run git:commit "msg"` | Commit with full validation | `git commit -m` + tests + security |
| `npm run git:push` | Push to current branch | `git push origin <branch>` |
| `npm run git:full "msg"` | Complete add + commit + push | All operations combined |
| `npm run git:commit-push "msg"` | Commit and push with validation | Commit + push with checks |
| `npm run git:quick "msg"` | Quick commit (skip tests) | Fast commit for minor changes |
| `npm run git:force "msg"` | Force commit and push | Skip safety checks |

## Workflow Integration

### Development Workflow

1. **Make Changes**: Edit code, add features, fix bugs
2. **Add Changes**: `npm run git:add` (with security validation)
3. **Commit**: `npm run git:commit "description"` (with tests)
4. **Push**: `npm run git:push` (to current branch)

### Continuous Integration

The git workflow integrates with existing CI/CD processes:

- **Pre-commit Hooks**: Secret scanning runs automatically
- **Test Integration**: Linting and build tests validate code
- **Security Pipeline**: Prevents committing sensitive data

### Error Handling

The scripts provide clear error messages and recovery suggestions:

```bash
# If security scan fails:
[ERROR] Security scan failed - secrets detected!
[ERROR] Please remove sensitive information before committing

# If tests fail:
[WARNING] Linting failed or not available
Continue despite linting issues? (y/N):

# If no staged changes:
[WARNING] No staged changes to commit
```

## Configuration

### Environment Variables

```bash
# Optional: Customize git behavior
export GIT_WORKFLOW_SKIP_TESTS=true    # Skip tests by default
export GIT_WORKFLOW_FORCE_MODE=true    # Enable force mode
export GIT_WORKFLOW_AUTO_PUSH=true     # Auto-push after commit
```

### Git Hooks Integration

Install pre-commit hooks for automatic secret scanning:

```bash
npm run scan:secrets:install-hook
```

## Troubleshooting

### Common Issues

**"Not in a git repository"**
- Ensure you're in the project root directory
- Check that `.git` directory exists

**"Security scan failed"**
- Review staged files for sensitive information
- Check `.env` files are in `.gitignore`
- Remove any wallet recovery words or API keys

**"No staged changes to commit"**
- Run `npm run git:add` first
- Check `git status` for unstaged changes

**"Failed to push changes"**
- Check internet connectivity
- Verify remote repository permissions
- Ensure branch exists on remote

### Getting Help

```bash
# Show detailed help for workflow script
./scripts/git-workflow.sh --help

# Show help for simple operations
./scripts/git-ops.sh --help

# Check git status
git status

# View recent commits
git log --oneline -5
```

## Best Practices

1. **Always use security-validated operations** for commits containing code changes
2. **Use quick mode** only for documentation or minor non-code changes
3. **Review staged changes** before committing with `git diff --cached`
4. **Test locally** before pushing to shared branches
5. **Use descriptive commit messages** following conventional commit format

## Contributing

When contributing to the git workflow scripts:

1. Test all operations with various scenarios
2. Ensure security scanning remains functional
3. Update documentation for new features
4. Maintain backward compatibility with existing workflows