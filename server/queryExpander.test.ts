import { describe, it, expect, vi, beforeEach } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));
vi.mock("./_core/env", () => ({ ENV: { anthropicApiKey: "test-key" } }));

import { expandQuery, cacheKey } from "./queryExpander";

function haikuReply(terms: string[]) {
  return {
    content: [
      { type: "text", text: JSON.stringify({ detected_language: "en", english: terms[0], terms }) },
    ],
  };
}

describe("queryExpander cache (Phase 0.5 cost cap)", () => {
  beforeEach(() => {
    create.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("normalizes the cache key: trim, lowercase, collapse whitespace, NFC", () => {
    expect(cacheKey("  Child   Rehab ")).toBe("child rehab");
    expect(cacheKey("école")).toBe("école"); // combining accent → precomposed
  });

  it("same normalized query twice → one Anthropic call", async () => {
    create.mockResolvedValue(haikuReply(["child rehab", "pediatric therapy"]));

    const first = await expandQuery("Child   Rehab");
    const second = await expandQuery("  child rehab ");

    expect(create).toHaveBeenCalledTimes(1);
    expect(second.terms).toEqual(first.terms);
    expect(second.original).toBe("child rehab"); // caller's own text, not the cached one
  });

  it("different query → separate Anthropic call", async () => {
    create.mockResolvedValue(haikuReply(["housing aid"]));

    await expandQuery("housing aid");
    await expandQuery("housing aid in France");

    expect(create).toHaveBeenCalledTimes(2);
  });

  it("failed call is not cached (falls back, retries next time)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValueOnce(new Error("boom")).mockResolvedValue(haikuReply(["dental care"]));

    const failed = await expandQuery("dental care");
    expect(failed.terms).toEqual(["dental care", "dental", "care"]); // fallback split

    const ok = await expandQuery("dental care");
    expect(ok.terms).toEqual(["dental care"]);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
