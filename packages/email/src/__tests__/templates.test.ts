import { buildWelcomeEmail } from "../templates/welcome";
import { buildPasswordResetEmail } from "../templates/password-reset";
import { buildInvoiceEmail } from "../templates/invoice";
import { buildPaymentReminderEmail } from "../templates/payment-reminder";

describe("Email Templates", () => {
  describe("buildWelcomeEmail", () => {
    const data = {
      to: "john@example.com",
      name: "John Doe",
      tenantName: "Maharaja Clothing",
      loginUrl: "https://app.adwyzors.com/setup?token=abc123",
    };

    it("returns correct recipient", () => {
      const result = buildWelcomeEmail(data);
      expect(result.to).toBe("john@example.com");
    });

    it("includes tenant name in subject", () => {
      const result = buildWelcomeEmail(data);
      expect(result.subject).toContain("Maharaja Clothing");
    });

    it("includes user name in HTML body", () => {
      const result = buildWelcomeEmail(data);
      expect(result.html).toContain("John Doe");
    });

    it("includes login URL in HTML body", () => {
      const result = buildWelcomeEmail(data);
      expect(result.html).toContain(data.loginUrl);
    });

    it("includes plain text fallback", () => {
      const result = buildWelcomeEmail(data);
      expect(result.text).toBeDefined();
      expect(result.text).toContain(data.loginUrl);
    });

    it("wraps content in HTML layout", () => {
      const result = buildWelcomeEmail(data);
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("Adwyzors");
    });
  });

  describe("buildPasswordResetEmail", () => {
    const data = {
      to: "user@example.com",
      name: "Jane",
      resetUrl: "https://app.adwyzors.com/reset-password?token=xyz789",
      expiresInMinutes: 60,
    };

    it("returns correct recipient", () => {
      const result = buildPasswordResetEmail(data);
      expect(result.to).toBe("user@example.com");
    });

    it("includes reset URL in HTML", () => {
      const result = buildPasswordResetEmail(data);
      expect(result.html).toContain(data.resetUrl);
    });

    it("mentions expiry time", () => {
      const result = buildPasswordResetEmail(data);
      expect(result.html).toContain("60 minutes");
    });

    it("has password-related subject", () => {
      const result = buildPasswordResetEmail(data);
      expect(result.subject.toLowerCase()).toContain("password");
    });
  });

  describe("buildInvoiceEmail", () => {
    const data = {
      to: "customer@example.com",
      customerName: "Acme Corp",
      invoiceNumber: "INV-2025-001",
      amount: "50,000",
      currency: "INR",
      dueDate: "2025-02-15",
      viewUrl: "https://app.adwyzors.com/invoices/inv-1",
    };

    it("includes invoice number in subject", () => {
      const result = buildInvoiceEmail(data);
      expect(result.subject).toContain("INV-2025-001");
    });

    it("includes amount and currency in HTML", () => {
      const result = buildInvoiceEmail(data);
      expect(result.html).toContain("INR");
      expect(result.html).toContain("50,000");
    });

    it("includes due date", () => {
      const result = buildInvoiceEmail(data);
      expect(result.html).toContain("2025-02-15");
    });

    it("includes view URL", () => {
      const result = buildInvoiceEmail(data);
      expect(result.html).toContain(data.viewUrl);
    });
  });

  describe("buildPaymentReminderEmail", () => {
    const data = {
      to: "customer@example.com",
      customerName: "Acme Corp",
      invoiceNumber: "INV-2025-001",
      amount: "50,000",
      currency: "INR",
      dueDate: "2025-01-01",
      daysOverdue: 15,
      paymentUrl: "https://app.adwyzors.com/pay/inv-1",
    };

    it("mentions days overdue", () => {
      const result = buildPaymentReminderEmail(data);
      expect(result.html).toContain("15 days overdue");
    });

    it("includes payment URL", () => {
      const result = buildPaymentReminderEmail(data);
      expect(result.html).toContain(data.paymentUrl);
    });

    it("includes invoice number in subject", () => {
      const result = buildPaymentReminderEmail(data);
      expect(result.subject).toContain("INV-2025-001");
    });

    it("uses warning color for <30 days overdue", () => {
      const result = buildPaymentReminderEmail(data);
      expect(result.html).toContain("#f59e0b"); // warning amber
    });

    it("uses danger color for >30 days overdue", () => {
      const result = buildPaymentReminderEmail({ ...data, daysOverdue: 45 });
      expect(result.html).toContain("#dc2626"); // destructive red
    });
  });
});
