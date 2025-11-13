'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks/useMobile';
import { Menu, X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

export function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const { isConnected } = useAccount();
  const isMobile = useMobile();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle scroll-based opacity changes
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if a path is active
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  // Base nav links (always shown)
  const baseNavLinks = [
    { href: '/publishers', label: 'Publishers' },
    { href: '/advertisers', label: 'Advertisers' },
  ];

  // Add dashboard link only when connected (client-side only)
  const navLinks = mounted && isConnected
    ? [...baseNavLinks, { href: '/dashboard', label: 'Dashboard' }]
    : baseNavLinks;

  // Calculate header background opacity based on scroll and page
  const headerOpacity = isHomePage
    ? scrolled
      ? 'bg-black/60'
      : 'bg-black/20'
    : scrolled
    ? 'bg-black/70'
    : 'bg-black/40';

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={cn(
          'relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50',
          active
            ? 'text-white bg-white/10'
            : 'text-white/80 hover:text-white hover:bg-white/5'
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        {label}
        {active && (
          <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          headerOpacity,
          'backdrop-blur-xl border-b border-white/10'
        )}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl font-bold text-white transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 rounded-lg"
              aria-label="Buzzer Network Home"
            >
              BUZZ
            </Link>

            {/* Desktop Navigation - Only render after mount to prevent hydration mismatch */}
            {mounted && !isMobile ? (
              <nav className="flex items-center gap-2">
                {navLinks.map((link) => (
                  <NavLink key={link.href} href={link.href} label={link.label} />
                ))}
                <WalletConnect />
              </nav>
            ) : mounted && isMobile ? (
              <div className="flex items-center gap-3">
                <WalletConnect />
                <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <DrawerTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/10 h-10 w-10"
                      aria-label="Open navigation menu"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="bg-black/95 backdrop-blur-xl border-t border-white/10 text-white">
                    <DrawerHeader className="text-left">
                      <div className="flex items-center justify-between">
                        <DrawerTitle className="text-white text-xl">Menu</DrawerTitle>
                        <DrawerClose asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 h-10 w-10"
                            aria-label="Close menu"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </DrawerClose>
                      </div>
                    </DrawerHeader>
                    <nav className="flex flex-col gap-2 px-4 pb-6">
                      {navLinks.map((link) => (
                        <NavLink key={link.href} href={link.href} label={link.label} />
                      ))}
                    </nav>
                  </DrawerContent>
                </Drawer>
              </div>
            ) : (
              // SSR fallback - render desktop nav structure
              <nav className="flex items-center gap-2">
                {baseNavLinks.map((link) => (
                  <NavLink key={link.href} href={link.href} label={link.label} />
                ))}
                <WalletConnect />
              </nav>
            )}
          </div>
        </div>
      </header>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:font-medium focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>
    </>
  );
}

