'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { authenticateWithWallet, getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { WalletConnect } from '@/components/WalletConnect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/GlassCard';
import { Building2, Globe } from 'lucide-react';

export default function AdvertisersPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    website_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      // Authenticate if not already authenticated
      let token = getAuthToken();
      if (!token) {
        await authenticateWithWallet(address, signMessageAsync as any);
        token = getAuthToken();
      }

      if (!token) {
        throw new Error('Authentication failed');
      }

      // Register advertiser
      const result = await api.registerAdvertiser(
        {
          company_name: formData.company_name,
          website_url: formData.website_url || undefined,
        },
        token
      );

      setSuccess(true);
      console.log('Advertiser registered:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-frosted-dark">
      <div className="w-full max-w-md mx-auto">
        <GlassCard variant="dark" blur="xl" className="p-8">
          <h1 className="text-3xl font-normal text-white mb-2">
            Become an Advertiser
          </h1>
          <p className="text-white/60 mb-8">
            Reach quality audiences with crypto-native advertising on BASE blockchain
          </p>

          {/* Why Advertise Card - Integrated into header */}
          <div className="mb-8 p-6 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">Why Advertise with Buzzer Network?</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Reach quality publishers with transparent, on-chain advertising. Pay only 15% fees 
                  (vs 30-40% elsewhere) and fund campaigns with crypto. Our matching engine connects 
                  your ads with verified publishers automatically, ensuring better results and transparency.
                </p>
              </div>
            </div>
          </div>

          {!isConnected && (
            <div className="mb-8">
              <p className="text-white/80 mb-4">Connect your wallet to get started:</p>
              <WalletConnect />
            </div>
          )}

          {isConnected && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <Label htmlFor="company_name" className="text-white/80 mb-2 block">
                  Company Name *
                </Label>
                <Input
                  id="company_name"
                  type="text"
                  required
                  variant="glass"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="pl-12"
                  placeholder="Your Company Name"
                />
              </div>

              <div className="relative">
                <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <Label htmlFor="website_url" className="text-white/80 mb-2 block">
                  Website URL (Optional)
                </Label>
                <Input
                  id="website_url"
                  type="url"
                  variant="glass"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  className="pl-12"
                  placeholder="https://example.com"
                />
              </div>

              {error && (
                <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-200 px-4 py-3 rounded-2xl">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-200 px-4 py-3 rounded-2xl">
                  Registration successful! You can now create campaigns.
                </div>
              )}

              <Button
                type="submit"
                variant="glass-dark"
                size="lg"
                disabled={loading}
                className="w-full rounded-2xl h-14"
              >
                {loading ? 'Registering...' : 'Register as Advertiser'}
              </Button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-lg font-semibold mb-4 text-white">Benefits of Advertising with Buzzer Network</h3>
            <ul className="space-y-2 text-white/80">
              <li>✓ Lower fees (15% vs 30-40% from traditional networks)</li>
              <li>✓ Instant payment processing</li>
              <li>✓ Direct publisher relationships</li>
              <li>✓ Transparent on-chain analytics</li>
              <li>✓ Quality-focused publisher network</li>
              <li>✓ Advanced targeting and matching engine</li>
              <li>✓ Crypto-native funding and settlements</li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

