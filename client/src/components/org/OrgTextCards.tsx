/*
 * ServicesOfferedCard / TargetAudienceCard — France import prose fields
 * (Phase 1.6). Text arrives already localised by the page (translations[lang]
 * with pickLocalized fallback); each card hides when the field is empty.
 */
import { ListChecks, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

function TextCard({ title, text, icon, testId }: { title: string; text: string | null; icon: React.ReactNode; testId: string }) {
  if (!text?.trim()) return null;
  return (
    <div className="bg-muted/40 border border-border rounded-xl p-5" data-testid={testId}>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  );
}

export function ServicesOfferedCard({ text }: { text: string | null }) {
  const { t } = useLanguage();
  return (
    <TextCard
      title={t.orgFrance.servicesTitle}
      text={text}
      icon={<ListChecks className="w-3.5 h-3.5 text-[color:var(--brand-green)]" aria-hidden />}
      testId="services-offered-card"
    />
  );
}

export function TargetAudienceCard({ text }: { text: string | null }) {
  const { t } = useLanguage();
  return (
    <TextCard
      title={t.orgFrance.audienceTitle}
      text={text}
      icon={<Users className="w-3.5 h-3.5 text-[color:var(--brand-green)]" aria-hidden />}
      testId="target-audience-card"
    />
  );
}
