import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export function maskAddress(address) {
  if (!address || address.length < 12) return address || 'unknown';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function extractRetrySecondsFromBody(textBody) {
  const match = textBody.match(/try again in\s+(\d+)\s+seconds/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export async function fetchJsonWithRetry(url, attempts = 5) {
  let delayMs = 1200;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return await response.json();
      }

      const body = await response.text();
      const retrySeconds = response.status === 429 ? extractRetrySecondsFromBody(body) : null;

      if (attempt === attempts) {
        throw new Error(`Request failed (${response.status}): ${body}`);
      }

      const backoff = retrySeconds ? retrySeconds * 1000 : delayMs;
      console.log(`[retry] Status ${response.status}. Waiting ${Math.ceil(backoff / 1000)}s before attempt ${attempt + 1}/${attempts}...`);
      await sleep(backoff + 200);
      delayMs *= 2;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      console.log(`[retry] Fetch error: ${error.message}. Waiting ${Math.ceil(delayMs / 1000)}s before attempt ${attempt + 1}/${attempts}...`);
      await sleep(delayMs + 200);
      delayMs *= 2;
    }
  }

  throw new Error('Unexpected retry flow');
}

export function parseCsvWallets(csvRaw) {
  const lines = csvRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split(',').map((h) => h.trim());
  const addrIndex = header.indexOf('address');
  const pkIndex = header.indexOf('privateKey');

  if (addrIndex === -1 || pkIndex === -1) {
    throw new Error('CSV is missing required columns: address, privateKey');
  }

  return lines.slice(1).map((line) => {
    const parts = line.split(',');
    return {
      address: (parts[addrIndex] || '').trim(),
      privateKey: (parts[pkIndex] || '').trim(),
    };
  });
}

export function loadWallets(walletFile) {
  const absolutePath = resolve(walletFile.replace(/^~\//, `${process.env.HOME || ''}/`));
  const raw = readFileSync(absolutePath, 'utf8');

  let wallets;

  if (absolutePath.endsWith('.csv')) {
    wallets = parseCsvWallets(raw);
  } else {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      wallets = parsed;
    } else if (Array.isArray(parsed.wallets)) {
      wallets = parsed.wallets;
    } else {
      throw new Error('JSON wallet file must be an array or have a wallets[] field');
    }
  }

  const filtered = wallets
    .map((wallet) => ({
      address: wallet.address,
      privateKey: wallet.privateKey,
    }))
    .filter((wallet) => wallet.privateKey);

  return { wallets: filtered, absolutePath };
}

export function formatBroadcastError(resOrError) {
  if (!resOrError) return 'Unknown broadcast error';

  if (resOrError instanceof Error) {
    return resOrError.message;
  }

  if (typeof resOrError === 'string') {
    return resOrError;
  }

  if (resOrError.error) {
    return resOrError.reason ? `${resOrError.error} (${resOrError.reason})` : String(resOrError.error);
  }

  return JSON.stringify(resOrError);
}

function isNonceError(message) {
  return /nonce|bad.?nonce|conflictingnonce|conflicting nonce/i.test(message);
}

function isRetryableBroadcastMessage(message) {
  return /429|5\d\d|temporar|timeout|network|fetch|parse node response|mempool|service unavailable|rate limit|nonce/i.test(message);
}

export async function executeWithBroadcastRecovery({
  send,
  initialNonce,
  refreshNonce,
  maxAttempts = 3,
  retryDelayMs = 1500,
  onRetry,
}) {
  let nonce = initialNonce;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await send(nonce);

      if (!res?.error) {
        return {
          success: true,
          txid: res?.txid,
          response: res,
          nonceUsed: nonce,
          nextNonce: nonce + 1,
          attemptsUsed: attempt,
        };
      }

      const message = formatBroadcastError(res);
      const retryable = isRetryableBroadcastMessage(message);
      const nonceIssue = isNonceError(message);

      if (!retryable || attempt === maxAttempts) {
        return {
          success: false,
          error: message,
          response: res,
          nonceUsed: nonce,
          attemptsUsed: attempt,
        };
      }

      if (nonceIssue && refreshNonce) {
        nonce = await refreshNonce();
      }

      if (onRetry) {
        onRetry(message, attempt, maxAttempts);
      }
      await sleep(retryDelayMs * attempt);
    } catch (error) {
      const message = formatBroadcastError(error);
      const retryable = isRetryableBroadcastMessage(message);
      const nonceIssue = isNonceError(message);

      if (!retryable || attempt === maxAttempts) {
        return {
          success: false,
          error: message,
          nonceUsed: nonce,
          attemptsUsed: attempt,
        };
      }

      if (nonceIssue && refreshNonce) {
        nonce = await refreshNonce();
      }

      if (onRetry) {
        onRetry(message, attempt, maxAttempts);
      }
      await sleep(retryDelayMs * attempt);
    }
  }

  return {
    success: false,
    error: 'Unexpected retry flow',
    nonceUsed: initialNonce,
    attemptsUsed: maxAttempts,
  };
}

export function loadFailedAddressesFromReport(reportPath) {
  const absolutePath = resolve(reportPath.replace(/^~\//, `${process.env.HOME || ''}/`));
  const parsed = JSON.parse(readFileSync(absolutePath, 'utf8'));
  const failed = (parsed.results || []).filter((item) => !item.success && item.address);

  return {
    absolutePath,
    failedAddresses: new Set(failed.map((item) => item.address)),
  };
}
