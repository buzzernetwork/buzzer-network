'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { CampaignFunding } from '@/components/CampaignFunding';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';

export default function CampaignDetailPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      router.push('/advertisers');
      return;
    }

    async function loadCampaign() {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/advertisers');
          return;
        }

        const result = await api.getCampaign(campaignId, token);
        setCampaign(result.campaign);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }

    loadCampaign();
  }, [isConnected, router, campaignId]);

  const handleFundingSuccess = () => {
    // Reload campaign data
    const token = getAuthToken();
    if (token) {
      api.getCampaign(campaignId, token).then((result) => {
        setCampaign(result.campaign);
      });
    }
  };

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
        <div className="text-xl text-white">Loading campaign...</div>
      </div>
    );
  }

  if (error || !campaign) {
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
          <h2 className="text-2xl font-bold mb-4 text-white">Campaign Not Found</h2>
          <p className="text-white/60 mb-6">{error || 'The campaign could not be loaded'}</p>
          <Button
            asChild
            variant="glass-dark"
          >
            <Link href="/advertisers/campaigns">
              Back to Campaigns
            </Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  const remainingBudget = parseFloat(campaign.total_budget || '0') - parseFloat(campaign.spent_budget || '0');
  const budgetPercentage = parseFloat(campaign.total_budget || '0') > 0
    ? (parseFloat(campaign.spent_budget || '0') / parseFloat(campaign.total_budget)) * 100
    : 0;

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/advertisers/campaigns"
              className="text-white/60 hover:text-white mb-2 inline-block transition-colors"
            >
              ← Back to Campaigns
            </Link>
            <h1 className="text-3xl font-bold text-white">{campaign.name}</h1>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            campaign.status === 'active' ? 'bg-green-500/20 text-green-200 border border-green-500/30' :
            campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30' :
            campaign.status === 'draft' ? 'bg-gray-500/20 text-gray-200 border border-gray-500/30' :
            'bg-red-500/20 text-red-200 border border-red-500/30'
          }`}>
            {campaign.status}
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Budget Overview */}
            <GlassCard variant="dark" blur="xl" className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Budget Overview</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-white/60 mb-1">
                    <span>Budget Used</span>
                    <span>{budgetPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-white/30 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-white/60">Total Budget</p>
                    <p className="text-xl font-bold text-white">{parseFloat(campaign.total_budget || '0').toFixed(4)} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Spent</p>
                    <p className="text-xl font-bold text-red-300">
                      {parseFloat(campaign.spent_budget || '0').toFixed(4)} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Remaining</p>
                    <p className="text-xl font-bold text-green-300">
                      {remainingBudget.toFixed(4)} ETH
                    </p>
                  </div>
                </div>
                {campaign.on_chain_balance && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-white/60">On-Chain Balance</p>
                    <p className="text-lg font-semibold text-white">{parseFloat(campaign.on_chain_balance).toFixed(4)} ETH</p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Campaign Details */}
            <GlassCard variant="dark" blur="xl" className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Campaign Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/60">Objective</p>
                  <p className="font-medium text-white capitalize">{campaign.objective}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Bid Model</p>
                  <p className="font-medium text-white">{campaign.bid_model}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Bid Amount</p>
                  <p className="font-medium text-white">{parseFloat(campaign.bid_amount || '0').toFixed(6)} ETH</p>
                  <p className="text-xs text-white/40">
                    {campaign.bid_model === 'CPM' ? 'per 1,000 impressions' : 'per click'}
                  </p>
                </div>
                {campaign.daily_budget && (
                  <div>
                    <p className="text-sm text-white/60">Daily Budget</p>
                    <p className="font-medium text-white">{parseFloat(campaign.daily_budget).toFixed(4)} ETH</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <p className="text-sm text-white/60">Creative URL</p>
                  <a
                    href={campaign.creative_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white underline break-all"
                  >
                    {campaign.creative_url}
                  </a>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-white/60">Landing Page</p>
                  <a
                    href={campaign.landing_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white underline break-all"
                  >
                    {campaign.landing_page_url}
                  </a>
                </div>
              </div>
            </GlassCard>

            {/* Targeting */}
            {campaign.targeting && (
              <GlassCard variant="dark" blur="xl" className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">Targeting</h2>
                <div className="space-y-2">
                  {campaign.targeting.geo && campaign.targeting.geo.length > 0 && (
                    <div>
                      <p className="text-sm text-white/60">Geographic</p>
                      <p className="font-medium text-white">{campaign.targeting.geo.join(', ')}</p>
                    </div>
                  )}
                  {campaign.targeting.quality_min && (
                    <div>
                      <p className="text-sm text-white/60">Minimum Quality Score</p>
                      <p className="font-medium text-white">{campaign.targeting.quality_min}</p>
                    </div>
                  )}
                  {campaign.targeting.devices && campaign.targeting.devices.length > 0 && (
                    <div>
                      <p className="text-sm text-white/60">Devices</p>
                      <p className="font-medium text-white">{campaign.targeting.devices.join(', ')}</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CampaignFunding campaignId={campaignId} onSuccess={handleFundingSuccess} />

            {/* Actions */}
            <GlassCard variant="dark" blur="xl" className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Actions</h2>
              <div className="space-y-2">
                <Button
                  variant="glass-dark"
                  className="w-full"
                  onClick={() => {
                    const token = getAuthToken();
                    if (token) {
                      api.updateCampaign(
                        campaignId,
                        { status: campaign.status === 'active' ? 'paused' : 'active' },
                        token
                      ).then(() => {
                        router.refresh();
                      });
                    }
                  }}
                >
                  {campaign.status === 'active' ? 'Pause Campaign' : 'Activate Campaign'}
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

