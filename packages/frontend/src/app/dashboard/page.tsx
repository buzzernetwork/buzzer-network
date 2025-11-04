'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    async function loadUser() {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/');
          return;
        }

        const result = await api.getMe(token);
        setUser(result.user);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [isConnected, router]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url('/bg.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: "url('/bg.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="text-center">
          <GlassCard variant="dark" blur="xl" className="p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-white">No Account Found</h2>
            <p className="text-white/60 mb-6">
              Please register as a publisher or advertiser first.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                variant="glass-dark"
                onClick={() => router.push('/publishers')}
              >
                Register as Publisher
              </Button>
              <Button
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                onClick={() => router.push('/advertisers')}
              >
                Register as Advertiser
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8"
      style={{
        backgroundImage: "url('/bg.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-white mb-8">
          Dashboard
        </h1>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <GlassCard variant="dark" blur="xl" className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Account Information</h2>
            <div className="space-y-3 text-white/80">
              <p><span className="font-medium text-white">Type:</span> <span className="capitalize">{user.type}</span></p>
              <p><span className="font-medium text-white">Wallet:</span> <span className="font-mono text-sm">{user.wallet_address}</span></p>
              <p><span className="font-medium text-white">Status:</span> <span className="capitalize">{user.status}</span></p>
              {user.website_url && (
                <p><span className="font-medium text-white">Website:</span> {user.website_url}</p>
              )}
              {user.company_name && (
                <p><span className="font-medium text-white">Company:</span> {user.company_name}</p>
              )}
            </div>
          </GlassCard>

          {user.type === 'publisher' && (
            <GlassCard variant="dark" blur="xl" className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Publisher Dashboard</h2>
              <p className="text-white/60">
                Publisher-specific features coming soon...
              </p>
              <p className="text-sm text-white/40 mt-4">
                Domain verification and earnings tracking will be available here.
              </p>
            </GlassCard>
          )}

          {user.type === 'advertiser' && (
            <GlassCard variant="dark" blur="xl" className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Advertiser Dashboard</h2>
              <p className="text-white/60">
                Advertiser-specific features coming soon...
              </p>
              <p className="text-sm text-white/40 mt-4">
                Campaign creation and management will be available here.
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

