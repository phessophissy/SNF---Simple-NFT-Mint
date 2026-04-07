#!/usr/bin/env node
// Fund generated wallets from a funder wallet (using mnemonic)
// Usage: node fund-100-wallets.js [--wallet-file <path>] [--amount <stx>] [--dry-run]
//
// Mnemonic is loaded from FUNDER_MNEMONIC in .env
// Funder address: SP1QPNQB6R3EFMTQYGHG9J7N03S3K52ARSE1VEVX4

import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  makeSTXTokenTransfer,
  broadcastTransaction,
  AnchorMode,
  getAddressFromPrivateKey,
} from '@stacks/transactions';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { generateWallet } from '@stacks/wallet-sdk';

const EXPECTED_FUNDER_ADDRESS = 'SP1QPNQB6R3EFMTQYGHG9J7N03S3K52ARSE1VEVX4';
const DEFAULT_WALLET_FILE = './generated-wallets.json';
const DEFAULT_AMOUNT_STX = 0.25;

const CONFIG = {
  NETWORK: process.env.NETWORK || 'mainnet',
  FEE: BigInt(process.env.FEE_MICROSTX || '10000'),
  DELAY_MS: Number.parseInt(process.env.DELAY_MS || '500', 10),
  RETRY_ATTEMPTS: Number.parseInt(process.env.RETRY_ATTEMPTS || '5', 10),
};

function getNetwork() {
  return CONFIG.NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
}

function getApiUrl() {
  return CONFIG.NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function maskAddress(address) {
  if (!address || address.length < 12) return address || 'unknown';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function extractRetrySeconds(text) {
  const match = text.match(/try again in\s+(\d+)\s+seconds/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function fetchJsonWithRetry(url, attempts = CONFIG.RETRY_ATTEMPTS) {
  let delayMs = 1200;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      const body = await response.text();
      const retrySeconds = response.status === 429 ? extractRetrySeconds(body) : null;
      if (attempt === attempts) throw new Error(`Request failed (${response.status}): ${body}`);
      const backoff = retrySeconds ? retrySeconds * 1000 : delayMs;
      console.log(`[retry] Status ${response.status}. Waiting ${Math.ceil(backoff / 1000)}s (attempt ${attempt + 1}/${attempts})...`);
      await sleep(backoff + 200);
      delayMs *= 2;
    } catch (error) {
      if (attempt === attempts) throw error;
      console.log(`[retry] Error: ${error.message}. Waiting ${Math.ceil(delayMs / 1000)}s (attempt ${attempt + 1}/${attempts})...`);
      await sleep(delayMs + 200);
      delayMs *= 2;
    }
  }
}

async function getAccountNonce(address) {
  const data = await fetchJsonWithRetry(`${getApiUrl()}/extended/v1/address/${address}/nonces`);
  return Number(data.possible_next_nonce);
}

async function getBalance(address) {
  const data = await fetchJsonWithRetry(`${getApiUrl()}/extended/v1/address/${address}/stx`);
  return BigInt(data.balance);
}

function parseArgs(argv) {
  const args = {
    walletFile: DEFAULT_WALLET_FILE,
    amountStx: DEFAULT_AMOUNT_STX,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--wallet-file' && argv[i + 1]) { args.walletFile = argv[i + 1]; i++; }
    else if (arg === '--amount' && argv[i + 1]) { args.amountStx = parseFloat(argv[i + 1]); i++; }
    else if (arg === '--dry-run') { args.dryRun = true; }
    else if (arg === '--help' || arg === '-h') { args.help = true; }
    else { throw new Error(`Unknown argument: ${arg}`); }
  }

  return args;
}

function loadWallets(walletFile) {
  const absolutePath = resolve(walletFile);
  const raw = readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw);
  const wallets = Array.isArray(parsed) ? parsed : parsed.wallets || [];
  return { wallets: wallets.filter((w) => w.address), absolutePath };
}

function printHelp() {
  console.log('Usage: node fund-100-wallets.js [options]');
  console.log('');
  console.log('Mnemonic is loaded from FUNDER_MNEMONIC in .env file.');
  console.log('');
  console.log('Options:');
  console.log(`  --wallet-file <path>  Wallet JSON file (default: ${DEFAULT_WALLET_FILE})`);
  console.log(`  --amount <stx>        STX amount per wallet (default: ${DEFAULT_AMOUNT_STX})`);
  console.log('  --dry-run             Show plan without sending transactions');
  console.log('');
  console.log(`Expected funder: ${EXPECTED_FUNDER_ADDRESS}`);
  console.log('');
  console.log('Environment variables (.env):');
  console.log('  FUNDER_MNEMONIC       12 or 24 word seed phrase (required)');
  console.log('  NETWORK=mainnet|testnet');
  console.log('  FEE_MICROSTX=10000');
  console.log('  DELAY_MS=500');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) { printHelp(); return; }

  const mnemonic = process.env.FUNDER_MNEMONIC;
  args.mnemonic = mnemonic;

  if (!args.mnemonic) {
    console.error('Error: FUNDER_MNEMONIC not found. Set it in .env file.');
    printHelp();
    process.exit(1);
  }

  // Derive private key from mnemonic
  const wallet = await generateWallet({ secretKey: args.mnemonic, password: '' });
  const funderPrivateKey = wallet.accounts[0].stxPrivateKey;
  const funderAddress = getAddressFromPrivateKey(funderPrivateKey, CONFIG.NETWORK);

  if (funderAddress !== EXPECTED_FUNDER_ADDRESS) {
    console.error(`Error: derived address ${funderAddress} does not match expected funder ${EXPECTED_FUNDER_ADDRESS}`);
    process.exit(1);
  }
  console.log(`Derived funder address: ${funderAddress} ✓`);

  const { wallets, absolutePath } = loadWallets(args.walletFile);
  const amountMicroStx = BigInt(Math.floor(args.amountStx * 1_000_000));

  console.log(`Network: ${CONFIG.NETWORK}`);
  console.log(`Funder: ${funderAddress}`);
  console.log(`Wallet file: ${absolutePath}`);
  console.log(`Wallets to fund: ${wallets.length}`);
  console.log(`Amount per wallet: ${args.amountStx} STX (${amountMicroStx} µSTX)`);
  console.log(`Fee per transfer: ${CONFIG.FEE} µSTX`);
  console.log(`Total cost: ~${((Number(amountMicroStx) + Number(CONFIG.FEE)) * wallets.length / 1_000_000).toFixed(4)} STX`);
  console.log(`Dry run: ${args.dryRun ? 'yes' : 'no'}`);
  console.log('');

  if (args.dryRun) {
    wallets.forEach((w, i) => {
      console.log(`[DRY RUN] ${i + 1}/${wallets.length}: ${maskAddress(w.address)} <- ${args.amountStx} STX`);
    });
    return;
  }

  // Check funder balance
  const balance = await getBalance(funderAddress);
  const totalNeeded = (amountMicroStx + CONFIG.FEE) * BigInt(wallets.length);
  console.log(`Funder balance: ${(Number(balance) / 1_000_000).toFixed(6)} STX`);
  if (balance < totalNeeded) {
    console.error(`Insufficient balance. Need ~${(Number(totalNeeded) / 1_000_000).toFixed(4)} STX`);
    process.exit(1);
  }

  let nonce = await getAccountNonce(funderAddress);
  console.log(`Starting nonce: ${nonce}`);
  console.log('');

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < wallets.length; i++) {
    const target = wallets[i];
    console.log(`[${i + 1}/${wallets.length}] Funding ${maskAddress(target.address)}...`);

    try {
      const tx = await makeSTXTokenTransfer({
        recipient: target.address,
        amount: amountMicroStx,
        senderKey: funderPrivateKey,
        network: getNetwork(),
        anchorMode: AnchorMode.Any,
        nonce: BigInt(nonce),
        fee: CONFIG.FEE,
      });

      const res = await broadcastTransaction({ transaction: tx, network: getNetwork() });

      if (res.error) {
        const msg = res.reason ? `${res.error} (${res.reason})` : res.error;
        console.log(`  FAILED: ${msg}`);
        failCount++;
        results.push({ address: target.address, success: false, error: msg });
      } else {
        console.log(`  OK: ${res.txid}`);
        successCount++;
        nonce++;
        results.push({ address: target.address, success: true, txid: res.txid });
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      failCount++;
      results.push({ address: target.address, success: false, error: err.message });
    }

    if (i < wallets.length - 1) await sleep(CONFIG.DELAY_MS);
  }

  console.log('');
  console.log(`Done. Success: ${successCount}, Failed: ${failCount}`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = `funding-report-${timestamp}.json`;
  writeFileSync(reportFile, JSON.stringify({
    funder: funderAddress,
    network: CONFIG.NETWORK,
    walletFile: absolutePath,
    amountStx: args.amountStx,
    walletsCount: wallets.length,
    successCount,
    failCount,
    createdAt: new Date().toISOString(),
    results,
  }, null, 2));
  console.log(`Report saved: ${reportFile}`);
}

main().catch(console.error);
