'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletConnect } from './WalletConnect';
import { cn } from '@/lib/utils';

export function Header() {
  const { isConnected } = useAccount();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass-dark border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="text-2xl font-bold text-white transition-all duration-300 hover:scale-105"
            >
              Buzzer Network
            </Link>
            
            <nav className="flex items-center gap-6">
              <Link
                href="/publishers"
                className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105"
              >
                Publishers
              </Link>
              <Link
                href="/advertisers"
                className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105"
              >
                Advertisers
              </Link>
              
              {isConnected && (
                <Link
                  href="/dashboard"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105"
                >
                  Dashboard
                </Link>
              )}
              
              <WalletConnect />
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

