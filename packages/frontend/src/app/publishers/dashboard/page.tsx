'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Globe, Check, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';

export default function PublisherDashboardPage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [publisher, setPublisher] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);

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

  // Auto-refresh every 30 seconds to catch verification completion
  useEffect(() => {
    const hasUnverifiedDomain = publisher?.domains?.some((d: any) => !d.domain_verified);
    
    if (hasUnverifiedDomain) {
      const interval = setInterval(async () => {
        try {
          const token = getAuthToken();
          if (!token) return;
          
          const publisherResult = await api.getPublisher(token);
          setPublisher(publisherResult.publisher);
        } catch (error) {
          console.error('Failed to refresh publisher:', error);
        }
      }, 30000); // Every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [publisher?.domains]);

  const hasVerifiedDomain = publisher?.domains?.some((d: any) => d.domain_verified);
  const hasUnverifiedDomain = publisher?.domains?.some((d: any) => !d.domain_verified);
  const nextVerificationDomain = publisher?.domains?.find((d: any) => !d.domain_verified && d.next_verification_at);

  const formatTimeUntil = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    const now = new Date().getTime();
    const target = new Date(timestamp).getTime();
    const diff = target - now;
    
    if (diff <= 0) return 'soon';
    
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
          <h2 className="text-2xl font-bold mb-4 text-white">Not Registered</h2>
          <p className="text-white/60 mb-6">Please register as a publisher first.</p>
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

  return (
    <div className="min-h-screen py-8 bg-frosted-dark pt-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-white mb-8 scroll-mt-24">Publisher Dashboard</h1>

        {/* Status banner for unverified publishers */}
        {hasUnverifiedDomain && (
          <GlassCard variant="dark" blur="xl" className="p-6 mb-8 bg-yellow-500/10 border-yellow-500/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-200 mb-2">
                  {hasVerifiedDomain ? 'Additional Domain Verification Pending' : 'Domain Verification Pending'}
                </h3>
                <p className="text-yellow-200/80 mb-1">
                  {nextVerificationDomain ? (
                    <>Verification checks running automatically. Next check in {formatTimeUntil(nextVerificationDomain.next_verification_at)}.</>
                  ) : (
                    <>Complete domain verification to start earning.</>
                  )}
                </p>
                {!hasVerifiedDomain && (
                  <p className="text-sm text-yellow-200/70">
                    You can browse your dashboard, but earnings will only accumulate after verification.
                  </p>
                )}
              </div>
              <Button
                variant="glass-dark"
                className="bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30 whitespace-nowrap"
                onClick={() => router.push('/publishers/verify')}
              >
                {hasVerifiedDomain ? 'Verify Additional Domain' : 'Complete Verification'}
              </Button>
            </div>
          </GlassCard>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <GlassCard variant="dark" blur="xl" className="p-6">
            <h3 className="text-sm font-medium text-white/60 mb-2">Total Earnings</h3>
            <p className="text-3xl font-bold text-white">
              {earnings?.earnings?.total?.toFixed(4) || '0.0000'} ETH
            </p>
          </GlassCard>

          <GlassCard variant="dark" blur="xl" className="p-6">
            <h3 className="text-sm font-medium text-white/60 mb-2">Status</h3>
            <p className={`text-2xl font-semibold ${
              publisher.status === 'approved' ? 'text-green-300' :
              publisher.status === 'pending' ? 'text-yellow-300' :
              'text-red-300'
            }`}>
              {publisher.status.charAt(0).toUpperCase() + publisher.status.slice(1)}
            </p>
          </GlassCard>

          <GlassCard variant="dark" blur="xl" className="p-6">
            <h3 className="text-sm font-medium text-white/60 mb-2">Quality Score</h3>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-bold text-white">
                {publisher.quality_score || 70}
              </p>
              <div className="text-xs text-white/60">
                <span className="block">/ 100</span>
              </div>
            </div>
            {(!publisher.quality_score || publisher.quality_score === 70) && (
              <p className="text-xs text-white/50 mt-2">
                Neutral baseline - Score will update after 500+ impressions or 7 days
              </p>
            )}
            {publisher.quality_score && publisher.quality_score >= 80 && (
              <p className="text-xs text-green-400 mt-2">
                ✨ Excellent quality - Premium campaigns available
              </p>
            )}
            {publisher.quality_score && publisher.quality_score < 60 && publisher.quality_score !== 70 && (
              <p className="text-xs text-yellow-400 mt-2">
                ⚠️ Below average - Focus on traffic quality
              </p>
            )}
          </GlassCard>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <GlassCard variant="dark" blur="xl" className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Account Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/60">Payment Wallet</p>
                <p className="font-mono text-sm text-white">{publisher.payment_wallet}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Registered</p>
                <p className="font-medium text-white">
                  {new Date(publisher.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </GlassCard>

          {earnings && (
            <GlassCard variant="dark" blur="xl" className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Earnings Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Events</span>
                  <span className="font-medium text-white">{earnings.earnings?.event_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Total Earnings</span>
                  <span className="font-bold text-white">
                    {earnings.earnings?.total?.toFixed(4) || '0.0000'} ETH
                  </span>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Domains Section */}
        <GlassCard variant="dark" blur="xl" className="p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Your Domains</h2>
            <Button
              variant="glass-dark"
              size="sm"
              onClick={() => router.push('/publishers')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </div>
          
          {publisher.domains && publisher.domains.length > 0 ? (
            <div className="space-y-3">
              {publisher.domains.map((domain: any) => (
                <div
                  key={domain.id}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    domain.domain_verified
                      ? 'border-green-500/30 bg-green-500/10'
                      : 'border-yellow-500/30 bg-yellow-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-white/60" />
                      <div>
                        <p className="font-medium text-white">{domain.website_url}</p>
                        <p className="text-sm text-white/60">
                          {domain.domain_verified ? 'Verified' : 'Pending verification'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {domain.domain_verified ? (
                        <Check className="w-5 h-5 text-green-300" />
                      ) : (
                        <>
                          <Button
                            variant="glass-dark"
                            size="sm"
                            onClick={async () => {
                              if (expandedDomainId === domain.id) {
                                setExpandedDomainId(null);
                              } else {
                                setExpandedDomainId(domain.id);
                                // Silent verification check
                                try {
                                  const token = getAuthToken();
                                  if (token) {
                                    api.verifyDomainNow(publisher.id, domain.id, token).catch(() => {});
                                  }
                                } catch {}
                              }
                            }}
                            className="gap-1"
                          >
                            {expandedDomainId === domain.id ? 'Hide' : 'Verify'}
                            {expandedDomainId === domain.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline verification steps - Apple style */}
                  {!domain.domain_verified && expandedDomainId === domain.id && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                        <p className="text-sm text-blue-200/90 mb-2">
                          <strong>🔄 Automatic verification in progress</strong>
                        </p>
                        <p className="text-xs text-blue-200/70">
                          {domain.next_verification_at 
                            ? `Next check in ${formatTimeUntil(domain.next_verification_at)}. We'll check automatically up to 5 times over 24 hours.`
                            : 'We\'re checking your domain now. This may take up to 24 hours for DNS changes to propagate.'
                          }
                        </p>
                        {domain.verification_attempts > 0 && (
                          <p className="text-xs text-blue-200/60 mt-2">
                            Attempts: {domain.verification_attempts}/5
                          </p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-white mb-3">How to verify your domain:</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="font-medium text-white mb-1">Option 1: DNS Record</p>
                            <p className="text-xs text-white/60">
                              Add a TXT record to your DNS with name: <code className="text-blue-300">_buzzer-verify.{new URL(domain.website_url).hostname}</code>
                            </p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="font-medium text-white mb-1">Option 2: HTML Meta Tag</p>
                            <p className="text-xs text-white/60">
                              Add a meta tag to your website's &lt;head&gt; section
                            </p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="font-medium text-white mb-1">Option 3: File Upload</p>
                            <p className="text-xs text-white/60">
                              Upload buzzer-verification.txt to your website root
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/publishers/verify')}
                          className="mt-4 w-full text-xs border-white/20 bg-white/5 hover:bg-white/10 text-white"
                        >
                          View detailed instructions →
                        </Button>
                      </div>

                      {domain.verification_error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                          <p className="text-xs text-red-200/80">
                            <strong>Last check:</strong> {domain.verification_error}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-white/60 mb-4">No domains registered yet.</p>
              <Button
                variant="glass-dark"
                onClick={() => router.push('/publishers')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Domain
              </Button>
            </div>
          )}
        </GlassCard>

        {/* Action Required - only show if no verified domains */}
        {publisher.domains && publisher.domains.length > 0 && 
         !publisher.domains.some((d: any) => d.domain_verified) && (
          <GlassCard variant="dark" blur="xl" className="p-6 bg-yellow-500/10 border-yellow-500/30">
            <h3 className="font-semibold text-yellow-200 mb-2">Action Required</h3>
            <p className="text-yellow-200/80 mb-4">
              Please verify at least one domain to start earning.
            </p>
            <Button
              variant="glass-dark"
              className="bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30"
              onClick={() => router.push('/publishers/verify')}
            >
              Verify Domain
            </Button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

