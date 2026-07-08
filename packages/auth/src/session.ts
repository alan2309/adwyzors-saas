import { ForbiddenError, UnauthorizedError } from '@adwyzors/shared'

import { auth } from './config.js'

export type { Session } from './types.js'

/**
 * Gets the current session server-side. Returns null if not authenticated.
 * Use in Server Components and Route Handlers.
 */
export async function getServerSession() {
  return auth()
}

/**
 * Gets the current session and throws UnauthorizedError if not authenticated.
 * Use in protected Route Handlers and Server Actions.
 */
export async function requireSession() {
  const session = await auth()
  if (!session?.user.userId) {
    throw new UnauthorizedError('You must be signed in to access this resource')
  }
  return session
}

/**
 * Requires a specific role. Throws ForbiddenError if the user's role doesn't match.
 * For permission-level checks, use the permissions package instead.
 */
export async function requireRole(role: string) {
  const session = await requireSession()
  if (session.user.role !== role) {
    throw new ForbiddenError(`This action requires the ${role} role`)
  }
  return session
}

/**
 * Returns true if the current user is a SUPER_ADMIN.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth()
  return session?.user.role === 'SUPER_ADMIN'
}
