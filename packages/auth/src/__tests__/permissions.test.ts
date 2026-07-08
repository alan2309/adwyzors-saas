import { getUserPermissions } from "../permissions";

// Mock Prisma client
const mockFindMany = jest.fn();
jest.mock("@adwyzors/database", () => ({
  prisma: {
    userRole: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

describe("getUserPermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns flat array of permission keys for a regular user", async () => {
    mockFindMany.mockResolvedValue([
      {
        role: {
          name: "TENANT_ADMIN",
          isSystem: true,
          deletedAt: null,
          status: "active",
          rolePermissions: [
            { permission: { key: "settings.user.read" } },
            { permission: { key: "settings.user.invite" } },
          ],
        },
      },
    ]);

    const permissions = await getUserPermissions("user-1", "tenant-1");

    expect(permissions).toContain("settings.user.read");
    expect(permissions).toContain("settings.user.invite");
    expect(permissions).toHaveLength(2);
  });

  it("returns ['*'] for SUPER_ADMIN system role", async () => {
    mockFindMany.mockResolvedValue([
      {
        role: {
          name: "SUPER_ADMIN",
          isSystem: true,
          deletedAt: null,
          status: "active",
          rolePermissions: [],
        },
      },
    ]);

    const permissions = await getUserPermissions("admin-1", "tenant-1");

    expect(permissions).toEqual(["*"]);
  });

  it("returns empty array for user with no roles", async () => {
    mockFindMany.mockResolvedValue([]);

    const permissions = await getUserPermissions("orphan-user", "tenant-1");

    expect(permissions).toEqual([]);
  });

  it("deduplicates permissions across multiple roles", async () => {
    mockFindMany.mockResolvedValue([
      {
        role: {
          name: "ROLE_A",
          isSystem: false,
          deletedAt: null,
          status: "active",
          rolePermissions: [
            { permission: { key: "crm.customer.list" } },
            { permission: { key: "crm.customer.create" } },
          ],
        },
      },
      {
        role: {
          name: "ROLE_B",
          isSystem: false,
          deletedAt: null,
          status: "active",
          rolePermissions: [
            { permission: { key: "crm.customer.list" } }, // duplicate
            { permission: { key: "crm.customer.edit" } },
          ],
        },
      },
    ]);

    const permissions = await getUserPermissions("user-1", "tenant-1");

    expect(permissions).toHaveLength(3);
    expect(permissions).toContain("crm.customer.list");
    expect(permissions).toContain("crm.customer.create");
    expect(permissions).toContain("crm.customer.edit");
  });

  it("skips deleted roles", async () => {
    mockFindMany.mockResolvedValue([
      {
        role: {
          name: "DELETED_ROLE",
          isSystem: false,
          deletedAt: new Date(),
          status: "active",
          rolePermissions: [
            { permission: { key: "should.not.appear" } },
          ],
        },
      },
    ]);

    const permissions = await getUserPermissions("user-1", "tenant-1");

    expect(permissions).toEqual([]);
  });

  it("skips inactive roles", async () => {
    mockFindMany.mockResolvedValue([
      {
        role: {
          name: "INACTIVE_ROLE",
          isSystem: false,
          deletedAt: null,
          status: "inactive",
          rolePermissions: [
            { permission: { key: "should.not.appear" } },
          ],
        },
      },
    ]);

    const permissions = await getUserPermissions("user-1", "tenant-1");

    expect(permissions).toEqual([]);
  });

  it("queries with correct userId and tenantId", async () => {
    mockFindMany.mockResolvedValue([]);

    await getUserPermissions("specific-user", "specific-tenant");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "specific-user", tenantId: "specific-tenant" },
      })
    );
  });
});
