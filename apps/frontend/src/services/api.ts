const API_BASE_URL = import.meta.env.VITE_BACKEND_URL!;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaymentPayload {
  fromAddress: string;
  toAddress: string;
  amount: string;
}

export interface PaymentResponse {
  uuid: string;
  qrUrl: string;
  deepLink: string;
}

export interface PayloadStatus {
  meta: {
    signed: boolean | null;
    resolved: boolean;
  };
  response?: {
    txid?: string;
    account?: string;
  };
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/');
  }

  // Create payment payload
  async createPayment(payload: PaymentPayload): Promise<ApiResponse<PaymentResponse>> {
    return this.request<PaymentResponse>('/api/xumm/payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Get payload status
  async getPayloadStatus(uuid: string): Promise<ApiResponse<PayloadStatus>> {
    return this.request<PayloadStatus>(`/api/xumm/payload/${uuid}`);
  }

  // Wait for payload result
  async waitForPayloadResult(uuid: string, timeoutMs?: number): Promise<ApiResponse<PayloadStatus>> {
    return this.request<PayloadStatus>(`/api/xumm/payload/${uuid}/wait`, {
      method: 'POST',
      body: JSON.stringify({ timeoutMs }),
    });
  }
}

export const apiService = new ApiService();