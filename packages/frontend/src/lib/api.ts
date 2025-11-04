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
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

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

  async getVerificationToken(publisherId: string, token: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/verification-token`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async verifyDomain(publisherId: string, method: string, token: string, verificationToken?: string) {
    return fetchAPI(`/api/v1/publishers/${publisherId}/verify`, {
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

  // Scraper/Gallery
  async getMemeGallery() {
    return fetchAPI('/api/v1/scraper/gallery');
  },
};

