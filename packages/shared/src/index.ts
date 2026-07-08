// Types
export type { BaseEntity, BaseEntityDto } from './types/base.js'
export type { PaginationParams, PaginationMeta, PaginatedResponse } from './types/pagination.js'
export { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from './types/pagination.js'
export type {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
  ApiResponse,
  ApiListResponse,
} from './types/api.js'

// Errors
export { AppError } from './errors/app-error.js'
export {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  BadRequestError,
  InternalError,
} from './errors/index.js'

// Utils
export { parsePaginationParams, getPrismaSkip } from './utils/pagination.js'
export { successResponse, paginatedResponse, errorResponse } from './utils/response.js'

// Constants
export { STATUS, PLATFORM_ROLES } from './constants/index.js'
export type { Status, PlatformRole } from './constants/index.js'
