"use server";

import { prisma } from "@adwyzors/database";
import { writeAuditLog } from "@adwyzors/audit";
import { logger } from "@adwyzors/logger";
import bcrypt from "bcryptjs";

/**
 * Handles the reset-password form submission.
 * Validates the token, hashes the new password, updates the user,
 * marks the token as used, and writes an audit log.
 */
export async function resetPasswordAction(
  _prevState: unknown,
  formData: FormData
) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) {
    return { error: "Invalid or missing reset token" };
  }

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  try {
    // Look up the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Validate: exists
    if (!resetToken) {
      logger.warn({ token: token.slice(0, 8) }, "Reset attempted with invalid token");
      return { error: "Invalid or expired reset link. Please request a new one." };
    }

    // Validate: not already used
    if (resetToken.usedAt) {
      logger.warn(
        { tokenId: resetToken.id, userId: resetToken.userId },
        "Reset attempted with already-used token"
      );
      return { error: "This reset link has already been used. Please request a new one." };
    }

    // Validate: not expired
    if (resetToken.expiresAt < new Date()) {
      logger.warn(
        { tokenId: resetToken.id, userId: resetToken.userId },
        "Reset attempted with expired token"
      );
      return { error: "This reset link has expired. Please request a new one." };
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, updatedAt: new Date() },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Write audit log
    await writeAuditLog({
      tenantId: resetToken.tenantId,
      userId: resetToken.userId,
      action: "user.password_reset",
      entityType: "User",
      entityId: resetToken.userId,
      metadata: { method: "reset_token" },
    });

    logger.info(
      { userId: resetToken.userId, email: resetToken.user.email },
      "Password reset successfully"
    );

    return { success: true };
  } catch (error) {
    logger.error({ error }, "Failed to process password reset");
    return { error: "Something went wrong. Please try again." };
  }
}
