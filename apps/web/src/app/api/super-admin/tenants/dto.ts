import { z } from "zod";

export const createTenantDto = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(50)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Subdomain must be lowercase, alphanumeric, and may contain hyphens"
    ),
  plan: z.enum(["trial", "starter", "professional", "enterprise"]).default("trial"),
  customDomain: z.string().optional(),
});

export const updateTenantDto = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.enum(["trial", "starter", "professional", "enterprise"]).optional(),
  customDomain: z.string().nullable().optional(),
  configJson: z.record(z.unknown()).optional(),
});

export type CreateTenantDto = z.infer<typeof createTenantDto>;
export type UpdateTenantDto = z.infer<typeof updateTenantDto>;
