import { createCustomerDto, updateCustomerDto } from "../app/api/crm/customers/dto";

describe("createCustomerDto", () => {
  it("accepts valid business customer", () => {
    const result = createCustomerDto.safeParse({
      name: "Maharaja Textiles",
      type: "business",
      email: "info@maharaja.com",
      phone: "+919876543210",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid individual customer", () => {
    const result = createCustomerDto.safeParse({
      name: "Rajesh Kumar",
      type: "individual",
    });
    expect(result.success).toBe(true);
  });

  it("defaults type to business", () => {
    const result = createCustomerDto.safeParse({ name: "Acme Corp" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("business");
    }
  });

  it("rejects name shorter than 2 characters", () => {
    const result = createCustomerDto.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createCustomerDto.safeParse({
      name: "Test",
      type: "corporation",
    });
    expect(result.success).toBe(false);
  });

  it("validates GSTIN format (15-char alphanumeric)", () => {
    // Valid GSTIN: 2 digits + 5 uppercase + 4 digits + 1 uppercase + 1 alphanumeric + Z + 1 alphanumeric
    const result = createCustomerDto.safeParse({
      name: "Test",
      gstin: "27AAPFU0939F1ZV",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid GSTIN format", () => {
    const result = createCustomerDto.safeParse({
      name: "Test",
      gstin: "INVALID123",
    });
    expect(result.success).toBe(false);
  });

  it("validates PAN format (10-char)", () => {
    const result = createCustomerDto.safeParse({
      name: "Test",
      pan: "ABCDE1234F",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid PAN format", () => {
    const result = createCustomerDto.safeParse({
      name: "Test",
      pan: "123ABC",
    });
    expect(result.success).toBe(false);
  });

  it("accepts address object", () => {
    const result = createCustomerDto.safeParse({
      name: "Test Corp",
      address: {
        line1: "123 MG Road",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts creditLimit as positive number", () => {
    const result = createCustomerDto.safeParse({
      name: "Big Client",
      creditLimit: 500000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative creditLimit", () => {
    const result = createCustomerDto.safeParse({
      name: "Test",
      creditLimit: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts paymentTerms as integer days", () => {
    const result = createCustomerDto.safeParse({
      name: "Test",
      paymentTerms: 30,
    });
    expect(result.success).toBe(true);
  });

  it("rejects paymentTerms > 365", () => {
    const result = createCustomerDto.safeParse({
      name: "Test",
      paymentTerms: 400,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = createCustomerDto.safeParse({
      name: "Test",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCustomerDto", () => {
  it("accepts partial updates", () => {
    const result = updateCustomerDto.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no-op)", () => {
    const result = updateCustomerDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts nullable email (to clear it)", () => {
    const result = updateCustomerDto.safeParse({ email: null });
    expect(result.success).toBe(true);
  });

  it("accepts status change to inactive", () => {
    const result = updateCustomerDto.safeParse({ status: "inactive" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateCustomerDto.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
  });
});
