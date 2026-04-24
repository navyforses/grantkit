/*
 * WhoWeHelpCard — the five accessibility signals for newcomers.
 *
 * Renders languages + immigration-status + insurance + cost + appointment
 * as a single card. Every row renders, even with missing data — unknown
 * rows show a greyed placeholder + alert icon so the user sees the
 * structure and the admin team sees what still needs filling.
 *
 * Rows fade/slide-in staggered on viewport entry.
 */

import { motion } from "framer-motion";
import { AlertCircle, DollarSign, Globe, HeartPulse, Languages, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  appointmentLabel,
  costLabel,
  formatLanguageName,
  insuranceLabel,
  isKnownEnum,
  parseLanguages,
  statusLabel,
  type AcceptsUndocumented,
  type AcceptsUninsured,
  type AppointmentPolicy,
  type ServiceCost,
} from "@/lib/orgEnrichment";

interface Props {
  languages: string | null;
  acceptsUndocumented: AcceptsUndocumented;
  acceptsUninsured: AcceptsUninsured;
  serviceCost: ServiceCost;
  appointmentPolicy: AppointmentPolicy;
}

export default function WhoWeHelpCard(props: Props) {
  const { t, language } = useLanguage();
  const e = t.orgEnrichment;

  const languageCodes = parseLanguages(props.languages);
  const languageList = languageCodes
    .map((code) => formatLanguageName(code, language))
    .filter(Boolean);

  type Row = {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone: "active" | "muted";
  };

  const rows: Row[] = [
    {
      icon: <Languages className="w-4 h-4" aria-hidden />,
      label: e.languagesLabel,
      value: languageList.length > 0 ? languageList.join(" · ") : e.placeholderTbd,
      tone: languageList.length > 0 ? "active" : "muted",
    },
    {
      icon: <ShieldCheck className="w-4 h-4" aria-hidden />,
      label: e.statusLabel,
      value: statusLabel(e, props.acceptsUndocumented),
      tone: isKnownEnum(props.acceptsUndocumented) ? "active" : "muted",
    },
    {
      icon: <HeartPulse className="w-4 h-4" aria-hidden />,
      label: e.insuranceLabel,
      value: insuranceLabel(e, props.acceptsUninsured),
      tone: isKnownEnum(props.acceptsUninsured) ? "active" : "muted",
    },
    {
      icon: <DollarSign className="w-4 h-4" aria-hidden />,
      label: e.costLabel,
      value: costLabel(e, props.serviceCost),
      tone: isKnownEnum(props.serviceCost) ? "active" : "muted",
    },
    {
      icon: <Globe className="w-4 h-4" aria-hidden />,
      label: e.appointmentLabel,
      value: appointmentLabel(e, props.appointmentPolicy),
      tone: isKnownEnum(props.appointmentPolicy) ? "active" : "muted",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-muted/40 border border-border rounded-xl p-5"
    >
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[color:var(--brand-green)]" aria-hidden />
        {e.whoWeHelpTitle}
      </h2>
      <ul className="space-y-3">
        {rows.map((row, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.35, delay: 0.05 + i * 0.06 }}
            className="flex items-start gap-3 text-sm"
          >
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${
                row.tone === "active"
                  ? "bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)]"
                  : "bg-muted text-muted-foreground/60"
              }`}
            >
              {row.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {row.label}
              </div>
              <div
                className={`text-sm leading-snug ${
                  row.tone === "active" ? "text-foreground/90" : "text-muted-foreground/70 italic"
                }`}
              >
                {row.value}
              </div>
            </div>
            {row.tone === "muted" && (
              <AlertCircle
                className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1"
                aria-label="data missing"
              />
            )}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
