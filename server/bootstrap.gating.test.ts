import { describe, it, expect } from "vitest";
import { isSmartSearchPath, isImportPath } from "./_core/bootstrap";

// Paths as seen by middleware mounted at /api/trpc (mount prefix stripped).
describe("smartSearch rate-limit path matching (10/min/IP)", () => {
  it("matches both smartSearch procedures", () => {
    expect(isSmartSearchPath("/catalog.smartSearch")).toBe(true);
    expect(isSmartSearchPath("/organizations.smartSearch")).toBe(true);
  });

  it("matches comma-joined tRPC batch paths", () => {
    expect(isSmartSearchPath("/catalog.list,catalog.smartSearch")).toBe(true);
  });

  it("leaves other procedures on the 100/min baseline", () => {
    expect(isSmartSearchPath("/catalog.list")).toBe(false);
    expect(isSmartSearchPath("/catalog.list,catalog.detail")).toBe(false);
  });
});

describe("50 MB JSON body limit is scoped to the admin import route", () => {
  it("matches parseImport / executeImport, including in a batch", () => {
    expect(isImportPath("/api/trpc/admin.parseImport")).toBe(true);
    expect(isImportPath("/api/trpc/admin.executeImport")).toBe(true);
    expect(isImportPath("/api/trpc/admin.stats,admin.parseImport")).toBe(true);
  });

  it("everything else gets the 2 MB limit", () => {
    expect(isImportPath("/api/trpc/catalog.list")).toBe(false);
    expect(isImportPath("/api/trpc/admin.importExternal")).toBe(false);
    expect(isImportPath("/api/paddle/webhook")).toBe(false);
  });
});
