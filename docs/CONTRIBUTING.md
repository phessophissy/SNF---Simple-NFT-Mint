# Contributing Guide

## Quick Start

1. Fork the repository and create a feature branch.
2. Install dependencies with `npm install`.
3. Run the app with `npm run dev`.
4. Run validation locally:
   - `npm run build`
   - `npm run test:smoke`

## Recommended Contribution Areas

- Batch runner reliability (`multi-wallet-mint.js`, `multi-wallet-marketplace.js`)
- Frontend modularity and maintainability (`src/main.js` and supporting modules)
- Documentation and operational runbooks (`README.md`, `docs/`)
- Build/test automation (`package.json`, `.github/workflows/`)

## Pull Request Checklist

- Keep changes focused and scoped.
- Include command examples when behavior changes.
- Update docs for new CLI flags and environment variables.
- Ensure `npm run build` passes.
- Ensure `npm run test:smoke` passes.

## Batch Scripts Notes

Batch scripts now support retry-based reruns from prior reports.

Mint failed-only rerun:

```bash
node multi-wallet-mint.js --wallet-file ./wallets.json --retry-report ./multi-wallet-mint-report-YYYY-MM-DDTHH-MM-SS.json --only-failed
```

Marketplace failed-only rerun:

```bash
node multi-wallet-marketplace.js --wallet-file ./wallets.json --retry-report ./multi-wallet-marketplace-report-YYYY-MM-DDTHH-MM-SS.json --only-failed
```
