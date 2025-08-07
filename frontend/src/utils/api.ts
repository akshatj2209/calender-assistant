export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

export const defaultApiConfig: ApiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
};

export class ApiError extends Error {
  public status: number;
  public response?: any;

  constructor(message: string, status: number = 0, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.error || error.response.data?.message || `HTTP ${error.response.status}`;
    return new ApiError(message, error.response.status, error.response.data);
  }

  if (error.request) {
    // Network error
    return new ApiError('Network error - please check your connection and that the backend server is running', 0);
  }

  // Unknown error
  return new ApiError(error.message || 'An unexpected error occurred', 0);
};

export const formatApiResponse = <T>(response: any): T => {
  return response.data;
};

// Type definitions for API responses
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface EmailResponse {
  email: {
    id: string;
    userId: string;
    gmailMessageId: string;
    gmailThreadId: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    receivedAt: string;
    status: 'pending' | 'processed' | 'failed' | 'response_sent';
    isDemoRequest?: boolean;
    intentAnalysis?: any;
    timePreferences?: any;
    contactInfo?: any;
    responseMessageId?: string;
    calendarEvents?: any[];
    createdAt: string;
    updatedAt: string;
  };
}

export interface CalendarEventResponse {
  event: {
    id: string;
    userId: string;
    emailRecordId?: string;
    googleEventId: string;
    summary: string;
    description?: string;
    startTime: string;
    endTime: string;
    timezone: string;
    attendeeEmail: string;
    attendeeName?: string;
    attendeeResponseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    isDemo: boolean;
    status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
    meetingType: string;
    emailRecord?: any;
    createdAt: string;
    updatedAt: string;
  };
}

export interface UserResponse {
  user: {
    id: string;
    email: string;
    name: string;
    googleTokens?: any;
    config?: any;
    createdAt: string;
    updatedAt: string;
  };
}

export interface StatsResponse {
  totalEmails: number;
  demoRequests: number;
  processedEmails: number;
  failedEmails: number;
  responsesSent: number;
  responseRate: number;
  averageProcessingTime: number;
  period: {
    start: string;
    end: string;
    days: number;
  };
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
}

export interface SystemStatusResponse {
  status: {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    database: boolean;
    system: boolean;
    services: {
      gmail: boolean;
      calendar: boolean;
      openai: boolean;
    };
  };
  timestamp: string;
}

// Utility functions for common API patterns
export const createQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  return searchParams.toString();
};

export const buildApiUrl = (endpoint: string, params?: Record<string, any>): string => {
  const baseUrl = `${API_BASE_URL}${endpoint}`;
  
  if (params && Object.keys(params).length > 0) {
    const queryString = createQueryParams(params);
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
  
  return baseUrl;
};