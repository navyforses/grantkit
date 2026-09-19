/*
 * StepStatus — optional immigration-status question (Phase 1.3, D6).
 * The answer stays in this browser (localStorage) and is never sent to the
 * server; the step shows a one-line privacy note and "Skip".
 */
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { VIEWER_STATUSES, type ViewerStatus } from "@/lib/onboardingLocal";
import { cn } from "@/lib/utils";

interface StepStatusProps {
  status: ViewerStatus | null;
  onSelect: (status: ViewerStatus | null) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepStatus({ status, onSelect, onBack, onNext }: StepStatusProps) {
  const { t } = useLanguage();
  const s = t.onboardingV2;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">{s.stepStatus}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{s.stepStatusHint}</p>
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground" data-testid="status-privacy-note">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {s.privacyNote}
      </p>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={s.stepStatus}>
        {VIEWER_STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={status === value}
            onClick={() => onSelect(status === value ? null : value)}
            className={cn(
              "rounded-xl border p-3 text-left text-sm font-medium transition-colors",
              status === value ? "border-brand-green ring-2 ring-brand-green/40" : "border-border hover:border-brand-green/40",
            )}
          >
            {s.statuses[value]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>{t.profile.back}</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { onSelect(null); onNext(); }}>{t.profile.skip}</Button>
          <Button className="bg-brand-green hover:bg-brand-green-hover" onClick={onNext}>{t.profile.next}</Button>
        </div>
      </div>
    </div>
  );
}
