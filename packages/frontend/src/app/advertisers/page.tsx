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
import { Alert } from '@/components/ui/alert';
import { Building2, Globe, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-frosted-dark pt-24">
      <div className="w-full max-w-md mx-auto">
        <GlassCard variant="dark" blur="xl" className="p-8">
          <h1 className="text-3xl font-bold text-white mb-2 scroll-mt-24">
            Become an Advertiser
          </h1>
          <p className="text-white/60 mb-8">
            Reach quality audiences with crypto-native advertising on BASE blockchain
          </p>

          {/* How It Works */}
          <section className="mb-8 p-8 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl" aria-labelledby="how-it-works-heading">
            <h2 id="how-it-works-heading" className="text-xl font-semibold text-white mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-medium mb-1">Create Campaigns</h3>
                  <p className="text-white/80 text-sm">
                    Set up your campaign with targeting options and creative assets
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-medium mb-1">Fund with Crypto</h3>
                  <p className="text-white/80 text-sm">
                    Deposit funds using crypto on BASE blockchain for transparent payments
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-medium mb-1">Reach Quality Audiences</h3>
                  <p className="text-white/80 text-sm">
                    Our matching engine automatically connects your ads with verified publishers to reach quality audiences
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Why Advertise Card - Integrated into header */}
          <section className="mb-8 p-8 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl" aria-labelledby="why-advertise-heading">
            <h2 id="why-advertise-heading" className="text-xl font-semibold text-white mb-2">Why Advertise with Buzzer Network?</h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Reach quality publishers with transparent, on-chain advertising. Pay only 15% fees 
              (vs 30-40% elsewhere) and fund campaigns with crypto. Our matching engine connects 
              your ads with verified publishers automatically, ensuring better results and transparency.
            </p>
          </section>

          {!isConnected && (
            <div className="mb-8">
              <p className="text-white/80 mb-4">Connect your wallet to get started:</p>
              <WalletConnect />
            </div>
          )}

          {isConnected && (
            <form onSubmit={handleSubmit} className="space-y-6" aria-label="Advertiser registration form">
              {/* Step 1: Company Name - Always visible */}
              <div className="relative animate-in fade-in duration-300">
                <Label htmlFor="company_name" className="text-white/80 mb-2 block">
                  Company Name <span className="text-white/60" aria-label="required">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none z-10" aria-hidden="true" />
                  <Input
                    id="company_name"
                    type="text"
                    required
                    variant="glass"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="pl-12"
                    placeholder="Your Company Name"
                    aria-describedby="company_name-help"
                  />
                </div>
                <p id="company_name-help" className="sr-only">Your company or brand name</p>
              </div>

              {/* Step 2: Website URL - Show when company name is filled */}
              {formData.company_name && (
                <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="website_url" className="text-white/80 mb-2 block">
                    Website URL <span className="text-white/60">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none z-10" aria-hidden="true" />
                    <Input
                      id="website_url"
                      type="url"
                      variant="glass"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      className="pl-12"
                      placeholder="https://example.com"
                      aria-describedby="website_url-help"
                    />
                  </div>
                  <p id="website_url-help" className="sr-only">Optional website URL for your company</p>
                </div>
              )}

              {error && (
                <Alert variant="error" role="alert" aria-live="assertive">
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" role="status" aria-live="polite">
                  Registration successful! You can now create campaigns.
                </Alert>
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

          <section className="mt-8 pt-8 border-t border-white/10" aria-labelledby="benefits-heading">
            <h2 id="benefits-heading" className="text-lg font-semibold mb-4 text-white">Benefits of Advertising with Buzzer Network</h2>
            <ul className="space-y-2 text-white/80" role="list">
              <li>✓ Lower fees (15% vs 30-40% from traditional networks)</li>
              <li>✓ Instant payment processing</li>
              <li>✓ Direct publisher relationships</li>
              <li>✓ Transparent on-chain analytics</li>
              <li>✓ Quality-focused publisher network</li>
              <li>✓ Advanced targeting and matching engine</li>
              <li>✓ Crypto-native funding and settlements</li>
            </ul>
          </section>
        </GlassCard>
      </div>
    </div>
  );
}

