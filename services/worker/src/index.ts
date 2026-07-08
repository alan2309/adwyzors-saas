import { logger } from '@adwyzors/logger'
import { startEmailWorker } from './workers/email.worker.js'
import { startPdfWorker } from './workers/pdf.worker.js'

logger.info('Starting BullMQ background worker service...')

try {
  // Start individual queue workers
  startEmailWorker()
  startPdfWorker()

  logger.info('Background worker service started successfully')
} catch (err) {
  logger.fatal({ err }, 'Failed to start background worker service')
  process.exit(1)
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down workers gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down workers gracefully...')
  process.exit(0)
})
