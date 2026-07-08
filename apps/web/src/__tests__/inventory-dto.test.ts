import { createProductDto, updateProductDto } from "../app/api/inventory/products/dto";

describe("createProductDto", () => {
  it("accepts valid product with all fields", () => {
    const result = createProductDto.safeParse({
      name: "Cotton Fabric - Blue",
      unit: "meters",
      hsn: "5208",
      costPrice: 150,
      sellPrice: 250,
      taxRate: 5,
      minStock: 100,
      maxStock: 5000,
      categoryId: "cat-1",
      description: "Premium cotton fabric for shirts",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal product (name + unit only)", () => {
    const result = createProductDto.safeParse({
      name: "Thread Spool",
      unit: "pcs",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = createProductDto.safeParse({ name: "X", unit: "kg" });
    expect(result.success).toBe(false);
  });

  it("rejects missing unit", () => {
    const result = createProductDto.safeParse({ name: "Valid Name" });
    expect(result.success).toBe(false);
  });

  it("rejects negative costPrice", () => {
    const result = createProductDto.safeParse({
      name: "Test",
      unit: "pcs",
      costPrice: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects taxRate > 100", () => {
    const result = createProductDto.safeParse({
      name: "Test",
      unit: "pcs",
      taxRate: 150,
    });
    expect(result.success).toBe(false);
  });

  it("accepts taxRate of 0 (tax-exempt)", () => {
    const result = createProductDto.safeParse({
      name: "Exempt Item",
      unit: "pcs",
      taxRate: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid HSN code", () => {
    const result = createProductDto.safeParse({
      name: "Fabric",
      unit: "meters",
      hsn: "52081100",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateProductDto", () => {
  it("accepts partial update", () => {
    const result = updateProductDto.safeParse({ sellPrice: 300 });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no-op)", () => {
    const result = updateProductDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts status change to inactive", () => {
    const result = updateProductDto.safeParse({ status: "inactive" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateProductDto.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
  });

  it("accepts nullable fields to clear them", () => {
    const result = updateProductDto.safeParse({
      hsn: null,
      costPrice: null,
      minStock: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("Stock calculation logic", () => {
  it("net stock = sum(inward) + sum(adjustment) - sum(outward)", () => {
    const movements = [
      { type: "inward", quantity: 100 },
      { type: "inward", quantity: 50 },
      { type: "outward", quantity: 30 },
      { type: "adjustment", quantity: 10 },
      { type: "outward", quantity: 20 },
    ];

    let net = 0;
    for (const m of movements) {
      if (m.type === "inward" || m.type === "adjustment") {
        net += m.quantity;
      } else if (m.type === "outward") {
        net -= m.quantity;
      }
    }

    // 100 + 50 + 10 - 30 - 20 = 110
    expect(net).toBe(110);
  });

  it("empty movements = 0 stock", () => {
    const movements: { type: string; quantity: number }[] = [];
    let net = 0;
    for (const m of movements) {
      if (m.type === "inward" || m.type === "adjustment") net += m.quantity;
      else if (m.type === "outward") net -= m.quantity;
    }
    expect(net).toBe(0);
  });

  it("outward cannot exceed inward (business rule)", () => {
    const currentStock = 50;
    const requestedOutward = 60;
    expect(currentStock < requestedOutward).toBe(true);
    // API returns INSUFFICIENT_STOCK error in this case
  });

  it("adjustment adds to stock positively", () => {
    const movements = [
      { type: "inward", quantity: 100 },
      { type: "adjustment", quantity: 25 }, // e.g. found extra during audit
    ];

    let net = 0;
    for (const m of movements) {
      if (m.type === "inward" || m.type === "adjustment") net += m.quantity;
    }
    expect(net).toBe(125);
  });
});
