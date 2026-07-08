import { ForbiddenError } from '@adwyzors/shared'
import type { PermissionKey } from './keys.js'

interface SessionUser {
  role: string
  userId: string
  tenantId: string
}

/**
 * Checks if a user has a specific permission.
 *
 * - SUPER_ADMIN bypasses all checks.
 * - Otherwise, matches the required permission against the user's granted permissions array.
 */
export function hasPermission(
  user: SessionUser,
  grantedPermissions: string[],
  requiredPermission: PermissionKey,
): boolean {
  if (user.role === 'SUPER_ADMIN') {
    return true
  }
  return grantedPermissions.includes(requiredPermission)
}

/**
 * Asserts that a user has a specific permission. Throws ForbiddenError if not.
 */
export function requirePermission(
  user: SessionUser,
  grantedPermissions: string[],
  requiredPermission: PermissionKey,
): void {
  if (!hasPermission(user, grantedPermissions, requiredPermission)) {
    throw new ForbiddenError(`You do not have permission: ${requiredPermission}`)
  }
}
