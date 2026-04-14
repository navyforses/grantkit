import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  NEED_OPTIONS,
  NEED_DETAIL_OPTIONS,
  type Need,
  type NeedDetail,
} from "@shared/profileTypes";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepNeedsProps {
  needs: Need[];
  needDetails: NeedDetail[];
  onUpdate: (needs: Need[], details: NeedDetail[]) => void;
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
}

export default function StepNeeds({ needs, needDetails, onUpdate, onBack, onFinish, saving }: StepNeedsProps) {
  const { t } = useLanguage();

  const toggleNeed = (need: Need) => {
    const exists = needs.includes(need);
    const nextNeeds = exists ? needs.filter((n) => n !== need) : [...needs, need];

    const detailValues = (NEED_DETAIL_OPTIONS[need] ?? []).map((d) => d.value);
    const nextDetails = exists
      ? needDetails.filter((d) => !detailValues.includes(d))
      : needDetails;

    onUpdate(nextNeeds, nextDetails);
  };

  const toggleDetail = (detail: NeedDetail) => {
    const exists = needDetails.includes(detail);
    onUpdate(needs, exists ? needDetails.filter((d) => d !== detail) : [...needDetails, detail]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">{t.profile.stepNeeds}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.profile.stepNeedsHint}</p>
      </div>

      <div className="space-y-3">
        {NEED_OPTIONS.map((need) => {
          const checked = needs.includes(need.value);
          const details = NEED_DETAIL_OPTIONS[need.value];

          return (
            <div key={need.value} className="rounded-xl border border-border p-3">
              <label className="flex items-center gap-3">
                <Checkbox checked={checked} onCheckedChange={() => toggleNeed(need.value)} />
                <span className="text-lg">{need.icon}</span>
                <span className="font-medium">{t.profile[need.labelKey.split(".")[1] as keyof typeof t.profile]}</span>
              </label>
              {checked && details && (
                <div className="mt-2 space-y-2 pl-7">
                  {details.map((detail) => (
                    <label key={detail.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={needDetails.includes(detail.value)}
                        onCheckedChange={() => toggleDetail(detail.value)}
                      />
                      <span>{t.profile[detail.labelKey.split(".")[1] as keyof typeof t.profile]}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
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
