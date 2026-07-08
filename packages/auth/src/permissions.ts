import { prisma } from "@adwyzors/database";

/**
 * Resolves the flat list of permission keys for a given user within a tenant.
 *
 * Follows the chain: User → UserRole → Role → RolePermission → Permission
 *
 * - SUPER_ADMIN role short-circuits and returns ["*"] (wildcard).
 *   The permissions checker treats SUPER_ADMIN as bypass regardless,
 *   but returning wildcard ensures callers can also detect it.
 * - Deduplicates permission keys when a user has multiple roles.
 * - Returns an empty array if the user has no assigned roles.
 *
 * @example
 * const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
 * requirePermission(session.user, permissions, PERMISSIONS.sales.order.create);
 */
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<string[]> {
  // Get user's roles in this tenant
  const userRoles = await prisma.userRole.findMany({
    where: { userId, tenantId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  // Check for SUPER_ADMIN — short-circuit
  const isSuperAdmin = userRoles.some(
    (ur) => ur.role.name === "SUPER_ADMIN" && ur.role.isSystem
  );
  if (isSuperAdmin) {
    return ["*"];
  }

  // Collect all permission keys, deduplicate
  const permissionSet = new Set<string>();
  for (const userRole of userRoles) {
    // Skip deleted/inactive roles
    if (userRole.role.deletedAt || userRole.role.status !== "active") {
      continue;
    }
    for (const rp of userRole.role.rolePermissions) {
      permissionSet.add(rp.permission.key);
    }
  }

  return Array.from(permissionSet);
}
