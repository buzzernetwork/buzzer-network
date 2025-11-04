'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { api } from '@/lib/api';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!publisher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Publisher Not Found</h2>
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

  const instructions = {
    dns: `Add a DNS TXT record: _buzzer-verify.${new URL(publisher.website_url).hostname} = ${verificationToken}`,
    html: `Add this meta tag to your website's <head> section:\n<meta name="buzzer-verification" content="${verificationToken}">`,
    file: `Upload a file named "buzzer-verification.txt" to your website root (${publisher.website_url}) with the following content:\n${verificationToken}`,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Domain Verification</h1>
          <p className="text-gray-600 mb-8">
            Verify ownership of <strong>{publisher.website_url}</strong>
          </p>

          {publisher.domain_verified ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Domain Verified</h3>
                  <p className="text-green-700">Your domain has been successfully verified.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Method
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['dns', 'html', 'file'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`px-4 py-3 rounded-lg border-2 transition ${
                        method === m
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold capitalize">{m}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {m === 'dns' && 'DNS TXT Record'}
                        {m === 'html' && 'HTML Meta Tag'}
                        {m === 'file' && 'File Upload'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Token
                </label>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 font-mono text-sm break-all">
                  {verificationToken || 'Loading...'}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {instructions[method]}
                  </pre>
                </div>
              </div>

              {result && (
                <div
                  className={`mb-6 p-4 rounded-lg ${
                    result.success
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {result.message}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerify}
                  disabled={verifying || !verificationToken}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? 'Verifying...' : 'Verify Domain'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

