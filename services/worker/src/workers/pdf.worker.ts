import { Worker } from 'bullmq'
import { connection } from '../queues/index.js'
import { logger } from '@adwyzors/logger'

export function startPdfWorker() {
  const pdfWorker = new Worker(
    'pdf',
    async (job) => {
      const { entityId, entityType, tenantId } = job.data as {
        entityId: string
        entityType: string
        tenantId: string
      }
      logger.info({ jobId: job.id, entityId, entityType, tenantId }, 'Generating PDF document')

      // TODO: Integrate PDF generation (Puppeteer / PDFKit / Weasyprint)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      logger.info({ jobId: job.id, entityId }, 'PDF generated successfully')
      return { success: true, url: `/uploads/${tenantId}/invoices/${entityId}.pdf` }
    },
    { connection, concurrency: 2 }
  )

  pdfWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'PDF worker job failed')
  })

  logger.info('PDF worker registered')
}
