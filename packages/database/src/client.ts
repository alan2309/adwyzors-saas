import { config } from '@adwyzors/config'
import { logger } from '@adwyzors/logger'
import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton.
 *
 * In development, re-uses the same instance across hot reloads to prevent
 * "Too many connections" errors. In production, creates one instance only.
 *
 * ⚠️  Application code MUST NOT use this directly.
 *     Use tenantPrisma(tenantId) instead to ensure tenant isolation.
 *     Only the Tenant Engine and seed scripts use this client directly.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: config.database.url },
    },
    log: config.app.isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ],
  })

interface PrismaEventEmitter {
  $on(event: 'query', callback: (event: { query: string; duration: number }) => void): void
  $on(event: 'warn' | 'error', callback: (event: { message: string }) => void): void
}

const prismaEvents = prisma as unknown as PrismaEventEmitter

if (config.app.isDev) {
  globalForPrisma.prisma = prisma

  // Log slow queries in development
  prismaEvents.$on('query', (e) => {
    if (e.duration > 200) {
      logger.warn({ query: e.query, duration: e.duration }, 'Slow query detected')
    }
  })
}

prismaEvents.$on('warn', (e) => {
  logger.warn({ message: e.message }, 'Prisma warning')
})

prismaEvents.$on('error', (e) => {
  logger.error({ message: e.message }, 'Prisma error')
})
