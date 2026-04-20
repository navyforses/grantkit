/**
 * localizeEntity — 3-level field fallback used by EntityDetail (and any
 * future detail-page render for grants/resources).
 *
 * Lookup order:
 *   1. API-provided translation (from `detailData.translations[language]`)
 *   2. Static bundled translation (from `tCatalogContent()`)
 *   3. Raw field on the item itself (English / unlocalized)
 *
 * The caller resolves steps 1 and 2 upstream (they come from different
 * sources) and passes both maps in. This helper picks the first
 * non-empty value and unifies the boilerplate.
 */

type StringRecord = Record<string, string | undefined>;

export function pickLocalized<T extends Record<string, any>>(
  item: T,
  field: keyof T,
  apiTranslations?: StringRecord | null,
  staticTranslations?: StringRecord | null
): string {
  const key = field as string;
  const apiValue = apiTranslations?.[key];
  if (apiValue) return apiValue;
  const staticValue = staticTranslations?.[key];
  if (staticValue) return staticValue;
  const raw = item[field];
  return typeof raw === "string" ? raw : raw == null ? "" : String(raw);
}

/**
 * Convenience wrapper: resolve a whole object of localized fields in one pass.
 * Fields that aren't present on the item simply fall through to "".
 */
export function pickLocalizedFields<
  T extends Record<string, any>,
  K extends keyof T
>(
  item: T,
  fields: readonly K[],
  apiTranslations?: StringRecord | null,
  staticTranslations?: StringRecord | null
): { [P in K]: string } {
  const out = {} as { [P in K]: string };
  for (const field of fields) {
    out[field] = pickLocalized(item, field, apiTranslations, staticTranslations);
  }
  return out;
}
