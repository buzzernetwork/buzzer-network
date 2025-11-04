/**
 * Wallet Configuration for BASE Network
 * Using wagmi + viem for wallet connections
 */

import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, metaMask, walletConnect } from 'wagmi/connectors';

// Determine which network to use based on environment
const network = process.env.NEXT_PUBLIC_BASE_NETWORK || 'base-sepolia';
const chains = network === 'base-mainnet' ? [base] as const : [baseSepolia, base] as const;

// Build connectors array conditionally
const connectors = [
  metaMask(),
  coinbaseWallet({
    appName: 'Buzzer Network',
  }),
];

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

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});

// Export chain configuration
export { chains };

