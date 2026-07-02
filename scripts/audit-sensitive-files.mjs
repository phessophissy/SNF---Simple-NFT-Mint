#!/usr/bin/env node

/**
 * Audit tracked files for sensitive data.
 *
 * Checks that no wallet exports, private keys, mnemonics, .env files,
 * or secret-reading tooling are tracked in git.
 *
 * Run: npm run audit:sensitive
 * Exits with code 1 if any violation is found.
 */

import { execFileSync } from 'node:child_process';

const patterns = [
  { label: 'environment file', test: (file) => /(^|\/)\.env(\..+)?$/.test(file) && !file.endsWith('.env.example') },
  { label: 'wallet export', test: (file) => /(^|\/)wallets(-[^/]+)?\.json$/.test(file) || /(^|\/)successful-wallets.*\.json$/.test(file) || /(^|\/)generated-wallets\.json$/.test(file) },
  { label: 'private key dump', test: (file) => /private.*key/i.test(file) || /\.pem$/i.test(file) || /\.key$/i.test(file) },
  { label: 'mnemonic/seed', test: (file) => /mnemonic|seed/i.test(file) },
  { label: 'funding tooling', test: (file) => /(^|\/)fund-wallet-batch\.js$/.test(file) || /(^|\/)filter-wallets\.(js|cjs)$/.test(file) },
  { label: 'deploy/mint script', test: (file) => /(^|\/)deploy-contract\.js$/.test(file) || /(^|\/)mint-script\.js$/.test(file) || /(^|\/)multi-wallet-mint\.js$/.test(file) || /(^|\/)multi-wallet-marketplace\.js$/.test(file) },
  { label: 'run report artifact', test: (file) => /funding-report-.*\.json$/.test(file) || /mint-100-report-.*\.json$/.test(file) || /multi-wallet-.*report.*\.json$/.test(file) },
];

function trackedFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const violations = trackedFiles().flatMap((file) =>
  patterns
    .filter((pattern) => pattern.test(file))
    .map((pattern) => ({ file, label: pattern.label }))
);

if (violations.length) {
  console.error('Sensitive file audit FAILED.');
  for (const violation of violations) {
    console.error(`  ✗ ${violation.file} (${violation.label})`);
  }
  process.exit(1);
}

console.log('Sensitive file audit passed — no tracked violations.');
