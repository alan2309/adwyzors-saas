/**
 * Platform-wide status constants.
 * Use these instead of raw strings for entity status fields.
 */
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const

export type Status = (typeof STATUS)[keyof typeof STATUS]

/**
 * Platform role names.
 * SUPER_ADMIN is a platform role (tenantId = null in DB).
 * All other roles are tenant-scoped.
 */
export const PLATFORM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  TENANT_USER: 'TENANT_USER',
} as const

export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES]
