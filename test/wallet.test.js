import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config/app-config.js';
import { withWalletContractOptions } from '../src/wallet/contract-call.js';

describe('wallet helpers', () => {
  it('exposes a wallet connect timeout budget', () => {
    expect(CONFIG.WALLET_CONNECT_TIMEOUT_MS).toBeGreaterThan(30_000);
  });

  it('injects stx address into contract call options', () => {
    const options = withWalletContractOptions(
      {
        contractAddress: 'SP31G2FZ5JN87BATZMP4ZRYE5F7WZQDNEXJ7G7X97',
        contractName: 'simple-nft-v4',
        functionName: 'mint',
        functionArgs: [],
      },
      'SP2ABC1234567890ABCDEFGHIJK'
    );

    expect(options.stxAddress).toBe('SP2ABC1234567890ABCDEFGHIJK');
    expect(options.appDetails?.name).toBe(CONFIG.APP_NAME);
  });
});
