"use server";

import { prisma } from "@adwyzors/database";
import { config } from "@adwyzors/config";
import { logger } from "@adwyzors/logger";
import crypto from "crypto";

/**
 * Handles the forgot-password form submission.
 * Generates a password reset token and logs the reset URL to the terminal.
 *
 * Security: Always returns success, even for non-existent emails (prevents enumeration).
 */
export async function forgotPasswordAction(
  _prevState: unknown,
  formData: FormData
) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email) {
    return { error: "Please enter your email address" };
  }

  try {
    // Look up user (soft-delete aware)
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null, status: "active" },
    });

    if (user) {
      // Generate cryptographically secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any existing unused tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          tenantId: user.tenantId,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });

      // Store the new token
      await prisma.passwordResetToken.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // In development: log the reset URL to the terminal
      const resetUrl = `${config.app.appUrl}/reset-password?token=${token}`;
      logger.info(
        {
          userId: user.id,
          email: user.email,
          resetUrl,
          expiresAt: expiresAt.toISOString(),
        },
        "Password reset token generated"
      );
    } else {
      // Timing-safe: do some work even if user not found
      logger.info({ email }, "Password reset requested for unknown email");
    }
  } catch (error) {
    logger.error({ email, error }, "Failed to process password reset request");
  }

  // Always return success — never reveal whether email exists
  return { success: true };
}
