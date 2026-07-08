import { Worker } from "bullmq";
import { connection } from "@adwyzors/queue";
import { logger } from "@adwyzors/logger";
import type { PdfJobData } from "@adwyzors/queue";

/**
 * PDF document templates.
 * Each returns an HTML string that can be rendered to PDF.
 * In production, use Puppeteer/Playwright to convert HTML → PDF.
 * For now, we generate the HTML and log the output path.
 */
function buildPdfHtml(data: PdfJobData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${data.entityType} - ${data.entityId}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; }
    .meta { color: #666; font-size: 12px; }
    .content { margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
    th { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.entityType} Document</h1>
    <p class="meta">ID: ${data.entityId} | Tenant: ${data.tenantId} | Generated: ${new Date().toISOString()}</p>
  </div>
  <div class="content">
    <p>This is a placeholder PDF document for <strong>${data.template}</strong> template.</p>
    <p>In production, this HTML will be rendered to PDF using Puppeteer or Playwright.</p>
  </div>
</body>
</html>`;
}

export function startPdfWorker() {
  const pdfWorker = new Worker(
    "pdf",
    async (job) => {
      const data = job.data as PdfJobData;
      logger.info(
        { jobId: job.id, entityId: data.entityId, entityType: data.entityType, tenantId: data.tenantId },
        "Generating PDF document"
      );

      // Generate HTML content
      const html = buildPdfHtml(data);

      // TODO: Replace with actual PDF rendering:
      // import puppeteer from 'puppeteer'
      // const browser = await puppeteer.launch()
      // const page = await browser.newPage()
      // await page.setContent(html)
      // const pdfBuffer = await page.pdf({ format: 'A4' })
      // await browser.close()
      // Upload pdfBuffer via @adwyzors/storage

      // For now, simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 500));

      const outputPath = `/${data.tenantId}/${data.entityType}/${data.entityId}.pdf`;

      logger.info(
        { jobId: job.id, entityId: data.entityId, outputPath, htmlLength: html.length },
        "PDF generated successfully (HTML ready for rendering)"
      );

      return { success: true, url: outputPath, htmlLength: html.length };
    },
    { connection, concurrency: 2 }
  );

  pdfWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "PDF worker job failed");
  });

  logger.info("PDF worker registered (HTML-to-PDF)");
}
