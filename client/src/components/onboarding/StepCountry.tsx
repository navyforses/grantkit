import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { SUPPORTED_COUNTRIES } from "@shared/profileTypes";

interface StepCountryProps {
  selected: string | null;
  onSelect: (code: string) => void;
  onNext: () => void;
}

export default function StepCountry({ selected, onSelect, onNext }: StepCountryProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">{t.profile.stepCountry}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.profile.stepCountryHint}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SUPPORTED_COUNTRIES.map((country) => (
          <motion.button
            key={country.code}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(country.code)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              selected === country.code
                ? "border-brand-green ring-2 ring-brand-green/40"
                : "border-border hover:border-brand-green/40"
            )}
          >
            <div className="text-lg">{country.flag}</div>
            <div className="mt-1 text-sm font-medium">{t.country[country.code as keyof typeof t.country]}</div>
          </motion.button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button className="bg-brand-green hover:bg-brand-green-hover" disabled={!selected} onClick={onNext}>
          {t.profile.next}
        </Button>
      </div>
    </div>
  );
}
