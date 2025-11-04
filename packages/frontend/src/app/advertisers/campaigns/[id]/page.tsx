'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { CampaignFunding } from '@/components/CampaignFunding';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading campaign...</div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Campaign Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The campaign could not be loaded'}</p>
          <Link
            href="/advertisers/campaigns"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const remainingBudget = parseFloat(campaign.total_budget || '0') - parseFloat(campaign.spent_budget || '0');
  const budgetPercentage = parseFloat(campaign.total_budget || '0') > 0
    ? (parseFloat(campaign.spent_budget || '0') / parseFloat(campaign.total_budget)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/advertisers/campaigns"
              className="text-indigo-600 hover:text-indigo-700 mb-2 inline-block"
            >
              ← Back to Campaigns
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            campaign.status === 'active' ? 'bg-green-100 text-green-800' :
            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
            'bg-red-100 text-red-800'
          }`}>
            {campaign.status}
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Budget Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Budget Overview</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Budget Used</span>
                    <span>{budgetPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Budget</p>
                    <p className="text-xl font-bold">{parseFloat(campaign.total_budget || '0').toFixed(4)} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Spent</p>
                    <p className="text-xl font-bold text-red-600">
                      {parseFloat(campaign.spent_budget || '0').toFixed(4)} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="text-xl font-bold text-green-600">
                      {remainingBudget.toFixed(4)} ETH
                    </p>
                  </div>
                </div>
                {campaign.on_chain_balance && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">On-Chain Balance</p>
                    <p className="text-lg font-semibold">{parseFloat(campaign.on_chain_balance).toFixed(4)} ETH</p>
                  </div>
                )}
              </div>
            </div>

            {/* Campaign Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Campaign Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Objective</p>
                  <p className="font-medium capitalize">{campaign.objective}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bid Model</p>
                  <p className="font-medium">{campaign.bid_model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bid Amount</p>
                  <p className="font-medium">{parseFloat(campaign.bid_amount || '0').toFixed(6)} ETH</p>
                  <p className="text-xs text-gray-400">
                    {campaign.bid_model === 'CPM' ? 'per 1,000 impressions' : 'per click'}
                  </p>
                </div>
                {campaign.daily_budget && (
                  <div>
                    <p className="text-sm text-gray-500">Daily Budget</p>
                    <p className="font-medium">{parseFloat(campaign.daily_budget).toFixed(4)} ETH</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Creative URL</p>
                  <a
                    href={campaign.creative_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline break-all"
                  >
                    {campaign.creative_url}
                  </a>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Landing Page</p>
                  <a
                    href={campaign.landing_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline break-all"
                  >
                    {campaign.landing_page_url}
                  </a>
                </div>
              </div>
            </div>

            {/* Targeting */}
            {campaign.targeting && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Targeting</h2>
                <div className="space-y-2">
                  {campaign.targeting.geo && campaign.targeting.geo.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500">Geographic</p>
                      <p className="font-medium">{campaign.targeting.geo.join(', ')}</p>
                    </div>
                  )}
                  {campaign.targeting.quality_min && (
                    <div>
                      <p className="text-sm text-gray-500">Minimum Quality Score</p>
                      <p className="font-medium">{campaign.targeting.quality_min}</p>
                    </div>
                  )}
                  {campaign.targeting.devices && campaign.targeting.devices.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500">Devices</p>
                      <p className="font-medium">{campaign.targeting.devices.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CampaignFunding campaignId={campaignId} onSuccess={handleFundingSuccess} />

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="space-y-2">
                <button
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  {campaign.status === 'active' ? 'Pause Campaign' : 'Activate Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

