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
    skipTests: args.has('skip-tests'),
    skipBuild: args.has('skip-build'),
  };
})();

if (!argv.network || !['testnet', 'mainnet'].includes(argv.network)) {
  console.error('Usage: --network=testnet|mainnet [--skip-tests] [--skip-build]');
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

/* ---------- Util ---------- */
const sh = (cmd: string, cwd = REPO_ROOT) =>
  execSync(cmd, {cwd, stdio: 'inherit'});

const log = (msg: string) => console.error(`[${new Date().toISOString()}] ${msg}`);

/* ---------- 1. Build ---------- */
async function build(): Promise<Record<string, string>> {
  log('Building all contracts …');
  sh('rm -rf artifacts && mkdir -p artifacts');

  const sums: Record<string, string> = {};

  for (const c of CONTRACTS) {
    const dir = join(REPO_ROOT, 'contracts', c);
    const config = CONTRACT_CONFIGS[c];

    // Check if contract directory exists
    if (!existsSync(dir)) {
      log(`⚠️ Contract ${c} directory not found, skipping …`);
      continue;
    }

    log(`Building ${c} …`);

    try {
      // Try optimised WASM build with Docker (if available)
      sh(
        'docker run --rm -v "$(pwd)":/code ' +
          '--mount type=volume,source=registry_cache,target=/usr/local/cargo/registry ' +
          '--mount type=volume,source=target_cache,target=/code/target ' +
          'cosmwasm/rust-optimizer:0.15.0 ./contracts/' +
          c,
        REPO_ROOT,
      );

      // Copy artefact from optimizer output (typically at repo root artifacts/)
      const wasmName = config?.wasmName ?? `${c.replace(/-/g, '_')}.wasm`;
      const sourceWasm = join(REPO_ROOT, 'artifacts', wasmName);
      const targetWasm = join(ARTEFACT_DIR, `${c}-pq.wasm`);

      if (existsSync(sourceWasm)) {
        sh(`cp ${sourceWasm} ${targetWasm}`);
      } else {
        // Fallback: try contract-specific artifacts directory
        const altSourceWasm = join(dir, 'artifacts', wasmName);
        if (existsSync(altSourceWasm)) {
          sh(`cp ${altSourceWasm} ${targetWasm}`);
        } else {
          throw new Error(`Built WASM not found for ${c}`);
        }
      }
    } catch {
      log(`Docker build failed for ${c}, trying cargo build …`);
      // Fallback to cargo build
      // Check if contract has pq feature from Cargo.toml
      const cargoToml = readFileSync(join(dir, 'Cargo.toml'), 'utf-8');
      const hasPqFeature = cargoToml.includes('[features]') && cargoToml.includes('pq');
      
      // Use config features if available, otherwise detect from Cargo.toml
      const features = config?.features || (hasPqFeature ? '--features pq' : '');

      sh(`cargo build --release --target wasm32-unknown-unknown ${features}`, dir);

      // Use config wasmName if available
      const wasmName = config?.wasmName ?? `${c.replace(/-/g, '_')}.wasm`;
      const targetWasm = join(ARTEFACT_DIR, `${c}-pq.wasm`);
      const cargoWasm = join(dir, 'target', 'wasm32-unknown-unknown', 'release', wasmName);

      if (existsSync(cargoWasm)) {
        sh(`cp ${cargoWasm} ${targetWasm}`);
      } else {
        throw new Error(`Failed to build ${c}`);
      }
    }

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
  checksum: string;
  txHash: string;
};

async function deploy(): Promise<Record<string, DeployInfo>> {
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
  for (const c of CONTRACTS) {
    const wasmPath = join(ARTEFACT_DIR, `${c}-pq.wasm`);
    
    // Skip contracts that weren't built
    if (!existsSync(wasmPath)) {
      log(`⚠️ Skipping ${c} - WASM not found (contract may not exist)`);
      continue;
    }
    
    const wasm = readFileSync(wasmPath);
    const checksum = calculateChecksum(wasm);
    log(`Uploading ${c}-pq.wasm …`);
    const upload = await client.upload(sender.address, wasm, 'auto');
    res[c] = {
      codeId: upload.codeId,
      checksum,
      txHash: upload.transactionHash,
    };
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

/* ---------- Main ---------- */
(async () => {
  try {
    const checksums = argv.skipBuild ? {} : await build();
    await test();
    const deployed = await deploy();
    await verify(deployed);
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
