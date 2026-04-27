#!/usr/bin/env node
// Multi-wallet NFT mint runner for Stacks
// Default wallet source: /home/thee1/SpinningB/generated/mainnet-wallets.json

import { writeFileSync } from 'node:fs';
import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  getAddressFromPrivateKey,
} from '@stacks/transactions';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import {
  executeWithBroadcastRecovery,
  fetchJsonWithRetry,
  loadFailedAddressesFromReport,
  loadWallets,
  maskAddress,
  sleep,
} from './scripts/batch-utils.js';

const DEFAULT_WALLET_FILE = './wallets.json';

const CONFIG = {
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || 'SP31G2FZ5JN87BATZMP4ZRYE5F7WZQDNEXJ7G7X97',
  CONTRACT_NAME: process.env.CONTRACT_NAME || 'simple-nft-v4',
  NETWORK: process.env.NETWORK || 'mainnet',
  FEE: BigInt(process.env.FEE_MICROSTX || '10000'),
  DELAY_MS: Number.parseInt(process.env.DELAY_MS || '400', 10),
  WALLET_LIMIT: Number.parseInt(process.env.WALLET_LIMIT || '50', 10),
  START_INDEX: Number.parseInt(process.env.START_INDEX || '0', 10),
  MINTS_PER_WALLET: Number.parseInt(process.env.MINTS_PER_WALLET || '1', 10),
  RETRY_ATTEMPTS: Number.parseInt(process.env.RETRY_ATTEMPTS || '5', 10),
  BROADCAST_RETRY_ATTEMPTS: Number.parseInt(process.env.BROADCAST_RETRY_ATTEMPTS || '3', 10),
  BROADCAST_RETRY_DELAY_MS: Number.parseInt(process.env.BROADCAST_RETRY_DELAY_MS || '1600', 10),
};

function getNetwork() {
  return CONFIG.NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
}

function getApiUrl() {
  return CONFIG.NETWORK === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so';
}

async function getAccountNonce(address) {
  const data = await fetchJsonWithRetry(
    `${getApiUrl()}/extended/v1/address/${address}/nonces`,
    CONFIG.RETRY_ATTEMPTS,
  );
  return Number(data.possible_next_nonce);
}

async function mintNFT(privateKey, nonce) {
  const tx = await makeContractCall({
    contractAddress: CONFIG.CONTRACT_ADDRESS,
    contractName: CONFIG.CONTRACT_NAME,
    functionName: 'mint',
    functionArgs: [],
    senderKey: privateKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: CONFIG.FEE,
    nonce: BigInt(nonce),
  });

  return broadcastTransaction({ transaction: tx, network: getNetwork() });
}

function parseArgs(argv) {
  const args = {
    walletFile: DEFAULT_WALLET_FILE,
    dryRun: false,
    retryReport: null,
    onlyFailed: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--wallet-file' && argv[i + 1]) {
      args.walletFile = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (arg === '--retry-report' && argv[i + 1]) {
      args.retryReport = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--only-failed') {
      args.onlyFailed = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}


function printHelp() {
  console.log('Usage: node multi-wallet-mint.js [--wallet-file <path>] [--dry-run] [--retry-report <path>] [--only-failed]');
  console.log('');
  console.log('Defaults:');
  console.log(`  Wallet file: ${DEFAULT_WALLET_FILE}`);
  console.log(`  Network: ${CONFIG.NETWORK}`);
  console.log(`  Contract: ${CONFIG.CONTRACT_ADDRESS}.${CONFIG.CONTRACT_NAME}`);
  console.log(`  Wallet limit: ${CONFIG.WALLET_LIMIT}`);
  console.log(`  Start index: ${CONFIG.START_INDEX}`);
  console.log(`  Mints per wallet: ${CONFIG.MINTS_PER_WALLET}`);
  console.log('');
  console.log('Environment variables:');
  console.log('  NETWORK=mainnet|testnet');
  console.log('  CONTRACT_ADDRESS=<address>');
  console.log('  CONTRACT_NAME=<name>');
  console.log('  FEE_MICROSTX=10000');
  console.log('  WALLET_LIMIT=50');
  console.log('  START_INDEX=0');
  console.log('  MINTS_PER_WALLET=1');
  console.log('  DELAY_MS=400');
  console.log('  BROADCAST_RETRY_ATTEMPTS=3');
  console.log('  BROADCAST_RETRY_DELAY_MS=1600');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (CONFIG.WALLET_LIMIT <= 0) {
    throw new Error('WALLET_LIMIT must be greater than 0');
  }

  if (CONFIG.MINTS_PER_WALLET <= 0) {
    throw new Error('MINTS_PER_WALLET must be greater than 0');
  }

  if (args.onlyFailed && !args.retryReport) {
    throw new Error('--only-failed requires --retry-report <path>');
  }

  const { wallets, absolutePath } = loadWallets(args.walletFile);

  let selectedWallets = wallets.slice(
    CONFIG.START_INDEX,
    CONFIG.START_INDEX + CONFIG.WALLET_LIMIT,
  );

  if (args.retryReport) {
    const { absolutePath: retryPath, failedAddresses } = loadFailedAddressesFromReport(args.retryReport);
    console.log(`Retry report: ${retryPath}`);
    console.log(`Failed addresses in report: ${failedAddresses.size}`);

    if (args.onlyFailed) {
      selectedWallets = selectedWallets.filter((wallet) => {
        const address = wallet.address || getAddressFromPrivateKey(wallet.privateKey, CONFIG.NETWORK);
        return failedAddresses.has(address);
      });
    }
  }

  if (selectedWallets.length === 0) {
    throw new Error('No wallets selected. Check wallet file, START_INDEX, and WALLET_LIMIT.');
  }

  console.log(`Network: ${CONFIG.NETWORK}`);
  console.log(`Contract: ${CONFIG.CONTRACT_ADDRESS}.${CONFIG.CONTRACT_NAME}`);
  console.log(`Wallet file: ${absolutePath}`);
  console.log(`Selected wallets: ${selectedWallets.length}`);
  console.log(`Mints per wallet: ${CONFIG.MINTS_PER_WALLET}`);
  console.log(`Delay between transactions: ${CONFIG.DELAY_MS}ms`);
  console.log(`Dry run: ${args.dryRun ? 'yes' : 'no'}`);
  console.log('');

  if (args.dryRun) {
    selectedWallets.forEach((wallet, idx) => {
      const address = wallet.address || getAddressFromPrivateKey(wallet.privateKey, CONFIG.NETWORK);
      console.log(`[DRY RUN] Wallet ${idx + 1}/${selectedWallets.length}: ${maskAddress(address)}`);
    });
    return;
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < selectedWallets.length; i += 1) {
    const wallet = selectedWallets[i];
    const address = wallet.address || getAddressFromPrivateKey(wallet.privateKey, CONFIG.NETWORK);

    console.log(`Wallet ${i + 1}/${selectedWallets.length}: ${maskAddress(address)}`);

    let nonce;
    try {
      nonce = await getAccountNonce(address);
      console.log(`  Starting nonce: ${nonce}`);
    } catch (error) {
      console.log(`  Failed to fetch nonce: ${error.message}`);
      failCount += CONFIG.MINTS_PER_WALLET;
      results.push({
        address,
        success: false,
        error: `nonce-fetch: ${error.message}`,
      });
      continue;
    }

    for (let mintIndex = 0; mintIndex < CONFIG.MINTS_PER_WALLET; mintIndex += 1) {
        const txResult = await executeWithBroadcastRecovery({
          send: (candidateNonce) => mintNFT(wallet.privateKey, candidateNonce),
          initialNonce: nonce,
          refreshNonce: async () => getAccountNonce(address),
          maxAttempts: CONFIG.BROADCAST_RETRY_ATTEMPTS,
          retryDelayMs: CONFIG.BROADCAST_RETRY_DELAY_MS,
          onRetry: (message, attempt, maxAttempts) => {
            console.log(`  Mint ${mintIndex + 1}: RETRY ${attempt}/${maxAttempts} -> ${message}`);
          },
        });

        if (txResult.success) {
          console.log(`  Mint ${mintIndex + 1}: OK -> ${txResult.txid}`);
          successCount += 1;
          results.push({
            address,
            success: true,
            txid: txResult.txid,
            attemptsUsed: txResult.attemptsUsed,
          });
          nonce = txResult.nextNonce;
        } else {
          console.log(`  Mint ${mintIndex + 1}: ERROR -> ${txResult.error}`);
        failCount += 1;
        results.push({
          address,
          success: false,
            error: txResult.error,
            attemptsUsed: txResult.attemptsUsed,
        });

          try {
            nonce = await getAccountNonce(address);
          } catch (_nonceRefreshError) {
            // Keep best-effort nonce progression for next attempt.
          }
      }

      const isLastWallet = i === selectedWallets.length - 1;
      const isLastMint = mintIndex === CONFIG.MINTS_PER_WALLET - 1;
      if (!isLastWallet || !isLastMint) {
        await sleep(CONFIG.DELAY_MS);
      }
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = `multi-wallet-mint-report-${timestamp}.json`;

  writeFileSync(
    reportFile,
    JSON.stringify(
      {
        network: CONFIG.NETWORK,
        contract: `${CONFIG.CONTRACT_ADDRESS}.${CONFIG.CONTRACT_NAME}`,
        walletFile: absolutePath,
        selectedWallets: selectedWallets.length,
        mintsPerWallet: CONFIG.MINTS_PER_WALLET,
        successCount,
        failCount,
        createdAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );

  console.log('');
  console.log('=== Summary ===');
  console.log(`Successful mints: ${successCount}`);
  console.log(`Failed mints: ${failCount}`);
  console.log(`Report: ${reportFile}`);

  if (successCount > 0) {
    const explorerBase =
      CONFIG.NETWORK === 'mainnet'
        ? 'https://explorer.hiro.so/txid/'
        : 'https://explorer.hiro.so/txid/?chain=testnet&txid=';

    console.log('Explorer links:');
    results
      .filter((item) => item.success && item.txid)
      .forEach((item) => console.log(`  ${explorerBase}${item.txid}`));
  }
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
