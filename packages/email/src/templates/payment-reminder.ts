import { emailLayout } from "./layout.js";
import type { EmailMessage } from "../types.js";

export interface PaymentReminderEmailData {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  paymentUrl: string;
}

/**
 * Payment reminder email — sent when an invoice is overdue.
 */
export function buildPaymentReminderEmail(data: PaymentReminderEmailData): EmailMessage {
  const urgencyColor = data.daysOverdue > 30 ? "#dc2626" : "#f59e0b";

  const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#18181b;">Payment Reminder</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
      Hi ${data.customerName},
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
      This is a friendly reminder that invoice <strong>${data.invoiceNumber}</strong> is
      <span style="color:${urgencyColor};font-weight:600;">${data.daysOverdue} days overdue</span>.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;background-color:#fef2f2;border-radius:6px;font-size:13px;color:#71717a;">Amount Overdue</td>
        <td style="padding:12px 16px;background-color:#fef2f2;border-radius:6px;font-size:16px;color:#dc2626;text-align:right;font-weight:700;">${data.currency} ${data.amount}</td>
      </tr>
    </table>
    <p style="margin:0 0 24px;font-size:13px;color:#71717a;">
      Original due date: ${data.dueDate}
    </p>
    <a href="${data.paymentUrl}" style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
      Make Payment
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      If you have already made this payment, please disregard this reminder.
    </p>
  `;

  return {
    to: data.to,
    subject: `Payment Reminder: Invoice ${data.invoiceNumber} is ${data.daysOverdue} days overdue`,
    html: emailLayout(content),
    text: `Reminder: Invoice ${data.invoiceNumber} for ${data.currency} ${data.amount} is ${data.daysOverdue} days overdue (due ${data.dueDate}). Pay at: ${data.paymentUrl}`,
  };
}
