import { X, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ParsedGrant } from "./GrantCard";

interface GrantFocusChipProps {
  grant: ParsedGrant;
  onClose: () => void;
  focusLabel?: string;
  removeFocusLabel?: string;
  className?: string;
}

export function GrantFocusChip({
  grant,
  onClose,
  focusLabel = "Focus:",
  removeFocusLabel = "Remove focus",
  className,
}: GrantFocusChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: -6, scaleY: 0.92 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "mx-3 my-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 shrink-0",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Target className="size-3.5 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                {focusLabel}
              </span>
              <span className="text-[11px] font-semibold text-foreground truncate max-w-[200px]">
                {grant.name}
              </span>
            </div>
            {(grant.organization || grant.country || grant.amount) && (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {grant.organization && (
                  <span className="text-[10px] text-muted-foreground">
                    🏢 {grant.organization}
                  </span>
                )}
                {grant.country && (
                  <span className="text-[10px] text-muted-foreground">
                    📍 {grant.country}
                  </span>
                )}
                {grant.amount && (
                  <span className="text-[10px] text-muted-foreground">
                    💰 {grant.amount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={removeFocusLabel}
          title={removeFocusLabel}
          className="shrink-0 p-0.5 rounded hover:bg-primary/15 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
