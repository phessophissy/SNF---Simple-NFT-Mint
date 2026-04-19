# docs-contract-reference - Section 4

> Documentation for SNF - Simple NFT Mint

## Overview

This section covers part 4 of the docs-contract-reference documentation series for the Simple NFT Mint Studio project.

## Contract Details

- **NFT Contract**: `simple-nft-v4.clar`
- **Marketplace Contract**: `nft-marketplace-v2.clar`
- **Deployer**: `SP2KYZRNME33Y39GP3RKC90DQJ45EF1N0NZNVRE09`
- **Max Supply**: 10,000 NFTs
- **Token Symbol**: SNFT

## Section 4 Content

### Key Points

1. The Simple NFT contract implements SIP-009 for NFT standard compliance
2. Marketplace operations use a separate contract for listing management
3. Fee structure is embedded as contract constants for transparency
4. All state changes emit events for frontend synchronization

### Fee Reference

| Operation | Fee (STX) | Fee (microSTX) |
|-----------|-----------|----------------|
| Mint | 0.001 | 1,000 |
| List | 0.0013 | 1,300 |
| Sale | 0.0013 | 1,300 |

### Configuration Notes - Part 4

- Token IDs are sequential starting from 1
- Ownership is tracked via a Clarity map keyed by token ID
- Listings are stored in the marketplace contract with seller, price, and status
- The frontend scans the most recent 24 token IDs for active marketplace listings
- Local storage persists activity history and user preferences across sessions

### Related Files

- `contracts/simple-nft-v4.clar` - Primary NFT contract
- `contracts/nft-marketplace-v2.clar` - Marketplace contract
- `src/main.js` - Frontend logic and wallet flows
- `index.html` - Dashboard shell and structure

## Version History

| Version | Change | Section |
|---------|--------|---------|
| 4.0 | Initial documentation | Part 4 |

---
*Part 4 of 20 in the docs-contract-reference series*
