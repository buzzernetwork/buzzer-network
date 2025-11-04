'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { api } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CampaignFundingProps {
  campaignId: string;
  onSuccess?: () => void;
}

export function CampaignFunding({ campaignId, onSuccess }: CampaignFundingProps) {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'preparing' | 'transaction'>('input');
  const [txData, setTxData] = useState<any>(null);

  const {
    writeContract,
    data: hash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStep('preparing');

    try {
      if (!isConnected || !address) {
        throw new Error('Please connect your wallet');
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error('Please authenticate first');
      }

      // Prepare funding transaction
      const result = await api.fundCampaign(
        {
          campaign_id: campaignId,
          amount,
          token_address: '0x0000000000000000000000000000000000000001', // Native ETH
        },
        token
      );

      setTxData(result.transaction);
      setStep('transaction');

      // Execute transaction with wallet
      const contractParams: any = {
        to: result.transaction.to as `0x${string}`,
        data: result.transaction.data as `0x${string}`,
      };
      
      if (result.transaction.value) {
        contractParams.value = BigInt(result.transaction.value);
      }
      
      writeContract(contractParams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare funding');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  // Handle transaction success
  if (isConfirmed && onSuccess) {
    setTimeout(() => {
      onSuccess();
    }, 1000);
  }

  return (
    <GlassCard variant="dark" blur="xl" className="p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Fund Campaign</h2>

      {step === 'input' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount" className="text-white/80 mb-2 block">
              Amount (ETH)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min="0.001"
              required
              variant="glass"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
            />
            <p className="mt-1 text-sm text-white/40">
              Minimum funding: 0.001 ETH
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-200 px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="glass-dark"
            size="lg"
            disabled={loading || !isConnected}
            className="w-full"
          >
            {loading ? 'Preparing...' : 'Fund Campaign'}
          </Button>
        </form>
      )}

      {step === 'preparing' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 mx-auto mb-4"></div>
          <p className="text-white/60">Preparing transaction...</p>
        </div>
      )}

      {step === 'transaction' && (
        <div className="space-y-4">
          {isWriting && (
            <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-4">
              <p className="text-yellow-200">Please confirm the transaction in your wallet...</p>
            </div>
          )}

          {isConfirming && (
            <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-4">
              <p className="text-blue-200">Transaction submitted. Waiting for confirmation...</p>
              {hash && (
                <p className="text-sm text-blue-300 mt-2">
                  Hash: {hash.substring(0, 10)}...{hash.substring(hash.length - 8)}
                </p>
              )}
            </div>
          )}

          {isConfirmed && (
            <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-4">
              <p className="text-green-200 font-semibold">✅ Funding successful!</p>
              {hash && (
                <a
                  href={`https://${process.env.NEXT_PUBLIC_BASE_NETWORK === 'base-mainnet' ? '' : 'sepolia.'}basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-300 hover:underline mt-2 block"
                >
                  View on BaseScan
                </a>
              )}
            </div>
          )}

          {writeError && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-2xl p-4">
              <p className="text-red-200">Transaction failed: {writeError.message}</p>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

