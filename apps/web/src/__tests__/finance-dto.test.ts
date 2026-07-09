import { z } from "zod";

const createJournalDto = z.object({
  date: z.string().datetime(),
  description: z.string().min(2).max(500),
  reference: z.string().optional(),
  lines: z.array(z.object({
    accountId: z.string().min(1),
    debit: z.number().min(0).default(0),
    credit: z.number().min(0).default(0),
    narration: z.string().optional(),
  })).min(2, "At least 2 lines required"),
});

const createAccountDto = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(2).max(200),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  parentId: z.string().optional(),
});

describe("Account DTO", () => {
  it("accepts valid account", () => {
    const r = createAccountDto.safeParse({ code: "1001", name: "Cash in Hand", type: "asset" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const r = createAccountDto.safeParse({ code: "1001", name: "Test", type: "income" });
    expect(r.success).toBe(false);
  });

  it("accepts all 5 account types", () => {
    for (const type of ["asset", "liability", "equity", "revenue", "expense"]) {
      expect(createAccountDto.safeParse({ code: "X", name: "Test", type }).success).toBe(true);
    }
  });
});

describe("Journal Entry DTO", () => {
  it("accepts valid balanced entry", () => {
    const r = createJournalDto.safeParse({
      date: "2025-03-01T00:00:00.000Z",
      description: "Cash sale",
      lines: [
        { accountId: "acc-cash", debit: 1000, credit: 0 },
        { accountId: "acc-revenue", debit: 0, credit: 1000 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects entry with fewer than 2 lines", () => {
    const r = createJournalDto.safeParse({
      date: "2025-03-01T00:00:00.000Z",
      description: "Single line",
      lines: [{ accountId: "acc-1", debit: 100, credit: 0 }],
    });
    expect(r.success).toBe(false);
  });
});

describe("Double-entry validation logic", () => {
  function validateDoubleEntry(lines: { debit: number; credit: number }[]): { valid: boolean; error?: string } {
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { valid: false, error: `Debits (${totalDebit}) != Credits (${totalCredit})` };
    }
    for (const line of lines) {
      if (line.debit === 0 && line.credit === 0) return { valid: false, error: "Empty line" };
      if (line.debit > 0 && line.credit > 0) return { valid: false, error: "Both debit and credit on same line" };
    }
    return { valid: true };
  }

  it("valid: debits = credits", () => {
    expect(validateDoubleEntry([{ debit: 5000, credit: 0 }, { debit: 0, credit: 5000 }]).valid).toBe(true);
  });

  it("valid: multi-line entry", () => {
    expect(validateDoubleEntry([
      { debit: 3000, credit: 0 },
      { debit: 2000, credit: 0 },
      { debit: 0, credit: 5000 },
    ]).valid).toBe(true);
  });

  it("invalid: debits != credits", () => {
    expect(validateDoubleEntry([{ debit: 1000, credit: 0 }, { debit: 0, credit: 999 }]).valid).toBe(false);
  });

  it("invalid: line with both debit and credit", () => {
    expect(validateDoubleEntry([{ debit: 500, credit: 500 }]).valid).toBe(false);
  });

  it("invalid: line with zero debit and zero credit", () => {
    expect(validateDoubleEntry([{ debit: 1000, credit: 0 }, { debit: 0, credit: 0 }]).valid).toBe(false);
  });

  it("handles decimal precision (rounding tolerance 0.01)", () => {
    expect(validateDoubleEntry([{ debit: 33.33, credit: 0 }, { debit: 33.33, credit: 0 }, { debit: 33.34, credit: 0 }, { debit: 0, credit: 100 }]).valid).toBe(true);
  });
});
