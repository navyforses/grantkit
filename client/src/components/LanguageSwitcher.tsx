import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === language)!;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium
          bg-muted hover:bg-muted text-foreground/80 transition-colors border border-border"
        aria-label="Select language"
      >
        <Globe className="w-4 h-4 text-muted-foreground" />
        <span className="hidden sm:inline">{current.flag} {current.nativeName}</span>
        <span className="sm:hidden">{current.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card rounded-xl shadow-xl border border-border py-1 z-50 overflow-hidden">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors
                ${language === lang.code
                  ? "bg-brand-green/10 text-brand-green font-semibold"
                  : "text-foreground/80 hover:bg-secondary"
                }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.nativeName}</span>
              <span className="text-muted-foreground/60 text-xs ml-auto">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
