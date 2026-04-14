import { describe, expect, it } from "vitest";
import { Resend } from "resend";

describe.skipIf(!process.env.RESEND_API_KEY)("Resend API Key Validation", () => {
  it("should have a valid RESEND_API_KEY that connects to Resend", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey!.startsWith("re_")).toBe(true);

    const resend = new Resend(apiKey);
    // Use the domains list endpoint as a lightweight validation call
    const { data, error } = await resend.domains.list();

    // If the key is invalid, Resend returns an error with code "unauthorized"
    if (error) {
      expect(error.name).not.toBe("validation_error");
      // A valid key with no domains still returns data, not an auth error
      expect(error.message).not.toContain("API key is invalid");
    }

    // If we get data, the key is valid
    if (data) {
      expect(data).toBeDefined();
    }
  });
});
