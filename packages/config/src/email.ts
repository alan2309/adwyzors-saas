import { env } from './env.js'

export const emailConfig = {
  provider: env.EMAIL_PROVIDER,
  from: env.EMAIL_FROM,
  resendApiKey: env.RESEND_API_KEY,
  isConsole: env.EMAIL_PROVIDER === 'console',
} as const

export type EmailConfig = typeof emailConfig
