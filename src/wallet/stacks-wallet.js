import { connect, disconnect, getLocalStorage, isConnected } from '@stacks/connect';
import { CONFIG } from '../config/app-config.js';

export function getWalletConnectOptions() {
  return {
    forceWalletSelect: true,
    persistWalletSelect: true,
    enableLocalStorage: true,
    walletConnect: {
      projectId: CONFIG.REOWN_PROJECT_ID,
      metadata: {
        name: CONFIG.APP_NAME,
        description: 'Mint, list, and trade NFTs on Stacks blockchain',
        url: window.location.origin,
        icons: [CONFIG.APP_ICON],
      },
    },
    network: CONFIG.NETWORK,
  };
}

export function readStoredStacksAddress() {
  const data = getLocalStorage();
  const addresses = data?.addresses?.stx ?? [];
  if (!addresses.length) {
    return null;
  }

  return addresses[0]?.address ?? null;
}

