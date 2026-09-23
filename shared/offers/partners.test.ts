/*
 * Phase 1.13 (D19) — content/offers/partners.json contract.
 *
 * 1. The file validates against content/offers/partners.schema.json
 *    (minimal draft-07 walker: type / required / additionalProperties /
 *    enum / pattern / minLength / minItems / $ref / properties / items).
 * 2. Every entry: 5 non-empty disclosures, non-empty excludedStatuses that
 *    cover NEVER_MONETIZE.viewerStatus, domain outside NEVER_MONETIZE.
 * 3. No placement exists yet: the only reader of partners.json under
 *    client/src and server/ is the /trust page (names + disclosure).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NEVER_MONETIZE, isNeverMonetizeDomain } from "../domains";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf-8"));
const schema = read("content/offers/partners.schema.json");
const data = read("content/offers/partners.json");
const LANGS = ["en", "fr", "es", "ru", "ka"] as const;

type Node = Record<string, any>;
function validate(node: Node, value: unknown, at: string, errors: string[]): void {
  if (node.$ref) {
    const target = node.$ref.replace(/^#\//, "").split("/").reduce((n: Node, k: string) => n[k], schema);
    return validate(target, value, at, errors);
  }
  const t = node.type;
  if (t === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return void errors.push(`${at}: not an object`);
    const obj = value as Record<string, unknown>;
    for (const k of node.required ?? []) if (!(k in obj)) errors.push(`${at}: missing ${k}`);
    for (const [k, v] of Object.entries(obj)) {
      const sub = node.properties?.[k];
      if (sub) validate(sub, v, `${at}.${k}`, errors);
      else if (node.additionalProperties === false) errors.push(`${at}: unexpected ${k}`);
    }
  } else if (t === "array") {
    if (!Array.isArray(value)) return void errors.push(`${at}: not an array`);
    if (node.minItems != null && value.length < node.minItems) errors.push(`${at}: fewer than ${node.minItems} items`);
    value.forEach((v, i) => node.items && validate(node.items, v, `${at}[${i}]`, errors));
  } else if (t === "string") {
    if (typeof value !== "string") return void errors.push(`${at}: not a string`);
    if (node.minLength != null && value.length < node.minLength) errors.push(`${at}: shorter than ${node.minLength}`);
    if (node.pattern && !new RegExp(node.pattern).test(value)) errors.push(`${at}: pattern ${node.pattern}`);
    if (node.enum && !node.enum.includes(value)) errors.push(`${at}: not in enum`);
  }
}

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? filesUnder(p) : [p];
  });
}

describe("content/offers/partners.json", () => {
  it("validates against partners.schema.json", () => {
    const errors: string[] = [];
    validate(schema, data, "$", errors);
    expect(errors).toEqual([]);
  });

  it("has ≥ 4 partners with the 4 named programmes", () => {
    const slugs = data.partners.map((p: any) => p.slug);
    expect(slugs.length).toBeGreaterThanOrEqual(4);
    for (const s of ["wise", "remitly", "lingoda"]) expect(slugs).toContain(s);
    expect(slugs.some((s: string) => s === "lebara" || s === "lyca")).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every entry has all 5 disclosures, non-empty", () => {
    for (const p of data.partners) {
      for (const l of LANGS) expect(p.disclosure[l]?.trim().length, `${p.slug}.${l}`).toBeGreaterThan(0);
    }
  });

  it("every entry excludes the PIVOT rule-4 statuses and stays outside NEVER_MONETIZE", () => {
    for (const p of data.partners) {
      expect(p.excludedStatuses.length, p.slug).toBeGreaterThan(0);
      for (const s of NEVER_MONETIZE.viewerStatus) expect(p.excludedStatuses, `${p.slug} must exclude ${s}`).toContain(s);
      expect(isNeverMonetizeDomain(p.domain), `${p.slug}.domain`).toBe(false);
    }
  });

  it("trackingUrl is a public URL or the placeholder — never a secret", () => {
    for (const p of data.partners) {
      expect(p.trackingUrl).not.toMatch(/secret|token|api[_-]?key|password/i);
    }
  });

  it("is read only by the /trust page (no placement before Phase 2.9)", () => {
    const readers = ["client/src", "server"]
      .flatMap((d) => filesUnder(path.join(ROOT, d)))
      .filter((f) => /\.(ts|tsx|js|mjs)$/.test(f) && fs.readFileSync(f, "utf-8").includes("partners.json"))
      .map((f) => path.relative(ROOT, f));
    expect(readers).toEqual(["client/src/pages/Trust.tsx"]);
  });
});
