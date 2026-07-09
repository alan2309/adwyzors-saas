import { z } from "zod";

const createBOMDto = z.object({
  productId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    scrap: z.number().min(0).max(100).default(0),
  })).min(1, "At least one component required"),
});

const createProdOrderDto = z.object({
  productId: z.string().min(1),
  bomId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().positive(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
  notes: z.string().optional(),
});

describe("BOM DTO", () => {
  it("accepts valid BOM with items", () => {
    const result = createBOMDto.safeParse({
      productId: "finished-good-1",
      items: [
        { productId: "raw-1", quantity: 2.5, unit: "meters" },
        { productId: "raw-2", quantity: 10, unit: "pcs", scrap: 5 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects BOM without items", () => {
    const result = createBOMDto.safeParse({ productId: "p-1", items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects item with zero quantity", () => {
    const result = createBOMDto.safeParse({
      productId: "p-1",
      items: [{ productId: "raw-1", quantity: 0, unit: "pcs" }],
    });
    expect(result.success).toBe(false);
  });

  it("defaults scrap to 0", () => {
    const result = createBOMDto.safeParse({
      productId: "p-1",
      items: [{ productId: "raw-1", quantity: 5, unit: "kg" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.items[0]?.scrap).toBe(0);
  });

  it("rejects scrap > 100%", () => {
    const result = createBOMDto.safeParse({
      productId: "p-1",
      items: [{ productId: "raw-1", quantity: 5, unit: "kg", scrap: 150 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("Production Order DTO", () => {
  it("accepts valid production order", () => {
    const result = createProdOrderDto.safeParse({
      productId: "p-1",
      bomId: "bom-1",
      warehouseId: "wh-1",
      quantity: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = createProdOrderDto.safeParse({
      productId: "p-1", bomId: "bom-1", warehouseId: "wh-1", quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing bomId", () => {
    const result = createProdOrderDto.safeParse({
      productId: "p-1", bomId: "", warehouseId: "wh-1", quantity: 50,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional planned dates", () => {
    const result = createProdOrderDto.safeParse({
      productId: "p-1", bomId: "bom-1", warehouseId: "wh-1", quantity: 200,
      plannedStart: "2025-03-01T08:00:00.000Z",
      plannedEnd: "2025-03-05T18:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("Material consumption calculation", () => {
  it("calculates required qty with scrap: qty * bomQty * (1 + scrap/100)", () => {
    const orderQty = 100;
    const bomItemQty = 2.5; // meters per unit
    const scrapPct = 5; // 5% scrap
    const required = orderQty * bomItemQty * (1 + scrapPct / 100);
    expect(required).toBe(262.5); // 100 * 2.5 * 1.05
  });

  it("zero scrap means exact quantity", () => {
    const required = 50 * 3 * (1 + 0 / 100);
    expect(required).toBe(150);
  });
});
