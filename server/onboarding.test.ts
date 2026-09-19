/**
 * Onboarding v2 (Phase 1.3) — the D6 "never" rule: immigration status is
 * client-only. The profile input schemas have no status field, and an extra
 * `status` key sent by a (buggy) client is stripped before the DB write.
 * `SELECT needs FROM users` therefore can never contain a status.
 */
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const updateUserProfileMock = vi.fn(async () => undefined);
const completeOnboardingMock = vi.fn(async () => undefined);

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, updateUserProfile: updateUserProfileMock, completeOnboarding: completeOnboardingMock };
});

const { appRouter } = await import("./routers");

function userCtx(): TrpcContext {
  return {
    user: { id: 7, role: "user" },
    req: { protocol: "https", headers: {} } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  } as unknown as TrpcContext;
}

function inputSchema(path: "onboarding.saveProfile" | "onboarding.updateProfile"): any {
  const procedures = (appRouter as any)._def.procedures as Record<string, any>;
  return procedures[path]._def.inputs[0];
}

describe("onboarding profile input schemas (D6 — status is never a server field)", () => {
  for (const path of ["onboarding.saveProfile", "onboarding.updateProfile"] as const) {
    it(`${path} has no status / city / immigrationStatus key`, () => {
      const shape = inputSchema(path).shape as Record<string, unknown>;
      expect(Object.keys(shape)).toEqual(expect.arrayContaining(["targetCountry", "needs"]));
      for (const forbidden of ["status", "immigrationStatus", "viewerStatus", "city"]) {
        expect(shape).not.toHaveProperty(forbidden);
      }
    });
  }

  it("saveProfile strips an unexpected status key before it reaches the DB layer", async () => {
    const caller = appRouter.createCaller(userCtx());
    await caller.onboarding.saveProfile({
      targetCountry: "FR",
      needs: ["housing", "legal_status"],
      status: "asylum_seeker",
    } as any);

    expect(updateUserProfileMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateUserProfileMock.mock.calls[0] as unknown as [number, Record<string, unknown>];
    expect(payload).toEqual({ targetCountry: "FR", needs: JSON.stringify(["housing", "legal_status"]) });
    expect(JSON.stringify(payload)).not.toMatch(/asylum_seeker|"status"/);
    expect(completeOnboardingMock).toHaveBeenCalledWith(7);
  });

  it("saveProfile leaves purposes untouched when the client does not send them", async () => {
    updateUserProfileMock.mockClear();
    const caller = appRouter.createCaller(userCtx());
    await caller.onboarding.saveProfile({ targetCountry: "FR", needs: [] });
    const [, payload] = updateUserProfileMock.mock.calls[0] as unknown as [number, Record<string, unknown>];
    expect(payload).not.toHaveProperty("purposes");
    expect(payload).not.toHaveProperty("purposeDetails");
    expect(payload).not.toHaveProperty("needDetails");
  });
});
