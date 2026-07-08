import { z } from "zod";

export const inviteUserDto = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  roleId: z.string().min(1, "Role is required"),
});

export const createRoleDto = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Role name must be uppercase with underscores"),
  description: z.string().max(200).optional(),
  permissionIds: z.array(z.string()).default([]),
});

export const updateRoleDto = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z][A-Z0-9_]*$/)
    .optional(),
  description: z.string().max(200).nullable().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export type InviteUserDto = z.infer<typeof inviteUserDto>;
export type CreateRoleDto = z.infer<typeof createRoleDto>;
export type UpdateRoleDto = z.infer<typeof updateRoleDto>;
