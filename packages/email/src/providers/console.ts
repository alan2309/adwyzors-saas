import { logger } from "@adwyzors/logger";
import type { EmailMessage, EmailProvider, EmailResult } from "../types.js";

/**
 * Console email provider — logs emails to the terminal.
 * Used in development mode when no email service is configured.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailResult> {
    const id = `console_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    logger.info(
      {
        messageId: id,
        to: message.to,
        subject: message.subject,
        replyTo: message.replyTo,
      },
      "📧 Email sent (console provider)"
    );
    logger.info(
      { messageId: id, html: message.html.slice(0, 500) },
      "📧 Email body preview"
    );

    return { success: true, messageId: id };
  }
}
