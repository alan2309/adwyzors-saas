import { config } from '@adwyzors/config'
import pino from 'pino'
import pretty from 'pino-pretty'

/**
 * Application-wide structured logger.
 *
 * - Development: human-readable pretty output via pino-pretty
 * - Production: structured JSON output (consumed by log aggregators)
 *
 * Sensitive fields are redacted and will never appear in logs.
 */
const pinoOptions: pino.LoggerOptions = {
  level: config.app.logLevel,
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'authorization',
      'cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  base: {
    service: 'adwyzors-erp',
    version: '0.1.0',
    env: config.app.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}

const prettyStream = config.app.isDev
  ? pretty({
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
    })
  : undefined

export const logger = pino(pinoOptions, prettyStream)

/**
 * Creates a child logger with additional context bound to every log line.
 * Use this in request handlers to bind tenantId, userId, requestId.
 *
 * @example
 * const log = childLogger({ tenantId, userId, requestId })
 * log.info({ action: 'user.login' }, 'User signed in')
 */
export function childLogger(context: Record<string, string | number | boolean | undefined>) {
  return logger.child(context)
}

export type Logger = typeof logger
export type ChildLogger = ReturnType<typeof childLogger>
