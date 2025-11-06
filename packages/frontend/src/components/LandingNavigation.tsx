'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { Globe, Megaphone } from 'lucide-react';

export function LandingNavigation() {

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Center Bottom CTAs */}
      <div className="absolute bottom-10 left-0 right-0 pointer-events-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-4xl mx-auto">
            {/* Publisher CTA */}
            <Link href="/publishers" className="w-full sm:w-auto">
              <Button
                variant="glass-dark"
                size="lg"
                className="w-full sm:w-auto min-w-[240px] h-14 text-base font-semibold group hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-3xl"
              >
                <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Monetize Your Site
              </Button>
            </Link>

            {/* Advertiser CTA */}
            <Link href="/advertisers" className="w-full sm:w-auto">
              <Button
                variant="glass-dark"
                size="lg"
                className="w-full sm:w-auto min-w-[240px] h-14 text-base font-semibold group hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-3xl"
              >
                <Megaphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Run Ad Campaigns
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

