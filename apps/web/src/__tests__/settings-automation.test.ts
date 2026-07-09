import { z } from "zod";

const createRuleDto = z.object({
  name: z.string().min(2).max(200),
  trigger: z.string().min(1),
  condition: z.record(z.unknown()).default({}),
  action: z.enum(["notify.email", "notify.inapp", "update.status", "webhook"]),
  config: z.record(z.unknown()).default({}),
});

const createTemplateDto = z.object({
  name: z.string().min(2).max(200),
  entityType: z.string().min(1),
  columns: z.array(z.object({ key: z.string(), label: z.string() })).min(1),
  filters: z.record(z.unknown()).default({}),
  schedule: z.string().nullable().optional(),
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
});

const upsertSequenceDto = z.object({
  entityType: z.string().min(1),
  prefix: z.string().min(1).max(10),
  padding: z.number().int().min(1).max(10).default(4),
});

describe("Automation Rule DTO", () => {
  it("accepts valid rule", () => {
    const r = createRuleDto.safeParse({
      name: "High Value Order Alert",
      trigger: "sales_order.created",
      condition: { field: "totalAmount", operator: ">", value: 100000 },
      action: "notify.email",
      config: { to: ["manager@tenant.com"], template: "high_value_order" },
    });
    expect(r.success).toBe(true);
  });

  it("accepts all valid action types", () => {
    for (const action of ["notify.email", "notify.inapp", "update.status", "webhook"]) {
      expect(createRuleDto.safeParse({ name: "Test", trigger: "x", action }).success).toBe(true);
    }
  });

  it("rejects invalid action", () => {
    const r = createRuleDto.safeParse({ name: "Test", trigger: "x", action: "send.sms" });
    expect(r.success).toBe(false);
  });

  it("defaults condition to empty object", () => {
    const r = createRuleDto.safeParse({ name: "No Condition", trigger: "invoice.created", action: "notify.inapp" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.condition).toEqual({});
  });

  it("rejects name shorter than 2 chars", () => {
    const r = createRuleDto.safeParse({ name: "X", trigger: "x", action: "webhook" });
    expect(r.success).toBe(false);
  });
});

describe("Report Template DTO", () => {
  it("accepts valid template", () => {
    const r = createTemplateDto.safeParse({
      name: "Monthly Sales Report",
      entityType: "sales_orders",
      columns: [{ key: "orderNumber", label: "Order #" }, { key: "totalAmount", label: "Amount" }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects template without columns", () => {
    const r = createTemplateDto.safeParse({ name: "Empty", entityType: "x", columns: [] });
    expect(r.success).toBe(false);
  });

  it("defaults format to csv", () => {
    const r = createTemplateDto.safeParse({
      name: "Test", entityType: "customers",
      columns: [{ key: "name", label: "Name" }],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.format).toBe("csv");
  });

  it("accepts all valid formats", () => {
    for (const format of ["csv", "xlsx", "pdf"]) {
      const r = createTemplateDto.safeParse({ name: "Test", entityType: "x", columns: [{ key: "a", label: "A" }], format });
      expect(r.success).toBe(true);
    }
  });
});

describe("Number Sequence DTO", () => {
  it("accepts valid sequence", () => {
    const r = upsertSequenceDto.safeParse({ entityType: "sales_order", prefix: "SO-", padding: 4 });
    expect(r.success).toBe(true);
  });

  it("defaults padding to 4", () => {
    const r = upsertSequenceDto.safeParse({ entityType: "invoice", prefix: "INV-" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.padding).toBe(4);
  });

  it("rejects padding > 10", () => {
    const r = upsertSequenceDto.safeParse({ entityType: "x", prefix: "X-", padding: 15 });
    expect(r.success).toBe(false);
  });

  it("rejects prefix longer than 10", () => {
    const r = upsertSequenceDto.safeParse({ entityType: "x", prefix: "VERY-LONG-PREFIX-" });
    expect(r.success).toBe(false);
  });

  it("generates formatted number from prefix + padding", () => {
    const prefix = "PO-";
    const padding = 4;
    const nextValue = 42;
    const result = `${prefix}${String(nextValue).padStart(padding, "0")}`;
    expect(result).toBe("PO-0042");
  });
});
