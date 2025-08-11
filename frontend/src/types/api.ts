// API-related types for frontend

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

export interface ApiError {
  message: string;
  status?: number;
  response?: {
    data?: {
      error?: string;
    };
  };
}

export interface ApiSuccessResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: boolean;
  error: string;
  message?: string;
  details?: any[];
}

// Standard API response wrapper
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
}

// Pagination response
export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  count: number;
  page?: number;
  limit?: number;
  total?: number;
  filters?: any;
}