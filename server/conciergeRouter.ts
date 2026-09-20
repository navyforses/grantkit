/**
 * concierge.intake — Health-abroad concierge v0 (item 1.11).
 *
 * Rules (tested in concierge.test.ts):
 *  - never touches the DB: this module must not import ./db or drizzle;
 *  - logs nothing personal;
 *  - the only side effect is one email to the owner via emailService.
 * Rate limit: /api/trpc/concierge prefix in _core/bootstrap.ts.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  CONCIERGE_COUNTRIES,
  CONCIERGE_LANGUAGES,
  DIAGNOSIS_CATEGORIES,
  TREATMENT_STAGES,
} from "@shared/concierge";
import { publicProcedure, router } from "./_core/trpc";
import { sendConciergeIntakeEmail } from "./emailService";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{6,}$/;

export const conciergeIntakeSchema = z.object({
  country: z.enum(CONCIERGE_COUNTRIES),
  diagnosisCategory: z.enum(DIAGNOSIS_CATEGORIES),
  stage: z.enum(TREATMENT_STAGES),
  language: z.enum(CONCIERGE_LANGUAGES),
  // Email or phone — one field, validated loosely so international phones pass.
  contact: z
    .string()
    .trim()
    .min(5)
    .max(120)
    .refine((v) => EMAIL_RE.test(v) || PHONE_RE.test(v), {
      message: "contact must be an email address or a phone number",
    }),
  consent: z.literal(true, { message: "explicit consent is required" }),
});

export type ConciergeIntake = z.infer<typeof conciergeIntakeSchema>;

export const conciergeRouter = router({
  intake: publicProcedure.input(conciergeIntakeSchema).mutation(async ({ input }) => {
    const result = await sendConciergeIntakeEmail(input);
    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not deliver the request. Please try again later.",
      });
    }
    return { success: true } as const;
  }),
});
