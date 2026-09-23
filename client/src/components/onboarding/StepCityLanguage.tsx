import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LANGUAGES, useLanguage, type Language } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface StepCityLanguageProps {
  city: string;
  language: Language;
  onCityChange: (city: string) => void;
  onLanguageChange: (language: Language) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepCityLanguage({ city, language, onCityChange, onLanguageChange, onBack, onNext }: StepCityLanguageProps) {
  const { t } = useLanguage();
  const s = t.onboardingV2;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">{s.stepCity}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{s.stepCityHint}</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">{s.cityLabel}</span>
        <Input
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder={s.cityPlaceholder}
          autoComplete="address-level2"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium">{s.languageLabel}</span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={s.languageLabel}>
          {LANGUAGES.map((option) => (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={language === option.code}
              onClick={() => onLanguageChange(option.code)}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium transition-colors",
                language === option.code
                  ? "border-brand-green ring-2 ring-brand-green/40"
                  : "border-border hover:border-brand-green/40",
              )}
            >
              <span aria-hidden>{option.flag}</span>
              {option.nativeName}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>{t.profile.back}</Button>
        <Button className="bg-brand-green hover:bg-brand-green-hover" onClick={onNext}>{t.profile.next}</Button>
      </div>
    </div>
  );
}
