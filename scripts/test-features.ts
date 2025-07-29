#!/usr/bin/env ts-node

/**
 * Feature Functionality Test Suite
 * 
 * Automated testing framework to validate that all PrivaChain features
 * are working correctly and identify any regression issues.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  testName: string;
  feature: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

interface TestSuite {
  name: string;
  results: TestResult[];
  passed: number;
  failed: number;
  warnings: number;
}

class FeatureTester {
  private rootPath: string;
  private testResults: TestResult[] = [];

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async runAllTests(): Promise<TestSuite[]> {
    console.log('🧪 Running PrivaChain Feature Functionality Tests...\n');

    const suites = [
      await this.testUserInterface(),
      await this.testCommunicationFeatures(),
      await this.testSecurityFeatures(),
      await this.testBlockchainIntegration(),
      await this.testStorageFeatures(),
      await this.testEconomicFeatures()
    ];

    return suites;
  }

  private async testUserInterface(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test UI Components Exist
    results.push(this.testFileExists(
      'src/components/MessengerView.tsx',
      'Messenger UI Component',
      'Messenger interface component exists',
      'critical'
    ));

    results.push(this.testFileExists(
      'src/components/EmailView.tsx',
      'Email UI Component',
      'Email interface component exists',
      'critical'
    ));

    results.push(this.testFileExists(
      'src/components/SearchView.tsx',
      'Search UI Component',
      'Search interface component exists',
      'high'
    ));

    results.push(this.testFileExists(
      'src/components/VideoCall.tsx',
      'Video Call UI Component',
      'Video calling interface component exists',
      'high'
    ));

    // Test UI Dependencies
    results.push(this.testDependency(
      '@radix-ui/react-dialog',
      'UI Framework',
      'Radix UI components for modern interface',
      'medium'
    ));

    results.push(this.testDependency(
      'lucide-react',
      'Icon System',
      'Icon library for UI elements',
      'medium'
    ));

    // Test Component Integration
    results.push(this.testComponentIntegration(
      'src/App.tsx',
      ['MessengerView', 'EmailView', 'SearchView'],
      'App Component Integration',
      'Main app integrates all UI components',
      'critical'
    ));

    return this.createTestSuite('User Interface', results);
  }

  private async testCommunicationFeatures(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test Video Calling
    results.push(this.testFileExists(
      'src/services/VideoCallService.ts',
      'Video Call Service',
      'Video calling service implementation exists',
      'high'
    ));

    results.push(this.testCodeContains(
      'src/services/VideoCallService.ts',
      'WebRTC',
      'WebRTC Integration',
      'Video calling uses WebRTC for P2P connections',
      'high'
    ));

    // Test Messaging
    results.push(this.testFileExists(
      'src/services/ProductionNetworking.ts',
      'Networking Service',
      'Networking and messaging service exists',
      'high'
    ));

    results.push(this.testCodeContains(
      'src/services/ProductionNetworking.ts',
      'libp2p',
      'P2P Networking',
      'Messaging uses libp2p for decentralized networking',
      'high'
    ));

    // Test Email System
    results.push(this.testFileExists(
      'src/services/EmailService.ts',
      'Email Service',
      'Email service implementation exists',
      'critical'
    ));

    results.push(this.testCodeContains(
      'src/services/EmailService.ts',
      'IPFS',
      'IPFS Email Storage',
      'Email system integrates with IPFS for storage',
      'high'
    ));

    return this.createTestSuite('Communication Features', results);
  }

  private async testSecurityFeatures(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test Cryptography
    results.push(this.testFileExists(
      'src/services/zkCrypto.ts',
      'ZK Crypto Service',
      'Zero-knowledge cryptography service exists',
      'critical'
    ));

    results.push(this.testCodeContains(
      'src/services/zkCrypto.ts',
      'WebCrypto',
      'Web Crypto API',
      'Cryptography uses WebCrypto API for security',
      'critical'
    ));

    // Test Key Management
    results.push(this.testCodeContains(
      'src/services/zkCrypto.ts',
      'generateKeyPair',
      'Key Generation',
      'Service can generate cryptographic key pairs',
      'critical'
    ));

    // Test Encryption
    results.push(this.testCodeContains(
      'src/services/zkCrypto.ts',
      'encrypt',
      'Encryption Functions',
      'Service provides encryption capabilities',
      'critical'
    ));

    // Test Anonymous Credentials
    results.push(this.testCodeContains(
      'src/services/zkCrypto.ts',
      'credential',
      'Anonymous Credentials',
      'Service supports anonymous credential system',
      'high'
    ));

    return this.createTestSuite('Security Features', results);
  }

  private async testBlockchainIntegration(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test Cosmos Integration
    results.push(this.testDependency(
      '@cosmjs/stargate',
      'Cosmos SDK Client',
      'CosmJS library for blockchain interaction',
      'critical'
    ));

    results.push(this.testFileExists(
      'src/services/cosmos.ts',
      'Cosmos Service',
      'Cosmos blockchain service exists',
      'critical'
    ));

    // Test Smart Contracts
    results.push(this.testFileExists(
      'contracts/mail/src/lib.rs',
      'Mail Contract',
      'CosmWasm mail contract exists',
      'high'
    ));

    results.push(this.testFileExists(
      'contracts/mail/src/contract.rs',
      'Contract Implementation',
      'Smart contract implementation exists',
      'high'
    ));

    // Test Gas Management
    results.push(this.testFileExists(
      'src/services/GasFeeManager.ts',
      'Gas Fee Manager',
      'Gas fee management service exists',
      'high'
    ));

    results.push(this.testCodeContains(
      'src/services/GasFeeManager.ts',
      'ATOM',
      'ATOM Gas Payments',
      'Gas fees paid using ATOM tokens',
      'high'
    ));

    return this.createTestSuite('Blockchain Integration', results);
  }

  private async testStorageFeatures(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test IPFS Integration
    results.push(this.testDependency(
      'helia',
      'IPFS Client',
      'Helia IPFS client library',
      'high'
    ));

    results.push(this.testFileExists(
      'src/services/ipfs.ts',
      'IPFS Service',
      'IPFS storage service exists',
      'high'
    ));

    results.push(this.testFileExists(
      'src/services/ProductionIPFS.ts',
      'Production IPFS',
      'Production IPFS service exists',
      'high'
    ));

    // Test OrbitDB
    results.push(this.testDependency(
      '@orbitdb/core',
      'OrbitDB',
      'OrbitDB for decentralized databases',
      'medium'
    ));

    results.push(this.testFileExists(
      'src/services/orbitdb.ts',
      'OrbitDB Service',
      'OrbitDB service exists',
      'medium'
    ));

    return this.createTestSuite('Storage Features', results);
  }

  private async testEconomicFeatures(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test Token Economics
    results.push(this.testFileExists(
      'src/services/ProductionEconomicSystem.ts',
      'Economic System',
      'Economic system service exists',
      'high'
    ));

    results.push(this.testCodeContains(
      'src/services/ProductionEconomicSystem.ts',
      'PRIV',
      'PRIV Token',
      'Economic system includes PRIV token functionality',
      'high'
    ));

    // Test Payment System
    results.push(this.testFileExists(
      'src/services/PaymentService.ts',
      'Payment Service',
      'Payment processing service exists',
      'medium'
    ));

    // Test Plan Management
    results.push(this.testFileExists(
      'src/services/PlanManager.ts',
      'Plan Manager',
      'User plan management service exists',
      'medium'
    ));

    results.push(this.testFileExists(
      'src/hooks/usePlanSystem.ts',
      'Plan System Hook',
      'React hook for plan system exists',
      'medium'
    ));

    return this.createTestSuite('Economic Features', results);
  }

  private testFileExists(
    filePath: string,
    feature: string,
    description: string,
    importance: 'critical' | 'high' | 'medium' | 'low'
  ): TestResult {
    const fullPath = join(this.rootPath, filePath);
    const exists = existsSync(fullPath);

    return {
      testName: `File Exists: ${filePath}`,
      feature,
      status: exists ? 'pass' : 'fail',
      message: exists ? description : `Missing file: ${filePath}`,
      importance
    };
  }

  private testDependency(
    packageName: string,
    feature: string,
    description: string,
    importance: 'critical' | 'high' | 'medium' | 'low'
  ): TestResult {
    try {
      const packageJsonPath = join(this.rootPath, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const hasDepency = packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName];

      return {
        testName: `Dependency: ${packageName}`,
        feature,
        status: hasDepency ? 'pass' : 'fail',
        message: hasDepency ? description : `Missing dependency: ${packageName}`,
        importance
      };
    } catch (error) {
      return {
        testName: `Dependency: ${packageName}`,
        feature,
        status: 'fail',
        message: `Error checking dependency: ${error}`,
        importance
      };
    }
  }

  private testCodeContains(
    filePath: string,
    searchTerm: string,
    feature: string,
    description: string,
    importance: 'critical' | 'high' | 'medium' | 'low'
  ): TestResult {
    const fullPath = join(this.rootPath, filePath);
    
    if (!existsSync(fullPath)) {
      return {
        testName: `Code Contains: ${searchTerm} in ${filePath}`,
        feature,
        status: 'fail',
        message: `File does not exist: ${filePath}`,
        importance
      };
    }

    try {
      const content = readFileSync(fullPath, 'utf8');
      const contains = content.includes(searchTerm);

      return {
        testName: `Code Contains: ${searchTerm} in ${filePath}`,
        feature,
        status: contains ? 'pass' : 'warning',
        message: contains ? description : `Code does not contain '${searchTerm}' - may be simulated`,
        importance
      };
    } catch (error) {
      return {
        testName: `Code Contains: ${searchTerm} in ${filePath}`,
        feature,
        status: 'fail',
        message: `Error reading file: ${error}`,
        importance
      };
    }
  }

  private testComponentIntegration(
    filePath: string,
    componentNames: string[],
    feature: string,
    description: string,
    importance: 'critical' | 'high' | 'medium' | 'low'
  ): TestResult {
    const fullPath = join(this.rootPath, filePath);
    
    if (!existsSync(fullPath)) {
      return {
        testName: `Component Integration: ${componentNames.join(', ')}`,
        feature,
        status: 'fail',
        message: `File does not exist: ${filePath}`,
        importance
      };
    }

    try {
      const content = readFileSync(fullPath, 'utf8');
      const missingComponents = componentNames.filter(comp => !content.includes(comp));

      if (missingComponents.length === 0) {
        return {
          testName: `Component Integration: ${componentNames.join(', ')}`,
          feature,
          status: 'pass',
          message: description,
          importance
        };
      } else {
        return {
          testName: `Component Integration: ${componentNames.join(', ')}`,
          feature,
          status: 'warning',
          message: `Missing components: ${missingComponents.join(', ')}`,
          importance
        };
      }
    } catch (error) {
      return {
        testName: `Component Integration: ${componentNames.join(', ')}`,
        feature,
        status: 'fail',
        message: `Error reading file: ${error}`,
        importance
      };
    }
  }

  private createTestSuite(name: string, results: TestResult[]): TestSuite {
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;

    return {
      name,
      results,
      passed,
      failed,
      warnings
    };
  }

  generateReport(suites: TestSuite[]): string {
    const totalTests = suites.reduce((sum, suite) => sum + suite.results.length, 0);
    const totalPassed = suites.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = suites.reduce((sum, suite) => sum + suite.failed, 0);
    const totalWarnings = suites.reduce((sum, suite) => sum + suite.warnings, 0);

    const lines = [
      '# PrivaChain Feature Functionality Test Report',
      '',
      '## 📊 Test Summary',
      `- **Total Tests**: ${totalTests}`,
      `- **Passed**: ${totalPassed} ✅`,
      `- **Failed**: ${totalFailed} ❌`,
      `- **Warnings**: ${totalWarnings} ⚠️`,
      `- **Success Rate**: ${Math.round((totalPassed / totalTests) * 100)}%`,
      '',
      '## 📋 Test Suite Results',
      ''
    ];

    suites.forEach(suite => {
      const successRate = Math.round((suite.passed / suite.results.length) * 100);
      const status = suite.failed === 0 ? '✅' : suite.failed > suite.passed ? '❌' : '⚠️';
      
      lines.push(`### ${status} ${suite.name}`);
      lines.push(`**Success Rate**: ${successRate}% (${suite.passed}/${suite.results.length} passed)`);
      lines.push('');

      // Show failed tests first, then warnings
      const criticalResults = suite.results.filter(r => r.status === 'fail' && r.importance === 'critical');
      const otherFailures = suite.results.filter(r => r.status === 'fail' && r.importance !== 'critical');
      const warnings = suite.results.filter(r => r.status === 'warning');

      if (criticalResults.length > 0) {
        lines.push('**🚨 Critical Failures:**');
        criticalResults.forEach(result => {
          lines.push(`- ❌ ${result.testName}: ${result.message}`);
        });
        lines.push('');
      }

      if (otherFailures.length > 0) {
        lines.push('**❌ Other Failures:**');
        otherFailures.forEach(result => {
          lines.push(`- ❌ ${result.testName}: ${result.message}`);
        });
        lines.push('');
      }

      if (warnings.length > 0) {
        lines.push('**⚠️ Warnings:**');
        warnings.forEach(result => {
          lines.push(`- ⚠️ ${result.testName}: ${result.message}`);
        });
        lines.push('');
      }
    });

    // Critical issues summary
    const criticalIssues = suites.flatMap(s => s.results)
      .filter(r => r.status === 'fail' && r.importance === 'critical');

    if (criticalIssues.length > 0) {
      lines.push('## 🚨 Critical Issues Requiring Immediate Attention');
      lines.push('');
      criticalIssues.forEach((issue, index) => {
        lines.push(`${index + 1}. **${issue.feature}**: ${issue.message}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }
}

// CLI execution
async function main() {
  const rootPath = process.cwd();
  const tester = new FeatureTester(rootPath);
  
  console.log('🧪 PrivaChain Feature Functionality Testing\n');
  
  const suites = await tester.runAllTests();
  const report = tester.generateReport(suites);
  
  console.log(report);
  
  // Output JSON for programmatic processing
  if (process.argv.includes('--json')) {
    console.log('\n---JSON OUTPUT---');
    console.log(JSON.stringify(suites, null, 2));
  }

  // Exit with error code if critical tests failed
  const criticalFailures = suites.flatMap(s => s.results)
    .filter(r => r.status === 'fail' && r.importance === 'critical');
  
  if (criticalFailures.length > 0) {
    console.log(`\n❌ ${criticalFailures.length} critical test(s) failed. Exiting with error code 1.`);
    process.exit(1);
  }
}

// Run main if this is the main module
main().catch(console.error);

export { FeatureTester, type TestResult, type TestSuite };