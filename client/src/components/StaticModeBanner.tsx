import { useApiHealth } from "@/hooks/useApiHealth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Info } from "lucide-react";

export function StaticModeBanner() {
  const { isStaticMode } = useApiHealth();
  const { t } = useLanguage();
  if (!isStaticMode) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
      <Info className="h-4 w-4 flex-shrink-0" />
      <span>{(t as any).staticMode?.banner || "Browsing in preview mode. Some features are limited."}</span>
    </div>
  );
}
