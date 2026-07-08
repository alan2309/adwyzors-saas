/**
 * Environment variable validation.
 * This is the ONLY file in the entire codebase that reads process.env directly.
 * All other files must import from @adwyzors/config.
 *
 * If any required variable is missing, this throws at application startup
 * with a clear, actionable error message.
 */
import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),

  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection URL'),

  // Auth.js v5
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32'),
  AUTH_URL: z.string().url('AUTH_URL must be a valid URL (e.g. http://localhost:3000)'),

  // Storage
  STORAGE_PROVIDER: z.enum(['r2', 'local']).default('local'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),
  PORT: z.string().default('3000'),

  // Optional observability
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  SENTRY_DSN: z.string().url().optional(),

  // Email (optional — falls back to console logging in dev)
  EMAIL_PROVIDER: z.enum(['resend', 'console']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Adwyzors <no-reply@adwyzors.com>'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors

  console.error('\n❌ Invalid environment variables detected:\n')
  for (const [key, messages] of Object.entries(errors)) {
    console.error(`  ${key}: ${messages?.join(', ')}`)
  }
  console.error('\nCheck your .env.local file against .env.example\n')

  throw new Error('Invalid environment variables — application cannot start')
}

export const env = parsed.data

export type Env = typeof env
