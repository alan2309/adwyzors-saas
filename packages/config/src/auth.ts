import { env } from './env.js'

export const authConfig = {
  secret: env.AUTH_SECRET,
  url: env.AUTH_URL,
  sessionMaxAge: 30 * 24 * 60 * 60, // 30 days in seconds
} as const

export type AuthConfig = typeof authConfig
