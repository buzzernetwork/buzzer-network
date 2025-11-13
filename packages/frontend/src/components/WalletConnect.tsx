'use client';

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useEIP6963 } from '@/hooks/useEIP6963';
import { useMobile } from '@/hooks/useMobile';
import { useToast } from '@/hooks/use-toast';
import { injected } from 'wagmi/connectors';
import { base, baseSepolia } from 'wagmi/chains';
import { Copy, Check, ExternalLink, LogOut, Wallet, AlertCircle } from 'lucide-react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { clearAuth } from '@/lib/auth';

export function WalletConnect() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { providers: eip6963Providers } = useEIP6963();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { toast } = useToast();
  const isMobile = useMobile();
  
  const [mounted, setMounted] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const previousAddressRef = useRef<string | undefined>();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Account change detection
  useEffect(() => {
    if (isConnected && address && previousAddressRef.current) {
      if (previousAddressRef.current !== address) {
        // Account changed
        clearAuth();
        toast({
          title: 'Account Changed',
          description: `Switched to ${address.slice(0, 6)}...${address.slice(-4)}`,
          duration: 3000,
        });
      }
    }
    previousAddressRef.current = address;
  }, [address, isConnected, toast]);

  const handleConnect = () => {
    const availableConnectors = connectors.filter(c => c.ready);
    
    if (isMobile) {
      setDrawerOpen(true);
    } else if (availableConnectors.length === 1) {
      connect({ connector: availableConnectors[0] });
    } else {
      setShowWalletMenu(!showWalletMenu);
    }
  };

  const handleEIP6963Connect = (provider: any) => {
    try {
      const connector = injected({
        target: {
          id: provider.info.rdns,
          name: provider.info.name,
          provider: () => provider.provider,
        },
      });
      connect({ connector });
      setShowWalletMenu(false);
      setDrawerOpen(false);
    } catch (error) {
      console.error('Failed to connect with EIP-6963 provider:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect wallet. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy address',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = () => {
    clearAuth();
    disconnect();
    setShowDisconnectDialog(false);
    setDrawerOpen(false);
    toast({
      title: 'Wallet Disconnected',
      description: 'You have been disconnected',
    });
  };

  const handleSwitchNetwork = async () => {
    const targetChainId = process.env.NEXT_PUBLIC_BASE_NETWORK === 'base-mainnet' 
      ? base.id 
      : baseSepolia.id;
    
    if (chainId === targetChainId) return;
    
    try {
      await switchChain({ chainId: targetChainId });
      toast({
        title: 'Network Switched',
        description: 'Successfully switched network',
      });
    } catch (error) {
      toast({
        title: 'Switch Failed',
        description: 'Failed to switch network. Please switch manually in your wallet.',
        variant: 'destructive',
      });
    }
  };

  const getNetworkName = () => {
    if (chainId === base.id) return 'Base';
    if (chainId === baseSepolia.id) return 'Base Sepolia';
    return 'Unknown Network';
  };

  const isCorrectNetwork = () => {
    const targetChainId = process.env.NEXT_PUBLIC_BASE_NETWORK === 'base-mainnet' 
      ? base.id 
      : baseSepolia.id;
    return chainId === targetChainId;
  };

  const getBaseScanUrl = () => {
    const network = process.env.NEXT_PUBLIC_BASE_NETWORK === 'base-mainnet' ? '' : 'sepolia.';
    return `https://${network}basescan.org/address/${address}`;
  };

  const getWalletName = () => {
    if (connector?.name) return connector.name;
    if (eip6963Providers.length > 0) {
      const provider = eip6963Providers.find(p => 
        p.provider === (window as any).ethereum
      );
      return provider?.info.name || 'Wallet';
    }
    return 'Wallet';
  };

  // Close menu when clicking outside (desktop only)
  useEffect(() => {
    if (!showWalletMenu || isMobile) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.wallet-menu-container')) {
        setShowWalletMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showWalletMenu, isMobile]);

  if (!mounted) {
    return null;
  }

  // Connected State Content (shared between drawer and dropdown)
  const ConnectedContent = () => (
    <>
      {/* Wallet Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{getWalletName()}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isCorrectNetwork()
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              }`}
            >
              {getNetworkName()}
            </span>
            {!isCorrectNetwork() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchNetwork}
                className="h-5 px-2 text-xs text-yellow-300 hover:text-yellow-200"
              >
                Switch
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Account Info */}
      <div className="px-4 py-3 space-y-3">
        <div>
          <p className="text-xs text-white/60 mb-1">Wallet Address</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-sm text-white flex-1 truncate">{address}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAddress}
              className="h-9 w-9 p-0 flex-shrink-0"
              aria-label="Copy wallet address"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-300" />
              ) : (
                <Copy className="w-4 h-4 text-white/60" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Actions */}
      <div className="px-2 py-2">
        <button
          onClick={() => window.open(getBaseScanUrl(), '_blank')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="View wallet on BaseScan"
        >
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
          <span>View on BaseScan</span>
        </button>
        <button
          onClick={() => setShowDisconnectDialog(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
          aria-label="Disconnect wallet"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>Disconnect</span>
        </button>
      </div>
    </>
  );

  // Connected State - Mobile (Drawer)
  if (isConnected && isMobile) {
    return (
      <>
        <Button
          variant="glass-dark"
          size="sm"
          onClick={() => setDrawerOpen(true)}
          className="font-mono text-xs"
        >
          {address?.slice(0, 4)}...{address?.slice(-4)}
        </Button>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="bg-black/95 backdrop-blur-xl border-t border-white/10 text-white">
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-white">Wallet</DrawerTitle>
              <DrawerDescription className="text-white/60">
                Manage your wallet connection
              </DrawerDescription>
            </DrawerHeader>
            <div className="pb-4">
              <ConnectedContent />
            </div>
          </DrawerContent>
        </Drawer>

        <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Disconnect Wallet?</DialogTitle>
              <DialogDescription className="text-white/60">
                You'll need to reconnect to continue using Buzzer Network.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDisconnectDialog(false)}
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
              >
                Disconnect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Connected State - Desktop (Dropdown)
  if (isConnected && !isMobile) {
    return (
      <>
        <div className="relative wallet-menu-container">
          <Button
            variant="glass-dark"
            size="sm"
            onClick={() => setShowWalletMenu(!showWalletMenu)}
            className="font-mono text-xs"
          >
            {address?.slice(0, 4)}...{address?.slice(-4)}
          </Button>
          
          {showWalletMenu && (
            <div className="absolute right-0 top-full mt-2 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 w-80 overflow-hidden">
              <ConnectedContent />
            </div>
          )}
        </div>

        <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Disconnect Wallet?</DialogTitle>
              <DialogDescription className="text-white/60">
                You'll need to reconnect to continue using Buzzer Network.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDisconnectDialog(false)}
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
              >
                Disconnect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Not Connected - Wallet Selection
  const WalletSelectionContent = () => (
    <>
      {eip6963Providers.length > 0 && (
        <>
          {eip6963Providers.map((providerDetail) => (
            <button
              key={providerDetail.info.uuid}
              onClick={() => handleEIP6963Connect(providerDetail)}
              disabled={isPending}
              className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 min-h-[44px]"
              aria-label={`Connect with ${providerDetail.info.name}`}
            >
              {providerDetail.info.icon && (
                <img
                  src={providerDetail.info.icon}
                  alt={providerDetail.info.name}
                  className="w-6 h-6 rounded flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="font-medium">{providerDetail.info.name}</span>
            </button>
          ))}
          {connectors.filter(c => c.ready).length > 0 && (
            <Separator className="bg-white/10 my-2" />
          )}
        </>
      )}
      
      {connectors
        .filter((connector) => {
          if (!connector.ready) return false;
          const hasEIP6963Version = eip6963Providers.some(
            (p) => p.info.name.toLowerCase() === connector.name.toLowerCase()
          );
          return !hasEIP6963Version;
        })
        .map((connector) => (
          <button
            key={connector.id}
            onClick={() => {
              connect({ connector });
              setShowWalletMenu(false);
              setDrawerOpen(false);
            }}
            disabled={isPending}
            className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 min-h-[44px]"
            aria-label={`Connect with ${connector.name}`}
          >
            <span className="font-medium">{connector.name}</span>
          </button>
        ))}
      
      {eip6963Providers.length === 0 && connectors.filter(c => c.ready).length === 0 && (
        <div className="px-4 py-6 text-sm text-white/60 text-center flex flex-col items-center gap-2">
          <AlertCircle className="w-5 h-5 text-white/40" />
          <p>No wallets detected.</p>
          <p className="text-xs">Please install MetaMask or another wallet extension.</p>
        </div>
      )}
    </>
  );

  // Not Connected - Mobile (Drawer)
  if (isMobile) {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="glass-dark"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            disabled={isPending}
          >
            {isPending ? 'Connecting...' : 'Connect'}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="bg-black/95 backdrop-blur-xl border-t border-white/10 text-white">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-white">Connect Wallet</DrawerTitle>
            <DrawerDescription className="text-white/60">
              Choose a wallet to connect to Buzzer Network
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-1">
            <WalletSelectionContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Not Connected - Desktop (Dropdown)
  return (
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
        <div className="absolute right-0 top-full mt-2 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[240px] shadow-2xl z-50 max-h-[400px] overflow-y-auto">
          <WalletSelectionContent />
        </div>
      )}
    </div>
  );
}
