import { Queue } from 'bullmq'
import { config } from '@adwyzors/config'

/**
 * Shared BullMQ connection options.
 * We pass the URL string directly — BullMQ creates its own ioredis connection internally,
 * avoiding ioredis version conflicts with separately installed packages.
 */
const connection = { url: config.redis.url }

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
}

// Declare all standard BullMQ queues
export const emailQueue = new Queue('email', { connection, defaultJobOptions })
export const pdfQueue = new Queue('pdf', { connection, defaultJobOptions })
export const importQueue = new Queue('import', { connection, defaultJobOptions })
export const exportQueue = new Queue('export', { connection, defaultJobOptions })
export const automationQueue = new Queue('automation', { connection, defaultJobOptions })

export { connection }
