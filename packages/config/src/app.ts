import { env } from './env.js'

export const appConfig = {
  nodeEnv: env.NODE_ENV,
  appUrl: env.NEXT_PUBLIC_APP_URL,
  port: parseInt(env.PORT, 10),
  logLevel: env.LOG_LEVEL,
  sentryDsn: env.SENTRY_DSN,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const

export type AppConfig = typeof appConfig
