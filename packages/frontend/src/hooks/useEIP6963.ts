/**
 * React Hook for EIP-6963 Provider Discovery
 * Manages wallet provider discovery state
 */

import { useState, useEffect } from 'react';
import { eip6963Store, EIP6963ProviderDetail } from '@/lib/eip6963';

export function useEIP6963() {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize store
    eip6963Store.initialize();
    setIsInitialized(true);

    // Get initial providers
    setProviders(eip6963Store.getProviders());

    // Subscribe to new provider announcements
    const unsubscribe = eip6963Store.subscribe((provider) => {
      setProviders((prev) => {
        // Check if provider already exists
        const exists = prev.some((p) => p.info.uuid === provider.info.uuid);
        if (exists) {
          return prev;
        }
        return [...prev, provider];
      });
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    providers,
    isInitialized,
    getProvider: (uuid: string) => eip6963Store.getProvider(uuid),
    getProviderByRdns: (rdns: string) => eip6963Store.getProviderByRdns(rdns),
  };
}



