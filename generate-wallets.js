#!/usr/bin/env node
// Generate 100 Stacks mainnet wallets for minting
// Usage: node generate-wallets.js [count] [--output <path>]

import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { getAddressFromPrivateKey } from '@stacks/transactions';

const DEFAULT_COUNT = 100;
const DEFAULT_OUTPUT = './generated-wallets.json';

function parseArgs(argv) {
  const args = { count: DEFAULT_COUNT, output: DEFAULT_OUTPUT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--output' && argv[i + 1]) {
      args.output = argv[i + 1];
      i++;
    } else if (/^\d+$/.test(argv[i])) {
      args.count = parseInt(argv[i], 10);
    }
  }
  return args;
}

function generateWallet(index) {
  const privateKey = randomBytes(32).toString('hex');
  const address = getAddressFromPrivateKey(privateKey, 'mainnet');
  return {
    name: `Wallet ${String(index + 1).padStart(3, '0')}`,
    address,
    privateKey,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Generating ${args.count} Stacks mainnet wallets...`);

  const wallets = [];
  for (let i = 0; i < args.count; i++) {
    wallets.push(generateWallet(i));
  }

  writeFileSync(args.output, JSON.stringify(wallets, null, 2));
  console.log(`Saved ${wallets.length} wallets to ${args.output}`);
  console.log(`Sample: ${wallets[0].address}`);
}

main();
