/**
 * @adwyzors/config
 *
 * Single export point for all application configuration.
 * Import this package everywhere instead of accessing process.env directly.
 *
 * @example
 * import { config } from "@adwyzors/config"
 * config.database.url   // ✅
 * process.env.DATABASE_URL  // ❌ ESLint will error
 */
import { appConfig } from './app.js'
import { authConfig } from './auth.js'
import { databaseConfig } from './database.js'
import { emailConfig } from './email.js'
import { redisConfig } from './redis.js'
import { storageConfig } from './storage.js'

export const config = {
  app: appConfig,
  database: databaseConfig,
  redis: redisConfig,
  auth: authConfig,
  storage: storageConfig,
  email: emailConfig,
} as const

export type Config = typeof config

// Re-export individual configs and types for direct access
export { appConfig, authConfig, databaseConfig, emailConfig, redisConfig, storageConfig }
export type { AppConfig } from './app.js'
export type { AuthConfig } from './auth.js'
export type { DatabaseConfig } from './database.js'
export type { EmailConfig } from './email.js'
export type { RedisConfig } from './redis.js'
export type { StorageConfig } from './storage.js'
export type { Env } from './env.js'
