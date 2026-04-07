import {
  makeSTXTokenTransfer,
  broadcastTransaction,
  AnchorMode,
  getAddressFromPrivateKey,
} from '@stacks/transactions';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { generateWallet } from '@stacks/wallet-sdk';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FUNDER_MNEMONIC = 'assume one trust cotton success worth south project gather wolf notice buffalo urban wrap mesh pen enforce nothing quarter install dish crouch cloth rely';
const WALLET_FILE = '/home/thee1/SpinningB/generated/mainnet-wallets.json';
const AMOUNT_STX = 0.015;
const AMOUNT_MICROSTX = BigInt(Math.floor(AMOUNT_STX * 1000000));
const NETWORK_NAME = 'mainnet';
const NETWORK = NETWORK_NAME === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
const API_URL = NETWORK_NAME === 'mainnet' ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so';

async function getAccountNonce(address) {
  const response = await fetch(`${API_URL}/extended/v1/address/${address}/nonces`);
  const data = await response.json();
  return Number(data.possible_next_nonce);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // 1. Get funder account from mnemonic
  const wallet = await generateWallet({
    secretKey: FUNDER_MNEMONIC,
    password: '',
  });
  const account = wallet.accounts[0];
  const funderPrivateKey = account.stxPrivateKey;
  const funderAddress = getAddressFromPrivateKey(funderPrivateKey, NETWORK_NAME);
  
  console.log(`Funder Address: ${funderAddress}`);
  
  // 2. Load target wallets
  const raw = readFileSync(resolve(WALLET_FILE), 'utf8');
  const data = JSON.parse(raw);
  const wallets = (data.wallets || data).slice(0, 50);
  
  console.log(`Funding ${wallets.length} wallets with ${AMOUNT_STX} STX each...`);

  // 3. Get initial nonce
  let nonce = await getAccountNonce(funderAddress);
  console.log(`Starting Nonce: ${nonce}`);

  // 4. Send transfers
  for (let i = 0; i < wallets.length; i++) {
    const target = wallets[i];
    console.log(`[${i + 1}/50] Funding ${target.address}...`);
    
    try {
      const tx = await makeSTXTokenTransfer({
        recipient: target.address,
        amount: AMOUNT_MICROSTX,
        senderKey: funderPrivateKey,
        network: NETWORK,
        anchorMode: AnchorMode.Any,
        nonce: BigInt(nonce),
        fee: 10000n, // ~0.01 STX fee
      });

      const result = await broadcastTransaction({ transaction: tx, network: NETWORK });
      
      if (result.error) {
        console.error(`  Failed: ${result.error} ${result.reason || ''}`);
      } else {
        console.log(`  Success! TXID: ${result.txid}`);
        nonce++;
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
    
    // Small delay to avoid hammering the API
    await sleep(500);
  }
  
  console.log('\nFunding complete.');
}

main().catch(console.error);
