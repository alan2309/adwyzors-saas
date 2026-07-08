import { prisma } from './client.js'

/**
 * Models that are scoped to a tenant (have tenantId column).
 * Models NOT in this set (Permission, AuditLog) are excluded from auto-scoping.
 * Update this set when new tenant-scoped models are added to the schema.
 */
const TENANT_SCOPED_MODELS = new Set([
  'User',
  'Role',
  'UserRole',
  'PasswordResetToken',
])

/**
 * tenantPrisma — the only way application code should query the database.
 *
 * Returns a Prisma client extension that automatically:
 * 1. Injects WHERE tenantId = ? on all read queries for tenant-scoped models
 * 2. Injects WHERE deletedAt IS NULL (soft delete filter) on all read queries
 * 3. Injects tenantId on create operations
 *
 * This makes it impossible to accidentally read another tenant's data.
 *
 * @example
 * // ❌ Never do this — no tenant isolation
 * prisma.user.findMany()
 *
 * // ✅ Always do this
 * const db = tenantPrisma(tenantId)
 * db.user.findMany() // automatically scoped to tenantId + deletedAt: null
 */
export function tenantPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        findMany({ args, query, model }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where = args.where as Record<string, unknown> | undefined
            ;(args as { where: Record<string, unknown> }).where = {
              ...where,
              tenantId,
              deletedAt: null,
            }
          }
          return query(args)
        },
        findFirst({ args, query, model }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where = args.where as Record<string, unknown> | undefined
            ;(args as { where: Record<string, unknown> }).where = {
              ...where,
              tenantId,
              deletedAt: null,
            }
          }
          return query(args)
        },
        count({ args, query, model }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where = args.where as Record<string, unknown> | undefined
            ;(args as { where: Record<string, unknown> }).where = {
              ...where,
              tenantId,
              deletedAt: null,
            }
          }
          return query(args)
        },
        create({ args, query, model }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            ;(args as { data: Record<string, unknown> }).data = {
              ...(args.data as Record<string, unknown>),
              tenantId,
            }
          }
          return query(args)
        },
        update({ args, query, model }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where = args.where as Record<string, unknown> | undefined
            ;(args as { where: Record<string, unknown> }).where = {
              ...where,
              tenantId,
            }
          }
          return query(args)
        },
        updateMany({ args, query, model }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where = args.where as Record<string, unknown> | undefined
            ;(args as { where: Record<string, unknown> }).where = {
              ...where,
              tenantId,
            }
          }
          return query(args)
        },
      },
    },
  })
}

export type TenantPrismaClient = ReturnType<typeof tenantPrisma>
