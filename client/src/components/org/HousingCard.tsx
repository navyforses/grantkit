/*
 * HousingCard — organization_housing row (Phase 1.6, France import).
 * Only known fields render (D7: `unknown` enums and empty text are hidden);
 * the card is omitted entirely when nothing is known.
 */
import { Accessibility, Baby, Clock, Coins, ClipboardList, Home, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Translations } from "@/i18n/types";

export interface HousingInfo {
  housingType: string | null;
  capacity: string | null;
  maxStayDuration: string | null;
  registrationProcess: string | null;
  costDetails: string | null;
  childrenFriendly: string | null;
  disabledAccessible: string | null;
}

type YesNo = "yes" | "no";
const isYesNo = (v: string | null): v is YesNo => v === "yes" || v === "no";

export function housingRows(h: HousingInfo, f: Translations["orgFrance"]): Array<{ key: string; label: string; value: string }> {
  const rows: Array<{ key: string; label: string; value: string }> = [];
  const type = h.housingType as keyof typeof f.housingType | null;
  if (type && f.housingType[type]) rows.push({ key: "housingType", label: f.housingTypeLabel, value: f.housingType[type] });
  if (h.capacity?.trim()) rows.push({ key: "capacity", label: f.capacity, value: h.capacity });
  if (h.maxStayDuration?.trim()) rows.push({ key: "maxStayDuration", label: f.maxStay, value: h.maxStayDuration });
  if (h.registrationProcess?.trim()) rows.push({ key: "registrationProcess", label: f.registration, value: h.registrationProcess });
  if (h.costDetails?.trim()) rows.push({ key: "costDetails", label: f.cost, value: h.costDetails });
  if (isYesNo(h.childrenFriendly)) rows.push({ key: "childrenFriendly", label: f.childrenFriendly, value: f[h.childrenFriendly] });
  if (isYesNo(h.disabledAccessible)) rows.push({ key: "disabledAccessible", label: f.disabledAccessible, value: f[h.disabledAccessible] });
  return rows;
}

const ICONS: Record<string, React.ReactNode> = {
  housingType: <Home className="w-4 h-4" aria-hidden />,
  capacity: <Users className="w-4 h-4" aria-hidden />,
  maxStayDuration: <Clock className="w-4 h-4" aria-hidden />,
  registrationProcess: <ClipboardList className="w-4 h-4" aria-hidden />,
  costDetails: <Coins className="w-4 h-4" aria-hidden />,
  childrenFriendly: <Baby className="w-4 h-4" aria-hidden />,
  disabledAccessible: <Accessibility className="w-4 h-4" aria-hidden />,
};

export default function HousingCard({ housing }: { housing: HousingInfo | null }) {
  const { t } = useLanguage();
  if (!housing) return null;
  const rows = housingRows(housing, t.orgFrance);
  if (rows.length === 0) return null;

  return (
    <div className="bg-muted/40 border border-border rounded-xl p-5" data-testid="housing-card">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <Home className="w-3.5 h-3.5 text-[color:var(--brand-green)]" aria-hidden />
        {t.orgFrance.housingTitle}
      </h2>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.key} className="flex items-start gap-3 text-sm" data-testid={`housing-${row.key}`}>
            <span className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)]">
              {ICONS[row.key]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">{row.label}</div>
              <div className="text-sm leading-snug text-foreground/90 whitespace-pre-line">{row.value}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
