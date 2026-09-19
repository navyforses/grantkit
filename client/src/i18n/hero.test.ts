/*
 * Phase 1.2 — Hero + copy v2 "never" rules, all 5 dictionaries.
 *  - no "grant" wording in any hero key (positioning = language + status, D17)
 *  - hero title carries the live {count} placeholder (no hardcoded number)
 *  - FAQ: 6–8 integration Q/As, no digits (no fabricated figures)
 */
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { fr } from "./fr";
import { es } from "./es";
import { ru } from "./ru";
import { ka } from "./ka";
import type { Translations } from "./types";

const dicts: Array<[string, Translations]> = [["en", en], ["fr", fr], ["es", es], ["ru", ru], ["ka", ka]];
// Word-initial only, so "immigrant" / "ემიგრანტი" / "мигрант" don't count;
// the brand name is stripped before matching.
const GRANT_WORDS = /(?<!\p{L})(grant|გრანტ|грант|subvention|subvenci|bourse|beca)/iu;
const noBrand = (s: string) => s.replace(/GrantKit/g, "");

describe.each(dicts)("hero copy — %s", (_lang, t) => {
  it("has no grant wording in any hero key", () => {
    for (const [key, value] of Object.entries(t.hero)) {
      expect(noBrand(value), `hero.${key}`).not.toMatch(GRANT_WORDS);
    }
  });
  it("title uses the live {count} placeholder and no literal number", () => {
    expect(t.hero.title).toContain("{count}");
    expect(t.hero.title.replace("{count}", "")).not.toMatch(/\d/);
  });
});

describe.each(dicts)("faq copy — %s", (_lang, t) => {
  it("is 6–8 integration questions with no fabricated numbers", () => {
    expect(t.faq.items.length).toBeGreaterThanOrEqual(6);
    expect(t.faq.items.length).toBeLessThanOrEqual(8);
    for (const { q, a } of t.faq.items) {
      expect(q + a).not.toMatch(/\d/);
      expect(noBrand(q + a)).not.toMatch(GRANT_WORDS);
    }
    const all = t.faq.items.map((i) => i.q + i.a).join(" ");
    for (const acronym of ["AME", "PUMa", "récépissé", "CAF"]) expect(all).toContain(acronym);
  });
});
