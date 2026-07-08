import { emailQueue, pdfQueue, importQueue, exportQueue } from "./queues.js";
import type { EmailJobData, PdfJobData, ImportJobData, ExportJobData } from "./types.js";

/**
 * Enqueue an email job.
 *
 * @example
 * await enqueueEmail("password-reset", "user@example.com", {
 *   name: "John",
 *   resetUrl: "https://...",
 *   expiresInMinutes: 60,
 * });
 */
export async function enqueueEmail(
  template: string,
  to: string,
  payload: Record<string, unknown>
): Promise<string | undefined> {
  const job = await emailQueue.add(`email.${template}`, {
    template,
    to,
    payload,
  } satisfies EmailJobData);
  return job.id;
}

/**
 * Enqueue a PDF generation job.
 */
export async function enqueuePdf(data: PdfJobData): Promise<string | undefined> {
  const job = await pdfQueue.add(`pdf.${data.entityType}`, data);
  return job.id;
}

/**
 * Enqueue an import job.
 */
export async function enqueueImport(data: ImportJobData): Promise<string | undefined> {
  const job = await importQueue.add(`import.${data.entityType}`, data);
  return job.id;
}

/**
 * Enqueue an export job.
 */
export async function enqueueExport(data: ExportJobData): Promise<string | undefined> {
  const job = await exportQueue.add(`export.${data.entityType}`, data);
  return job.id;
}
