// Dedicated module for catalog data — no other imports to avoid TDZ issues.
// catalogTranslations.json (1.2MB) already loads synchronously via the same
// pattern in LanguageContext.tsx, confirming Vite handles large JSON fine.
import catalog from "./catalog.json";

export const catalogItems: any[] = catalog;
export default catalogItems;
