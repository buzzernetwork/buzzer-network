'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useRouter } from 'next/navigation';
import { authenticateWithWallet, getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { CreativeUpload } from '@/components/CreativeUpload';
import { useEthPrice } from '@/hooks/useEthPrice';

export default function NewCampaignPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const { ethPrice, convertToUSD, formatUSD } = useEthPrice();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store USD amounts (user input)
  const [usdAmounts, setUsdAmounts] = useState({
    bid_amount_usd: '',
    total_budget_usd: '',
    daily_budget_usd: '',
  });
  
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

  // Convert USD to ETH
  const usdToEth = (usdAmount: number): number => {
    if (!ethPrice || ethPrice === 0) return 0;
    return usdAmount / ethPrice;
  };

  // Convert ETH to USD
  const ethToUsd = (ethAmount: number): number | null => {
    return convertToUSD(ethAmount);
  };

  // Handle USD input changes and convert to ETH
  const handleUsdChange = (field: 'bid_amount_usd' | 'total_budget_usd' | 'daily_budget_usd', value: string) => {
    setUsdAmounts(prev => ({ ...prev, [field]: value }));
    
    const usdValue = parseFloat(value) || 0;
    const ethValue = usdToEth(usdValue);
    
    if (field === 'bid_amount_usd') {
      setFormData(prev => ({ ...prev, bid_amount: ethValue.toString() }));
    } else if (field === 'total_budget_usd') {
      setFormData(prev => ({ ...prev, total_budget: ethValue.toString() }));
    } else if (field === 'daily_budget_usd') {
      setFormData(prev => ({ ...prev, daily_budget: ethValue.toString() }));
    }
  };

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
          <h2 className="text-2xl font-bold mb-4 text-white">Connect Wallet Required</h2>
          <p className="text-white/60">Please connect your wallet to create a campaign.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 bg-frosted-dark pt-24"
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <GlassCard variant="dark" blur="xl" className="p-8">
          <h1 className="text-3xl font-bold text-white mb-8 scroll-mt-24">Create New Campaign</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campaign Basics */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Campaign Basics</h2>
              
              <div>
                <Label htmlFor="name" className="text-white/80 mb-2 block">
                  Campaign Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  variant="glass"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Sale 2025"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="objective" className="text-white/80 mb-2 block">
                    Objective *
                  </Label>
                  <select
                    id="objective"
                    required
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value as any })}
                    className="w-full h-14 bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl text-white placeholder:text-white/60 focus:border-white/30 focus:ring-0 px-4 text-base transition-all duration-200 hover:bg-black/30 focus:bg-black/30"
                  >
                    <option value="awareness">Awareness</option>
                    <option value="clicks">Clicks</option>
                    <option value="conversions">Conversions</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="bid_model" className="text-white/80 mb-2 block">
                    Bid Model *
                  </Label>
                  <select
                    id="bid_model"
                    required
                    value={formData.bid_model}
                    onChange={(e) => setFormData({ ...formData, bid_model: e.target.value as any })}
                    className="w-full h-14 bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl text-white placeholder:text-white/60 focus:border-white/30 focus:ring-0 px-4 text-base transition-all duration-200 hover:bg-black/30 focus:bg-black/30"
                  >
                    <option value="CPM">CPM (Cost Per Mille)</option>
                    <option value="CPC">CPC (Cost Per Click)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Budget</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_budget_usd" className="text-white font-medium mb-3 block text-base">
                    Total Budget (USD) <span className="text-white/60 font-normal" aria-label="required">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 font-medium z-10">$</span>
                    <Input
                      id="total_budget_usd"
                      type="number"
                      step="0.01"
                      required
                      variant="glass"
                      value={usdAmounts.total_budget_usd}
                      onChange={(e) => handleUsdChange('total_budget_usd', e.target.value)}
                      className="pl-8 rounded-2xl"
                      placeholder="100.00"
                      inputMode="decimal"
                    />
                  </div>
                  {usdAmounts.total_budget_usd && ethPrice && (
                    <p className="mt-1.5 text-sm text-white/60">
                      ≈ {parseFloat(formData.total_budget || '0').toFixed(6)} ETH
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="daily_budget_usd" className="text-white font-medium mb-3 block text-base">
                    Daily Budget (USD) <span className="text-white/60 font-normal">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 font-medium z-10">$</span>
                    <Input
                      id="daily_budget_usd"
                      type="number"
                      step="0.01"
                      variant="glass"
                      value={usdAmounts.daily_budget_usd}
                      onChange={(e) => handleUsdChange('daily_budget_usd', e.target.value)}
                      className="pl-8 rounded-2xl"
                      placeholder="10.00"
                      inputMode="decimal"
                    />
                  </div>
                  {usdAmounts.daily_budget_usd && ethPrice && (
                    <p className="mt-1.5 text-sm text-white/60">
                      ≈ {parseFloat(formData.daily_budget || '0').toFixed(6)} ETH
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="bid_amount_usd" className="text-white font-medium mb-3 block text-base">
                  Bid Amount (USD) <span className="text-white/60 font-normal" aria-label="required">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 font-medium z-10">$</span>
                  <Input
                    id="bid_amount_usd"
                    type="number"
                    step="0.01"
                    required
                    variant="glass"
                    value={usdAmounts.bid_amount_usd}
                    onChange={(e) => handleUsdChange('bid_amount_usd', e.target.value)}
                    className="pl-8 rounded-2xl"
                    placeholder={formData.bid_model === 'CPM' ? '1.00' : '0.50'}
                    inputMode="decimal"
                  />
                </div>
                <div className="mt-1.5 space-y-1">
                  <p className="text-sm text-white/60">
                    {formData.bid_model === 'CPM' ? 'Per 1,000 impressions' : 'Per click'}
                  </p>
                  {usdAmounts.bid_amount_usd && ethPrice && (
                    <p className="text-sm text-white/60">
                      ≈ {parseFloat(formData.bid_amount || '0').toFixed(6)} ETH
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Creative */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Creative</h2>
              
              <div>
                <CreativeUpload
                  value={formData.creative_url}
                  onChange={(url) => {
                    setFormData({ ...formData, creative_url: url });
                    setError(null); // Clear error when URL is set
                  }}
                  onError={(error) => setError(error)}
                  token={getAuthToken() || ''}
                />
              </div>

              <div>
                <Label htmlFor="landing_page_url" className="text-white/80 mb-2 block">
                  Landing Page URL *
                </Label>
                <Input
                  id="landing_page_url"
                  type="url"
                  required
                  variant="glass"
                  value={formData.landing_page_url}
                  onChange={(e) => setFormData({ ...formData, landing_page_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="glass-dark"
                size="lg"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}

