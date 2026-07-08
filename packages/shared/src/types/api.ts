import type { PaginationMeta } from './pagination.js'

/**
 * Standard API response envelope.
 * Every REST endpoint returns one of these shapes — never raw data.
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: Record<string, unknown>
}

export interface ApiPaginatedResponse<T> {
  success: true
  data: T[]
  meta: PaginationMeta
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]> | null
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
export type ApiListResponse<T> = ApiPaginatedResponse<T> | ApiErrorResponse
