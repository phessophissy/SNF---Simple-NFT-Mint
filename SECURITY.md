# Security Policy

## Sensitive Files

This repository includes wallet tooling and deployment helpers that interact
with Stacks mainnet. The following files must **never** be committed to git:

- `.env` — contains a real funder mnemonic
- `wallets.json`, `wallets-funded.json`, `wallets-*.json` — wallet exports with private keys
- `generated-wallets.json`, `successful-wallets-*.json` — generated wallet sets
- `fund-wallet-batch.js`, `filter-wallets.js`, `filter-wallets.cjs` — scripts that read secrets from `.env`
- `deploy-contract.js`, `mint-script.js`, `multi-wallet-mint.js`, `multi-wallet-marketplace.js` — deployment/mint scripts
- `funding-report-*.json`, `mint-100-report-*.json`, `multi-wallet-*-report-*.json` — run artifacts
- `*.key`, `*.pem`, `private-key*`, `mnemonic*` — key material

All of these are listed in `.gitignore`.

## Before Opening a PR

1. Run `npm run audit:sensitive` to verify no sensitive files are tracked.
2. Confirm `git status --short` does not include wallet exports or `.env`.
3. Verify `.env.example` contains only placeholder values.

## If a Secret Is Committed

1. **Rotate the secret immediately** — assume it is compromised.
2. Remove it from the branch history before merging (`git filter-repo` or BFG).
3. Notify maintainers through the GitHub security advisory flow.

## Audit CI

A GitHub Actions workflow runs `npm run audit:sensitive` on every pull request
and push to `main`. Any violation will block the CI pipeline.
