import { useCallback } from 'react';
import type { ApiResponse, ApiError } from '../types/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
      });

      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      if (!response.ok) {
        const error: ApiError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = { data: data as any };
        throw error;
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      console.error('API Request failed:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError: ApiError = new Error('Network error - please check if the backend server is running');
        networkError.status = 0;
        throw networkError;
      }
      
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const useApi = () => {
  const apiClient = new ApiClient();

  // Users API
  const users = {
    getById: useCallback((id: string) => apiClient.get(`/users/${id}`), []),
    getByEmail: useCallback((email: string) => apiClient.get(`/users/email/${email}`), []),
    create: useCallback((userData: any) => apiClient.post('/users', userData), []),
    update: useCallback((id: string, userData: any) => apiClient.put(`/users/${id}`, userData), []),
    delete: useCallback((id: string) => apiClient.delete(`/users/${id}`), []),
    getConfig: useCallback((id: string) => apiClient.get(`/users/${id}/config`), []),
    updateConfig: useCallback((id: string, config: any) => apiClient.put(`/users/${id}/config`, config), []),
    getStats: useCallback((id: string, days?: number) => 
      apiClient.get(`/users/${id}/stats${days ? `?days=${days}` : ''}`), []
    ),
  };

  // Emails API
  const emails = {
    getById: useCallback((id: string) => apiClient.get(`/emails/${id}`), []),
    getByGmailId: useCallback((messageId: string) => apiClient.get(`/emails/gmail/${messageId}`), []),
    create: useCallback((emailData: any) => apiClient.post('/emails', emailData), []),
    update: useCallback((id: string, emailData: any) => apiClient.put(`/emails/${id}`, emailData), []),
    delete: useCallback((id: string) => apiClient.delete(`/emails/${id}`), []),
    search: useCallback((params: any) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/emails?${searchParams}`);
    }, []),
    getPending: useCallback((userId?: string) => {
      const params = userId ? `?userId=${userId}` : '';
      return apiClient.get(`/emails/status/pending${params}`);
    }, []),
    getFailed: useCallback((userId?: string) => {
      const params = userId ? `?userId=${userId}` : '';
      return apiClient.get(`/emails/status/failed${params}`);
    }, []),
    getDemoRequests: useCallback((userId?: string, params?: any) => {
      const searchParams = new URLSearchParams();
      if (userId) searchParams.set('userId', userId);
      if (params?.responded !== undefined) searchParams.set('responded', params.responded.toString());
      if (params?.startDate) searchParams.set('startDate', params.startDate);
      if (params?.endDate) searchParams.set('endDate', params.endDate);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      const queryString = searchParams.toString() ? `?${searchParams}` : '';
      return apiClient.get(`/emails/demo-requests${queryString}`);
    }, []),
    getStats: useCallback((params?: { userId?: string; days?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.userId) searchParams.set('userId', params.userId);
      if (params?.days) searchParams.set('days', params.days.toString());
      return apiClient.get(`/emails/stats?${searchParams}`);
    }, []),
    markProcessed: useCallback((id: string, data: any) => 
      apiClient.post(`/emails/${id}/mark-processed`, data), []
    ),
    markFailed: useCallback((id: string, error: string) => 
      apiClient.post(`/emails/${id}/mark-failed`, { error }), []
    ),
    markResponseSent: useCallback((id: string, responseId: string) => 
      apiClient.post(`/emails/${id}/mark-response-sent`, { responseMessageId: responseId }), []
    ),
  };


  // System API
  const system = {
    health: useCallback(() => apiClient.get('/health'), []),
    status: useCallback(() => apiClient.get('/status'), []),
  };

  // Direct API methods
  const get = useCallback((endpoint: string) => apiClient.get(endpoint), []);
  const post = useCallback((endpoint: string, data?: any) => apiClient.post(endpoint, data), []);
  const put = useCallback((endpoint: string, data?: any) => apiClient.put(endpoint, data), []);
  const del = useCallback((endpoint: string) => apiClient.delete(endpoint), []);

  return {
    // Organized API methods
    users,
    emails,
    // Calendar DB metrics endpoints can be called via direct get/post when needed
    system,
    
    // Direct methods for custom endpoints
    get,
    post,
    put,
    delete: del,
  };
};

export default useApi;