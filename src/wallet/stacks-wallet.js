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

export function getConnectedStacksAddress() {
  if (!isConnected()) {
    return null;
  }

  return readStoredStacksAddress();
}

export async function openStacksWalletConnection() {
  const result = await connect(getWalletConnectOptions());
  const fromResponse = result?.addresses?.[0]?.address;
  return fromResponse ?? readStoredStacksAddress();
}

export function closeStacksWalletConnection() {
  disconnect();
}

export function createWalletConnectTimeout(onTimeout) {
  return window.setTimeout(() => {
    onTimeout();
  }, CONFIG.WALLET_CONNECT_TIMEOUT_MS);
}

export function clearWalletConnectTimeout(timerId) {
  if (timerId) {
    window.clearTimeout(timerId);
  }
}
