/**
 * Authentication Utilities
 * Wallet signing and authentication helpers
 */

import { useAccount, useSignMessage } from 'wagmi';
import { api } from './api';

export interface AuthResult {
  token: string;
  address: string;
  userId?: string;
  userType: 'publisher' | 'advertiser' | 'new';
}

/**
 * Authenticate with wallet
 * Signs message and gets JWT token
 */
export async function authenticateWithWallet(
  address: string,
  signMessage: (variables: { message: string }) => Promise<`0x${string}`>
): Promise<AuthResult> {
  try {
    // Get auth message
    const { message, nonce } = await api.getAuthMessage(address);

    // Sign message with wallet (wagmi v2 format)
    const signature = await signMessage({ message });

    // Verify signature and get token
    const result = await api.verifySignature(address, message, signature);

    // Store token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('wallet_address', address);
    }

    return result;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Get stored wallet address
 */
export function getWalletAddress(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wallet_address');
}

/**
 * Clear authentication
 */
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('wallet_address');
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null && getWalletAddress() !== null;
}

