import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@adwyzors/auth";
import { markNotificationRead } from "@adwyzors/notifications";
import { logger } from "@adwyzors/logger";
import { errorResponse } from "@adwyzors/shared";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/notifications/[id]/read
 * Marks a single notification as read.
 */
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const success = await markNotificationRead(id, session.user.userId);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Notification not found or already read" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to mark notification as read");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
