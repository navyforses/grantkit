import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { es } from "@/i18n/es";
import { ru } from "@/i18n/ru";
import { ka } from "@/i18n/ka";
import type { Translations } from "@/i18n/types";
import grantTranslations from "@/data/grantTranslations.json";

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

// Type for the grant translations JSON
type TranslationLookup = Record<string, Record<string, string>>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  /** Translate a grant category name */
  tCategory: (category: string) => string;
  /** Translate a grant type name */
  tType: (type: string) => string;
  /** Translate a situation/condition name */
  tSituation: (situation: string) => string;
  /** Translate a country name */
  tCountry: (country: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function createTranslator(lookup: TranslationLookup, lang: Language) {
  return (key: string): string => {
    const entry = lookup[key];
    if (entry && entry[lang]) return entry[lang];
    return key; // fallback to key itself
  };
}

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

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tCategory, tType, tSituation, tCountry }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
