/**
 * Email message payload — what consumers pass to the email provider.
 */
export interface EmailMessage {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML body content */
  html: string;
  /** Plain text fallback (optional) */
  text?: string;
  /** Reply-to address (optional) */
  replyTo?: string;
}

/**
 * Result from sending an email.
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email provider interface — implemented by Resend and Console providers.
 */
export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}
