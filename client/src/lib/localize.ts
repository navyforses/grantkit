/**
 * Picks the locale-aware field from a multilingual object.
 * Falls back to the base (English) value if no translation exists.
 */
export function localized(
  item: {
    name?: string
    title?: string
    name_ka?: string
    name_fr?: string
    name_es?: string
    name_ru?: string
    title_ka?: string
    title_fr?: string
    title_es?: string
    title_ru?: string
  },
  locale: string,
  field: 'name' | 'title' = 'name'
): string {
  const base = (field === 'title' ? item.title : item.name) ?? ''
  const map: Record<string, string | undefined> = {
    ka: field === 'title' ? item.title_ka : item.name_ka,
    fr: field === 'title' ? item.title_fr : item.name_fr,
    es: field === 'title' ? item.title_es : item.name_es,
    ru: field === 'title' ? item.title_ru : item.name_ru,
  }
  return map[locale] || base
}

/**
 * Picks the locale-aware description from a multilingual object.
 */
export function localizedDescription(
  item: {
    description?: string
    description_ka?: string
    description_fr?: string
    description_es?: string
    description_ru?: string
  },
  locale: string
): string {
  const map: Record<string, string | undefined> = {
    ka: item.description_ka,
    fr: item.description_fr,
    es: item.description_es,
    ru: item.description_ru,
  }
  return map[locale] || item.description || ''
}
