'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';

export default function CampaignsPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      router.push('/advertisers');
      return;
    }

    async function loadCampaigns() {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/advertisers');
          return;
        }

        const result = await api.getCampaigns(token);
        setCampaigns(result.campaigns || []);
      } catch (error) {
        console.error('Failed to load campaigns:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCampaigns();
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
        <div className="text-xl text-white">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 bg-frosted-dark pt-24"
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white scroll-mt-24">Campaigns</h1>
          <Button
            asChild
            variant="glass-dark"
            size="lg"
          >
            <Link href="/advertisers/campaigns/new">
              Create Campaign
            </Link>
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <GlassCard variant="dark" blur="xl" className="p-12 text-center">
            <p className="text-white/60 mb-6">You haven't created any campaigns yet.</p>
            <Button
              asChild
              variant="glass-dark"
              size="lg"
            >
              <Link href="/advertisers/campaigns/new">
                Create Your First Campaign
              </Link>
            </Button>
          </GlassCard>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/advertisers/campaigns/${campaign.id}`}
              >
                <GlassCard variant="dark" blur="xl" className="p-6 hover:scale-[1.02] transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-white">{campaign.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      campaign.status === 'active' ? 'bg-green-500/20 text-green-200 border border-green-500/30' :
                      campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30' :
                      'bg-gray-500/20 text-gray-200 border border-gray-500/30'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-white/60">
                    <p><span className="font-medium text-white">Objective:</span> <span className="capitalize">{campaign.objective}</span></p>
                    <p><span className="font-medium text-white">Bid:</span> {campaign.bid_amount} ETH ({campaign.bid_model})</p>
                    <p><span className="font-medium text-white">Budget:</span> {campaign.spent_budget || '0'} / {campaign.total_budget} ETH</p>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

