import { env } from './env.js'

export const databaseConfig = {
  url: env.DATABASE_URL,
} as const

export type DatabaseConfig = typeof databaseConfig
