'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useRouter } from 'next/navigation';
import { authenticateWithWallet, getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';

export default function NewCampaignPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    objective: 'awareness' as 'awareness' | 'clicks' | 'conversions',
    bid_model: 'CPM' as 'CPM' | 'CPC',
    bid_amount: '',
    total_budget: '',
    daily_budget: '',
    targeting: {
      geo: [] as string[],
      categories: [] as string[],
      quality_min: 70,
      devices: ['desktop', 'mobile'] as string[],
    },
    creative_url: '',
    creative_format: 'banner' as 'banner' | 'native' | 'video',
    landing_page_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      let token = getAuthToken();
      if (!token) {
        await authenticateWithWallet(address, signMessageAsync as any);
        token = getAuthToken();
      }

      if (!token) {
        throw new Error('Authentication failed');
      }

      // Create campaign
      const result = await api.createCampaign(
        {
          ...formData,
          bid_amount: parseFloat(formData.bid_amount),
          total_budget: parseFloat(formData.total_budget),
          daily_budget: formData.daily_budget ? parseFloat(formData.daily_budget) : undefined,
        },
        token!
      );

      // Redirect to campaign page
      router.push(`/advertisers/campaigns/${result.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Campaign creation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet Required</h2>
          <p className="text-gray-600">Please connect your wallet to create a campaign.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Campaign</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campaign Basics */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Campaign Basics</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Summer Sale 2025"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objective *
                  </label>
                  <select
                    required
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="awareness">Awareness</option>
                    <option value="clicks">Clicks</option>
                    <option value="conversions">Conversions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bid Model *
                  </label>
                  <select
                    required
                    value={formData.bid_model}
                    onChange={(e) => setFormData({ ...formData, bid_model: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CPM">CPM (Cost Per Mille)</option>
                    <option value="CPC">CPC (Cost Per Click)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Budget</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Budget (ETH) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="1.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Budget (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.daily_budget}
                    onChange={(e) => setFormData({ ...formData, daily_budget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bid Amount (ETH) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={formData.bid_amount}
                  onChange={(e) => setFormData({ ...formData, bid_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.01"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.bid_model === 'CPM' ? 'Per 1,000 impressions' : 'Per click'}
                </p>
              </div>
            </div>

            {/* Creative */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Creative</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Creative URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.creative_url}
                  onChange={(e) => setFormData({ ...formData, creative_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Upload to IPFS or use CDN URL
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Landing Page URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.landing_page_url}
                  onChange={(e) => setFormData({ ...formData, landing_page_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

