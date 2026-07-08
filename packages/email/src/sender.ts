import { config } from "@adwyzors/config";
import { logger } from "@adwyzors/logger";
import type { EmailMessage, EmailProvider, EmailResult } from "./types.js";
import { ConsoleEmailProvider } from "./providers/console.js";
import { ResendEmailProvider } from "./providers/resend.js";

/**
 * Singleton email provider instance.
 * Provider selection is based on EMAIL_PROVIDER env var.
 */
let provider: EmailProvider | null = null;

function getProvider(): EmailProvider {
  if (!provider) {
    if (config.email.provider === "resend") {
      provider = new ResendEmailProvider();
      logger.info("Email provider initialized: Resend");
    } else {
      provider = new ConsoleEmailProvider();
      logger.info("Email provider initialized: Console (dev mode)");
    }
  }
  return provider;
}

/**
 * Send an email using the configured provider.
 * Non-blocking — catches errors and returns result.
 *
 * @example
 * const result = await sendEmail({
 *   to: "user@example.com",
 *   subject: "Welcome to Adwyzors",
 *   html: "<h1>Welcome!</h1>",
 * });
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  try {
    return await getProvider().send(message);
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Unknown email error";
    logger.error({ to: message.to, error: errMsg }, "sendEmail failed");
    return { success: false, error: errMsg };
  }
}

/**
 * Reset provider (used in tests).
 */
export function resetEmailProvider(): void {
  provider = null;
}
