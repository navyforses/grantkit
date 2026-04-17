import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { es } from "@/i18n/es";
import { ru } from "@/i18n/ru";
import { ka } from "@/i18n/ka";
import type { Translations } from "@/i18n/types";
import catalogTranslations from "@/data/catalogTranslations.json";

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

type ContentLookup = Record<string, Record<string, { name: string; description: string; eligibility: string }>>;

interface TranslatedContent {
  name: string;
  description: string;
  eligibility: string;
}

// Category translation map
const CATEGORY_LABELS: Record<string, Record<Language, string>> = {
  all: { en: "All Categories", fr: "Toutes les catégories", es: "Todas las categorías", ru: "Все категории", ka: "ყველა კატეგორია" },
  medical_treatment: { en: "Medical & Treatment", fr: "Médical & Traitement", es: "Médico & Tratamiento", ru: "Медицина и лечение", ka: "სამედიცინო & მკურნალობა" },
  financial_assistance: { en: "Financial Assistance", fr: "Aide financière", es: "Asistencia financiera", ru: "Финансовая помощь", ka: "ფინანსური დახმარება" },
  assistive_technology: { en: "Assistive Technology", fr: "Technologie d'assistance", es: "Tecnología de asistencia", ru: "Вспомогательные технологии", ka: "დამხმარე ტექნოლოგია" },
  social_services: { en: "Social Services", fr: "Services sociaux", es: "Servicios sociales", ru: "Социальные услуги", ka: "სოციალური სერვისები" },
  scholarships: { en: "Scholarships", fr: "Bourses", es: "Becas", ru: "Стипендии", ka: "სტიპენდიები" },
  housing: { en: "Housing", fr: "Logement", es: "Vivienda", ru: "Жильё", ka: "საცხოვრებელი" },
  travel_transport: { en: "Travel & Transport", fr: "Voyage & Transport", es: "Viaje & Transporte", ru: "Путешествия и транспорт", ka: "მოგზაურობა & ტრანსპორტი" },
  international: { en: "International", fr: "International", es: "Internacional", ru: "Международные", ka: "საერთაშორისო" },
  food_basic_needs: { en: "Food & Basic Needs", fr: "Alimentation & Besoins essentiels", es: "Alimentación & Necesidades básicas", ru: "Питание и базовые потребности", ka: "საკვები & ძირითადი საჭიროებები" },
  startup: { en: "Startup & Business", fr: "Startup & Entreprise", es: "Startup & Negocio", ru: "Стартапы и бизнес", ka: "სტარტაპი & ბიზნესი" },
  educational: { en: "Educational", fr: "Éducatif", es: "Educativo", ru: "Образовательные", ka: "საგანმანათლებლო" },
  research: { en: "Research", fr: "Recherche", es: "Investigación", ru: "Исследования", ka: "კვლევა" },
  community: { en: "Community Development", fr: "Développement communautaire", es: "Desarrollo comunitario", ru: "Развитие сообщества", ka: "საზოგადოების განვითარება" },
  individual: { en: "Individual & Fellowship", fr: "Individuel & Bourse", es: "Individual & Beca", ru: "Индивидуальные и стипендии", ka: "ინდივიდუალური & სტიპენდია" },
  other: { en: "Other", fr: "Autre", es: "Otro", ru: "Другое", ka: "სხვა" },
};

const COUNTRY_LABELS: Record<string, Record<Language, string>> = {
  US: { en: "United States", fr: "États-Unis", es: "Estados Unidos", ru: "США", ka: "აშშ" },
  International: { en: "International", fr: "International", es: "Internacional", ru: "Международный", ka: "საერთაშორისო" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  tCategory: (category: string) => string;
  tCountry: (country: string) => string;
  tCatalogContent: (itemId: string, fallback: TranslatedContent) => TranslatedContent;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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

  const tCategory = useCallback(
    (category: string): string => {
      const labels = CATEGORY_LABELS[category];
      return labels?.[language] || category;
    },
    [language]
  );

  const tCountry = useCallback(
    (country: string): string => {
      const labels = COUNTRY_LABELS[country];
      return labels?.[language] || country;
    },
    [language]
  );

  const tCatalogContent = useCallback(
    (itemId: string, fallback: TranslatedContent): TranslatedContent => {
      if (language === "en") return fallback;
      const itemTrans = (catalogTranslations as ContentLookup)[itemId];
      if (!itemTrans) return fallback;
      const langTrans = itemTrans[language];
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
      value={{ language, setLanguage, t, tCategory, tCountry, tCatalogContent }}
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
