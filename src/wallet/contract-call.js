import { CONFIG } from '../config/app-config.js';

export function withWalletContractOptions(options, userAddress) {
  return {
    ...options,
    stxAddress: userAddress ?? undefined,
    appDetails: {
      name: CONFIG.APP_NAME,
      icon: CONFIG.APP_ICON,
    },
  };
}
