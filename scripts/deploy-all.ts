#!/usr/bin/env -S tsx
/* ------------------------------------------------------------------ */
/*  PrivaChain PQ – deploy-all.ts                                     */
/*  1. build → 2. test → 3. deploy → 4. verify                        */
/*  Usage:                                                              */
/*   TESTNET_MNEMONIC="..."                                           */
/*   MAINNET_MNEMONIC="..."                                           */
/*   npm i -g tsx                                                     */
/*   tsx scripts/deploy-all.ts --network=testnet | jq .               */
/* ------------------------------------------------------------------ */

import {execSync} from 'node:child_process';
import {readFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {
  SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate';
import {DirectSecp256k1HdWallet} from '@cosmjs/proto-signing';
import {GasPrice} from '@cosmjs/stargate';

/* ---------- ES module helpers ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ---------- Checksum util ---------- */
const calculateChecksum = (data: Uint8Array): string => {
  return createHash('sha256').update(data).digest('hex').toLowerCase();
};

/* ---------- Paths ---------- */
const REPO_ROOT = join(__dirname, '..');
const ARTEFACT_DIR = join(REPO_ROOT, 'artifacts');
const CONTRACTS = [
  'pq-verifier',
  'reputation',
  'gas-sponsor',
  'mail',
  'domain-registry',
  'did-registry',
];

/* ---------- CLI args ---------- */
const argv = (() => {
  const args = new Map(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.split('=');
      return [k.replace(/^--/, ''), v ?? 'true'];
    }),
  );
  return {
    network: args.get('network') as 'testnet' | 'mainnet' | undefined,
    contracts: args.get('contracts')?.split(',') ?? CONTRACTS,
    skipTests: args.has('skip-tests'),
    skipBuild: args.has('skip-build'),
    dryRun: args.has('dry-run'),
    parallel: args.has('parallel'),
  };
})();

if (!argv.network || !['testnet', 'mainnet'].includes(argv.network)) {
  console.error('Usage: --network=testnet|mainnet [--skip-tests] [--skip-build] [--dry-run] [--parallel] [--contracts=mail,domain-registry]');
  process.exit(1);
}

/* ---------- Env ---------- */
const MNEMONIC =
  argv.network === 'testnet'
    ? process.env.TESTNET_MNEMONIC
    : process.env.MAINNET_MNEMONIC;
if (!MNEMONIC) {
  console.error(`MNEMONIC for ${argv.network} not set`);
  process.exit(1);
}

const ENDPOINT =
  argv.network === 'testnet'
    ? 'https://rpc.uni.junonetwork.io:443'
    : 'https://rpc.juno.strange.love:443';

const PREFIX = 'juno';
const GAS_PRICE = GasPrice.fromString('0.025ujuno');

/* ---------- Contract-specific build configuration ---------- */
interface ContractConfig {
  features: string;
  wasmName: string;
}

const CONTRACT_CONFIGS: Record<string, ContractConfig> = {
  'pq-verifier': {
    features: '--features pq',
    wasmName: 'pq_verifier.wasm',
  },
  'reputation': {
    features: '--features pq',
    wasmName: 'reputation.wasm',
  },
  'gas-sponsor': {
    features: '',
    wasmName: 'gas_sponsor.wasm',
  },
  'mail': {
    features: '',
    wasmName: 'privachain_mail.wasm',
  },
  'domain-registry': {
    features: '',
    wasmName: 'privachain_domain_registry.wasm',
  },
  'did-registry': {
    features: '',
    wasmName: 'did_registry.wasm',
  },
};

/* ---------- Contract instantiation configuration ---------- */
const INSTANTIATE_CONFIG = {
  mail: {
    post_price: "1000",          // ujuno
    proof_of_work_difficulty: 4,
    max_recipients: 50
  },
  'domain-registry': {
    base_price: "1000000",       // 1 JUNO for .prv
    registration_period: 31536000, // 1 year in seconds
    renewal_grace_period: 2592000  // 30 days in seconds
  },
  'gas-sponsor': {
    daily_quota: {messages: 200, emails: 50, video_minutes: 120}
  }
};

/* ---------- Verification constants ---------- */
const TEST_DOMAIN = "test.prv";

/* ---------- Util ---------- */
const sh = (cmd: string, cwd = REPO_ROOT) =>
  execSync(cmd, {cwd, stdio: 'inherit'});

const log = (msg: string) => console.error(`[${new Date().toISOString()}] ${msg}`);

/* ---------- Environment Checks ---------- */
async function checkPrerequisites(): Promise<void> {
  try {
    execSync('cargo --version', {stdio: 'pipe'});
    log('✅ Rust installed');
  } catch {
    throw new Error('Rust not installed - install via rustup.rs');
  }

  try {
    execSync('docker --version', {stdio: 'pipe'});
    log('✅ Docker available for optimized builds');
  } catch {
    log('⚠️ Docker not found - using cargo builds only');
  }

  try {
    execSync('rustup target list --installed | grep wasm32-unknown-unknown', {stdio: 'pipe'});
    log('✅ WASM target installed');
  } catch {
    log('Installing wasm32-unknown-unknown target...');
    sh('rustup target add wasm32-unknown-unknown');
  }
}

/* ---------- 1. Build ---------- */
async function buildContract(contract: string, contractDir: string): Promise<void> {
  const config = CONTRACT_CONFIGS[contract];
  
  try {
    // Try optimized WASM build with Docker (if available)
    sh(
      'docker run --rm -v "$(pwd)":/code ' +
        '--mount type=volume,source=registry_cache,target=/usr/local/cargo/registry ' +
        '--mount type=volume,source=target_cache,target=/code/target ' +
        'cosmwasm/rust-optimizer:0.15.0 ./contracts/' +
        contract,
      REPO_ROOT,
    );

    // Copy artifact from optimizer output (typically at repo root artifacts/)
    const wasmName = config?.wasmName ?? `${contract.replace(/-/g, '_')}.wasm`;
    const sourceWasm = join(REPO_ROOT, 'artifacts', wasmName);
    const targetWasm = join(ARTEFACT_DIR, `${contract}-pq.wasm`);

    if (existsSync(sourceWasm)) {
      sh(`cp ${sourceWasm} ${targetWasm}`);
    } else {
      // Fallback: try contract-specific artifacts directory
      const altSourceWasm = join(contractDir, 'artifacts', wasmName);
      if (existsSync(altSourceWasm)) {
        sh(`cp ${altSourceWasm} ${targetWasm}`);
      } else {
        throw new Error(`Built WASM not found for ${contract}`);
      }
    }
  } catch {
    log(`Docker build failed for ${contract}, trying cargo build …`);
    // Fallback to cargo build
    const features = config?.features ?? '';

    sh(`cargo build --release --target wasm32-unknown-unknown ${features}`, contractDir);

    // Use wasmName from config
    const wasmName = config?.wasmName ?? `${contract.replace(/-/g, '_')}.wasm`;
    const targetWasm = join(ARTEFACT_DIR, `${contract}-pq.wasm`);
    const cargoWasm = join(contractDir, 'target', 'wasm32-unknown-unknown', 'release', wasmName);

    if (existsSync(cargoWasm)) {
      sh(`cp ${cargoWasm} ${targetWasm}`);
    } else {
      throw new Error(`Failed to build ${contract}`);
    }
  }
}

async function buildParallel(): Promise<Record<string, string>> {
  log('Building all contracts in parallel...');
  
  // Clean artifacts directory before starting parallel builds
  sh('rm -rf artifacts && mkdir -p artifacts');

  const contractsToBuild = argv.contracts.filter(c => CONTRACTS.includes(c));
  
  const buildPromises = contractsToBuild.map(async (contract) => {
    try {
      const contractDir = join(REPO_ROOT, 'contracts', contract);
      if (!existsSync(contractDir)) {
        log(`⚠️ Skipping ${contract} - directory not found`);
        return null;
      }

      await buildContract(contract, contractDir);
      const wasmPath = join(ARTEFACT_DIR, `${contract}-pq.wasm`);

      if (existsSync(wasmPath)) {
        const checksum = calculateChecksum(readFileSync(wasmPath));
        log(`✅ ${contract} built successfully`);
        return [contract, checksum] as [string, string];
      }
      return null;
    } catch (error) {
      log(`❌ Failed to build ${contract}: ${error}`);
      throw error;
    }
  });

  const results = await Promise.all(buildPromises);
  
  return Object.fromEntries(
    results.filter((r): r is [string, string] => r !== null).map(([k, v]) => [`${k}-pq`, v])
  );
}

async function build(): Promise<Record<string, string>> {
  if (argv.parallel) {
    return buildParallel();
  }

  log('Building all contracts …');
  sh('rm -rf artifacts && mkdir -p artifacts');

  const sums: Record<string, string> = {};
  const contractsToBuild = argv.contracts.filter(c => CONTRACTS.includes(c));

  for (const c of contractsToBuild) {
    const dir = join(REPO_ROOT, 'contracts', c);

    // Check if contract directory exists
    if (!existsSync(dir)) {
      log(`⚠️ Contract ${c} directory not found, skipping …`);
      continue;
    }

    log(`Building ${c} …`);
    await buildContract(c, dir);

    // Calculate checksum for this contract
    const wasmPath = join(ARTEFACT_DIR, `${c}-pq.wasm`);
    if (existsSync(wasmPath)) {
      sums[`${c}-pq`] = calculateChecksum(readFileSync(wasmPath));
      log(`✅ ${c} built successfully`);
    }
  }

  return sums;
}

/* ---------- 2. Test ---------- */
async function test(): Promise<void> {
  if (argv.skipTests) return log('Tests skipped by flag');
  log('Running unit + integration tests …');
  sh('cargo test --all-features', join(REPO_ROOT, 'contracts'));
  // Run npm test if tests directory exists
  if (existsSync(join(REPO_ROOT, 'tests'))) {
    sh('npm run test:unit', REPO_ROOT);
  }
}

/* ---------- 3. Deploy ---------- */
type DeployInfo = {
  codeId: number;
  address: string;
  checksum: string;
  txHash: string;
  instantiateTx: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function getInstantiateMsg(contract: string, senderAddress: string): any {
  switch (contract) {
    case 'mail':
      return {...INSTANTIATE_CONFIG.mail};
    case 'domain-registry':
      return {...INSTANTIATE_CONFIG['domain-registry']};
    case 'gas-sponsor':
      return {
        ...INSTANTIATE_CONFIG['gas-sponsor'],
        sponsor_address: senderAddress
      };
    case 'pq-verifier':
      return {admin: senderAddress};
    case 'reputation':
      return {admin: senderAddress};
    case 'did-registry':
      return {admin: senderAddress};
    default:
      return {};
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function deploy(): Promise<Record<string, DeployInfo>> {
  if (argv.dryRun) {
    log('Dry run mode - skipping actual deployment');
    return {};
  }

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
    prefix: PREFIX,
  });
  const client = await SigningCosmWasmClient.connectWithSigner(
    ENDPOINT,
    wallet,
    {gasPrice: GAS_PRICE},
  );
  const [sender] = await wallet.getAccounts();

  const res: Record<string, DeployInfo> = {};
  const contractsToDeploy = argv.contracts.filter(c => CONTRACTS.includes(c));

  for (const c of contractsToDeploy) {
    const wasmPath = join(ARTEFACT_DIR, `${c}-pq.wasm`);
    
    // Skip contracts that weren't built
    if (!existsSync(wasmPath)) {
      log(`⚠️ Skipping ${c} - WASM not found (contract may not exist)`);
      continue;
    }
    
    const wasm = readFileSync(wasmPath);
    const checksum = calculateChecksum(wasm);
    
    // Upload code
    log(`Uploading ${c}-pq.wasm …`);
    const upload = await client.upload(sender.address, wasm, 'auto');
    
    // Instantiate contract
    log(`Instantiating ${c} contract...`);
    const instantiateMsg = getInstantiateMsg(c, sender.address);
    const instantiate = await client.instantiate(
      sender.address,
      upload.codeId,
      instantiateMsg,
      `${c}-contract`,
      'auto'
    );
    
    res[c] = {
      codeId: upload.codeId,
      address: instantiate.contractAddress,
      checksum,
      txHash: upload.transactionHash,
      instantiateTx: instantiate.transactionHash,
    };
    
    log(`✅ ${c} deployed at ${instantiate.contractAddress}`);
  }
  return res;
}

/* ---------- 4. Verify ---------- */
async function verify(
  deployed: Record<string, DeployInfo>,
): Promise<void> {
  const client = await SigningCosmWasmClient.connect(ENDPOINT);
  for (const [name, info] of Object.entries(deployed)) {
    const onChain = await client.getCodeDetails(info.codeId);
    if (onChain.checksum !== info.checksum) {
      throw new Error(
        `Checksum mismatch for ${name}: expected ${info.checksum}, got ${onChain.checksum}`,
      );
    }
    log(`✅ ${name} code-id ${info.codeId} verified on-chain`);
  }
}

/* ---------- 5. Verify All Contracts (Query-based) ---------- */
async function verifyAllContracts(
  deployed: Record<string, DeployInfo>,
): Promise<void> {
  const client = await SigningCosmWasmClient.connect(ENDPOINT);

  for (const [name, info] of Object.entries(deployed)) {
    log(`Testing ${name} at ${info.address}...`);

    try {
      switch (name) {
        case 'mail': {
          const mailConfig = await client.queryContractSmart(info.address, {
            get_config: {}
          });
          if (!mailConfig.post_price) {
            throw new Error(`Mail config validation failed: post_price is missing or invalid (got: ${JSON.stringify(mailConfig)})`);
          }
          break;
        }
        case 'domain-registry': {
          const domainPrice = await client.queryContractSmart(info.address, {
            get_domain_price: {domain: TEST_DOMAIN}
          });
          if (!domainPrice.amount) {
            throw new Error(`Domain registry validation failed: price amount is missing for ${TEST_DOMAIN} (got: ${JSON.stringify(domainPrice)})`);
          }
          break;
        }
        case 'gas-sponsor': {
          const sponsorConfig = await client.queryContractSmart(info.address, {
            config: {}
          });
          if (!sponsorConfig.daily_quota) {
            throw new Error(`Gas sponsor config validation failed: daily_quota is missing (got: ${JSON.stringify(sponsorConfig)})`);
          }
          break;
        }
      }

      log(`✅ ${name} functions verified at ${info.address}`);
    } catch (error) {
      log(`❌ ${name} verification failed: ${error}`);
      throw error;
    }
  }
}

/* ---------- Main ---------- */
(async () => {
  try {
    // Check prerequisites
    await checkPrerequisites();
    
    const checksums = argv.skipBuild ? {} : await build();
    await test();
    const deployed = await deploy();
    
    if (Object.keys(deployed).length > 0) {
      await verify(deployed);
      await verifyAllContracts(deployed);
    }
    
    const report = {
      network: argv.network,
      checksums,
      deployed,
      contractsDeployed: Object.keys(deployed).length,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(report, null, 2));
    log(`🎉 ${Object.keys(deployed).length} contracts deployed and verified successfully!`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
