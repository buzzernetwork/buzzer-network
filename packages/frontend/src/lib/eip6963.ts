/**
 * EIP-6963 Provider Discovery
 * Standardized wallet discovery for multiple injected providers
 * https://eips.ethereum.org/EIPS/eip-6963
 */

export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isBraveWallet?: boolean;
  [key: string]: unknown;
}

export interface EIP6963ProviderInfo {
  rdns: string; // Reverse domain name identifier (e.g., "io.metamask")
  uuid: string; // Unique identifier
  name: string; // Wallet name (e.g., "MetaMask")
  icon: string; // Base64 encoded icon or URL
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

// Type declarations for window.ethereum and window.braveEthereum
declare global {
  interface Window {
    ethereum?: any;
    braveEthereum?: EIP1193Provider;
  }
}

type ProviderListener = (provider: EIP6963ProviderDetail) => void;

class EIP6963ProviderStore {
  private providers: Map<string, EIP6963ProviderDetail> = new Map();
  private listeners: Set<ProviderListener> = new Set();
  private initialized = false;

  /**
   * Initialize EIP-6963 provider discovery
   */
  initialize(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    this.initialized = true;

    // Listen for provider announcements
    window.addEventListener('eip6963:announceProvider', this.handleAnnounceProvider);

    // Request providers to announce themselves
    // This is useful for wallets that loaded before our listener was set up
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Also check for legacy providers (non-EIP-6963 wallets)
    this.detectLegacyProviders();
  }

  /**
   * Handle provider announcement events
   */
  private handleAnnounceProvider = (event: Event): void => {
    const customEvent = event as CustomEvent<EIP6963ProviderDetail>;
    const detail = customEvent.detail;

    if (!detail || !detail.info || !detail.provider) {
      return;
    }

    const { uuid } = detail.info;
    
    // Store provider
    this.providers.set(uuid, detail);

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(detail);
      } catch (error) {
        console.error('Error in provider listener:', error);
      }
    });
  };

  /**
   * Detect legacy providers (non-EIP-6963 wallets)
   * Falls back to window.ethereum and window.braveEthereum
   */
  private detectLegacyProviders(): void {
    // Check for window.ethereum (MetaMask, etc.)
    if (typeof window !== 'undefined' && window.ethereum) {
      const ethereum = window.ethereum as EIP1193Provider;
      
      // Determine wallet name
      let walletName = 'Injected Wallet';
      let rdns = 'io.ethereum';
      
      if (ethereum.isMetaMask) {
        walletName = 'MetaMask';
        rdns = 'io.metamask';
      } else if (ethereum.isBraveWallet) {
        walletName = 'Brave Wallet';
        rdns = 'com.brave.wallet';
      }

      // Create provider detail for legacy provider
      const legacyProvider: EIP6963ProviderDetail = {
        info: {
          rdns,
          uuid: `legacy-${rdns}`,
          name: walletName,
          icon: '', // Legacy providers don't provide icons via EIP-6963
        },
        provider: ethereum,
      };

      // Only add if we don't already have an EIP-6963 version
      const hasEIP6963Version = Array.from(this.providers.values()).some(
        (p) => p.info.rdns === rdns
      );

      if (!hasEIP6963Version) {
        this.providers.set(legacyProvider.info.uuid, legacyProvider);
        
        // Notify listeners
        this.listeners.forEach((listener) => {
          try {
            listener(legacyProvider);
          } catch (error) {
            console.error('Error in provider listener:', error);
          }
        });
      }
    }

    // Check for window.braveEthereum (Brave browser)
    if (typeof window !== 'undefined' && (window as any).braveEthereum) {
      const braveEthereum = (window as any).braveEthereum as EIP1193Provider;
      
      const braveProvider: EIP6963ProviderDetail = {
        info: {
          rdns: 'com.brave.wallet',
          uuid: 'legacy-com.brave.wallet',
          name: 'Brave Wallet',
          icon: '',
        },
        provider: braveEthereum,
      };

      const hasEIP6963Version = Array.from(this.providers.values()).some(
        (p) => p.info.rdns === 'com.brave.wallet'
      );

      if (!hasEIP6963Version) {
        this.providers.set(braveProvider.info.uuid, braveProvider);
        
        this.listeners.forEach((listener) => {
          try {
            listener(braveProvider);
          } catch (error) {
            console.error('Error in provider listener:', error);
          }
        });
      }
    }
  }

  /**
   * Get all discovered providers
   */
  getProviders(): EIP6963ProviderDetail[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by UUID
   */
  getProvider(uuid: string): EIP6963ProviderDetail | undefined {
    return this.providers.get(uuid);
  }

  /**
   * Get provider by RDNS (reverse domain name)
   */
  getProviderByRdns(rdns: string): EIP6963ProviderDetail | undefined {
    return Array.from(this.providers.values()).find((p) => p.info.rdns === rdns);
  }

  /**
   * Subscribe to provider announcements
   */
  subscribe(listener: ProviderListener): () => void {
    this.listeners.add(listener);

    // Immediately call listener with existing providers
    this.providers.forEach((provider) => {
      try {
        listener(provider);
      } catch (error) {
        console.error('Error in provider listener:', error);
      }
    });

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('eip6963:announceProvider', this.handleAnnounceProvider);
    }
    this.listeners.clear();
    this.providers.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const eip6963Store = new EIP6963ProviderStore();

// Initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      eip6963Store.initialize();
    });
  } else {
    eip6963Store.initialize();
  }
}

