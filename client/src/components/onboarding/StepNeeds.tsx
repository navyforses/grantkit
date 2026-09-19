/*
 * StepNeeds — pick integration domains (the 11-domain taxonomy in
 * shared/domains.ts). Domain keys are what the profile's `needs` field stores.
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DOMAIN_KEYS, type Domain } from "@shared/domains";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepNeedsProps {
  needs: Domain[];
  onUpdate: (needs: Domain[]) => void;
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
}

export default function StepNeeds({ needs, onUpdate, onBack, onFinish, saving }: StepNeedsProps) {
  const { t } = useLanguage();

  const toggle = (domain: Domain) => {
    onUpdate(needs.includes(domain) ? needs.filter((n) => n !== domain) : [...needs, domain]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">{t.onboardingV2.stepNeeds}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.onboardingV2.stepNeedsHint}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DOMAIN_KEYS.map((domain) => {
          const checked = needs.includes(domain);
          return (
            <label
              key={domain}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                checked ? "border-brand-green bg-brand-green/5" : "border-border"
              }`}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(domain)} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block font-medium">{t.domains[domain].label}</span>
                <span className="block text-xs text-muted-foreground">{t.domains[domain].description}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>{t.profile.back}</Button>
        <Button className="bg-brand-green hover:bg-brand-green-hover" disabled={saving} onClick={onFinish}>
          {t.profile.finish}
        </Button>
      </div>
    </div>
  );
}
