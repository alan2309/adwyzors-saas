import { emailLayout } from "./layout.js";
import type { EmailMessage } from "../types.js";

export interface WelcomeEmailData {
  to: string;
  name: string;
  tenantName: string;
  loginUrl: string;
}

/**
 * Welcome email — sent when a new user is invited to a tenant.
 */
export function buildWelcomeEmail(data: WelcomeEmailData): EmailMessage {
  const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#18181b;">Welcome to ${data.tenantName}</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
      Hi ${data.name},
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
      You have been invited to join <strong>${data.tenantName}</strong> on Adwyzors ERP. Click the button below to set up your password and get started.
    </p>
    <a href="${data.loginUrl}" style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
      Set Up Your Account
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      If the button does not work, copy and paste this URL into your browser:<br/>
      <a href="${data.loginUrl}" style="color:#2563eb;word-break:break-all;">${data.loginUrl}</a>
    </p>
  `;

  return {
    to: data.to,
    subject: `You're invited to ${data.tenantName} on Adwyzors`,
    html: emailLayout(content),
    text: `Hi ${data.name}, you've been invited to ${data.tenantName}. Visit ${data.loginUrl} to set up your account.`,
  };
}
