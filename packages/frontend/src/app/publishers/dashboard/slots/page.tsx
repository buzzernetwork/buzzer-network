'use client';

/**
 * Ad Slots Management Page
 * List and manage all ad slots for a publisher
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Pause, 
  Play, 
  Archive,
  Copy,
  BarChart3,
  Eye,
  EyeOff,
  MoreVertical,
} from 'lucide-react';

interface AdSlot {
  id: string;
  slot_id: string;
  name: string;
  format: string;
  sizes: string[];
  primary_size: string;
  position: string;
  status: 'active' | 'paused' | 'archived';
  created_at: string;
  total_impressions?: number;
  total_clicks?: number;
  total_revenue?: number;
  avg_viewability_rate?: number;
}

export default function AdSlotsPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [publisher, setPublisher] = useState<any>(null);
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'archived'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const token = getAuthToken();
      if (!token || !address) {
        router.push('/publishers');
        return;
      }

      try {
        // Get publisher info
        const publisherResult = await api.getPublisher(token);
        if (!publisherResult.publisher) {
          router.push('/publishers');
          return;
        }
        setPublisher(publisherResult.publisher);

        // Get slots
        const slotsResult = await api.getSlots(
          publisherResult.publisher.id,
          filterStatus === 'all' ? {} : { status: filterStatus as any },
          token
        );
        setSlots(slotsResult.slots || []);
      } catch (error) {
        console.error('Error fetching slots:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [address, router, filterStatus]);

  const copyToClipboard = (text: string, slotId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(slotId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (slotId: string, newStatus: 'active' | 'paused' | 'archived') => {
    const token = getAuthToken();
    if (!token || !publisher) return;

    try {
      await api.updateSlotStatus(publisher.id, slotId, newStatus, token);
      // Refresh slots
      const slotsResult = await api.getSlots(
        publisher.id,
        filterStatus === 'all' ? {} : { status: filterStatus as any },
        token
      );
      setSlots(slotsResult.slots || []);
    } catch (error) {
      console.error('Error updating slot status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'paused': return 'bg-yellow-500/20 text-yellow-400';
      case 'archived': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Ad Slots</h1>
              <p className="text-white/60">Manage your ad placements and integration</p>
            </div>
            <Button
              variant="glass-dark"
              size="lg"
              onClick={() => router.push('/publishers/dashboard/slots/create')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Slot
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'active', 'paused', 'archived'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === status
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Slots Grid */}
        {slots.length === 0 ? (
          <GlassCard variant="dark" blur="xl" className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white/60" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No ad slots yet</h3>
              <p className="text-white/60 mb-6">
                Create your first ad slot to start serving ads and earning revenue
              </p>
              <Button
                variant="glass-dark"
                onClick={() => router.push('/publishers/dashboard/slots/create')}
              >
                Create Your First Slot
              </Button>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slots.map((slot) => (
              <GlassCard key={slot.id} variant="dark" blur="xl" className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{slot.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(slot.status)}`}>
                        {slot.status}
                      </span>
                      <span className="text-xs text-white/60">{slot.format}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-white/10">
                  <div>
                    <p className="text-xs text-white/60 mb-1">Impressions</p>
                    <p className="text-lg font-semibold">{slot.total_impressions?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Clicks</p>
                    <p className="text-lg font-semibold">{slot.total_clicks?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Revenue</p>
                    <p className="text-lg font-semibold">${slot.total_revenue?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Viewability</p>
                    <p className="text-lg font-semibold">
                      {slot.avg_viewability_rate ? `${(slot.avg_viewability_rate * 100).toFixed(0)}%` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Slot ID */}
                <div className="mb-4">
                  <p className="text-xs text-white/60 mb-1">Slot ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-white/5 px-2 py-1 rounded flex-1 truncate">
                      {slot.slot_id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(slot.slot_id, slot.id)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Copy slot ID"
                    >
                      {copiedId === slot.id ? (
                        <span className="text-xs text-green-400">✓</span>
                      ) : (
                        <Copy className="w-4 h-4 text-white/60" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/publishers/dashboard/slots/${slot.slot_id}`)}
                    className="flex-1"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Analytics
                  </Button>
                  {slot.status === 'active' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange(slot.slot_id, 'paused')}
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  ) : slot.status === 'paused' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange(slot.slot_id, 'active')}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/publishers/dashboard')}
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

