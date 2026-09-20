/**
 * Health-abroad concierge v0 (MASTER-PLAN v2 §5 item 1.11, D17/D20/D23).
 *
 * Coarse intake enums shared by the /health-abroad form (client) and the
 * `concierge.intake` zod schema (server). No free-text diagnosis: the
 * category is the only health datum we accept (GDPR Art. 9 — minimisation).
 * Nothing here is stored in the DB — the intake is emailed to the owner.
 */

/** Country order follows 08-online-validation §4.2: US/TR/DE demand, FR weak. */
export const CONCIERGE_COUNTRIES = ["US", "TR", "DE", "FR"] as const;
export type ConciergeCountry = (typeof CONCIERGE_COUNTRIES)[number];

export const DIAGNOSIS_CATEGORIES = [
  "oncology",
  "pediatric",
  "cardiology",
  "neurology",
  "transplant",
  "rare_disease",
  "other",
] as const;
export type DiagnosisCategory = (typeof DIAGNOSIS_CATEGORIES)[number];

export const TREATMENT_STAGES = ["diagnosis", "seeking_clinic", "clinic_found", "funding", "travel"] as const;
export type TreatmentStage = (typeof TREATMENT_STAGES)[number];

export const CONCIERGE_LANGUAGES = ["ka", "ru", "en"] as const;
export type ConciergeLanguage = (typeof CONCIERGE_LANGUAGES)[number];

/** Prices are owner decisions (PIVOT §6 rule 5); manual invoice, no Paddle in v0. */
export const CONCIERGE_PRICES_EUR = { orientation: 290, accompaniment: 590 } as const;

/** Intake retention promised on the page: the owner deletes the email after this. */
export const INTAKE_RETENTION_DAYS = 90;
