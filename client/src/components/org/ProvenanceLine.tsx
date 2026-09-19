/*
 * ProvenanceLine — one muted line under a contact fact (phone / email):
 * "Last checked {date} · source: {source}" or "Unverified — call to
 * double-check". Rules live in client/src/lib/orgTrust.ts (D7/D8).
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { formatProvenance, provenanceState } from "@/lib/orgTrust";

interface Props {
  verifiedAt: Date | string | null | undefined;
  source: string | null | undefined;
  className?: string;
}

export default function ProvenanceLine({ verifiedAt, source, className = "" }: Props) {
  const { t, language } = useLanguage();
  const state = provenanceState(verifiedAt, source);
  const tone =
    state.kind === "verified"
      ? "text-emerald-300/80"
      : state.kind === "stale"
      ? "text-amber-300/80"
      : "text-muted-foreground/70";
  return (
    <p
      data-provenance={state.kind}
      className={`text-[11px] leading-snug ${tone} ${className}`}
    >
      {formatProvenance(t.orgTrust, state, language)}
    </p>
  );
}
