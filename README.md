# Simple NFT Mint Studio

A polished Stacks mainnet desk for minting Simple NFTs, watching live marketplace activity, and operating listings with fee-aware pricing guidance.

## Features

-  Live mint, list, buy, and cancel flows for the Simple NFT collection
-  Professional dashboard theme with responsive card-based layout
-  Wallet desk with connection status, sync cadence, and portfolio inventory
-  Live market pulse with floor, average ask, and seller exposure
-  Fee-aware price lab for modeling seller net and floor positioning
-  Browser-stored activity history and UI preferences
-  Low fees: Mint (0.001 STX), List (0.0013 STX), Sale (0.0013 STX)


## Project Structure

```
SNF---Simple-NFT-Mint/
├── contracts/
│   ├── simple-nft-v4.clar          # NFT contract used by the dashboard
│   └── nft-marketplace-v2.clar     # Marketplace contract used for listings and sales
├── src/
│   ├── main.js                     # Frontend logic, wallet flows, and live data reads
│   └── styles/stacks-vivid-theme.css
├── index.html                      # Studio shell and dashboard structure
├── multi-wallet-mint.js            # Bulk minting helper for generated wallets
├── multi-wallet-marketplace.js     # Bulk marketplace helper
├── vite.config.js
└── package.json
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
# start the dev server (alias)
npm start
# or the explicit dev script
npm run dev
```

Visit http://localhost:3000

### 3. Run tests

```bash
npm test
```

## Contributor Docs

- [Contributing Guide](docs/CONTRIBUTING.md)
- [Batch Operations Runbook](docs/BATCH_OPERATIONS_RUNBOOK.md)

## Dashboard Notes

- The frontend reads contract data from Hiro mainnet endpoints by default.
- Activity history, theme selection, auto-refresh preference, and price lab inputs are stored in browser local storage.
- The price lab uses the current floor from the recent market scan window, not the full contract history.
- The marketplace view scans the most recent 24 minted token IDs for active listings to keep the desk responsive.

## Contract Details

### NFT Contract Functions

| Function | Description |
|----------|-------------|
| `mint` | Mint a new NFT (costs 0.001 STX) |
| `transfer` | Transfer NFT to another address |
| `get-owner` | Get owner of a token ID |
| `get-total-minted` | Get total NFTs minted |

### Marketplace Contract Functions

| Function | Description |
|----------|-------------|
| `list-nft` | List an NFT for sale (costs 0.0013 STX) |
| `buy-nft` | Buy a listed NFT |
| `cancel-listing` | Cancel your listing |
| `update-price` | Update listing price |
| `get-listing` | Get listing details |

### Fee Structure

| Action | Fee |
|--------|-----|
| Mint | 0.001 STX |
| List | 0.0013 STX |
| Sale | 0.0013 STX (deducted from sale price) |

### Constants

- **Max Supply**: 10,000 NFTs
- **Token Name**: Simple NFT
- **Token Symbol**: SNFT

## Wallet Support

The frontend supports these Stacks wallets:
- [Leather](https://leather.io/) (formerly Hiro Wallet)
- [Xverse](https://www.xverse.app/)

### Connect Wallet Troubleshooting

- If the connect modal does not appear, allow popups for your dashboard domain and retry.
- Make sure one supported wallet is installed and unlocked before clicking Connect Wallet.
- If a wallet request is already in progress, wait for that wallet window to complete or cancel.
- On errors, read the wallet status panel for the latest failure detail surfaced by the app.

## Building for Production

```bash
npm run build
npm run preview
```

## License

ISC
