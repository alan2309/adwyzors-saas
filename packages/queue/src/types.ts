/**
 * Typed job payloads for each BullMQ queue.
 */

export interface EmailJobData {
  /** Template identifier: "welcome" | "password-reset" | "invoice" | "payment-reminder" */
  template: string;
  /** Recipient email */
  to: string;
  /** Template-specific data payload */
  payload: Record<string, unknown>;
}

export interface PdfJobData {
  tenantId: string;
  entityType: string;
  entityId: string;
  template: string;
}

export interface ImportJobData {
  tenantId: string;
  userId: string;
  entityType: string;
  fileUrl: string;
  fileName: string;
}

export interface ExportJobData {
  tenantId: string;
  userId: string;
  entityType: string;
  filters: Record<string, unknown>;
  format: "csv" | "xlsx";
}
