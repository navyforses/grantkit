import { describe, it, expect } from "vitest";
import { parseCSV, validateBatch, VALID_CATEGORIES, VALID_COUNTRIES } from "./importGrants";

describe("Grant Import - CSV Parsing", () => {
  it("should parse a valid CSV with required fields", () => {
    const csv = `Name,Category,Country,Type,Organization,Description
Test Grant,medical_treatment,US,grant,Test Org,A test grant`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.grants[0].name).toBe("Test Grant");
    expect(result.grants[0].category).toBe("medical_treatment");
    expect(result.grants[0].country).toBe("US");
    expect(result.grants[0].type).toBe("grant");
    expect(result.grants[0].organization).toBe("Test Org");
    expect(result.grants[0].description).toBe("A test grant");
  });

  it("should handle multiple rows", () => {
    const csv = `Name,Category,Country
Grant One,scholarships,US
Grant Two,housing,International
Grant Three,other,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(3);
    expect(result.totalRows).toBe(3);
    expect(result.grants).toHaveLength(3);
  });

  it("should reject rows with missing required name", () => {
    const csv = `Name,Category,Country
,medical_treatment,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(0);
    expect(result.skippedRows).toBe(1);
    expect(result.errors.some(e => e.field === "name")).toBe(true);
  });

  it("should reject rows with missing required category", () => {
    const csv = `Name,Category,Country
Test Grant,,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(0);
    expect(result.errors.some(e => e.field === "category")).toBe(true);
  });

  it("should reject rows with invalid category", () => {
    const csv = `Name,Category,Country
Test Grant,invalid_cat,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(0);
    expect(result.errors.some(e => e.field === "category" && e.message.includes("Invalid category"))).toBe(true);
  });

  it("should reject rows with missing required country", () => {
    const csv = `Name,Category,Country
Test Grant,medical_treatment,`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(0);
    expect(result.errors.some(e => e.field === "country")).toBe(true);
  });

  it("should reject rows with invalid country", () => {
    const csv = `Name,Category,Country
Test Grant,medical_treatment,Germany`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(0);
    expect(result.errors.some(e => e.field === "country" && e.message.includes("Invalid country"))).toBe(true);
  });

  it("should reject rows with invalid type", () => {
    const csv = `Name,Category,Country,Type
Test Grant,medical_treatment,US,loan`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(0);
    expect(result.errors.some(e => e.field === "type" && e.message.includes("Invalid type"))).toBe(true);
  });

  it("should default type to 'grant' when not specified", () => {
    const csv = `Name,Category,Country
Test Grant,medical_treatment,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(1);
    expect(result.grants[0].type).toBe("grant");
  });

  it("should normalize header variations", () => {
    const csv = `Item ID,Name,Org,Desc,Category,Country,URL,Telephone,Grant Email,Funding Amount
id123,Test Grant,Test Org,A description,scholarships,International,https://example.com,555-1234,test@test.com,$5000`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(1);
    expect(result.grants[0].itemId).toBe("id123");
    expect(result.grants[0].organization).toBe("Test Org");
    expect(result.grants[0].description).toBe("A description");
    expect(result.grants[0].website).toBe("https://example.com");
    expect(result.grants[0].phone).toBe("555-1234");
    expect(result.grants[0].email).toBe("test@test.com");
    expect(result.grants[0].amount).toBe("$5000");
  });

  it("should parse translation columns (EN Name, KA Description format)", () => {
    const csv = `Name,Category,Country,EN Name,EN Description,KA Name,KA Description
Test Grant,medical_treatment,US,Test Grant EN,English desc,ტესტ გრანტი,ქართული აღწერა`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(1);
    expect(result.grants[0].translations.en).toBeDefined();
    expect(result.grants[0].translations.en.name).toBe("Test Grant EN");
    expect(result.grants[0].translations.en.description).toBe("English desc");
    expect(result.grants[0].translations.ka).toBeDefined();
    expect(result.grants[0].translations.ka.name).toBe("ტესტ გრანტი");
    expect(result.grants[0].translations.ka.description).toBe("ქართული აღწერა");
  });

  it("should parse translation columns (en_name, ka_description format)", () => {
    const csv = `Name,Category,Country,en_name,en_description,fr_name,fr_description
Test Grant,medical_treatment,US,English Name,English Desc,Nom Français,Description Française`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(1);
    expect(result.grants[0].translations.en.name).toBe("English Name");
    expect(result.grants[0].translations.fr.name).toBe("Nom Français");
    expect(result.grants[0].translations.fr.description).toBe("Description Française");
  });

  it("should skip completely empty rows", () => {
    const csv = `Name,Category,Country
Grant One,medical_treatment,US
,,
Grant Two,housing,International`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(2);
    expect(result.grants[0].name).toBe("Grant One");
    expect(result.grants[1].name).toBe("Grant Two");
  });

  it("should handle mixed valid and invalid rows", () => {
    const csv = `Name,Category,Country
Valid Grant,medical_treatment,US
,scholarships,US
Another Valid,housing,International
Bad Category,nonexistent,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(2);
    expect(result.skippedRows).toBe(2);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle empty CSV", () => {
    const csv = `Name,Category,Country`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(0);
    expect(result.totalRows).toBe(0);
    expect(result.grants).toHaveLength(0);
  });

  it("should preserve optional fields as empty strings when not provided", () => {
    const csv = `Name,Category,Country
Minimal Grant,other,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(1);
    expect(result.grants[0].organization).toBe("");
    expect(result.grants[0].description).toBe("");
    expect(result.grants[0].website).toBe("");
    expect(result.grants[0].phone).toBe("");
    expect(result.grants[0].email).toBe("");
    expect(result.grants[0].amount).toBe("");
  });

  it("should not include translations when no translation columns exist", () => {
    const csv = `Name,Category,Country
Test Grant,medical_treatment,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(1);
    expect(Object.keys(result.grants[0].translations)).toHaveLength(0);
  });

  it("should handle itemId for update mode", () => {
    const csv = `Item ID,Name,Category,Country
item_0001,Updated Grant,medical_treatment,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(1);
    expect(result.grants[0].itemId).toBe("item_0001");
  });

  it("should set itemId to undefined when not provided", () => {
    const csv = `Name,Category,Country
New Grant,medical_treatment,US`;

    const result = parseCSV(csv);
    expect(result.validRows).toBe(1);
    expect(result.grants[0].itemId).toBeUndefined();
  });
});

describe("Grant Import - Batch Validation", () => {
  it("should detect duplicate names within a batch", () => {
    const grants = [
      { name: "Grant A", category: "medical_treatment", country: "US", type: "grant" as const, organization: "", description: "", eligibility: "", website: "", phone: "", email: "", amount: "", status: "", translations: {} },
      { name: "Grant B", category: "housing", country: "US", type: "grant" as const, organization: "", description: "", eligibility: "", website: "", phone: "", email: "", amount: "", status: "", translations: {} },
      { name: "Grant A", category: "scholarships", country: "International", type: "grant" as const, organization: "", description: "", eligibility: "", website: "", phone: "", email: "", amount: "", status: "", translations: {} },
    ];

    const errors = validateBatch(grants);
    expect(errors.length).toBe(1);
    expect(errors[0].field).toBe("name");
    expect(errors[0].message).toContain("Duplicate name");
  });

  it("should detect case-insensitive duplicates", () => {
    const grants = [
      { name: "Test Grant", category: "medical_treatment", country: "US", type: "grant" as const, organization: "", description: "", eligibility: "", website: "", phone: "", email: "", amount: "", status: "", translations: {} },
      { name: "test grant", category: "housing", country: "US", type: "grant" as const, organization: "", description: "", eligibility: "", website: "", phone: "", email: "", amount: "", status: "", translations: {} },
    ];

    const errors = validateBatch(grants);
    expect(errors.length).toBe(1);
  });

  it("should return no errors for unique grants", () => {
    const grants = [
      { name: "Grant A", category: "medical_treatment", country: "US", type: "grant" as const, organization: "", description: "", eligibility: "", website: "", phone: "", email: "", amount: "", status: "", translations: {} },
      { name: "Grant B", category: "housing", country: "US", type: "grant" as const, organization: "", description: "", eligibility: "", website: "", phone: "", email: "", amount: "", status: "", translations: {} },
    ];

    const errors = validateBatch(grants);
    expect(errors).toHaveLength(0);
  });

  it("should return no errors for empty batch", () => {
    const errors = validateBatch([]);
    expect(errors).toHaveLength(0);
  });
});

describe("Grant Import - Constants", () => {
  it("should export valid categories", () => {
    expect(VALID_CATEGORIES).toContain("medical_treatment");
    expect(VALID_CATEGORIES).toContain("scholarships");
    expect(VALID_CATEGORIES).toContain("housing");
    expect(VALID_CATEGORIES.length).toBeGreaterThan(5);
  });

  it("should export valid countries", () => {
    expect(VALID_COUNTRIES).toContain("US");
    expect(VALID_COUNTRIES).toContain("International");
  });
});
