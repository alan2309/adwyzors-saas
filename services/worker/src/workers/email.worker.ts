import { Worker } from "bullmq";
import { connection } from "@adwyzors/queue";
import { logger } from "@adwyzors/logger";
import {
  sendEmail,
  buildPasswordResetEmail,
  buildWelcomeEmail,
  buildInvoiceEmail,
  buildPaymentReminderEmail,
} from "@adwyzors/email";
import type { EmailJobData } from "@adwyzors/queue";
import type { EmailMessage } from "@adwyzors/email";

/**
 * Builds the appropriate email message based on the template name.
 */
function buildEmailFromTemplate(data: EmailJobData): EmailMessage | null {
  const { template, to, payload } = data;

  switch (template) {
    case "password-reset":
      return buildPasswordResetEmail({
        to,
        name: (payload.name as string) ?? "User",
        resetUrl: payload.resetUrl as string,
        expiresInMinutes: (payload.expiresInMinutes as number) ?? 60,
      });

    case "welcome":
      return buildWelcomeEmail({
        to,
        name: (payload.name as string) ?? "User",
        tenantName: (payload.tenantName as string) ?? "Adwyzors",
        loginUrl: payload.loginUrl as string,
      });

    case "invoice":
      return buildInvoiceEmail({
        to,
        customerName: (payload.customerName as string) ?? "Customer",
        invoiceNumber: payload.invoiceNumber as string,
        amount: payload.amount as string,
        currency: (payload.currency as string) ?? "INR",
        dueDate: payload.dueDate as string,
        viewUrl: payload.viewUrl as string,
      });

    case "payment-reminder":
      return buildPaymentReminderEmail({
        to,
        customerName: (payload.customerName as string) ?? "Customer",
        invoiceNumber: payload.invoiceNumber as string,
        amount: payload.amount as string,
        currency: (payload.currency as string) ?? "INR",
        dueDate: payload.dueDate as string,
        daysOverdue: (payload.daysOverdue as number) ?? 0,
        paymentUrl: payload.paymentUrl as string,
      });

    default:
      logger.warn({ template }, "Unknown email template requested");
      return null;
  }
}

export function startEmailWorker() {
  const emailWorker = new Worker(
    "email",
    async (job) => {
      const data = job.data as EmailJobData;
      logger.info(
        { jobId: job.id, template: data.template, to: data.to },
        "Processing email job"
      );

      const message = buildEmailFromTemplate(data);
      if (!message) {
        throw new Error(`Unknown email template: ${data.template}`);
      }

      const result = await sendEmail(message);

      if (!result.success) {
        throw new Error(`Email send failed: ${result.error ?? "unknown"}`);
      }

      logger.info(
        { jobId: job.id, messageId: result.messageId, to: data.to },
        "Email sent successfully"
      );

      return { success: true, messageId: result.messageId };
    },
    { connection, concurrency: 5 }
  );

  emailWorker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, template: (job?.data as EmailJobData)?.template, err },
      "Email worker job failed"
    );
  });

  emailWorker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, template: (job.data as EmailJobData).template },
      "Email worker job completed"
    );
  });

  logger.info("Email worker registered (template-based)");
}
