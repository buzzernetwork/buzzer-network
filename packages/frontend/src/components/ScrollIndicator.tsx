'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ScrollIndicator() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Hide indicator after user scrolls
      if (window.scrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 pointer-events-none z-30 animate-bounce">
      <div className="flex flex-col items-center gap-2">
        <ChevronDown className="w-6 h-6 text-white/60" />
        <p className="text-xs text-white/50 font-mono uppercase tracking-wider">
          Scroll
        </p>
      </div>
    </div>
  );
}

