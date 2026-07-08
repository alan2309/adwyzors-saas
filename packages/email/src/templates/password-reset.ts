import { emailLayout } from "./layout.js";
import type { EmailMessage } from "../types.js";

export interface PasswordResetEmailData {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

/**
 * Password reset email — sent when a user requests a password reset.
 */
export function buildPasswordResetEmail(data: PasswordResetEmailData): EmailMessage {
  const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#18181b;">Reset Your Password</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
      Hi ${data.name},
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
      We received a request to reset your password. Click the button below to choose a new one. This link expires in ${data.expiresInMinutes} minutes.
    </p>
    <a href="${data.resetUrl}" style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
      Reset Password
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      If you did not request this, you can safely ignore this email. Your password will not change.
    </p>
    <p style="margin:12px 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      Link: <a href="${data.resetUrl}" style="color:#2563eb;word-break:break-all;">${data.resetUrl}</a>
    </p>
  `;

  return {
    to: data.to,
    subject: "Reset your Adwyzors password",
    html: emailLayout(content),
    text: `Hi ${data.name}, reset your password here: ${data.resetUrl} (expires in ${data.expiresInMinutes} minutes)`,
  };
}
