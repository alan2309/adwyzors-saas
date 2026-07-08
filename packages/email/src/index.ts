export { sendEmail, resetEmailProvider } from "./sender.js";
export type { EmailMessage, EmailResult, EmailProvider } from "./types.js";
export { ConsoleEmailProvider } from "./providers/console.js";
export { ResendEmailProvider } from "./providers/resend.js";
export {
  emailLayout,
  buildWelcomeEmail,
  buildPasswordResetEmail,
  buildInvoiceEmail,
  buildPaymentReminderEmail,
} from "./templates/index.js";
export type {
  WelcomeEmailData,
  PasswordResetEmailData,
  InvoiceEmailData,
  PaymentReminderEmailData,
} from "./templates/index.js";
