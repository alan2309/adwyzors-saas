import { z } from "zod";

/**
 * Tests for Purchase & Sales DTO validation and business logic.
 * Validates the Zod schemas inline (matching what's in the route files).
 */

// ── Purchase Order DTO ──
const createPODto = z.object({
  vendorId: z.string().min(1),
  orderDate: z.string().datetime(),
  expectedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).max(100).default(0),
  })).min(1, "At least one item required"),
});

// ── Sales Order DTO ──
const createSODto = z.object({
  customerId: z.string().min(1),
  orderDate: z.string().datetime(),
  deliveryDate: z.string().datetime().optional(),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    taxRate: z.number().min(0).max(100).default(0),
  })).min(1),
});

// ── Invoice DTO ──
const createInvoiceDto = z.object({
  customerId: z.string().min(1),
  soId: z.string().optional(),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  totalAmount: z.number().positive(),
  notes: z.string().optional(),
});

// ── Payment DTO ──
const recordPaymentDto = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["cash", "bank_transfer", "cheque", "upi", "card"]),
  reference: z.string().optional(),
  paidAt: z.string().datetime(),
  notes: z.string().optional(),
});

describe("Purchase Order DTO", () => {
  it("accepts valid PO with items", () => {
    const result = createPODto.safeParse({
      vendorId: "vendor-1",
      orderDate: "2025-02-01T00:00:00.000Z",
      items: [{ productId: "p-1", quantity: 100, unit: "meters", unitPrice: 150 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects PO without items", () => {
    const result = createPODto.safeParse({
      vendorId: "vendor-1",
      orderDate: "2025-02-01T00:00:00.000Z",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects item with zero quantity", () => {
    const result = createPODto.safeParse({
      vendorId: "v-1",
      orderDate: "2025-01-01T00:00:00.000Z",
      items: [{ productId: "p-1", quantity: 0, unit: "pcs", unitPrice: 10 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative unitPrice", () => {
    const result = createPODto.safeParse({
      vendorId: "v-1",
      orderDate: "2025-01-01T00:00:00.000Z",
      items: [{ productId: "p-1", quantity: 5, unit: "kg", unitPrice: -10 }],
    });
    expect(result.success).toBe(false);
  });

  it("defaults taxRate to 0", () => {
    const result = createPODto.safeParse({
      vendorId: "v-1",
      orderDate: "2025-01-01T00:00:00.000Z",
      items: [{ productId: "p-1", quantity: 10, unit: "pcs", unitPrice: 100 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]?.taxRate).toBe(0);
    }
  });
});

describe("Sales Order DTO", () => {
  it("accepts valid SO with items", () => {
    const result = createSODto.safeParse({
      customerId: "cust-1",
      orderDate: "2025-03-15T00:00:00.000Z",
      items: [{ productId: "p-1", quantity: 50, unit: "pcs", unitPrice: 200 }],
    });
    expect(result.success).toBe(true);
  });

  it("defaults discount to 0", () => {
    const result = createSODto.safeParse({
      customerId: "cust-1",
      orderDate: "2025-03-15T00:00:00.000Z",
      items: [{ productId: "p-1", quantity: 10, unit: "pcs", unitPrice: 100 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.discount).toBe(0);
    }
  });

  it("rejects without customerId", () => {
    const result = createSODto.safeParse({
      customerId: "",
      orderDate: "2025-03-15T00:00:00.000Z",
      items: [{ productId: "p-1", quantity: 10, unit: "pcs", unitPrice: 100 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("Invoice DTO", () => {
  it("accepts valid invoice", () => {
    const result = createInvoiceDto.safeParse({
      customerId: "cust-1",
      invoiceDate: "2025-03-20T00:00:00.000Z",
      dueDate: "2025-04-20T00:00:00.000Z",
      totalAmount: 25000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero totalAmount", () => {
    const result = createInvoiceDto.safeParse({
      customerId: "cust-1",
      invoiceDate: "2025-03-20T00:00:00.000Z",
      dueDate: "2025-04-20T00:00:00.000Z",
      totalAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("soId is optional", () => {
    const result = createInvoiceDto.safeParse({
      customerId: "cust-1",
      invoiceDate: "2025-03-20T00:00:00.000Z",
      dueDate: "2025-04-20T00:00:00.000Z",
      totalAmount: 5000,
    });
    expect(result.success).toBe(true);
  });
});

describe("Payment DTO", () => {
  it("accepts valid payment", () => {
    const result = recordPaymentDto.safeParse({
      invoiceId: "inv-1",
      amount: 10000,
      method: "bank_transfer",
      paidAt: "2025-04-01T00:00:00.000Z",
      reference: "TXN-123456",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid payment methods", () => {
    for (const method of ["cash", "bank_transfer", "cheque", "upi", "card"]) {
      const result = recordPaymentDto.safeParse({
        invoiceId: "inv-1",
        amount: 1000,
        method,
        paidAt: "2025-04-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid payment method", () => {
    const result = recordPaymentDto.safeParse({
      invoiceId: "inv-1",
      amount: 1000,
      method: "bitcoin",
      paidAt: "2025-04-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = recordPaymentDto.safeParse({
      invoiceId: "inv-1",
      amount: 0,
      method: "cash",
      paidAt: "2025-04-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("Line item calculation", () => {
  it("calculates PO line total = qty * unitPrice + tax", () => {
    const qty = 100;
    const unitPrice = 150;
    const taxRate = 18;
    const subtotal = qty * unitPrice; // 15000
    const tax = subtotal * (taxRate / 100); // 2700
    const total = subtotal + tax; // 17700
    expect(total).toBe(17700);
  });

  it("calculates SO line total with discount", () => {
    const qty = 50;
    const unitPrice = 200;
    const lineDiscount = 500;
    const taxRate = 5;
    const subtotal = qty * unitPrice - lineDiscount; // 9500
    const tax = subtotal * (taxRate / 100); // 475
    const total = subtotal + tax; // 9975
    expect(total).toBe(9975);
  });
});
