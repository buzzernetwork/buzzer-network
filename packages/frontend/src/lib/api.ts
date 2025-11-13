/**
 * API Client
 * Centralized API calls for frontend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${API_URL}${endpoint}`;
  
  // Add timeout (10 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      
      // Try to parse JSON error response
      if (isJSON) {
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          // JSON parsing failed, use default message
        }
      } else {
        // For non-JSON errors (HTML pages, etc.), try to get text
        try {
          const text = await response.text();
          // Only use text if it's short and looks like an error message
          if (text.length < 200 && !text.includes('<!DOCTYPE')) {
            errorMessage = text;
          }
        } catch {
          // Ignore text parsing errors
        }
      }
      
      throw new Error(errorMessage);
    }

    // Validate that we received JSON before parsing
    if (!isJSON) {
      const text = await response.text();
      throw new Error(
        `Expected JSON response but received ${contentType || 'unknown type'}. ` +
        `This usually means the backend server is not running or the endpoint doesn't exist. ` +
        `URL: ${url}`
      );
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout: The server took too long to respond. Please try again.');
    }
    throw error;
  }
}

export const api = {
  // Auth
  async getAuthMessage(address: string) {
    return fetchAPI('/api/v1/auth/message', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  },

  async verifySignature(address: string, message: string, signature: string) {
    return fetchAPI('/api/v1/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, message, signature }),
    });
  },

  async getMe(token: string) {
    return fetchAPI('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Publishers
  async registerPublisher(data: {
    website_url: string;
    email?: string;
    payment_wallet: string;
  }, token: string) {
    return fetchAPI('/api/v1/publishers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  async getPublisher(token: string) {
    return fetchAPI('/api/v1/publishers/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getPublisherDomains(publisherId: string, token: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/domains`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async addPublisherDomain(publisherId: string, data: { website_url: string }, token: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  async getDomainVerificationToken(publisherId: string, domainId: string, token: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/domains/${domainId}/verification-token`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async verifyDomain(publisherId: string, domainId: string, method: string, token: string, verificationToken?: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/domains/${domainId}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        verification_method: method,
        verification_token: verificationToken,
      }),
    });
  },

  async verifyDomainNow(publisherId: string, domainId: string, token: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/domains/${domainId}/verify-now`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getEarnings(publisherId: string, token: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return fetchAPI(`/api/v1/publishers/${publisherId}/earnings?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Advertisers
  async registerAdvertiser(data: {
    company_name: string;
    website_url?: string;
  }, token: string) {
    return fetchAPI('/api/v1/advertisers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  async createCampaign(data: {
    name: string;
    objective: 'awareness' | 'clicks' | 'conversions';
    bid_model: 'CPM' | 'CPC';
    bid_amount: number;
    total_budget: number;
    daily_budget?: number;
    targeting: {
      geo?: string[];
      categories?: string[];
      quality_min?: number;
      devices?: string[];
    };
    creative_url: string;
    creative_format: 'banner' | 'native' | 'video';
    landing_page_url: string;
    start_date?: string;
    end_date?: string;
  }, token: string) {
    return fetchAPI('/api/v1/advertisers/campaigns', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  async getCampaigns(token: string) {
    return fetchAPI('/api/v1/advertisers/campaigns', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async updateCampaign(campaignId: string, data: {
    status?: string;
    total_budget?: number;
    daily_budget?: number;
  }, token: string) {
    return fetchAPI(`/api/v1/advertisers/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  // Campaigns
  async fundCampaign(data: {
    campaign_id: string;
    amount: string;
    token_address?: string;
  }, token: string) {
    return fetchAPI('/api/v1/campaigns/fund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  async getCampaign(campaignId: string, token: string) {
    return fetchAPI(`/api/v1/campaigns/${campaignId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getCampaignBalance(campaignId: string, token: string) {
    return fetchAPI(`/api/v1/campaigns/${campaignId}/balance`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Ad Slots
  async getIABAdSizes() {
    return fetchAPI('/api/v1/ad-sizes');
  },

  async createSlot(publisherId: string, data: {
    name: string;
    path?: string;
    format: 'banner' | 'native' | 'video';
    sizes: string[];
    primary_size: string;
    position?: 'above_fold' | 'below_fold' | 'sidebar' | 'footer';
    refresh_enabled?: boolean;
    refresh_interval?: number;
    lazy_load?: boolean;
    viewability_threshold?: number;
    floor_price?: number;
  }, token: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/slots`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  async getSlots(publisherId: string, params: {
    status?: 'active' | 'paused' | 'archived';
    format?: 'banner' | 'native' | 'video';
    limit?: number;
    offset?: number;
  }, token: string) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.set('status', params.status);
    if (params.format) queryParams.set('format', params.format);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());

    return fetchAPI(`/api/v1/publishers/${publisherId}/slots?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getSlot(publisherId: string, slotId: string, token: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/slots/${slotId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async updateSlot(publisherId: string, slotId: string, data: {
    name?: string;
    path?: string;
    sizes?: string[];
    primary_size?: string;
    position?: 'above_fold' | 'below_fold' | 'sidebar' | 'footer';
    refresh_enabled?: boolean;
    refresh_interval?: number;
    lazy_load?: boolean;
    viewability_threshold?: number;
    floor_price?: number;
  }, token: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/slots/${slotId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  async updateSlotStatus(publisherId: string, slotId: string, status: 'active' | 'paused' | 'archived', token: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/slots/${slotId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
  },

  async getSlotTestPage(publisherId: string, slotId: string, token: string): Promise<string> {
    const response = await fetch(`${API_URL}/api/v1/publishers/${publisherId}/slots/${slotId}/test-page`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  },
};

