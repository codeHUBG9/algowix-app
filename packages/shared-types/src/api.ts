export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  requestId: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiFieldError[];
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
