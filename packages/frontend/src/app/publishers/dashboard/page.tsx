'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';

export default function PublisherDashboardPage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [publisher, setPublisher] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    async function loadData() {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/');
          return;
        }

        // Get publisher info
        const publisherResult = await api.getPublisher(token);
        setPublisher(publisherResult.publisher);

        // Get earnings if publisher exists
        if (publisherResult.publisher?.id) {
          const earningsResult = await api.getEarnings(
            publisherResult.publisher.id,
            token
          );
          setEarnings(earningsResult);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
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

  if (!publisher) {
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
        <GlassCard variant="dark" blur="xl" className="p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Not Registered</h2>
          <p className="text-white/60 mb-6">Please register as a publisher first.</p>
          <Button
            variant="glass-dark"
            onClick={() => router.push('/publishers')}
          >
            Register as Publisher
          </Button>
        </GlassCard>
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
        <h1 className="text-3xl font-bold text-white mb-8">Publisher Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <GlassCard variant="dark" blur="xl" className="p-6">
            <h3 className="text-sm font-medium text-white/60 mb-2">Total Earnings</h3>
            <p className="text-3xl font-bold text-white">
              {earnings?.earnings?.total?.toFixed(4) || '0.0000'} ETH
            </p>
          </GlassCard>

          <GlassCard variant="dark" blur="xl" className="p-6">
            <h3 className="text-sm font-medium text-white/60 mb-2">Status</h3>
            <p className={`text-2xl font-semibold ${
              publisher.status === 'approved' ? 'text-green-300' :
              publisher.status === 'pending' ? 'text-yellow-300' :
              'text-red-300'
            }`}>
              {publisher.status.charAt(0).toUpperCase() + publisher.status.slice(1)}
            </p>
          </GlassCard>

          <GlassCard variant="dark" blur="xl" className="p-6">
            <h3 className="text-sm font-medium text-white/60 mb-2">Quality Score</h3>
            <p className="text-3xl font-bold text-white">
              {publisher.quality_score || 'N/A'}
            </p>
          </GlassCard>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <GlassCard variant="dark" blur="xl" className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Account Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/60">Website</p>
                <p className="font-medium text-white">{publisher.website_url}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Payment Wallet</p>
                <p className="font-mono text-sm text-white">{publisher.payment_wallet}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Domain Verified</p>
                <p className="font-medium text-white">
                  {publisher.domain_verified ? '✅ Yes' : '❌ No'}
                </p>
              </div>
              <div>
                <p className="text-sm text-white/60">Registered</p>
                <p className="font-medium text-white">
                  {new Date(publisher.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </GlassCard>

          {earnings && (
            <GlassCard variant="dark" blur="xl" className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Earnings Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Events</span>
                  <span className="font-medium text-white">{earnings.earnings?.event_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Total Earnings</span>
                  <span className="font-bold text-white">
                    {earnings.earnings?.total?.toFixed(4) || '0.0000'} ETH
                  </span>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {(!publisher.domain_verified || publisher.status === 'pending') && (
          <GlassCard variant="dark" blur="xl" className="p-6 bg-yellow-500/10 border-yellow-500/30">
            <h3 className="font-semibold text-yellow-200 mb-2">Action Required</h3>
            <p className="text-yellow-200/80 mb-4">
              {publisher.domain_verified 
                ? 'Your publisher account is pending approval.'
                : 'Please verify your domain ownership to start earning.'}
            </p>
            <Button
              variant="glass-dark"
              className="bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30"
              onClick={() => router.push('/publishers/verify')}
            >
              {publisher.domain_verified ? 'Check Status' : 'Verify Domain'}
            </Button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

