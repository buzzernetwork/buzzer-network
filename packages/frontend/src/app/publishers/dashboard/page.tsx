'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!publisher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Not Registered</h2>
          <p className="text-gray-600 mb-6">Please register as a publisher first.</p>
          <button
            onClick={() => router.push('/publishers')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Register as Publisher
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Publisher Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Earnings</h3>
            <p className="text-3xl font-bold text-indigo-600">
              {earnings?.earnings?.total?.toFixed(4) || '0.0000'} ETH
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <p className={`text-2xl font-semibold ${
              publisher.status === 'approved' ? 'text-green-600' :
              publisher.status === 'pending' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {publisher.status.charAt(0).toUpperCase() + publisher.status.slice(1)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Quality Score</h3>
            <p className="text-3xl font-bold text-gray-900">
              {publisher.quality_score || 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Website</p>
              <p className="font-medium">{publisher.website_url}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Wallet</p>
              <p className="font-mono text-sm">{publisher.payment_wallet}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Domain Verified</p>
              <p className="font-medium">
                {publisher.domain_verified ? '✅ Yes' : '❌ No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Registered</p>
              <p className="font-medium">
                {new Date(publisher.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {earnings && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Earnings Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Events</span>
                <span className="font-medium">{earnings.earnings?.event_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Earnings</span>
                <span className="font-bold text-indigo-600">
                  {earnings.earnings?.total?.toFixed(4) || '0.0000'} ETH
                </span>
              </div>
            </div>
          </div>
        )}

        {(!publisher.domain_verified || publisher.status === 'pending') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
            <h3 className="font-semibold text-yellow-800 mb-2">Action Required</h3>
            <p className="text-yellow-700 mb-4">
              {publisher.domain_verified 
                ? 'Your publisher account is pending approval.'
                : 'Please verify your domain ownership to start earning.'}
            </p>
            <button
              onClick={() => router.push('/publishers/verify')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
            >
              {publisher.domain_verified ? 'Check Status' : 'Verify Domain'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

