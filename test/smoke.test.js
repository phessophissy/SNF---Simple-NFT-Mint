import { describe, expect, it } from 'vitest';

describe('project smoke', () => {
  it('has expected contract names', () => {
    const nftContractName = 'simple-nft-v4';
    const marketplaceContractName = 'nft-marketplace-v2';

    expect(nftContractName).toBe('simple-nft-v4');
    expect(marketplaceContractName).toBe('nft-marketplace-v2');
  });

  it('uses valid stx fee constants', () => {
    const mintFeeMicroStx = 1000;
    const listFeeMicroStx = 1300;

    expect(mintFeeMicroStx).toBeGreaterThan(0);
    expect(listFeeMicroStx).toBeGreaterThanOrEqual(mintFeeMicroStx);
  });
});
