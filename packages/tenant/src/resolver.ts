import { config } from '@adwyzors/config'
import { prisma } from '@adwyzors/database'
import { logger } from '@adwyzors/logger'
import { NotFoundError } from '@adwyzors/shared'
import Redis from 'ioredis'
import type { TenantContext } from './types.js'

let redis: Redis | null = null

try {
  if (config.redis.url) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
    redis.on('error', (err) => {
      logger.error({ err }, 'Redis connection error in tenant resolver')
    })
  }
} catch (err) {
  logger.error({ err }, 'Failed to initialize Redis in tenant resolver')
}

const CACHE_TTL = 300 // 5 minutes in seconds

/**
 * Resolves a tenant based on the request hostname.
 * Supports:
 * - Subdomains (e.g., maharaja.adwyzors.com)
 * - Custom domains (e.g., erp.maharajaclothing.com)
 *
 * Caches the resolved context in Redis for fast access.
 */
export async function resolveTenant(hostname: string): Promise<TenantContext> {
  const cacheKey = `tenant:${hostname}`

  // 1. Try Cache
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached) as TenantContext
      }
    } catch (err) {
      logger.warn({ err, hostname }, 'Redis get failed in tenant resolver, falling back to DB')
    }
  }

  // 2. Parse Subdomain / Custom Domain
  // Expected local development format: maharaja.localhost:3000 -> maharaja
  // Expected production format: maharaja.adwyzors.com -> maharaja
  let subdomain = ''
  let customDomain: string | null = null

  // Remove port if present
  const host = hostname.split(':')[0] ?? ''

  // Define root domains to extract subdomains
  const rootDomains = ['localhost', 'adwyzors.com']
  let isRootDomain = false

  for (const root of rootDomains) {
    if (host.endsWith(root)) {
      isRootDomain = true
      const prefix = host.substring(0, host.length - root.length - 1)
      if (prefix && prefix !== 'www') {
        subdomain = prefix
      }
      break
    }
  }

  if (!isRootDomain) {
    // If not a root domain, treat it as a custom domain
    customDomain = host
  }

  // 3. Query Database
  let tenantRecord = null

  if (subdomain) {
    tenantRecord = await prisma.tenant.findUnique({
      where: { subdomain, deletedAt: null, status: 'active' },
    })
  } else if (customDomain) {
    tenantRecord = await prisma.tenant.findUnique({
      where: { customDomain, deletedAt: null, status: 'active' },
    })
  }

  // Development fallback: if no tenant resolved from hostname, fall back to first active tenant
  if (!tenantRecord && config.app.isDev) {
    tenantRecord = await prisma.tenant.findFirst({
      where: { deletedAt: null, status: 'active' },
    })
    if (tenantRecord) {
      logger.info(
        { fallbackTenant: tenantRecord.subdomain },
        'No tenant resolved from hostname; falling back to first active tenant in development mode'
      )
    }
  }

  if (!tenantRecord) {
    logger.warn({ hostname, subdomain, customDomain }, 'Tenant not found for hostname')
    throw new NotFoundError('Tenant')
  }

  const context: TenantContext = {
    id: tenantRecord.id,
    name: tenantRecord.name,
    subdomain: tenantRecord.subdomain,
    customDomain: tenantRecord.customDomain,
    plan: tenantRecord.plan,
    status: tenantRecord.status,
    config: (tenantRecord.configJson as Record<string, unknown>) ?? {},
  }

  // 4. Cache Result
  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(context), 'EX', CACHE_TTL)
    } catch (err) {
      logger.warn({ err, hostname }, 'Redis set failed in tenant resolver')
    }
  }

  return context
}
