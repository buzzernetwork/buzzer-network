'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <Link
            href="/advertisers/campaigns/new"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Create Campaign
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-6">You haven't created any campaigns yet.</p>
            <Link
              href="/advertisers/campaigns/new"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Create Your First Campaign
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/advertisers/campaigns/${campaign.id}`}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{campaign.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Objective:</span> {campaign.objective}</p>
                  <p><span className="font-medium">Bid:</span> {campaign.bid_amount} ETH ({campaign.bid_model})</p>
                  <p><span className="font-medium">Budget:</span> {campaign.spent_budget || '0'} / {campaign.total_budget} ETH</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

