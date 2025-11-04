'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export default function DomainVerificationPage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [publisher, setPublisher] = useState<any>(null);
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [method, setMethod] = useState<'dns' | 'html' | 'file'>('dns');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isConnected) {
      router.push('/publishers');
      return;
    }

    async function loadData() {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/publishers');
          return;
        }

        const publisherResult = await api.getPublisher(token);
        setPublisher(publisherResult.publisher);

        // Get verification token
        try {
          const tokenResult = await api.getVerificationToken(
            publisherResult.publisher.id,
            token
          );
          setVerificationToken(tokenResult.verification_token);
        } catch (error) {
          console.error('Failed to get verification token:', error);
        }
      } catch (error) {
        console.error('Failed to load publisher:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isConnected, router]);

  const handleVerify = async () => {
    if (!publisher || !verificationToken) return;

    setVerifying(true);
    setResult(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.verifyDomain(
        publisher.id,
        method,
        token,
        verificationToken
      );

      setResult({
        success: result.verified,
        message: result.message,
      });

      if (result.verified) {
        // Refresh publisher data
        setTimeout(() => {
          router.push('/publishers/dashboard');
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Verification failed',
      });
    } finally {
      setVerifying(false);
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
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  if (!publisher) {
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
          <h2 className="text-2xl font-bold mb-4 text-white">Publisher Not Found</h2>
          <Button
            variant="glass-dark"
            onClick={() => router.push('/publishers')}
          >
            Register as Publisher
          </Button>
        </GlassCard>
      </div>
    );
  }

  const instructions = {
    dns: `Add a DNS TXT record: _buzzer-verify.${new URL(publisher.website_url).hostname} = ${verificationToken}`,
    html: `Add this meta tag to your website's <head> section:\n<meta name="buzzer-verification" content="${verificationToken}">`,
    file: `Upload a file named "buzzer-verification.txt" to your website root (${publisher.website_url}) with the following content:\n${verificationToken}`,
  };

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
      <div className="container mx-auto px-4 max-w-4xl">
        <GlassCard variant="dark" blur="xl" className="p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Domain Verification</h1>
          <p className="text-white/60 mb-8">
            Verify ownership of <strong className="text-white">{publisher.website_url}</strong>
          </p>

          {publisher.domain_verified ? (
            <GlassCard variant="dark" blur="xl" className="p-6 bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-3">
                <Check className="w-8 h-8 text-green-300" />
                <div>
                  <h3 className="text-lg font-semibold text-green-200">Domain Verified</h3>
                  <p className="text-green-200/80">Your domain has been successfully verified.</p>
                </div>
              </div>
            </GlassCard>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Verification Method
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['dns', 'html', 'file'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`px-4 py-3 rounded-2xl border-2 transition ${
                        method === m
                          ? 'border-white/30 bg-white/20 backdrop-blur-sm text-white'
                          : 'border-white/10 hover:border-white/20 bg-white/5 text-white/60 hover:text-white/80'
                      }`}
                    >
                      <div className="font-semibold capitalize">{m}</div>
                      <div className="text-xs text-white/40 mt-1">
                        {m === 'dns' && 'DNS TXT Record'}
                        {m === 'html' && 'HTML Meta Tag'}
                        {m === 'file' && 'File Upload'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Verification Token
                </label>
                <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 font-mono text-sm break-all text-white">
                  {verificationToken || 'Loading...'}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Instructions
                </label>
                <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-4">
                  <pre className="whitespace-pre-wrap text-sm text-white/80">
                    {instructions[method]}
                  </pre>
                </div>
              </div>

              {result && (
                <div
                  className={`mb-6 p-4 rounded-2xl backdrop-blur-sm ${
                    result.success
                      ? 'bg-green-500/20 border border-green-500/30 text-green-200'
                      : 'bg-red-500/20 border border-red-500/30 text-red-200'
                  }`}
                >
                  {result.message}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  variant="glass-dark"
                  size="lg"
                  onClick={handleVerify}
                  disabled={verifying || !verificationToken}
                  className="flex-1"
                >
                  {verifying ? 'Verifying...' : 'Verify Domain'}
                </Button>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

