/**
 * Tests for tenant management DTO validation.
 * Tests business rules enforced by Zod schemas.
 */
import { createTenantDto, updateTenantDto } from "../app/api/super-admin/tenants/dto";

describe("createTenantDto", () => {
  it("accepts valid input", () => {
    const result = createTenantDto.safeParse({
      name: "Acme Corp",
      subdomain: "acme",
      plan: "starter",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Acme Corp");
      expect(result.data.subdomain).toBe("acme");
      expect(result.data.plan).toBe("starter");
    }
  });

  it("defaults plan to trial when not provided", () => {
    const result = createTenantDto.safeParse({
      name: "Test Tenant",
      subdomain: "test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plan).toBe("trial");
    }
  });

  it("rejects name shorter than 2 characters", () => {
    const result = createTenantDto.safeParse({
      name: "A",
      subdomain: "valid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects subdomain shorter than 3 characters", () => {
    const result = createTenantDto.safeParse({
      name: "Valid Name",
      subdomain: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects subdomain with uppercase characters", () => {
    const result = createTenantDto.safeParse({
      name: "Valid Name",
      subdomain: "Invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects subdomain with special characters", () => {
    const result = createTenantDto.safeParse({
      name: "Valid Name",
      subdomain: "not_valid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts subdomain with hyphens", () => {
    const result = createTenantDto.safeParse({
      name: "Valid Name",
      subdomain: "my-company",
    });
    expect(result.success).toBe(true);
  });

  it("rejects subdomain starting with hyphen", () => {
    const result = createTenantDto.safeParse({
      name: "Valid Name",
      subdomain: "-invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid plan values", () => {
    const result = createTenantDto.safeParse({
      name: "Valid Name",
      subdomain: "valid",
      plan: "invalid-plan",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid plan values", () => {
    for (const plan of ["trial", "starter", "professional", "enterprise"]) {
      const result = createTenantDto.safeParse({
        name: "Valid",
        subdomain: "valid",
        plan,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateTenantDto", () => {
  it("accepts partial updates", () => {
    const result = updateTenantDto.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no-op update)", () => {
    const result = updateTenantDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts null customDomain (to clear it)", () => {
    const result = updateTenantDto.safeParse({ customDomain: null });
    expect(result.success).toBe(true);
  });

  it("accepts configJson as arbitrary object", () => {
    const result = updateTenantDto.safeParse({
      configJson: { industry: "garment_manufacturing", modules: ["crm", "inventory"] },
    });
    expect(result.success).toBe(true);
  });
});
