import { z } from "zod";

export const createCustomerDto = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  type: z.enum(["individual", "business"]).default("business"),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format")
    .optional(),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
    .optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTerms: z.number().int().min(0).max(365).optional(),
});

export const updateCustomerDto = z.object({
  name: z.string().min(2).max(200).optional(),
  type: z.enum(["individual", "business"]).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .nullable()
    .optional(),
  gstin: z.string().nullable().optional(),
  pan: z.string().nullable().optional(),
  creditLimit: z.number().min(0).nullable().optional(),
  paymentTerms: z.number().int().min(0).max(365).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateCustomerDto = z.infer<typeof createCustomerDto>;
export type UpdateCustomerDto = z.infer<typeof updateCustomerDto>;
