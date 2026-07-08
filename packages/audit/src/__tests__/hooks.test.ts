import { withAudit } from "../hooks";

// Mock writeAuditLog
const mockWriteAuditLog = jest.fn();
jest.mock("../logger", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

// Mock logger
jest.mock("@adwyzors/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("withAudit", () => {
  const context = {
    tenantId: "tenant-1",
    userId: "user-1",
    ipAddress: "127.0.0.1",
    userAgent: "TestAgent/1.0",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  it("calls the handler and returns its result", async () => {
    const result = await withAudit(context, async (log) => {
      log({
        action: "user.created",
        entityType: "User",
        entityId: "u-1",
      });
      return { id: "u-1", name: "Test" };
    });

    expect(result).toEqual({ id: "u-1", name: "Test" });
  });

  it("writes audit log on successful handler completion", async () => {
    await withAudit(context, async (log) => {
      log({
        action: "tenant.created",
        entityType: "Tenant",
        entityId: "t-1",
        after: { name: "Acme" },
      });
      return "ok";
    });

    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    const call = mockWriteAuditLog.mock.calls[0][0];
    expect(call.tenantId).toBe("tenant-1");
    expect(call.userId).toBe("user-1");
    expect(call.action).toBe("tenant.created");
    expect(call.entityType).toBe("Tenant");
    expect(call.entityId).toBe("t-1");
    expect(call.after).toEqual({ name: "Acme" });
    expect(call.ipAddress).toBe("127.0.0.1");
  });

  it("does not write audit log when handler throws", async () => {
    await expect(
      withAudit(context, async (log) => {
        log({ action: "fail", entityType: "X", entityId: "x-1" });
        throw new Error("handler failed");
      })
    ).rejects.toThrow("handler failed");

    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });

  it("re-throws handler errors unchanged", async () => {
    const error = new Error("specific error");
    await expect(
      withAudit(context, async () => {
        throw error;
      })
    ).rejects.toBe(error);
  });

  it("does not write audit log when log() is never called", async () => {
    await withAudit(context, async () => {
      return "no-op";
    });

    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});
