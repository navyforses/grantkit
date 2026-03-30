import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { es } from "@/i18n/es";
import { ru } from "@/i18n/ru";
import { ka } from "@/i18n/ka";
import type { Translations } from "@/i18n/types";
import grantTranslations from "@/data/grantTranslations.json";
import grantContentTranslations from "@/data/grantContentTranslations.json";
import resourceTranslations from "@/data/resourceTranslations.json";

export type Language = "en" | "fr" | "es" | "ru" | "ka";

export interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
  nativeName: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", flag: "🇬🇧", nativeName: "English" },
  { code: "fr", label: "French", flag: "🇫🇷", nativeName: "Français" },
  { code: "es", label: "Spanish", flag: "🇪🇸", nativeName: "Español" },
  { code: "ru", label: "Russian", flag: "🇷🇺", nativeName: "Русский" },
  { code: "ka", label: "Georgian", flag: "🇬🇪", nativeName: "ქართული" },
];

const translations: Record<Language, Translations> = { en, fr, es, ru, ka };

type TranslationLookup = Record<string, Record<string, string>>;
type ContentLookup = Record<string, Record<string, { name: string; description: string; eligibility: string }>>;

interface TranslatedContent {
  name: string;
  description: string;
  eligibility: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  tCategory: (category: string) => string;
  tType: (type: string) => string;
  tSituation: (situation: string) => string;
  tCountry: (country: string) => string;
  tGrantContent: (grantId: number, fallback: TranslatedContent) => TranslatedContent;
  /** Translate resource category slug to localized label */
  tResourceCategory: (category: string) => string;
  /** Get translated resource content (name, description, eligibility) by resource ID */
  tResourceContent: (resourceId: string, fallback: TranslatedContent) => TranslatedContent;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function createTranslator(lookup: TranslationLookup, lang: Language) {
  return (key: string): string => {
    const entry = lookup[key];
    if (entry && entry[lang]) return entry[lang];
    return key;
  };
}

// Resource category translation map
const RESOURCE_CATEGORY_LABELS: Record<string, Record<Language, string>> = {
  medical: { en: "Medical", fr: "Médical", es: "Médico", ru: "Медицинские", ka: "სამედიცინო" },
  duke_services: { en: "Duke Services", fr: "Services Duke", es: "Servicios Duke", ru: "Услуги Duke", ka: "Duke სერვისები" },
  financial: { en: "Financial", fr: "Financier", es: "Financiero", ru: "Финансовые", ka: "ფინანსური" },
  assistive_tech: { en: "Assistive Technology", fr: "Technologie d'assistance", es: "Tecnología de asistencia", ru: "Вспомогательные технологии", ka: "დამხმარე ტექნოლოგია" },
  housing: { en: "Housing", fr: "Logement", es: "Vivienda", ru: "Жильё", ka: "საცხოვრებელი" },
  scholarships: { en: "Scholarships", fr: "Bourses", es: "Becas", ru: "Стипендии", ka: "სტიპენდიები" },
  travel: { en: "Travel", fr: "Voyage", es: "Viaje", ru: "Путешествия", ka: "მოგზაურობა" },
  international: { en: "International", fr: "International", es: "Internacional", ru: "Международные", ka: "საერთაშორისო" },
  social_services: { en: "Social Services", fr: "Services sociaux", es: "Servicios sociales", ru: "Социальные услуги", ka: "სოციალური სერვისები" },
  other: { en: "Other", fr: "Autre", es: "Otro", ru: "Другое", ka: "სხვა" },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("grantkit-lang");
    return (saved as Language) || "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("grantkit-lang", lang);
    document.documentElement.lang = lang;
  }, []);

  const t = translations[language];

  const tCategory = useMemo(
    () => createTranslator(grantTranslations.categories as TranslationLookup, language),
    [language]
  );
  const tType = useMemo(
    () => createTranslator(grantTranslations.types as TranslationLookup, language),
    [language]
  );
  const tSituation = useMemo(
    () => createTranslator(grantTranslations.situations as TranslationLookup, language),
    [language]
  );
  const tCountry = useMemo(
    () => createTranslator(grantTranslations.countries as TranslationLookup, language),
    [language]
  );

  const tGrantContent = useCallback(
    (grantId: number, fallback: TranslatedContent): TranslatedContent => {
      if (language === "en") return fallback;
      const grantTrans = (grantContentTranslations as ContentLookup)[String(grantId)];
      if (!grantTrans) return fallback;
      const langTrans = grantTrans[language];
      if (!langTrans) return fallback;
      return {
        name: langTrans.name || fallback.name,
        description: langTrans.description || fallback.description,
        eligibility: langTrans.eligibility || fallback.eligibility,
      };
    },
    [language]
  );

  const tResourceCategory = useCallback(
    (category: string): string => {
      const labels = RESOURCE_CATEGORY_LABELS[category];
      return labels?.[language] || category;
    },
    [language]
  );

  const tResourceContent = useCallback(
    (resourceId: string, fallback: TranslatedContent): TranslatedContent => {
      if (language === "en") return fallback;
      const resTrans = (resourceTranslations as ContentLookup)[resourceId];
      if (!resTrans) return fallback;
      const langTrans = resTrans[language];
      if (!langTrans) return fallback;
      return {
        name: langTrans.name || fallback.name,
        description: langTrans.description || fallback.description,
        eligibility: langTrans.eligibility || fallback.eligibility,
      };
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language, setLanguage, t,
        tCategory, tType, tSituation, tCountry, tGrantContent,
        tResourceCategory, tResourceContent,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
