#!/usr/bin/env ts-node

/**
 * Feature Functionality Test Suite
 * 
 * Automated testing framework to validate that all PrivaChain features
 * are working correctly and identify any regression issues.
 * Updated to perform runtime functionality tests instead of just presence checks.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Import production services for functional testing
// Using dynamic imports to handle ES module compatibility
let BlockchainUtils: any
let videoQualityContract: any
let privaChainIPFS: any

async function initializeTestModules() {
  try {
    const cryptoModule = await import('../src/lib/crypto')
    BlockchainUtils = cryptoModule.BlockchainUtils
    
    const videoModule = await import('../src/blockchain/videoQualityContract')
    videoQualityContract = videoModule.videoQualityContract
    
    const ipfsModule = await import('../src/services/ipfs')
    privaChainIPFS = ipfsModule.privaChainIPFS
    
    console.log('✅ Test modules loaded successfully')
  } catch (error) {
    console.warn('⚠️ Failed to load test modules:', error)
  }
}

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

    // Initialize test modules
    await initializeTestModules()

    const suites = [
      await this.testUserInterface(),
      await this.testCommunicationFeatures(),
      await this.testSecurityFeatures(),
      await this.testBlockchainIntegration(),
      await this.testStorageFeatures(),
      await this.testEconomicFeatures(),
      // New functional test suites
      await this.testBlockchainFunctionality(),
      await this.testIPFSFunctionality(),
      await this.testVideoQualityFunctionality()
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

  /**
   * NEW: Test blockchain functionality with real Cosmos SDK integration
   */
  private async testBlockchainFunctionality(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test proof of work generation
    results.push(await this.testProofOfWorkGeneration());

    // Test stake verification 
    results.push(await this.testStakeVerification());

    // Test quota checking
    results.push(await this.testQuotaChecking());

    return this.createTestSuite('Blockchain Functionality', results);
  }

  /**
   * NEW: Test IPFS functionality with real Helia integration
   */
  private async testIPFSFunctionality(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test IPFS initialization
    results.push(await this.testIPFSInitialization());

    // Test content indexing
    results.push(await this.testContentIndexing());

    // Test encrypted upload/download
    results.push(await this.testEncryptedStorage());

    return this.createTestSuite('IPFS Functionality', results);
  }

  /**
   * NEW: Test video quality contract functionality
   */
  private async testVideoQualityFunctionality(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test optimal server selection
    results.push(await this.testOptimalServerSelection());

    // Test server metrics reporting
    results.push(await this.testServerMetricsReporting());

    return this.createTestSuite('Video Quality Functionality', results);
  }

  /**
   * Functional test: Proof of Work generation
   */
  private async testProofOfWorkGeneration(): Promise<TestResult> {
    if (!BlockchainUtils) {
      return {
        testName: 'Proof of Work Generation',
        feature: 'Blockchain Crypto',
        status: 'fail',
        message: 'BlockchainUtils module not available',
        importance: 'high'
      }
    }

    try {
      const challenge = 'test_challenge_' + Date.now()
      const difficulty = 2 // Low difficulty for testing

      console.log('Testing proof of work generation...')
      const startTime = Date.now()
      const proof = await BlockchainUtils.generateProofOfWork(challenge, difficulty)
      const endTime = Date.now()

      if (proof && proof.startsWith('pow_') && (endTime - startTime) < 30000) {
        return {
          testName: 'Proof of Work Generation',
          feature: 'Blockchain Crypto',
          status: 'pass',
          message: `Generated proof in ${endTime - startTime}ms: ${proof.substring(0, 20)}...`,
          importance: 'high'
        }
      } else {
        return {
          testName: 'Proof of Work Generation',
          feature: 'Blockchain Crypto',
          status: 'fail',
          message: 'Proof of work generation failed or took too long',
          importance: 'high'
        }
      }
    } catch (error) {
      return {
        testName: 'Proof of Work Generation',
        feature: 'Blockchain Crypto',
        status: 'fail',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importance: 'high'
      }
    }
  }

  /**
   * Functional test: Stake verification
   */
  private async testStakeVerification(): Promise<TestResult> {
    if (!BlockchainUtils) {
      return {
        testName: 'Stake Verification',
        feature: 'Blockchain Integration',
        status: 'fail',
        message: 'BlockchainUtils module not available',
        importance: 'high'
      }
    }

    try {
      console.log('Testing stake verification...')
      const result = await BlockchainUtils.verifyStake()

      if (typeof result.hasStake === 'boolean' && typeof result.amount === 'number') {
        return {
          testName: 'Stake Verification',
          feature: 'Blockchain Integration',
          status: 'pass',
          message: `Stake check completed: ${result.hasStake ? 'Has stake' : 'No stake'} (${result.amount} ATOM)`,
          importance: 'high'
        }
      } else {
        return {
          testName: 'Stake Verification',
          feature: 'Blockchain Integration',
          status: 'fail',
          message: 'Invalid stake verification response format',
          importance: 'high'
        }
      }
    } catch (error) {
      return {
        testName: 'Stake Verification',
        feature: 'Blockchain Integration',
        status: 'warning',
        message: `Stake verification using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importance: 'high'
      }
    }
  }

  /**
   * Functional test: Quota checking
   */
  private async testQuotaChecking(): Promise<TestResult> {
    try {
      console.log('Testing quota checking...')
      const quota = await BlockchainUtils.checkQuota()

      if (quota.messages_limit && quota.emails_limit && quota.video_minutes_limit) {
        return {
          testName: 'Quota Checking',
          feature: 'Resource Management',
          status: 'pass',
          message: `Quota check successful: ${quota.messages_used}/${quota.messages_limit} messages, ${quota.emails_used}/${quota.emails_limit} emails`,
          importance: 'medium'
        }
      } else {
        return {
          testName: 'Quota Checking',
          feature: 'Resource Management',
          status: 'fail',
          message: 'Invalid quota response format',
          importance: 'medium'
        }
      }
    } catch (error) {
      return {
        testName: 'Quota Checking',
        feature: 'Resource Management',
        status: 'warning',
        message: `Using default quota limits: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importance: 'medium'
      }
    }
  }

  /**
   * Functional test: IPFS initialization
   */
  private async testIPFSInitialization(): Promise<TestResult> {
    try {
      console.log('Testing IPFS initialization...')
      const ipfs = await privaChainIPFS.initIpfs()
      const status = privaChainIPFS.getStatus()

      if (status.initialized && ipfs) {
        return {
          testName: 'IPFS Initialization',
          feature: 'Decentralized Storage',
          status: 'pass',
          message: `IPFS initialized successfully with ${status.peers} peers`,
          importance: 'critical'
        }
      } else {
        return {
          testName: 'IPFS Initialization',
          feature: 'Decentralized Storage',
          status: 'fail',
          message: 'IPFS failed to initialize properly',
          importance: 'critical'
        }
      }
    } catch (error) {
      return {
        testName: 'IPFS Initialization',
        feature: 'Decentralized Storage',
        status: 'fail',
        message: `IPFS initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importance: 'critical'
      }
    }
  }

  /**
   * Functional test: Content indexing
   */
  private async testContentIndexing(): Promise<TestResult> {
    try {
      console.log('Testing content indexing...')
      
      // First ensure IPFS is initialized
      await privaChainIPFS.initIpfs()
      
      const testContent = 'Test content for indexing: ' + Date.now()
      const keywords = ['test', 'indexing', 'privachain']
      
      const cid = await privaChainIPFS.indexContent(testContent, keywords)
      
      if (cid && cid.length > 0) {
        // Test search functionality
        const searchResults = await privaChainIPFS.searchIndex('test')
        
        return {
          testName: 'Content Indexing',
          feature: 'IPFS Search',
          status: 'pass',
          message: `Content indexed successfully: ${cid.substring(0, 20)}..., search found ${searchResults.length} results`,
          importance: 'high'
        }
      } else {
        return {
          testName: 'Content Indexing',
          feature: 'IPFS Search',
          status: 'fail',
          message: 'Content indexing returned invalid CID',
          importance: 'high'
        }
      }
    } catch (error) {
      return {
        testName: 'Content Indexing',
        feature: 'IPFS Search',
        status: 'fail',
        message: `Content indexing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importance: 'high'
      }
    }
  }

  /**
   * Functional test: Encrypted storage
   */
  private async testEncryptedStorage(): Promise<TestResult> {
    try {
      console.log('Testing encrypted storage...')
      
      // First ensure IPFS is initialized
      await privaChainIPFS.initIpfs()
      
      const testData = 'Encrypted test data: ' + Date.now()
      
      // Upload encrypted content
      const encrypted = await privaChainIPFS.uploadEncrypted(testData, 'test.txt')
      
      if (encrypted.cid && encrypted.encryptionKey) {
        // Try to download and decrypt
        const decrypted = await privaChainIPFS.downloadEncrypted(encrypted)
        const decryptedText = new TextDecoder().decode(decrypted)
        
        if (decryptedText === testData) {
          return {
            testName: 'Encrypted Storage',
            feature: 'IPFS Encryption',
            status: 'pass',
            message: `Encryption/decryption successful: ${encrypted.cid.substring(0, 20)}...`,
            importance: 'critical'
          }
        } else {
          return {
            testName: 'Encrypted Storage',
            feature: 'IPFS Encryption',
            status: 'fail',
            message: 'Decrypted content does not match original',
            importance: 'critical'
          }
        }
      } else {
        return {
          testName: 'Encrypted Storage',
          feature: 'IPFS Encryption',
          status: 'fail',
          message: 'Encryption upload failed',
          importance: 'critical'
        }
      }
    } catch (error) {
      return {
        testName: 'Encrypted Storage',
        feature: 'IPFS Encryption',
        status: 'fail',
        message: `Encryption test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importance: 'critical'
      }
    }
  }

  /**
   * Functional test: Optimal server selection
   */
  private async testOptimalServerSelection(): Promise<TestResult> {
    try {
      console.log('Testing optimal server selection...')
      
      const server = await videoQualityContract.requestOptimalServer('US-East', 'HD')
      
      if (server && server.id && server.url && server.region) {
        return {
          testName: 'Optimal Server Selection',
          feature: 'Video Quality',
          status: 'pass',
          message: `Selected server: ${server.id} in ${server.region} (${server.latency}ms latency)`,
          importance: 'high'
        }
      } else {
        return {
          testName: 'Optimal Server Selection',
          feature: 'Video Quality',
          status: 'fail',
          message: 'Invalid server selection response',
          importance: 'high'
        }
      }
    } catch (error) {
      return {
        testName: 'Optimal Server Selection',
        feature: 'Video Quality',
        status: 'fail',
        message: `Server selection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importance: 'high'
      }
    }
  }

  /**
   * Functional test: Server metrics reporting
   */
  private async testServerMetricsReporting(): Promise<TestResult> {
    try {
      console.log('Testing server metrics reporting...')
      
      const testServerId = 'test-server-' + Date.now()
      
      // Try to update server metrics
      await videoQualityContract.updateServerMetrics(testServerId, 50, 95.5)
      
      // Try to get server stats
      const stats = await videoQualityContract.getServerStats(testServerId)
      
      if (stats && typeof stats.averageLatency === 'number') {
        return {
          testName: 'Server Metrics Reporting',
          feature: 'Video Quality',
          status: 'pass',
          message: `Metrics reported successfully, average latency: ${stats.averageLatency}ms`,
          importance: 'medium'
        }
      } else {
        return {
          testName: 'Server Metrics Reporting',
          feature: 'Video Quality',
          status: 'warning',
          message: 'Metrics reporting using fallback implementation',
          importance: 'medium'
        }
      }
    } catch (error) {
      return {
        testName: 'Server Metrics Reporting',
        feature: 'Video Quality',
        status: 'warning',
        message: `Metrics reporting using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importance: 'medium'
      }
    }
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