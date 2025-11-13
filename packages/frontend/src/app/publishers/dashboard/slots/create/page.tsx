'use client';

/**
 * Create Ad Slot Page
 * Form to create a new ad slot with IAB standards
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Copy, Check } from 'lucide-react';

export default function CreateSlotPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [publisher, setPublisher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrationCode, setIntegrationCode] = useState<string | null>(null);
  const [iabSizes, setIabSizes] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    format: 'banner',
    sizes: [] as string[],
    primary_size: '',
    position: 'above_fold',
    refresh_enabled: false,
    refresh_interval: 30,
    lazy_load: true,
    floor_price: '',
  });

  useEffect(() => {
    async function fetchData() {
      const token = getAuthToken();
      if (!token || !address) {
        router.push('/publishers');
        return;
      }

      try {
        const publisherResult = await api.getPublisher(token);
        if (!publisherResult.publisher) {
          router.push('/publishers');
          return;
        }
        setPublisher(publisherResult.publisher);

        // Get IAB sizes
        const sizesResult = await api.getIABAdSizes();
        setIabSizes(sizesResult);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [address, router]);

  const handleSizeToggle = (size: string) => {
    if (formData.sizes.includes(size)) {
      setFormData({
        ...formData,
        sizes: formData.sizes.filter(s => s !== size),
        primary_size: formData.primary_size === size ? '' : formData.primary_size,
      });
    } else {
      setFormData({
        ...formData,
        sizes: [...formData.sizes, size],
        primary_size: formData.primary_size || size, // Auto-select as primary if first
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const token = getAuthToken();
    if (!token || !publisher) return;

    try {
      // Validate
      if (!formData.name) {
        throw new Error('Slot name is required');
      }
      if (formData.sizes.length === 0) {
        throw new Error('At least one size is required');
      }
      if (!formData.primary_size) {
        throw new Error('Primary size is required');
      }

      const result = await api.createSlot(
        publisher.id,
        {
          name: formData.name,
          format: formData.format as any,
          sizes: formData.sizes,
          primary_size: formData.primary_size,
          position: formData.position as any,
          refresh_enabled: formData.refresh_enabled,
          refresh_interval: formData.refresh_interval,
          lazy_load: formData.lazy_load,
          floor_price: formData.floor_price ? parseFloat(formData.floor_price) : undefined,
        },
        token
      );

      setIntegrationCode(result.integration_code);
    } catch (error: any) {
      setError(error.message || 'Failed to create slot');
      setSubmitting(false);
    }
  };

  const copyCode = () => {
    if (integrationCode) {
      navigator.clipboard.writeText(integrationCode);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Success screen
  if (integrationCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <GlassCard variant="dark" blur="xl" className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ad Slot Created!</h2>
              <p className="text-white/60">Your ad slot "{formData.name}" is ready to use</p>
            </div>

            <div className="mb-6">
              <Label className="text-white mb-2">Integration Code</Label>
              <div className="relative">
                <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{integrationCode}</code>
                </pre>
                <button
                  onClick={copyCode}
                  className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Next Steps:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-white/80">
                <li>Copy the integration code above</li>
                <li>Paste it into your website HTML where you want the ad to appear</li>
                <li>Ensure your domain is verified</li>
                <li>Ads will start serving automatically</li>
              </ol>
            </div>

            <div className="flex gap-4">
              <Button
                variant="glass-dark"
                onClick={() => router.push('/publishers/dashboard/slots')}
                className="flex-1"
              >
                View All Slots
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.location.reload()}
              >
                Create Another
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/publishers/dashboard/slots')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Slots
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-8">Create New Ad Slot</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <GlassCard variant="dark" blur="xl" className="p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Slot Name *</Label>
                <Input
                  id="name"
                  variant="glass"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Homepage Top Banner"
                  required
                />
              </div>

              <div>
                <Label htmlFor="format">Format</Label>
                <select
                  id="format"
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
                >
                  <option value="banner">Banner</option>
                  <option value="native">Native</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div>
                <Label htmlFor="position">Position</Label>
                <select
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
                >
                  <option value="above_fold">Above the Fold</option>
                  <option value="below_fold">Below the Fold</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="footer">Footer</option>
                </select>
              </div>
            </div>
          </GlassCard>

          {/* Size Selection */}
          <GlassCard variant="dark" blur="xl" className="p-6">
            <h2 className="text-xl font-semibold mb-4">Ad Sizes (IAB Standards)</h2>
            <p className="text-sm text-white/60 mb-4">Select one or more ad sizes. The first selected will be primary.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {iabSizes?.all_sizes.slice(0, 9).map((size: string) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSizeToggle(size)}
                  className={`p-3 rounded-lg border transition-colors ${
                    formData.sizes.includes(size)
                      ? 'bg-blue-500/20 border-blue-500/50 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm font-medium">{size}</span>
                  {formData.primary_size === size && (
                    <span className="block text-xs mt-1 text-blue-400">Primary</span>
                  )}
                </button>
              ))}
            </div>

            {formData.sizes.length > 0 && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm">
                  Selected: {formData.sizes.join(', ')}
                  <br />
                  Primary: {formData.primary_size}
                </p>
              </div>
            )}
          </GlassCard>

          {/* Advanced Settings */}
          <GlassCard variant="dark" blur="xl" className="p-6">
            <h2 className="text-xl font-semibold mb-4">Advanced Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="lazy_load"
                  checked={formData.lazy_load}
                  onChange={(e) => setFormData({ ...formData, lazy_load: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="lazy_load" className="cursor-pointer">
                  Enable Lazy Loading (recommended)
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="refresh_enabled"
                  checked={formData.refresh_enabled}
                  onChange={(e) => setFormData({ ...formData, refresh_enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="refresh_enabled" className="cursor-pointer">
                  Enable Ad Refresh
                </Label>
              </div>

              {formData.refresh_enabled && (
                <div>
                  <Label htmlFor="refresh_interval">Refresh Interval (seconds)</Label>
                  <Input
                    id="refresh_interval"
                    type="number"
                    variant="glass"
                    min="30"
                    max="300"
                    value={formData.refresh_interval}
                    onChange={(e) => setFormData({ ...formData, refresh_interval: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-white/60 mt-1">Minimum 30 seconds (policy compliance)</p>
                </div>
              )}

              <div>
                <Label htmlFor="floor_price">Floor Price (CPM in USD) - Optional</Label>
                <Input
                  id="floor_price"
                  type="number"
                  variant="glass"
                  step="0.01"
                  min="0"
                  value={formData.floor_price}
                  onChange={(e) => setFormData({ ...formData, floor_price: e.target.value })}
                  placeholder="e.g., 2.50"
                />
                <p className="text-xs text-white/60 mt-1">Minimum CPM bid to accept for this slot</p>
              </div>
            </div>
          </GlassCard>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="submit"
              variant="glass-dark"
              size="lg"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Creating...' : 'Create Ad Slot'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/publishers/dashboard/slots')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

