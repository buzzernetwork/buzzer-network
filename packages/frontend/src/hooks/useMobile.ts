'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current viewport is mobile
 * Uses 768px as the breakpoint (standard tablet/mobile breakpoint)
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}


