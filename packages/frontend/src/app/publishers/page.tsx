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
import { Globe, Mail, Wallet } from 'lucide-react';

export default function PublishersPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    website_url: '',
    email: '',
    payment_wallet: '',
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

      // Register publisher
      const result = await api.registerPublisher(
        {
          website_url: formData.website_url,
          email: formData.email || undefined,
          payment_wallet: formData.payment_wallet || address,
        },
        token
      );

      setSuccess(true);
      console.log('Publisher registered:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="w-full max-w-md mx-auto">
        <GlassCard variant="dark" blur="xl" className="p-8">
          <h1 className="text-3xl font-normal text-white mb-2">
            Become a Publisher
          </h1>
          <p className="text-white/60 mb-8">
            Monetize your website with crypto-native ads on BASE blockchain
          </p>

          {!isConnected && (
            <div className="mb-8">
              <p className="text-white/80 mb-4">Connect your wallet to get started:</p>
              <WalletConnect />
            </div>
          )}

          {isConnected && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <Label htmlFor="website_url" className="text-white/80 mb-2 block">
                  Website URL *
                </Label>
                <Input
                  id="website_url"
                  type="url"
                  required
                  variant="glass"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  className="pl-12"
                  placeholder="https://example.com"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <Label htmlFor="email" className="text-white/80 mb-2 block">
                  Email (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  variant="glass"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-12"
                  placeholder="publisher@example.com"
                />
              </div>

              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <Label htmlFor="payment_wallet" className="text-white/80 mb-2 block">
                  Payment Wallet Address
                </Label>
                <Input
                  id="payment_wallet"
                  type="text"
                  variant="glass"
                  value={formData.payment_wallet || address}
                  onChange={(e) => setFormData({ ...formData, payment_wallet: e.target.value })}
                  className="pl-12 font-mono text-sm"
                  placeholder={address || "0x..."}
                />
                <p className="mt-1 text-sm text-white/40">
                  Leave empty to use connected wallet address
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-200 px-4 py-3 rounded-2xl">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-200 px-4 py-3 rounded-2xl">
                  Registration successful! You'll need to verify your domain ownership to start earning.
                </div>
              )}

              <Button
                type="submit"
                variant="glass-dark"
                size="lg"
                disabled={loading}
                className="w-full rounded-2xl h-14"
              >
                {loading ? 'Registering...' : 'Register as Publisher'}
              </Button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-lg font-semibold mb-4 text-white">Benefits of Publishing with Buzzer Network</h3>
            <ul className="space-y-2 text-white/60">
              <li>✓ 85% revenue share (vs 30-40% from traditional networks)</li>
              <li>✓ Instant crypto payments (no net-30 delays)</li>
              <li>✓ Transparent on-chain records</li>
              <li>✓ Quality-focused publisher network</li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

