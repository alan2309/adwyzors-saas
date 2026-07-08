export { prisma } from './client.js'
export { tenantPrisma } from './tenant-client.js'
export type { TenantPrismaClient } from './tenant-client.js'

// Re-export Prisma types for convenience
export type {
  Tenant,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  AuditLog,
  PasswordResetToken,
  Notification,
  Customer,
  Contact,
  Prisma,
} from '@prisma/client'
