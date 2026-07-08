import {
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationCounts,
} from "../engine";

// Mock Prisma
const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockUpdateMany = jest.fn();
const mockCount = jest.fn();

jest.mock("@adwyzors/database", () => ({
  prisma: {
    notification: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

jest.mock("@adwyzors/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

describe("Notification Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createNotification", () => {
    it("creates a notification and returns the ID", async () => {
      mockCreate.mockResolvedValue({ id: "notif-1" });

      const id = await createNotification({
        tenantId: "t-1",
        userId: "u-1",
        type: "user.invited",
        title: "New member joined",
      });

      expect(id).toBe("notif-1");
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it("passes body and link when provided", async () => {
      mockCreate.mockResolvedValue({ id: "notif-2" });

      await createNotification({
        tenantId: "t-1",
        userId: "u-1",
        type: "invoice.overdue",
        title: "Invoice overdue",
        body: "INV-001 is 5 days overdue",
        link: "/invoices/inv-001",
      });

      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.body).toBe("INV-001 is 5 days overdue");
      expect(callData.link).toBe("/invoices/inv-001");
    });

    it("returns null on database error (non-blocking)", async () => {
      mockCreate.mockRejectedValue(new Error("DB error"));

      const id = await createNotification({
        tenantId: "t-1",
        userId: "u-1",
        type: "test",
        title: "Test",
      });

      expect(id).toBeNull();
    });
  });

  describe("listNotifications", () => {
    it("returns items with cursor pagination", async () => {
      const mockItems = [
        { id: "n-1", title: "First" },
        { id: "n-2", title: "Second" },
      ];
      mockFindMany.mockResolvedValue(mockItems);

      const result = await listNotifications({
        tenantId: "t-1",
        userId: "u-1",
        limit: 20,
      });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it("detects hasMore when results exceed limit", async () => {
      const items = Array.from({ length: 6 }, (_, i) => ({ id: `n-${i}` }));
      mockFindMany.mockResolvedValue(items);

      const result = await listNotifications({
        tenantId: "t-1",
        userId: "u-1",
        limit: 5,
      });

      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe("n-4");
    });

    it("filters by unreadOnly when set", async () => {
      mockFindMany.mockResolvedValue([]);

      await listNotifications({
        tenantId: "t-1",
        userId: "u-1",
        unreadOnly: true,
      });

      const callArg = mockFindMany.mock.calls[0][0];
      expect(callArg.where.isRead).toBe(false);
    });
  });

  describe("markNotificationRead", () => {
    it("updates the notification and returns true", async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });

      const result = await markNotificationRead("notif-1", "u-1");

      expect(result).toBe(true);
      const callWhere = mockUpdateMany.mock.calls[0][0].where;
      expect(callWhere.id).toBe("notif-1");
      expect(callWhere.userId).toBe("u-1");
    });

    it("returns false on error", async () => {
      mockUpdateMany.mockRejectedValue(new Error("fail"));

      const result = await markNotificationRead("notif-1", "u-1");

      expect(result).toBe(false);
    });
  });

  describe("markAllNotificationsRead", () => {
    it("returns count of updated notifications", async () => {
      mockUpdateMany.mockResolvedValue({ count: 5 });

      const count = await markAllNotificationsRead("t-1", "u-1");

      expect(count).toBe(5);
    });

    it("returns 0 on error", async () => {
      mockUpdateMany.mockRejectedValue(new Error("fail"));

      const count = await markAllNotificationsRead("t-1", "u-1");

      expect(count).toBe(0);
    });
  });

  describe("getNotificationCounts", () => {
    it("returns total and unread counts", async () => {
      mockCount
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread

      const counts = await getNotificationCounts("t-1", "u-1");

      expect(counts.total).toBe(10);
      expect(counts.unread).toBe(3);
    });
  });
});
