/**
 * Wallet Configuration for BASE Network
 * Using wagmi + viem for wallet connections with EIP-6963 support
 * 
 * EIP-6963 support: The injected() connector automatically discovers
 * multiple wallet providers using EIP-6963 standard
 */

import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected, metaMask, walletConnect } from 'wagmi/connectors';

// Determine which network to use based on environment
const network = process.env.NEXT_PUBLIC_BASE_NETWORK || 'base-sepolia';
const chains = network === 'base-mainnet' ? [base] as const : [baseSepolia, base] as const;

/**
 * Build connectors array with EIP-6963 support
 * 
 * The injected() connector in wagmi v2 automatically supports EIP-6963
 * and will discover multiple wallet providers without conflicts.
 * 
 * We also include specific connectors (metaMask, coinbaseWallet) as fallbacks
 * and for better naming/identification.
 */
function buildConnectors() {
  const connectors: any[] = [];

  // Use injected connector - automatically discovers EIP-6963 providers
  // This will detect MetaMask, Brave Wallet, and other EIP-6963 compliant wallets
  connectors.push(injected());

  // Also add specific connectors for better UX (they may use the same provider)
  // but provide better naming and specific features
  connectors.push(metaMask());
  
  connectors.push(
    coinbaseWallet({
      appName: 'Buzzer Network',
    })
  );

  // Only add WalletConnect if project ID is configured
  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (walletConnectProjectId && walletConnectProjectId.trim() !== '') {
    try {
      connectors.push(
        walletConnect({
          projectId: walletConnectProjectId,
        }) as any
      );
    } catch (error) {
      // WalletConnect optional - skip if not available
      if (process.env.NODE_ENV === 'development') {
        console.warn('WalletConnect connector failed to initialize:', error);
      }
    }
  } else {
    // Log warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'WalletConnect not configured: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing. ' +
        'Get a project ID at https://cloud.reown.com'
      );
    }
  }

  // Note: WalletConnect may show "already initialized" warnings in development
  // due to Next.js Fast Refresh. This is harmless and can be ignored.

  return connectors;
}

// Build connectors
const connectors = buildConnectors();

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
  // Disable SSR for wallet detection (wallets are client-side only)
  ssr: false,
});

// Export chain configuration
export { chains };

