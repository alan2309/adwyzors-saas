import { z } from "zod";

export const createContactDto = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  role: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
});

export const updateContactDto = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export type CreateContactDto = z.infer<typeof createContactDto>;
export type UpdateContactDto = z.infer<typeof updateContactDto>;
