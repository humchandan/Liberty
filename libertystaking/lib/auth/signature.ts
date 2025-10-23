import { ethers } from 'ethers';

interface NonceStore {
  [walletAddress: string]: {
    nonce: string;
    expiresAt: number;
  };
}

const nonceStore: NonceStore = {};
const NONCE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Generate nonce
 */
export function generateNonce(walletAddress: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const nonce = `Sign this message to authenticate with Liberty Finance: ${timestamp}-${randomString}`;

  nonceStore[walletAddress.toLowerCase()] = {
    nonce,
    expiresAt: Date.now() + NONCE_EXPIRY,
  };

  return nonce;
}

/**
 * Verify signature
 */
export async function verifySignature(
  walletAddress: string,
  signature: string,
  nonce: string
): Promise<boolean> {
  try {
    const normalizedWallet = walletAddress.toLowerCase();

    const storedNonce = nonceStore[normalizedWallet];
    if (!storedNonce) {
      console.error('Nonce not found');
      return false;
    }

    if (Date.now() > storedNonce.expiresAt) {
      console.error('Nonce expired');
      delete nonceStore[normalizedWallet];
      return false;
    }

    if (storedNonce.nonce !== nonce) {
      console.error('Nonce mismatch');
      return false;
    }

    const recoveredAddress = ethers.utils.verifyMessage(nonce, signature);
    const isValid = recoveredAddress.toLowerCase() === normalizedWallet;

    if (isValid) {
      delete nonceStore[normalizedWallet];
    }

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Cleanup expired nonces
 */
setInterval(() => {
  const now = Date.now();
  Object.keys(nonceStore).forEach((wallet) => {
    if (nonceStore[wallet].expiresAt < now) {
      delete nonceStore[wallet];
    }
  });
}, 10 * 60 * 1000);
