import { writeAuditLog } from "../logger";

// Mock @adwyzors/database
const mockCreate = jest.fn();
jest.mock("@adwyzors/database", () => ({
  prisma: {
    auditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// Mock @adwyzors/logger
const mockLogInfo = jest.fn();
const mockLogError = jest.fn();
jest.mock("@adwyzors/logger", () => ({
  logger: {
    info: (...args: unknown[]) => mockLogInfo(...args),
    error: (...args: unknown[]) => mockLogError(...args),
  },
}));

describe("writeAuditLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validInput = {
    tenantId: "tenant-1",
    userId: "user-1",
    action: "user.created",
    entityType: "User",
    entityId: "entity-1",
  };

  it("writes a record to the database with all mandatory fields", async () => {
    mockCreate.mockResolvedValue({ id: "log-1" });

    await writeAuditLog(validInput);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.data.tenantId).toBe("tenant-1");
    expect(callArg.data.userId).toBe("user-1");
    expect(callArg.data.action).toBe("user.created");
    expect(callArg.data.entityType).toBe("User");
    expect(callArg.data.entityId).toBe("entity-1");
  });

  it("writes before/after state when provided", async () => {
    mockCreate.mockResolvedValue({ id: "log-2" });

    await writeAuditLog({
      ...validInput,
      before: { name: "Old" },
      after: { name: "New" },
    });

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.data.before).toEqual({ name: "Old" });
    expect(callArg.data.after).toEqual({ name: "New" });
  });

  it("logs info on success", async () => {
    mockCreate.mockResolvedValue({ id: "log-3" });

    await writeAuditLog(validInput);

    expect(mockLogInfo).toHaveBeenCalledTimes(1);
    expect(mockLogInfo.mock.calls[0][1]).toBe("Audit log written");
  });

  it("does not throw on database failure — catches internally", async () => {
    mockCreate.mockRejectedValue(new Error("DB connection lost"));

    // Should NOT throw
    await expect(writeAuditLog(validInput)).resolves.toBeUndefined();
  });

  it("logs error on database failure", async () => {
    mockCreate.mockRejectedValue(new Error("DB connection lost"));

    await writeAuditLog(validInput);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError.mock.calls[0][1]).toBe("Failed to write audit log");
  });
});
