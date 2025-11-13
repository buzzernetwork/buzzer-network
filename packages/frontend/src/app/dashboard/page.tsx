'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { User, FileText } from 'lucide-react';

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
      <div className="min-h-screen py-8 bg-frosted-dark">
        <div className="container mx-auto px-4 max-w-6xl">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid md:grid-cols-2 gap-6">
            <GlassCard variant="dark" blur="xl" className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </GlassCard>
            <GlassCard variant="dark" blur="xl" className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-8 bg-frosted-dark flex items-center justify-center p-4">
        <GlassCard variant="dark" blur="xl" className="p-8 max-w-md">
          <EmptyState
            icon={User}
            title="No Account Found"
            description="Please register as a publisher or advertiser to get started."
            action={{
              label: 'Register as Publisher',
              onClick: () => router.push('/publishers'),
            }}
          />
          <div className="mt-4 flex justify-center">
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
    );
  }

  return (
    <div className="min-h-screen py-8 bg-frosted-dark pt-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-white mb-8 scroll-mt-24">
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
              <EmptyState
                icon={FileText}
                title="Publisher Dashboard"
                description="Domain verification and earnings tracking will be available here soon."
              />
            </GlassCard>
          )}

          {user.type === 'advertiser' && (
            <GlassCard variant="dark" blur="xl" className="p-6">
              <EmptyState
                icon={FileText}
                title="Advertiser Dashboard"
                description="Campaign creation and management will be available here soon."
                action={{
                  label: 'Create Campaign',
                  onClick: () => router.push('/advertisers/campaigns/new'),
                }}
              />
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

