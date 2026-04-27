# Batch Operations Runbook

## Purpose

This runbook covers reliable execution of the multi-wallet mint and marketplace scripts, including retry and failed-only reruns.

## Preflight

1. Ensure wallet source file exists (default: `./wallets.json`).
2. Confirm environment values as needed:
   - `NETWORK`
   - `WALLET_LIMIT`
   - `START_INDEX`
   - `DELAY_MS`
   - `BROADCAST_RETRY_ATTEMPTS`
   - `BROADCAST_RETRY_DELAY_MS`

## Mint Workflow

Dry run:

```bash
npm run mint:multi:dry
```

Execute:

```bash
npm run mint:multi
```

Second batch (example):

```bash
START_INDEX=50 WALLET_LIMIT=50 npm run mint:multi
```

Failed-only rerun from report:

```bash
node multi-wallet-mint.js --wallet-file ./wallets.json --retry-report ./multi-wallet-mint-report-YYYY-MM-DDTHH-MM-SS.json --only-failed
```

## Marketplace Workflow

Dry run:

```bash
npm run market:multi:list:dry
```

Execute:

```bash
npm run market:multi:list
```

Failed-only rerun from report:

```bash
node multi-wallet-marketplace.js --wallet-file ./wallets.json --retry-report ./multi-wallet-marketplace-report-YYYY-MM-DDTHH-MM-SS.json --only-failed
```

## Operational Notes

- Scripts refresh nonce when retry logic detects nonce-related errors.
- Both scripts write JSON reports with per-wallet outcomes.
- Keep generated report/log artifacts out of commits.

## Troubleshooting

- `No wallets selected`: verify `wallets.json`, `START_INDEX`, and `WALLET_LIMIT`.
- Broadcast parse or transient API failures: rerun with retry defaults or raise `BROADCAST_RETRY_ATTEMPTS`.
- Rate limits (`429`): increase `DELAY_MS` and retry failed-only.
