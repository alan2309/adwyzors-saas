import { prisma } from "@adwyzors/database";
import { logger } from "@adwyzors/logger";
import type {
  CreateNotificationInput,
  ListNotificationsOptions,
  NotificationCounts,
} from "./types.js";

/**
 * Creates a new in-app notification for a user.
 * Non-blocking — catches its own errors to avoid breaking caller flows.
 *
 * @example
 * await createNotification({
 *   tenantId: "t-1",
 *   userId: "u-1",
 *   type: "user.invited",
 *   title: "New team member joined",
 *   body: "John Doe has joined your workspace",
 *   link: "/settings/users",
 * });
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<string | null> {
  try {
    const notification = await prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });

    logger.info(
      {
        notificationId: notification.id,
        userId: input.userId,
        type: input.type,
      },
      "Notification created"
    );

    return notification.id;
  } catch (error) {
    logger.error(
      { userId: input.userId, type: input.type, error },
      "Failed to create notification"
    );
    return null;
  }
}

/**
 * Lists notifications for a user with optional filtering and cursor pagination.
 */
export async function listNotifications(options: ListNotificationsOptions) {
  const { tenantId, userId, unreadOnly = false, limit = 20, cursor } = options;

  const where: Record<string, unknown> = { tenantId, userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    take: limit + 1, // Fetch one extra to determine hasMore
    orderBy: { createdAt: "desc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  return { items, hasMore, nextCursor };
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return true;
  } catch (error) {
    logger.error(
      { notificationId, userId, error },
      "Failed to mark notification as read"
    );
    return false;
  }
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsRead(
  tenantId: string,
  userId: string
): Promise<number> {
  try {
    const result = await prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  } catch (error) {
    logger.error(
      { tenantId, userId, error },
      "Failed to mark all notifications as read"
    );
    return 0;
  }
}

/**
 * Gets notification counts (total + unread) for a user.
 */
export async function getNotificationCounts(
  tenantId: string,
  userId: string
): Promise<NotificationCounts> {
  const [total, unread] = await Promise.all([
    prisma.notification.count({ where: { tenantId, userId } }),
    prisma.notification.count({ where: { tenantId, userId, isRead: false } }),
  ]);
  return { total, unread };
}
