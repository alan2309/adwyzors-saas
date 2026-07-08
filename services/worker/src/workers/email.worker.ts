import { Worker } from 'bullmq'
import { connection } from '../queues/index.js'
import { logger } from '@adwyzors/logger'

export function startEmailWorker() {
  const emailWorker = new Worker(
    'email',
    async (job) => {
      const { to, subject } = job.data as { to: string; subject: string; body: string }
      logger.info({ jobId: job.id, to, subject }, 'Processing email job')

      // TODO: Integrate email provider (Resend / Nodemailer / SES)
      await new Promise((resolve) => setTimeout(resolve, 500))

      logger.info({ jobId: job.id, to }, 'Email sent successfully')
      return { success: true }
    },
    { connection, concurrency: 5 }
  )

  emailWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Email worker job failed')
  })

  logger.info('Email worker registered')
}
