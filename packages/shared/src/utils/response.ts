import type { ApiErrorResponse, ApiPaginatedResponse, ApiSuccessResponse } from '../types/api.js'
import type { PaginationMeta, PaginationParams } from '../types/pagination.js'
import { AppError } from '../errors/app-error.js'

/**
 * Creates a standard success response envelope.
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) }
}

/**
 * Creates a standard paginated response envelope.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): ApiPaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit)
  const meta: PaginationMeta = {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  }
  return { success: true, data, meta }
}

/**
 * Creates a standard error response envelope.
 * Accepts AppError instances or unknown thrown values.
 */
export function errorResponse(error: unknown): ApiErrorResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    }
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: null,
    },
  }
}
