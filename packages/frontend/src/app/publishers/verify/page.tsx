'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Check, Globe, Plus } from 'lucide-react';

export default function DomainVerificationPage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [publisher, setPublisher] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<any | null>(null);
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [method, setMethod] = useState<'dns' | 'html' | 'file'>('dns');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Clear old cache keys on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear old cache keys that don't include domain ID
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('verification_token_') && !key.includes('_', key.indexOf('_') + 1)) {
          // Old format: verification_token_{publisherId}
          // New format: verification_token_{publisherId}_{domainId}
          sessionStorage.removeItem(key);
        }
      });
    }
  }, []);

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
        
        // Get domains from publisher or fetch separately
        const publisherDomains = publisherResult.publisher.domains || [];
        setDomains(publisherDomains);

        // Auto-select first unverified domain, or first domain if all verified
        if (publisherDomains.length > 0) {
          const unverifiedDomain = publisherDomains.find((d: any) => !d.domain_verified);
          const domainToSelect = unverifiedDomain || publisherDomains[0];
          setSelectedDomainId(domainToSelect.id);
          setSelectedDomain(domainToSelect);
          
          // Load token for selected domain
          loadVerificationToken(domainToSelect.id, token);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load publisher:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isConnected, router]);

  const loadVerificationToken = async (domainId: string, token: string) => {
    if (!publisher || !domainId) return;

    setTokenLoading(true);
    setTokenError(null);
    
    try {
      // Try to get from sessionStorage first (domain-specific key)
      const cacheKey = `verification_token_${publisher.id}_${domainId}`;
      const cachedToken = sessionStorage.getItem(cacheKey);
      
      if (cachedToken) {
        setVerificationToken(cachedToken);
        setTokenLoading(false);
        setTokenError(null);
        return;
      }

      // Otherwise fetch it
      const tokenResult = await api.getDomainVerificationToken(
        publisher.id,
        domainId,
        token
      );
      
      setVerificationToken(tokenResult.verification_token);
      
      // Cache it with domain-specific key
      sessionStorage.setItem(cacheKey, tokenResult.verification_token);
      setTokenError(null);
    } catch (error) {
      console.error('Failed to get verification token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load verification token';
      setTokenError(errorMessage);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleDomainSelect = async (domainId: string) => {
    setSelectedDomainId(domainId);
    const domain = domains.find(d => d.id === domainId);
    setSelectedDomain(domain);
    setResult(null);
    
    const token = getAuthToken();
    if (token && publisher) {
      await loadVerificationToken(domainId, token);
    }
  };

  // Poll status every 10 seconds while domain is pending verification
  useEffect(() => {
    if (!selectedDomain?.domain_verified && selectedDomain?.next_verification_at) {
      const interval = setInterval(async () => {
        try {
          const token = getAuthToken();
          if (!token) return;
          
          // Refresh domain status
          const publisherResult = await api.getPublisher(token);
          setPublisher(publisherResult.publisher);
          const updatedDomains = publisherResult.publisher.domains || [];
          setDomains(updatedDomains);
          
          // Update selected domain
          const updatedDomain = updatedDomains.find((d: any) => d.id === selectedDomainId);
          if (updatedDomain) {
            setSelectedDomain(updatedDomain);
          }
        } catch (error) {
          console.error('Failed to refresh status:', error);
        }
      }, 10000); // Every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [selectedDomain?.domain_verified, selectedDomain?.next_verification_at, selectedDomainId]);

  const handleVerify = async () => {
    if (!publisher || !selectedDomainId || !verificationToken) return;

    setVerifying(true);
    setResult(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.verifyDomain(
        publisher.id,
        selectedDomainId,
        method,
        token,
        verificationToken
      );

      setResult({
        success: result.verified,
        message: result.message,
      });

      // Refresh publisher data to get updated domain status
      const publisherResult = await api.getPublisher(token);
      setPublisher(publisherResult.publisher);
      setDomains(publisherResult.publisher.domains || []);
      
      // Update selected domain
      const updatedDomain = publisherResult.publisher.domains?.find((d: any) => d.id === selectedDomainId);
      if (updatedDomain) {
        setSelectedDomain(updatedDomain);
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

  const handleCheckNow = async () => {
    if (!publisher || !selectedDomainId) return;

    setVerifying(true);
    setResult(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.verifyDomainNow(
        publisher.id,
        selectedDomainId,
        token
      );

      setResult({
        success: result.verified,
        message: result.message,
      });

      // Refresh publisher data
      const publisherResult = await api.getPublisher(token);
      setPublisher(publisherResult.publisher);
      setDomains(publisherResult.publisher.domains || []);
      
      // Update selected domain
      const updatedDomain = publisherResult.publisher.domains?.find((d: any) => d.id === selectedDomainId);
      if (updatedDomain) {
        setSelectedDomain(updatedDomain);
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

  const formatTimeUntil = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    const now = new Date().getTime();
    const target = new Date(timestamp).getTime();
    const diff = target - now;
    
    if (diff <= 0) return 'checking soon...';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'less than a minute';
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
        <div className="text-xl text-white">Getting everything ready...</div>
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
          <h2 className="text-2xl font-bold mb-4 text-white">We couldn't find your account</h2>
          <p className="text-white/60 mb-6">Register first to verify your domain.</p>
          <Button
            variant="glass-dark"
            onClick={() => router.push('/publishers')}
          >
            Register now
          </Button>
        </GlassCard>
      </div>
    );
  }

  const allDomainsVerified = domains.length > 0 && domains.every((d: any) => d.domain_verified);

  const instructions = selectedDomain ? {
    dns: `1. Go to your domain settings (where you manage DNS records)
2. Add a new TXT record with:
   Name: _buzzer-verify.${new URL(selectedDomain.website_url).hostname}
   Value: ${verificationToken}
3. Save and wait a few minutes for it to update`,
    html: `1. Open your website's HTML code
2. Find the <head> section
3. Add this line before </head>:
   <meta name="buzzer-verification" content="${verificationToken}">
4. Save and publish your site`,
    file: `1. Create a new text file named: buzzer-verification.txt
2. Put this code inside: ${verificationToken}
3. Upload it to your website's main folder (same place as index.html)
4. Make sure it's accessible at: ${selectedDomain.website_url}/buzzer-verification.txt`,
  } : { dns: '', html: '', file: '' };

  return (
    <div className="min-h-screen py-8 bg-frosted-dark pt-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <GlassCard variant="dark" blur="xl" className="p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 scroll-mt-24 leading-tight">Prove you own your site.</h1>
          <p className="text-base md:text-lg text-white/70 mb-10 leading-relaxed">
            One quick step to start earning. Choose the method that works best for you.
          </p>

          {allDomainsVerified ? (
            <GlassCard variant="dark" blur="xl" className="p-6 bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-3">
                <Check className="w-8 h-8 text-green-300" />
                <div>
                  <h3 className="text-lg font-semibold text-green-200">All domains verified!</h3>
                  <p className="text-green-200/80">All your domains are verified. You can start earning now.</p>
                </div>
              </div>
            </GlassCard>
          ) : (
            <>
              {/* Domain Selection */}
              {domains.length > 1 && (
                <div className="mb-8">
                  <label className="block text-base font-medium text-white mb-4">
                    Select domain to verify
                  </label>
                  <div className="grid gap-3">
                    {domains.map((domain: any) => (
                      <button
                        key={domain.id}
                        onClick={() => handleDomainSelect(domain.id)}
                        className={`px-4 py-3 rounded-2xl border-2 transition text-left flex items-center justify-between ${
                          selectedDomainId === domain.id
                            ? 'border-white/30 bg-white/20 backdrop-blur-sm text-white'
                            : 'border-white/10 hover:border-white/20 bg-white/5 text-white/60 hover:text-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5" />
                          <div>
                            <div className="font-semibold text-base">{domain.website_url}</div>
                            <div className="text-xs text-white/60">
                              {domain.domain_verified ? (
                                <span className="text-green-300">✓ Verified</span>
                              ) : (
                                <span className="text-yellow-300">Pending verification</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {domain.domain_verified && (
                          <Check className="w-5 h-5 text-green-300" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDomain && !selectedDomain.domain_verified && (
                <>
                  <div className="mb-8">
                    <label className="block text-base font-medium text-white mb-4">
                      Choose your method
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {(['dns', 'html', 'file'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMethod(m)}
                          className={`px-4 py-4 rounded-2xl border-2 transition text-left ${
                            method === m
                              ? 'border-white/30 bg-white/20 backdrop-blur-sm text-white'
                              : 'border-white/10 hover:border-white/20 bg-white/5 text-white/60 hover:text-white/80'
                          }`}
                        >
                          <div className="font-semibold text-base capitalize mb-1">{m === 'dns' ? 'DNS' : m === 'html' ? 'HTML' : 'File'}</div>
                          <div className="text-xs text-white/60 leading-relaxed">
                            {m === 'dns' && 'Add a record to your domain'}
                            {m === 'html' && 'Add code to your site'}
                            {m === 'file' && 'Upload a file to your site'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {verificationToken && (
                    <div className="mb-8">
                      <label className="block text-base font-medium text-white mb-3">
                        Your verification code
                      </label>
                      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 font-mono text-sm break-all text-white/90">
                        {verificationToken}
                      </div>
                    </div>
                  )}

                  {tokenLoading && (
                    <div className="mb-8">
                      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-white/60">
                        Getting your code...
                      </div>
                    </div>
                  )}

                  {tokenError && (
                    <div className="mb-8 space-y-3">
                      <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-2xl p-4 text-red-200">
                        <p className="font-semibold mb-1">Couldn't load your code</p>
                        <p className="text-sm text-red-200/80">{tokenError}</p>
                      </div>
                      <Button
                        type="button"
                        variant="glass-dark"
                        size="sm"
                        onClick={async () => {
                          const token = getAuthToken();
                          if (!token || !publisher || !selectedDomainId) return;
                          await loadVerificationToken(selectedDomainId, token);
                        }}
                      >
                        Try again
                      </Button>
                    </div>
                  )}

                  {verificationToken && (
                    <div className="mb-8">
                      <label className="block text-base font-medium text-white mb-4">
                        Follow these steps
                      </label>
                      <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6">
                        <pre className="whitespace-pre-wrap text-sm text-white/90 leading-relaxed font-sans">
                          {instructions[method]}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Background verification status */}
                  {selectedDomain.next_verification_at && (
                    <div className="mb-6 p-5 rounded-2xl backdrop-blur-sm bg-blue-500/10 border border-blue-500/30">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-blue-200 mb-2">🔄 Automatic verification in progress</p>
                          <p className="text-sm text-blue-200/80 mb-1">
                            Next check in: {formatTimeUntil(selectedDomain.next_verification_at)}
                          </p>
                          <p className="text-sm text-blue-200/60">
                            Attempts: {selectedDomain.verification_attempts || 0}/5
                          </p>
                          {selectedDomain.verification_error && (
                            <p className="text-xs text-blue-200/70 mt-2">
                              Last error: {selectedDomain.verification_error}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="glass-dark"
                          size="sm"
                          onClick={handleCheckNow}
                          disabled={verifying}
                          className="bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30"
                        >
                          {verifying ? 'Checking...' : 'Check Now'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {result && (
                    <div
                      className={`mb-6 p-5 rounded-2xl backdrop-blur-sm ${
                        result.success
                          ? 'bg-green-500/20 border border-green-500/30 text-green-200'
                          : 'bg-red-500/20 border border-red-500/30 text-red-200'
                      }`}
                    >
                      {result.success ? (
                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold mb-1">Verified!</p>
                            <p className="text-sm text-green-200/80">Domain verified successfully.</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold mb-1">Not verified yet</p>
                          <p className="text-sm text-red-200/80">{result.message}</p>
                          <p className="text-sm text-red-200/60 mt-2">Make sure you followed the steps correctly and wait a few minutes if you just added the record.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Single primary action - silently checks verification then navigates */}
                  <Button
                    variant="glass-dark"
                    size="lg"
                    onClick={async () => {
                      // Silently trigger verification check
                      if (publisher && selectedDomainId && !verifying) {
                        try {
                          const token = getAuthToken();
                          if (token) {
                            // Fire and forget - don't wait for result
                            api.verifyDomainNow(publisher.id, selectedDomainId, token).catch(() => {
                              // Silent fail - background worker will handle it
                            });
                          }
                        } catch {
                          // Silent fail - background worker will handle it
                        }
                      }
                      // Navigate immediately
                      router.push('/publishers/dashboard');
                    }}
                    className="w-full"
                  >
                    Continue to Dashboard →
                  </Button>
                </>
              )}

              {selectedDomain && selectedDomain.domain_verified && (
                <>
                  <GlassCard variant="dark" blur="xl" className="p-6 bg-green-500/10 border-green-500/30 mb-6">
                    <div className="flex items-center gap-3">
                      <Check className="w-8 h-8 text-green-300" />
                      <div>
                        <h3 className="text-lg font-semibold text-green-200">This domain is verified!</h3>
                        <p className="text-green-200/80">{selectedDomain.website_url} is verified and ready to earn.</p>
                      </div>
                    </div>
                  </GlassCard>
                  
                  <Button
                    variant="glass-dark"
                    size="lg"
                    onClick={() => router.push('/publishers/dashboard')}
                    className="w-full"
                  >
                    Continue to Dashboard →
                  </Button>
                </>
              )}

              {/* Add Domain Button */}
              <div className="mt-8 pt-8 border-t border-white/10">
                <Button
                  variant="glass-dark"
                  onClick={() => router.push('/publishers')}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Domain
                </Button>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
