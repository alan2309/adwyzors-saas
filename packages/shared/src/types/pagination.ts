/**
 * Standard pagination types used across all list endpoints.
 * Every API endpoint that returns a list MUST use PaginatedResponse<T>.
 */
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string | undefined
  sortOrder?: 'asc' | 'desc' | undefined
  search?: string | undefined
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100
