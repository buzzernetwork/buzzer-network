'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-white/20 backdrop-blur-xl border border-white/10 rounded-xl font-mono text-sm text-white">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <Button
          variant="glass-dark"
          size="sm"
          onClick={() => disconnect()}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.id}
          variant="glass-dark"
          size="sm"
          onClick={() => connect({ connector })}
          disabled={!connector.ready || isPending}
        >
          {isPending
            ? 'Connecting...'
            : `Connect ${connector.name}`}
          {!connector.ready && ' (unsupported)'}
        </Button>
      ))}
    </div>
  );
}

