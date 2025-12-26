// NFT Mint App - Uses @stacks/connect for wallet connection
import { AppConfig, UserSession, showConnect, openContractCall } from '@stacks/connect';
import { deserializeCV, cvToValue } from '@stacks/transactions';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

// Configuration
const CONFIG = {
  CONTRACT_ADDRESS: 'SP31G2FZ5JN87BATZMP4ZRYE5F7WZQDNEXJ7G7X97',
  CONTRACT_NAME: 'simple-nft-v2',
  NETWORK: 'mainnet',
  MINT_PRICE: 1000,
  APP_NAME: 'Simple NFT',
  APP_ICON: 'https://snfish.vercel.app/icon.png'
};

// Initialize Stacks Connect
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// DOM Elements
const elements = {
  connectBtn: document.getElementById('connect-btn'),
  mintBtn: document.getElementById('mint-btn'),
  disconnectBtn: document.getElementById('disconnect-btn'),
  notConnected: document.getElementById('not-connected'),
  connected: document.getElementById('connected'),
  walletAddress: document.getElementById('wallet-address'),
  status: document.getElementById('status'),
  minted: document.getElementById('minted')
};

// State
let userAddress = null;

// Show status message
function showStatus(message, type = 'info') {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  elements.status.classList.remove('hidden');
}

// Hide status
function hideStatus() {
  elements.status.classList.add('hidden');
}

// Update UI based on connection state
function updateUI() {
  if (userAddress) {
    elements.notConnected.classList.add('hidden');
    elements.connected.classList.remove('hidden');
    elements.walletAddress.textContent = `${userAddress.slice(0, 8)}...${userAddress.slice(-8)}`;
  } else {
    elements.notConnected.classList.remove('hidden');
    elements.connected.classList.add('hidden');
  }
}

// Connect wallet using @stacks/connect
function connectWallet() {
  showStatus('Opening wallet...', 'info');
  
  showConnect({
    appDetails: {
      name: CONFIG.APP_NAME,
      icon: CONFIG.APP_ICON,
    },
    redirectTo: '/',
    onFinish: () => {
      hideStatus();
      const userData = userSession.loadUserData();
      console.log('User data:', userData);
      userAddress = userData.profile.stxAddress.mainnet;
      updateUI();
      showStatus('Connected!', 'success');
      setTimeout(hideStatus, 2000);
      fetchMintedCount();
    },
    onCancel: () => {
      showStatus('Connection cancelled', 'error');
      setTimeout(hideStatus, 3000);
    },
    userSession,
  });
}

// Disconnect wallet
function disconnectWallet() {
  userSession.signUserOut('/');
  userAddress = null;
  updateUI();
  hideStatus();
}

// Fetch minted count from contract
async function fetchMintedCount() {
  try {
    const apiUrl = CONFIG.NETWORK === 'mainnet' 
      ? 'https://api.mainnet.hiro.so'
      : 'https://api.testnet.hiro.so';
    
    const response = await fetch(
      `${apiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.CONTRACT_NAME}/get-total-minted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: CONFIG.CONTRACT_ADDRESS,
          arguments: []
        })
      }
    );
    
    const data = await response.json();
    if (data.okay && data.result) {
      const cv = deserializeCV(data.result);
      const value = cvToValue(cv);
      elements.minted.textContent = value.toLocaleString();
    }
  } catch (error) {
    console.error('Failed to fetch minted count:', error);
    elements.minted.textContent = '0';
  }
}

// Mint NFT
function mintNFT() {
  if (!userAddress) {
    showStatus('Please connect your wallet first', 'error');
    return;
  }
  
  elements.mintBtn.disabled = true;
  showStatus('Opening wallet for approval...', 'info');
  
  openContractCall({
    contractAddress: CONFIG.CONTRACT_ADDRESS,
    contractName: CONFIG.CONTRACT_NAME,
    functionName: 'mint',
    functionArgs: [],
    network: CONFIG.NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET,
    appDetails: {
      name: CONFIG.APP_NAME,
      icon: CONFIG.APP_ICON,
    },
    onFinish: (data) => {
      console.log('Mint response:', data);
      const txId = data.txId;
      const explorerUrl = CONFIG.NETWORK === 'mainnet'
        ? `https://explorer.hiro.so/txid/${txId}`
        : `https://explorer.hiro.so/txid/${txId}?chain=testnet`;
      
      elements.status.className = 'status success';
      elements.status.innerHTML = `NFT minted! <a href="${explorerUrl}" target="_blank">View on Explorer</a>`;
      elements.status.classList.remove('hidden');
      elements.mintBtn.disabled = false;
      
      setTimeout(fetchMintedCount, 10000);
    },
    onCancel: () => {
      showStatus('Transaction cancelled', 'error');
      elements.mintBtn.disabled = false;
      setTimeout(hideStatus, 3000);
    },
    userSession,
  });
}

// Event listeners
elements.connectBtn.addEventListener('click', connectWallet);
elements.mintBtn.addEventListener('click', mintNFT);
elements.disconnectBtn.addEventListener('click', disconnectWallet);

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  fetchMintedCount();
  
  // Check for existing session
  if (userSession.isUserSignedIn()) {
    const userData = userSession.loadUserData();
    userAddress = userData.profile.stxAddress.mainnet;
    updateUI();
  }
  
  // Handle redirect from wallet
  if (userSession.isSignInPending()) {
    userSession.handlePendingSignIn().then((userData) => {
      userAddress = userData.profile.stxAddress.mainnet;
      updateUI();
    });
  }
});
