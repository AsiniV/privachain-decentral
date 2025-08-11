#!/usr/bin/env node
/**
 * Secret Scan - Precommit Hook for PrivaChain
 * Scans staged files for mnemonic phrases and other secrets
 * 
 * Usage: node scripts/precommit/secret-scan.js
 * 
 * Exit codes:
 * 0 - No secrets found
 * 1 - Secrets detected (blocks commit)
 * 2 - Script error
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// BIP39 mnemonic patterns to detect
const MNEMONIC_PATTERNS = [
  // Common test mnemonics
  /abandon\s+abandon\s+abandon/i,
  /test\s+test\s+test\s+test\s+test\s+test/i,
  
  // Generic BIP39 patterns (12+ words)
  /\b(?:[a-z]+\s+){11,23}[a-z]+\b/i,
  
  // Common wallet phrases
  /mnemon(ic|e)/i,
  /seed\s+phrase/i,
  /recovery\s+phrase/i,
  /private\s+key/i,
  
  // Specific dangerous patterns
  /(DEVELOPER_MNEMONIC|VITE_DEVELOPER_MNEMONIC)\s*=\s*"[^"]*"/i,
];

// API key patterns
const API_KEY_PATTERNS = [
  // Generic API keys
  /api[_-]?key\s*[=:]\s*["']?[a-zA-Z0-9]{20,}["']?/i,
  /secret[_-]?key\s*[=:]\s*["']?[a-zA-Z0-9]{20,}["']?/i,
  /access[_-]?token\s*[=:]\s*["']?[a-zA-Z0-9]{20,}["']?/i,
  
  // Specific service patterns
  /sk_live_[a-zA-Z0-9]+/i, // Stripe live keys
  /pk_live_[a-zA-Z0-9]+/i, // Stripe live public keys
];

// Files to always scan
const ALWAYS_SCAN = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.staging'
];

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  '.env.template',
  '.env.example',
  'secret-scan.js', // This file
  'node_modules/',
  'dist/',
  'target/',
  '.git/'
];

/**
 * Get list of staged files from Git
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(file => file.length > 0);
  } catch (error) {
    console.error('❌ Failed to get staged files:', error.message);
    return [];
  }
}

/**
 * Check if file should be excluded from scanning
 */
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Scan file content for secrets
 */
function scanFileContent(filePath, content) {
  const violations = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check for mnemonic patterns
    MNEMONIC_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'MNEMONIC',
          content: line.trim().substring(0, 80) + '...',
          severity: 'CRITICAL'
        });
      }
    });
    
    // Check for API key patterns
    API_KEY_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          type: 'API_KEY',
          content: line.trim().substring(0, 80) + '...',
          severity: 'HIGH'
        });
      }
    });
  });
  
  return violations;
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  if (shouldExclude(filePath)) {
    return [];
  }
  
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    return scanFileContent(filePath, content);
  } catch (error) {
    console.warn(`⚠️ Could not scan file ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Main scanning function
 */
function performSecretScan() {
  console.log('🔍 Scanning for secrets and mnemonics...');
  
  // Get staged files
  const stagedFiles = getStagedFiles();
  
  // Add always-scan files if they exist
  const filesToScan = [...stagedFiles];
  ALWAYS_SCAN.forEach(file => {
    if (fs.existsSync(file) && !filesToScan.includes(file)) {
      filesToScan.push(file);
    }
  });
  
  if (filesToScan.length === 0) {
    console.log('✅ No files to scan');
    return true;
  }
  
  console.log(`📁 Scanning ${filesToScan.length} files...`);
  
  // Scan all files
  let allViolations = [];
  filesToScan.forEach(file => {
    const violations = scanFile(file);
    allViolations = allViolations.concat(violations);
  });
  
  if (allViolations.length === 0) {
    console.log('✅ No secrets detected');
    return true;
  }
  
  // Report violations
  console.log('\n🚨 SECURITY VIOLATIONS DETECTED:\n');
  
  const criticalViolations = allViolations.filter(v => v.severity === 'CRITICAL');
  const highViolations = allViolations.filter(v => v.severity === 'HIGH');
  
  criticalViolations.forEach(violation => {
    console.log(`❌ CRITICAL: ${violation.type} in ${violation.file}:${violation.line}`);
    console.log(`   ${violation.content}`);
    console.log('');
  });
  
  highViolations.forEach(violation => {
    console.log(`⚠️  HIGH: ${violation.type} in ${violation.file}:${violation.line}`);
    console.log(`   ${violation.content}`);
    console.log('');
  });
  
  console.log('🔒 REMEDIATION STEPS:');
  
  if (criticalViolations.length > 0) {
    console.log('1. Remove all mnemonic phrases from staged files');
    console.log('2. Use environment variables instead of hardcoded secrets');
    console.log('3. Ensure .env files are in .gitignore');
  }
  
  if (highViolations.length > 0) {
    console.log('4. Remove API keys and tokens from source code');
    console.log('5. Use .env.template for documentation');
    console.log('6. Never commit production credentials');
  }
  
  console.log('\n💡 HELP:');
  console.log('- See .env.template for proper secret management');
  console.log('- Check .gitignore includes .env files');
  console.log('- Use placeholder values in templates');
  
  return false;
}

/**
 * Install Git hook (optional)
 */
function installGitHook() {
  const hookPath = '.git/hooks/pre-commit';
  const hookContent = `#!/bin/sh
# PrivaChain secret scanning pre-commit hook
node scripts/precommit/secret-scan.js
if [ $? -ne 0 ]; then
  echo "❌ Commit blocked by secret scan"
  exit 1
fi
`;

  try {
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    console.log('✅ Git pre-commit hook installed');
    console.log('   Hook path:', hookPath);
  } catch (error) {
    console.warn('⚠️ Could not install Git hook:', error.message);
    console.log('💡 Manual installation: copy the hook content to .git/hooks/pre-commit');
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--install-hook')) {
    installGitHook();
    process.exit(0);
  }
  
  const success = performSecretScan();
  process.exit(success ? 0 : 1);
}

module.exports = {
  performSecretScan,
  scanFileContent,
  MNEMONIC_PATTERNS,
  API_KEY_PATTERNS
};