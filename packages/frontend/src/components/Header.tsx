'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [mounted, setMounted] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = () => {
    // If only one connector available, connect directly
    const availableConnectors = connectors.filter(c => c.ready);
    if (availableConnectors.length === 1) {
      connect({ connector: availableConnectors[0] });
    } else if (availableConnectors.length > 1) {
      // Multiple connectors, show menu
      setShowWalletMenu(!showWalletMenu);
    } else {
      // No connectors available, still show menu
      setShowWalletMenu(!showWalletMenu);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!showWalletMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.wallet-menu-container')) {
        setShowWalletMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showWalletMenu]);

  if (!mounted) {
    return null;
  }

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isHomePage ? "bg-black/20 backdrop-blur-xl border-b border-white/10" : "bg-black/40 backdrop-blur-xl border-b border-white/10"
    )}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link 
            href="/" 
            className="text-2xl font-bold text-white transition-all duration-300 hover:scale-105"
          >
            BUZZ
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link
              href="/publishers"
              className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 rounded-lg px-2 py-1"
            >
              Publishers
            </Link>
            <Link
              href="/advertisers"
              className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 rounded-lg px-2 py-1"
            >
              Advertisers
            </Link>
            
            {isConnected ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 rounded-lg px-2 py-1"
                >
                  Dashboard
                </Link>
                <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg font-mono text-xs text-white/80">
                  {address?.slice(0, 4)}...{address?.slice(-4)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnect()}
                  className="text-white/60 hover:text-white text-xs"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="relative wallet-menu-container">
                <Button
                  variant="glass-dark"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isPending}
                >
                  {isPending ? 'Connecting...' : 'Connect'}
                </Button>
                {showWalletMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[200px] shadow-2xl z-50">
                    {connectors.map((connector) => (
                      <button
                        key={connector.id}
                        onClick={() => {
                          connect({ connector });
                          setShowWalletMenu(false);
                        }}
                        disabled={!connector.ready || isPending}
                        className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {connector.name}
                        {!connector.ready && ' (unsupported)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

