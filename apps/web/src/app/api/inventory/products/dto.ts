import { z } from "zod";

export const createProductDto = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().optional(),
  unit: z.string().min(1).max(20),
  hsn: z.string().max(20).optional(),
  costPrice: z.number().min(0).optional(),
  sellPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
});

export const updateProductDto = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  unit: z.string().min(1).max(20).optional(),
  hsn: z.string().max(20).nullable().optional(),
  costPrice: z.number().min(0).nullable().optional(),
  sellPrice: z.number().min(0).nullable().optional(),
  taxRate: z.number().min(0).max(100).nullable().optional(),
  minStock: z.number().min(0).nullable().optional(),
  maxStock: z.number().min(0).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateProductDto = z.infer<typeof createProductDto>;
export type UpdateProductDto = z.infer<typeof updateProductDto>;
