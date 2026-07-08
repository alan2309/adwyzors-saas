import { logger } from "@adwyzors/logger";
import { writeAuditLog } from "./logger.js";
import type { AuditContext, AuditLogInput } from "./types.js";

type AuditEntry = Pick<AuditLogInput, "action" | "entityType" | "entityId"> & {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Wraps an async handler function to automatically write an audit log
 * on successful completion.
 *
 * The handler receives a `log` callback that it must call with the
 * audit details (action, entityType, entityId, before/after).
 * If the handler throws, the error is re-thrown (no audit log for failures).
 *
 * @example
 * const result = await withAudit(
 *   { tenantId, userId, ipAddress },
 *   async (log) => {
 *     const user = await createUser(data);
 *     log({
 *       action: "user.created",
 *       entityType: "User",
 *       entityId: user.id,
 *       after: { email: user.email },
 *     });
 *     return user;
 *   }
 * );
 */
export async function withAudit<T>(
  context: AuditContext,
  handler: (log: (entry: AuditEntry) => void) => Promise<T>
): Promise<T> {
  let pendingLog: AuditEntry | null = null;

  const log = (entry: AuditEntry) => {
    pendingLog = entry;
  };

  try {
    const result = await handler(log);

    // Write audit log after successful execution
    if (pendingLog !== null) {
      const entry = pendingLog as AuditEntry;
      const auditInput: AuditLogInput = {
        tenantId: context.tenantId,
        userId: context.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
      };
      if (entry.before != null) auditInput.before = entry.before;
      if (entry.after != null) auditInput.after = entry.after;
      if (entry.metadata != null) auditInput.metadata = entry.metadata;
      if (context.ipAddress != null) auditInput.ipAddress = context.ipAddress;
      if (context.userAgent != null) auditInput.userAgent = context.userAgent;

      await writeAuditLog(auditInput);
    }

    return result;
  } catch (error) {
    // Log the failure context but re-throw — no audit entry for failed ops
    const entry = pendingLog as AuditEntry | null;
    logger.error(
      {
        tenantId: context.tenantId,
        userId: context.userId,
        action: entry?.action ?? "unknown",
        error,
      },
      "Handler failed in withAudit wrapper"
    );
    throw error;
  }
}
