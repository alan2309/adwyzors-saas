import { prisma } from "@adwyzors/database";
import type { Prisma } from "@adwyzors/database";
import { logger } from "@adwyzors/logger";
import type { AuditLogInput } from "./types.js";

/**
 * Writes an immutable audit log entry to the database.
 *
 * This function is async and non-blocking — it catches its own errors
 * to prevent audit failures from breaking the main request flow.
 * Audit log writes should never cause a user-facing error.
 *
 * @example
 * await writeAuditLog({
 *   tenantId: session.tenantId,
 *   userId: session.userId,
 *   action: "user.created",
 *   entityType: "User",
 *   entityId: newUser.id,
 *   after: { email: newUser.email, name: newUser.name },
 * });
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };

    if (input.before != null) {
      data.before = input.before as Prisma.InputJsonValue;
    }
    if (input.after != null) {
      data.after = input.after as Prisma.InputJsonValue;
    }
    if (input.metadata != null) {
      data.metadata = input.metadata as Prisma.InputJsonValue;
    }

    await prisma.auditLog.create({ data });

    logger.info(
      {
        tenantId: input.tenantId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
      },
      "Audit log written"
    );
  } catch (error) {
    // Never let audit failures break the main flow
    logger.error(
      {
        error,
        tenantId: input.tenantId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
      },
      "Failed to write audit log"
    );
  }
}
