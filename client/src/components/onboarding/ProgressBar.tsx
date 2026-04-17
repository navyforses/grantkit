import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: 3;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  const { t } = useLanguage();
  const labels = [t.profile.stepCountry, t.profile.stepPurpose, t.profile.stepNeeds];

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center">
        {labels.map((label, i) => {
          const step = i + 1;
          const isComplete = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full border text-xs",
                    isComplete && "border-brand-green bg-brand-green text-white",
                    isCurrent && "border-brand-green bg-brand-green text-white",
                    !isComplete && !isCurrent && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : step}
                  {isCurrent && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-brand-green"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className="text-center text-[10px] text-muted-foreground md:text-xs">{label}</span>
              </div>
              {step < labels.length && (
                <div className={cn("mx-2 h-0.5 flex-1 rounded", isComplete ? "bg-brand-green" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
