/**
 * Input for writing an audit log entry.
 * Maps directly to the AuditLog Prisma model fields.
 */
export interface AuditLogInput {
  /** Tenant that owns this log entry */
  tenantId: string;
  /** User who performed the action (null for system actions) */
  userId?: string | null;
  /** Action performed, dot-notation e.g. "user.created", "tenant.suspended" */
  action: string;
  /** Entity type e.g. "User", "Tenant", "Role" */
  entityType: string;
  /** ID of the affected entity */
  entityId: string;
  /** State before mutation (for updates/deletes) */
  before?: Record<string, unknown> | null;
  /** State after mutation (for creates/updates) */
  after?: Record<string, unknown> | null;
  /** Client IP address */
  ipAddress?: string | null;
  /** Client user agent string */
  userAgent?: string | null;
  /** Additional context metadata */
  metadata?: Record<string, unknown> | null;
}

/**
 * Context available to the withAudit wrapper for auto-logging.
 */
export interface AuditContext {
  tenantId: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}
