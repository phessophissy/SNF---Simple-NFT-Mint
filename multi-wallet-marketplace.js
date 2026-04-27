#!/usr/bin/env node
// Multi-wallet marketplace interaction runner (list-nft)
// Default wallet source: /home/thee1/SpinningB/generated/mainnet-wallets.json

import { writeFileSync } from 'node:fs';
import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  getAddressFromPrivateKey,
  uintCV,
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
  NETWORK: process.env.NETWORK || 'mainnet',
  MARKETPLACE_CONTRACT_ADDRESS:
    process.env.MARKETPLACE_CONTRACT_ADDRESS || 'SP31G2FZ5JN87BATZMP4ZRYE5F7WZQDNEXJ7G7X97',
  MARKETPLACE_CONTRACT_NAME: process.env.MARKETPLACE_CONTRACT_NAME || 'nft-marketplace-v2',
  NFT_ASSET_IDENTIFIER:
    process.env.NFT_ASSET_IDENTIFIER ||
    'SP31G2FZ5JN87BATZMP4ZRYE5F7WZQDNEXJ7G7X97.simple-nft-v4::simple-nft',
  LIST_PRICE_MICROSTX: BigInt(process.env.LIST_PRICE_MICROSTX || '50000'), // 0.05 STX
  FEE_MICROSTX: BigInt(process.env.FEE_MICROSTX || '10000'),
  DELAY_MS: Number.parseInt(process.env.DELAY_MS || '1800', 10),
  WALLET_LIMIT: Number.parseInt(process.env.WALLET_LIMIT || '50', 10),
  START_INDEX: Number.parseInt(process.env.START_INDEX || '0', 10),
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

async function getAccountNonce(address) {
  const data = await fetchJsonWithRetry(
    `${getApiUrl()}/extended/v1/address/${address}/nonces`,
    CONFIG.RETRY_ATTEMPTS,
  );
  return Number(data.possible_next_nonce);
}

async function getFirstOwnedTokenId(address) {
  const url = `${getApiUrl()}/extended/v1/tokens/nft/holdings?principal=${address}&asset_identifiers=${CONFIG.NFT_ASSET_IDENTIFIER}&limit=50`;
  const data = await fetchJsonWithRetry(url, CONFIG.RETRY_ATTEMPTS);
  const first = (data.results || [])[0];

  if (!first || !first.value || !first.value.repr) {
    return null;
  }

  const tokenId = first.value.repr.replace(/^u/, '');
  if (!/^\d+$/.test(tokenId)) {
    return null;
  }

  return BigInt(tokenId);
}

async function listNft(privateKey, nonce, tokenId) {
  const tx = await makeContractCall({
    contractAddress: CONFIG.MARKETPLACE_CONTRACT_ADDRESS,
    contractName: CONFIG.MARKETPLACE_CONTRACT_NAME,
    functionName: 'list-nft',
    functionArgs: [uintCV(tokenId), uintCV(CONFIG.LIST_PRICE_MICROSTX)],
    senderKey: privateKey,
    network: getNetwork(),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: CONFIG.FEE_MICROSTX,
    nonce: BigInt(nonce),
  });

  return broadcastTransaction({ transaction: tx, network: getNetwork() });
}

function printHelp() {
  console.log('Usage: node multi-wallet-marketplace.js [--wallet-file <path>] [--dry-run] [--retry-report <path>] [--only-failed]');
  console.log('');
  console.log('Defaults:');
  console.log(`  Wallet file: ${DEFAULT_WALLET_FILE}`);
  console.log(`  Network: ${CONFIG.NETWORK}`);
  console.log(`  Marketplace: ${CONFIG.MARKETPLACE_CONTRACT_ADDRESS}.${CONFIG.MARKETPLACE_CONTRACT_NAME}`);
  console.log(`  NFT asset: ${CONFIG.NFT_ASSET_IDENTIFIER}`);
  console.log(`  List price (microSTX): ${CONFIG.LIST_PRICE_MICROSTX.toString()}`);
  console.log(`  Wallet limit: ${CONFIG.WALLET_LIMIT}`);
  console.log(`  Start index: ${CONFIG.START_INDEX}`);
  console.log('');
  console.log('Environment variables:');
  console.log('  NETWORK=mainnet|testnet');
  console.log('  MARKETPLACE_CONTRACT_ADDRESS=<address>');
  console.log('  MARKETPLACE_CONTRACT_NAME=nft-marketplace-v2');
  console.log('  NFT_ASSET_IDENTIFIER=<contract.asset>');
  console.log('  LIST_PRICE_MICROSTX=50000');
  console.log('  FEE_MICROSTX=10000');
  console.log('  WALLET_LIMIT=50');
  console.log('  START_INDEX=0');
  console.log('  DELAY_MS=1800');
  console.log('  RETRY_ATTEMPTS=5');
  console.log('  BROADCAST_RETRY_ATTEMPTS=3');
  console.log('  BROADCAST_RETRY_DELAY_MS=1600');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (args.onlyFailed && !args.retryReport) {
    throw new Error('--only-failed requires --retry-report <path>');
  }

  const { wallets, absolutePath } = loadWallets(args.walletFile);
  let selectedWallets = wallets.slice(CONFIG.START_INDEX, CONFIG.START_INDEX + CONFIG.WALLET_LIMIT);

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
  console.log(`Marketplace: ${CONFIG.MARKETPLACE_CONTRACT_ADDRESS}.${CONFIG.MARKETPLACE_CONTRACT_NAME}`);
  console.log(`NFT asset: ${CONFIG.NFT_ASSET_IDENTIFIER}`);
  console.log(`Wallet file: ${absolutePath}`);
  console.log(`Selected wallets: ${selectedWallets.length}`);
  console.log(`List price (microSTX): ${CONFIG.LIST_PRICE_MICROSTX.toString()}`);
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

    let tokenId;
    try {
      tokenId = await getFirstOwnedTokenId(address);
      if (tokenId === null) {
        throw new Error('No owned token found for configured NFT asset');
      }
      console.log(`  Token selected: ${tokenId.toString()}`);
    } catch (error) {
      console.log(`  Failed token lookup: ${error.message}`);
      failCount += 1;
      results.push({
        address,
        success: false,
        error: `token-lookup: ${error.message}`,
      });
      continue;
    }

    let nonce;
    try {
      nonce = await getAccountNonce(address);
      console.log(`  Starting nonce: ${nonce}`);
    } catch (error) {
      console.log(`  Failed to fetch nonce: ${error.message}`);
      failCount += 1;
      results.push({
        address,
        tokenId: tokenId.toString(),
        success: false,
        error: `nonce-fetch: ${error.message}`,
      });
      continue;
    }

      const txResult = await executeWithBroadcastRecovery({
        send: (candidateNonce) => listNft(wallet.privateKey, candidateNonce, tokenId),
        initialNonce: nonce,
        refreshNonce: async () => getAccountNonce(address),
        maxAttempts: CONFIG.BROADCAST_RETRY_ATTEMPTS,
        retryDelayMs: CONFIG.BROADCAST_RETRY_DELAY_MS,
        onRetry: (message, attempt, maxAttempts) => {
          console.log(`  List: RETRY ${attempt}/${maxAttempts} -> ${message}`);
        },
      });

      if (txResult.success) {
        console.log(`  List: OK -> ${txResult.txid}`);
        successCount += 1;
        results.push({
          address,
          tokenId: tokenId.toString(),
          success: true,
          txid: txResult.txid,
          attemptsUsed: txResult.attemptsUsed,
        });
      } else {
        console.log(`  List: ERROR -> ${txResult.error}`);
      failCount += 1;
      results.push({
        address,
        tokenId: tokenId.toString(),
        success: false,
          error: txResult.error,
          attemptsUsed: txResult.attemptsUsed,
      });
    }

    if (i < selectedWallets.length - 1) {
      await sleep(CONFIG.DELAY_MS);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = `multi-wallet-marketplace-report-${timestamp}.json`;

  writeFileSync(
    reportFile,
    JSON.stringify(
      {
        network: CONFIG.NETWORK,
        marketplace: `${CONFIG.MARKETPLACE_CONTRACT_ADDRESS}.${CONFIG.MARKETPLACE_CONTRACT_NAME}`,
        nftAssetIdentifier: CONFIG.NFT_ASSET_IDENTIFIER,
        listPriceMicroStx: CONFIG.LIST_PRICE_MICROSTX.toString(),
        walletFile: absolutePath,
        selectedWallets: selectedWallets.length,
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
  console.log(`Successful interactions: ${successCount}`);
  console.log(`Failed interactions: ${failCount}`);
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
