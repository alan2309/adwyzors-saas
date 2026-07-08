import { Resend } from "resend";
import { config } from "@adwyzors/config";
import { logger } from "@adwyzors/logger";
import type { EmailMessage, EmailProvider, EmailResult } from "../types.js";

/**
 * Resend email provider — sends real emails via Resend API.
 * Requires RESEND_API_KEY to be set in environment.
 */
export class ResendEmailProvider implements EmailProvider {
  private client: Resend;

  constructor() {
    const apiKey = config.email.resendApiKey;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is required when EMAIL_PROVIDER=resend"
      );
    }
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const options: {
        from: string;
        to: string;
        subject: string;
        html: string;
        text?: string;
        replyTo?: string;
      } = {
        from: config.email.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
      };
      if (message.text) options.text = message.text;
      if (message.replyTo) options.replyTo = message.replyTo;

      const response = await this.client.emails.send(options);

      if (response.error) {
        logger.error(
          { to: message.to, error: response.error },
          "Resend email send failed"
        );
        return {
          success: false,
          error: response.error.message,
        };
      }

      logger.info(
        { messageId: response.data?.id, to: message.to },
        "Email sent via Resend"
      );

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(
        { to: message.to, error: errMsg },
        "Resend email send threw"
      );
      return { success: false, error: errMsg };
    }
  }
}
