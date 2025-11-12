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
      <div className="w-full max-w-4xl mx-auto">
        <GlassCard variant="dark" blur="xl" className="p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 scroll-mt-24 leading-tight">
            Better ads. Lower costs.
          </h1>
          <p className="text-base md:text-lg text-white/70 mb-10 leading-relaxed">
            Pay 15% fees instead of 30–40%. Reach real audiences. See exactly where your money goes.
          </p>

          {/* Desktop: Two-column layout, Mobile: Stacked */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* How It Works */}
            <section className="p-6 md:p-8 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl" aria-labelledby="how-it-works-heading">
              <h2 id="how-it-works-heading" className="text-xl md:text-2xl font-semibold text-white mb-6">How It Works</h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold mb-2 text-base">Create your campaign</h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Choose your audience, set your budget, upload your creative. Simple.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold mb-2 text-base">Fund instantly</h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Pay with crypto. No credit cards. No bank delays. Your campaign starts immediately.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold mb-2 text-base">Reach real people</h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Your ads appear on verified sites with real audiences. Every impression is verified. No bots.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Why Advertise Card */}
            <section className="p-6 md:p-8 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl" aria-labelledby="why-advertise-heading">
            <h2 id="why-advertise-heading" className="text-xl md:text-2xl font-semibold text-white mb-4">Why advertise with us?</h2>
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              Pay 15% fees instead of 30–40%. That's real savings. Every impression is verified, 
              so you only pay for real views. See exactly where your budget goes with transparent 
              analytics. No hidden costs. No fraud. Just better results.
            </p>
            </section>
          </div>

          {!isConnected && (
            <div className="mb-8">
              <p className="text-white/80 mb-4">Connect your wallet to get started:</p>
              <WalletConnect />
            </div>
          )}

          {isConnected && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto" aria-label="Advertiser registration form">
              {/* Step 1: Company Name - Always visible */}
              <div className="relative animate-in fade-in duration-300">
                <Label htmlFor="company_name" className="text-white font-medium mb-3 block text-base">
                  Company Name <span className="text-white/60 font-normal" aria-label="required">*</span>
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
                  <Label htmlFor="website_url" className="text-white font-medium mb-3 block text-base">
                    Website URL <span className="text-white/60 font-normal">(Optional)</span>
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
            <h2 id="benefits-heading" className="text-lg md:text-xl font-semibold mb-5 text-white">Benefits of Advertising with Buzzer Network</h2>
            <ul className="space-y-3 text-white/80 text-sm md:text-base leading-relaxed" role="list">
              <li className="flex items-start gap-3">
                <span className="text-green-400 font-semibold mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                <span>Save 50% on fees. Pay 15% instead of 30–40%.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 font-semibold mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                <span>Stop fraud before it costs you. Every impression is verified.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 font-semibold mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                <span>See exactly where your money goes. Full transparency, always.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 font-semibold mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                <span>Reach verified publishers. Real sites. Real audiences.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 font-semibold mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                <span>Launch campaigns instantly. No credit cards. No delays.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 font-semibold mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                <span>Connect directly with publishers. No middlemen taking cuts.</span>
              </li>
            </ul>
          </section>
        </GlassCard>
      </div>
    </div>
  );
}

