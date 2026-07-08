/**
 * Input for creating a notification.
 */
export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Pagination options for listing notifications.
 */
export interface ListNotificationsOptions {
  tenantId: string;
  userId: string;
  unreadOnly?: boolean;
  limit?: number;
  cursor?: string;
}

/**
 * Notification count summary.
 */
export interface NotificationCounts {
  total: number;
  unread: number;
}
