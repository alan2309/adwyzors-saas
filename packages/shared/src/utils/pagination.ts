import type { PaginationParams } from '../types/pagination.js'
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../types/pagination.js'

/**
 * Parses and validates pagination parameters from URL search params.
 * Clamps limit to MAX_LIMIT (100) to prevent abuse.
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? String(DEFAULT_PAGE), 10))
  const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT)
  const search = searchParams.get('search') ?? undefined
  const sortBy = searchParams.get('sortBy') ?? undefined
  const rawSortOrder = searchParams.get('sortOrder')
  const sortOrder: 'asc' | 'desc' | undefined =
    rawSortOrder === 'asc' || rawSortOrder === 'desc' ? rawSortOrder : undefined

  return { page, limit, search, sortBy, sortOrder }
}

/**
 * Calculates skip/offset for Prisma queries from pagination params.
 */
export function getPrismaSkip(params: PaginationParams): number {
  return (params.page - 1) * params.limit
}
