import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@adwyzors/auth";
import {
  listNotifications,
  getNotificationCounts,
  markAllNotificationsRead,
} from "@adwyzors/notifications";
import { logger } from "@adwyzors/logger";
import { errorResponse } from "@adwyzors/shared";

/**
 * GET /api/notifications
 * Lists notifications for the current user.
 * Query params: unreadOnly (boolean), limit (number), cursor (string)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = request.nextUrl;

    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
      50
    );
    const cursor = searchParams.get("cursor") ?? undefined;

    const [result, counts] = await Promise.all([
      listNotifications({
        tenantId: session.user.tenantId,
        userId: session.user.userId,
        unreadOnly,
        limit,
        cursor,
      }),
      getNotificationCounts(session.user.tenantId, session.user.userId),
    ]);

    return NextResponse.json({
      success: true,
      data: result.items,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        unreadCount: counts.unread,
        totalCount: counts.total,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to list notifications");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}

/**
 * POST /api/notifications
 * Marks all notifications as read for the current user.
 * Body: { action: "markAllRead" }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body: unknown = await request.json();
    const action = (body as { action?: string }).action;

    if (action !== "markAllRead") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "action must be 'markAllRead'" },
        },
        { status: 400 }
      );
    }

    const count = await markAllNotificationsRead(
      session.user.tenantId,
      session.user.userId
    );

    logger.info(
      { userId: session.user.userId, markedCount: count },
      "All notifications marked as read"
    );

    return NextResponse.json({ success: true, data: { markedCount: count } });
  } catch (error) {
    logger.error({ error }, "Failed to mark all notifications as read");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
