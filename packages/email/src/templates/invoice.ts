import { emailLayout } from "./layout.js";
import type { EmailMessage } from "../types.js";

export interface InvoiceEmailData {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  dueDate: string;
  viewUrl: string;
  pdfUrl?: string;
}

/**
 * Invoice email — sent when an invoice is created or sent to a customer.
 */
export function buildInvoiceEmail(data: InvoiceEmailData): EmailMessage {
  const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#18181b;">Invoice ${data.invoiceNumber}</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
      Hi ${data.customerName},
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
      Please find below the details of your invoice.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px 6px 0 0;font-size:13px;color:#71717a;font-weight:600;">Invoice Number</td>
        <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px 6px 0 0;font-size:13px;color:#18181b;text-align:right;font-weight:600;">${data.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#71717a;">Amount Due</td>
        <td style="padding:12px 16px;font-size:16px;color:#18181b;text-align:right;font-weight:700;">${data.currency} ${data.amount}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#71717a;">Due Date</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#18181b;text-align:right;">${data.dueDate}</td>
      </tr>
    </table>
    <a href="${data.viewUrl}" style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
      View Invoice
    </a>
  `;

  return {
    to: data.to,
    subject: `Invoice ${data.invoiceNumber} — ${data.currency} ${data.amount}`,
    html: emailLayout(content),
    text: `Invoice ${data.invoiceNumber} for ${data.currency} ${data.amount}, due ${data.dueDate}. View: ${data.viewUrl}`,
  };
}
