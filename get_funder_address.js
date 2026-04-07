import { getAddressFromPrivateKey } from '@stacks/transactions';
import { generateWallet } from '@stacks/wallet-sdk';

const FUNDER_MNEMONIC = 'assume one trust cotton success worth south project gather wolf notice buffalo urban wrap mesh pen enforce nothing quarter install dish crouch cloth rely';
const NETWORK_NAME = 'mainnet';

async function main() {
  const wallet = await generateWallet({
    secretKey: FUNDER_MNEMONIC,
    password: '',
  });
  const account = wallet.accounts[0];
  const funderAddress = getAddressFromPrivateKey(account.stxPrivateKey, 'mainnet');
  console.log(funderAddress);
}

main().catch(console.error);
