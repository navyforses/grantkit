/*
 * ⚠️ LEGACY — only rendered by EntityDetail.tsx (/grant/:id fallback).
 * See CLAUDE.md → LEGACY for the full list + removal plan.
 *
 * MatchSummary — "Your Match: N/M" card with per-criterion checklist.
 *
 * Renders the result of computeMatch() as a green-bordered panel. Each
 * criterion shows ✓ / ✗ / ? according to its `status`. For "unknown"
 * criteria we link to /profile so the user can fill in the missing data.
 *
 * Returns null when result is null (no criteria to score) — caller does
 * not need to guard.
 */

import { Link } from "wouter";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { MatchResult } from "@/lib/computeMatch";

interface Props {
  result: MatchResult | null;
  title: string;                        // "Your Match"
  matchFormat: (n: number, m: number) => string; // formatter for "3/4"
  profileHref?: string;
}

export default function MatchSummary({ result, title, matchFormat, profileHref = "/profile" }: Props) {
  if (!result || result.total === 0) return null;

  const accent =
    result.matched === result.total
      ? "border-emerald-500/40 bg-emerald-500/5"
      : result.matched >= Math.ceil(result.total / 2)
      ? "border-emerald-500/30 bg-emerald-500/[0.04]"
      : "border-amber-500/30 bg-amber-500/[0.04]";

  return (
    <div className={`rounded-xl border ${accent} p-4`}>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          {title}
        </p>
        <p className="text-sm font-bold text-emerald-300">
          {matchFormat(result.matched, result.total)}
        </p>
      </div>
      <ul className="space-y-2">
        {result.criteria.map((c) => (
          <li key={c.key} className="flex items-start gap-2 text-sm">
            {c.status === "match" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            )}
            {c.status === "no_match" && (
              <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            )}
            {c.status === "unknown" && (
              <HelpCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <span className="flex-1 min-w-0">
              <span className="font-medium text-foreground/80">{c.label}: </span>
              <span className="text-muted-foreground truncate">{c.value}</span>
              {c.status === "unknown" && (
                <Link
                  href={profileHref}
                  className="ml-1 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  →
                </Link>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
