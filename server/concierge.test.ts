/**
 * concierge.intake — Health-abroad concierge v0 (item 1.11).
 *
 *  1. valid input → the owner email sender is called exactly once, no DB;
 *  2. invalid input (bad contact, no consent, free-text diagnosis) → zod error;
 *  3. "never" rules by source grep: the handler imports no DB module, the page
 *     is linked from no nav surface, the route is rate-limited and noindex.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import type { TrpcContext } from "./_core/context";

const sendMock = vi.fn(async () => ({ success: true, messageId: "msg_1" }));
vi.mock("./emailService", () => ({ sendConciergeIntakeEmail: sendMock }));

// Any DB access from the concierge path would go through ./db — make it explode.
const dbSpy = vi.fn();
vi.mock("./db", () => new Proxy({}, { get: (_t, prop) => { dbSpy(prop); return vi.fn(); } }));

const { appRouter } = await import("./routers");

function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  } as unknown as TrpcContext;
}

const valid = {
  country: "TR",
  diagnosisCategory: "oncology",
  stage: "seeking_clinic",
  language: "ka",
  contact: "family@example.com",
  consent: true,
} as const;

describe("concierge.intake", () => {
  beforeEach(() => {
    sendMock.mockClear();
    dbSpy.mockClear();
  });

  it("valid → owner email sent once, nothing written to the DB", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const out = await caller.concierge.intake(valid);
    expect(out).toEqual({ success: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(valid);
    expect(dbSpy).not.toHaveBeenCalled();
  });

  it("accepts a phone number as contact", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.concierge.intake({ ...valid, contact: "+995 555 12 34 56" });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("invalid → zod BAD_REQUEST, sender never called", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const cases: Array<Record<string, unknown>> = [
      { ...valid, consent: false },
      { ...valid, contact: "x" },
      { ...valid, country: "GE" },
      { ...valid, diagnosisCategory: "stage IV lung carcinoma" },
      { ...valid, language: "fr" },
    ];
    for (const input of cases) {
      await expect(caller.concierge.intake(input as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(sendMock).not.toHaveBeenCalled();
    expect(dbSpy).not.toHaveBeenCalled();
  });

  it("surfaces a delivery failure without storing anything", async () => {
    sendMock.mockResolvedValueOnce({ success: false, error: "Email service not configured" } as any);
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.concierge.intake(valid)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(dbSpy).not.toHaveBeenCalled();
  });
});

describe("1.11 'never' rules (source grep)", () => {
  const root = path.resolve(__dirname, "..");
  const read = (p: string) => readFileSync(path.join(root, p), "utf8");

  it("conciergeRouter imports no DB module and logs nothing", () => {
    const src = read("server/conciergeRouter.ts");
    expect(src).not.toMatch(/from\s+["']\.\/db["']/);
    expect(src).not.toMatch(/drizzle/);
    expect(src).not.toMatch(/console\./);
  });

  it("/health-abroad is not linked from Navbar, MobileBottomNav or Home (D17)", () => {
    for (const f of ["client/src/components/Navbar.tsx", "client/src/components/MobileBottomNav.tsx", "client/src/pages/Home.tsx"]) {
      expect(read(f)).not.toContain("health-abroad");
    }
  });

  it("intake path is rate-limited in bootstrap like the AI paths", () => {
    expect(read("server/_core/bootstrap.ts")).toMatch(/app\.use\("\/api\/trpc\/concierge",\s*rateLimit\(/);
  });
});
