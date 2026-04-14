import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  PURPOSE_OPTIONS,
  PURPOSE_DETAIL_OPTIONS,
  type Purpose,
  type PurposeDetail,
} from "@shared/profileTypes";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface StepPurposeProps {
  purposes: Purpose[];
  purposeDetails: PurposeDetail[];
  onUpdate: (purposes: Purpose[], details: PurposeDetail[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const purposeLabelKey: Record<Purpose, "purposeEducation" | "purposeMedical" | "purposeBusiness"> = {
  EDUCATION: "purposeEducation",
  MEDICAL: "purposeMedical",
  BUSINESS: "purposeBusiness",
};

export default function StepPurpose({
  purposes,
  purposeDetails,
  onUpdate,
  onNext,
  onBack,
}: StepPurposeProps) {
  const { t } = useLanguage();

  const togglePurpose = (purpose: Purpose) => {
    const selected = purposes.includes(purpose);
    const nextPurposes = selected ? purposes.filter((p) => p !== purpose) : [...purposes, purpose];

    const removedDetails = new Set(
      (selected ? PURPOSE_DETAIL_OPTIONS[purpose] : []).map((d) => d.value)
    );
    const nextDetails = selected
      ? purposeDetails.filter((d) => !removedDetails.has(d))
      : purposeDetails;

    onUpdate(nextPurposes, nextDetails);
  };

  const toggleDetail = (detail: PurposeDetail) => {
    const exists = purposeDetails.includes(detail);
    onUpdate(
      purposes,
      exists ? purposeDetails.filter((d) => d !== detail) : [...purposeDetails, detail]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">{t.profile.stepPurpose}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.profile.stepPurposeHint}</p>
      </div>

      <div className="space-y-3">
        {PURPOSE_OPTIONS.map((option) => {
          const selected = purposes.includes(option.value);
          return (
            <motion.div key={option.value} layout className="rounded-xl border border-border bg-card p-4">
              <button
                type="button"
                onClick={() => togglePurpose(option.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  selected ? "border-brand-green bg-brand-green/5" : "border-border"
                )}
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="font-medium text-foreground">{t.profile[purposeLabelKey[option.value]]}</span>
              </button>

              {selected && (
                <div className="mt-3 space-y-2 pl-2">
                  {PURPOSE_DETAIL_OPTIONS[option.value].map((detail) => (
                    <label key={detail.value} className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={purposeDetails.includes(detail.value)}
                        onCheckedChange={() => toggleDetail(detail.value)}
                      />
                      <span>{t.profile[detail.labelKey.split(".")[1] as keyof typeof t.profile]}</span>
                    </label>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>{t.profile.back}</Button>
        <Button className="bg-brand-green hover:bg-brand-green-hover" disabled={purposes.length === 0} onClick={onNext}>
          {t.profile.next}
        </Button>
      </div>
    </div>
  );
}
