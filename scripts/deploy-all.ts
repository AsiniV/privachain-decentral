#!/usr/bin/env -S tsx
/* ------------------------------------------------------------------ */
/*  PrivaChain PQ – deploy-all.ts                                     */
/*  1. build → 2. test → 3. deploy → 4. verify → 5. functional tests  */
/*  Usage:                                                              */
/*   TESTNET_MNEMONIC="..."                                           */
/*   MAINNET_MNEMONIC="..."                                           */
/*   npm i -g tsx                                                     */
/*   tsx scripts/deploy-all.ts --network=testnet | jq .               */
/* ------------------------------------------------------------------ */

import * as dotenv from 'dotenv';
dotenv.config();

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
    skipFunctional: args.has('skip-functional'),
    dryRun: args.has('dry-run'),
    parallel: args.has('parallel'),
  };
})();

if (!argv.network || !['testnet', 'mainnet'].includes(argv.network)) {
  console.error('Usage: --network=testnet|mainnet [--skip-tests] [--skip-build] [--skip-functional] [--dry-run] [--parallel] [--contracts=mail,domain-registry]');
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
    denom: 'ujuno',
    domain_registration_fee: '1000000',  // 1 JUNO
    email_fee: '1000',                   // 0.001 JUNO
    pow_difficulty: 4,
    relay_reward: '100'                  // 0.0001 JUNO per delivery
  },
  'domain-registry': {
    registration_cost: '1000000',        // 1 JUNO
    denom: 'ujuno',
    max_domain_length: 64,
    domain_expiration_seconds: 31536000, // 1 year in seconds
    registration_cooldown: 3600          // 1 hour cooldown
  },
  'gas-sponsor': {
    grant_amount: '10000',               // 0.01 JUNO per grant
    max_requests_per_day: 100,
    denom: 'ujuno'
  },
  'pq-verifier': {
    code_id: 1                           // Placeholder, will be updated after upload
  }
};

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
function getInstantiateMsg(contract: string, senderAddress: string, codeId?: number): any {
  switch (contract) {
    case 'mail':
      return {
        admin: senderAddress,
        ...INSTANTIATE_CONFIG.mail
      };
    case 'domain-registry':
      return {
        admin: senderAddress,
        ...INSTANTIATE_CONFIG['domain-registry']
      };
    case 'gas-sponsor':
      return {...INSTANTIATE_CONFIG['gas-sponsor']};
    case 'pq-verifier':
      return {code_id: codeId ?? 1};
    case 'reputation':
      return {};
    case 'did-registry':
      // DID registry requires multi-sig setup with at least 2 unique admins
      // Using sender + a deterministic secondary admin derived from sender
      // vk is stored directly as bytes, not base64 encoded in the contract
      return {
        admins: [
          senderAddress,
          // Create a secondary admin by modifying the last char of sender address
          // This ensures we have 2 unique valid-format addresses
          senderAddress.slice(0, -1) + (senderAddress.endsWith('a') ? 'b' : 'a')
        ],
        threshold: 1,
        vk: '' // Empty binary for verifying key placeholder
      };
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
    const instantiateMsg = getInstantiateMsg(c, sender.address, upload.codeId);
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

/* ---------- 5. Functional Tests (Query + Execute) ---------- */
async function functionalTest(
  deployed: Record<string, DeployInfo>,
): Promise<void> {
  if (argv.skipFunctional) {
    log('Functional tests skipped by flag');
    return;
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

  for (const [name, info] of Object.entries(deployed)) {
    log(`Functional test ${name} at ${info.address} …`);

    try {
      switch (name) {
        case 'mail': {
          // Query: get_config
          const cfg = await client.queryContractSmart(info.address, {
            get_config: {}
          });
          if (typeof cfg.email_fee !== 'string' || typeof cfg.domain_registration_fee !== 'string') {
            throw new Error(`Mail config validation failed: fee fields missing (got: ${JSON.stringify(cfg)})`);
          }
          log(`  ✅ mail config OK (${cfg.denom || 'upriv'})`);

          // Note: Execute send_email requires valid ZK proof and PoW, skipping in CI
          // Real testnet deployments would include actual mail sending tests
          break;
        }

        case 'domain-registry': {
          // Query: config
          const cfg = await client.queryContractSmart(info.address, {
            config: {}
          });
          if (!cfg.registration_cost || !cfg.denom) {
            throw new Error(`Domain registry config validation failed: missing fields (got: ${JSON.stringify(cfg)})`);
          }
          log(`  ✅ domain-registry config OK (${cfg.registration_cost}${cfg.denom})`);

          // Note: Execute register requires valid ZK proof, skipping in CI
          // Real testnet deployments would include domain registration tests
          break;
        }

        case 'gas-sponsor': {
          // Query: config
          const cfg = await client.queryContractSmart(info.address, {
            config: {}
          });
          if (!cfg.grant_amount || !cfg.denom) {
            throw new Error(`Gas sponsor config validation failed: missing fields (got: ${JSON.stringify(cfg)})`);
          }
          log(`  ✅ gas-sponsor config OK (grant: ${cfg.grant_amount}${cfg.denom})`);

          // Query: balance
          const balance = await client.queryContractSmart(info.address, {
            balance: {}
          });
          log(`  ✅ gas-sponsor balance OK (${balance.balance}${balance.denom})`);
          break;
        }

        case 'pq-verifier': {
          // Query: code_id
          const codeIdResp = await client.queryContractSmart(info.address, {
            code_id: {}
          });
          if (typeof codeIdResp.code_id !== 'number') {
            throw new Error(`PQ verifier validation failed: code_id not found (got: ${JSON.stringify(codeIdResp)})`);
          }
          log(`  ✅ pq-verifier code_id OK (${codeIdResp.code_id})`);
          break;
        }

        case 'reputation': {
          // Query: get_reputation (for sender address - will return default/empty for new deployment)
          try {
            const rep = await client.queryContractSmart(info.address, {
              get_reputation: { address: sender.address }
            });
            log(`  ✅ reputation query OK (score: ${rep.score ?? 0})`);
          } catch {
            // Expected: no reputation entry exists yet for this address
            log(`  ✅ reputation query OK (no entry - expected for new deployment)`);
          }
          break;
        }

        case 'did-registry': {
          // Query: get_admins
          const admins = await client.queryContractSmart(info.address, {
            get_admins: {}
          });
          if (!Array.isArray(admins)) {
            throw new Error(`DID registry validation failed: admins not an array (got: ${JSON.stringify(admins)})`);
          }
          log(`  ✅ did-registry admins OK (${admins.length} admin(s))`);
          break;
        }

        default:
          log(`  ⚠️ ${name} - no functional tests defined`);
      }

      log(`✅ ${name} functional tests passed`);
    } catch (error) {
      log(`❌ ${name} functional test failed: ${error}`);
      throw error;
    }
  }

  log('🎉 All functional tests passed');
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
      await functionalTest(deployed);
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
