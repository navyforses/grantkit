/*
 * GrantDetailPanel — Slide-in detail drawer for a selected map marker.
 *
 * Desktop (md+): 400px panel slides in from the right edge of the map container.
 * Mobile (<md):  full-width sheet slides up from the bottom (max 78dvh).
 *
 * Opened when the user clicks an individual marker on the map (Phase 4).
 * Closed by the X button, the Escape key, or clicking the backdrop (mobile).
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bookmark, BookmarkCheck, Globe, Mail, Phone,
  MapPin, Calendar, DollarSign, Tag, ExternalLink,
} from "lucide-react";
import { type CatalogItem, CATEGORIES, getCategoryStyle } from "@/lib/constants";
import { useIsMobile } from "@/hooks/useMobile";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  item: CatalogItem | null;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function categoryIcon(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.icon ?? "📁";
}

/** Format a location string from country / state / city fields. */
function formatLocation(country: string, state: string, city: string): string {
  const skip = /^(nationwide|national|international|n\/a|all\s)$/i;
  const parts = [city, state, country].filter((p) => p && !skip.test(p.trim()));
  return parts.join(", ");
}

/** Return null if the field is empty / placeholder value. */
function present(v?: string | null): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  if (trimmed === "" || trimmed === "N/A" || trimmed === "n/a" || trimmed === "-") return null;
  return trimmed;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-foreground">
      <span className="flex-shrink-0 mt-0.5 text-muted-foreground">{icon}</span>
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

function LinkButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
        "bg-secondary/60 border border-border hover:bg-secondary",
        "text-foreground transition-colors truncate",
      ].join(" ")}
    >
      <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate">{label}</span>
      <ExternalLink className="w-3 h-3 flex-shrink-0 text-muted-foreground ml-auto" />
    </a>
  );
}

// ── Panel content ─────────────────────────────────────────────────────────────

function PanelContent({ item, isSaved, onToggleSave, onClose }: Props & { item: CatalogItem }) {
  const { tCategory } = useLanguage();

  const location = formatLocation(item.country, item.state, item.city);
  const catStyle  = getCategoryStyle(item.category);
  const catIcon   = categoryIcon(item.category);

  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky header ── */}
      <div className="flex-shrink-0 flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type badge */}
          <span
            className={[
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
              catStyle,
            ].join(" ")}
          >
            <span>{catIcon}</span>
            <span>{tCategory(item.category)}</span>
          </span>
          {/* Grant / Resource */}
          <span
            className={[
              "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
              item.type === "grant"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800",
            ].join(" ")}
          >
            {item.type === "grant" ? "Grant" : "Resource"}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Save button */}
          <button
            type="button"
            onClick={onToggleSave}
            aria-label={isSaved ? "Unsave" : "Save"}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            {isSaved
              ? <BookmarkCheck className="w-4.5 h-4.5 text-primary" />
              : <Bookmark className="w-4.5 h-4.5 text-muted-foreground" />
            }
          </button>
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">

        {/* Name + org */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground leading-snug">{item.name}</h2>
          {present(item.organization) && (
            <p className="text-sm text-muted-foreground">{item.organization}</p>
          )}
        </div>

        {/* Key metrics */}
        {(present(item.amount) || present(item.deadline) || present(item.status)) && (
          <div className="grid grid-cols-2 gap-2">
            {present(item.amount) && (
              <div className="flex flex-col gap-0.5 bg-secondary/50 rounded-lg px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Amount
                </span>
                <span className="text-sm font-semibold text-foreground">{item.amount}</span>
              </div>
            )}
            {present(item.deadline) && (
              <div className="flex flex-col gap-0.5 bg-secondary/50 rounded-lg px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Deadline
                </span>
                <span className="text-sm font-semibold text-foreground">{item.deadline}</span>
              </div>
            )}
            {present(item.status) && (
              <div className="flex flex-col gap-0.5 bg-secondary/50 rounded-lg px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Status
                </span>
                <span className="text-sm font-semibold text-foreground">{item.status}</span>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        {present(location) && (
          <InfoRow icon={<MapPin className="w-4 h-4" />} text={location} />
        )}

        {/* Description */}
        {present(item.description) && (
          <Section title="Description">
            <p className="text-sm text-foreground leading-relaxed">{item.description}</p>
          </Section>
        )}

        {/* Eligibility */}
        {present(item.eligibility) && (
          <Section title="Eligibility">
            <p className="text-sm text-foreground leading-relaxed">{item.eligibility}</p>
          </Section>
        )}

        {/* Extra filters as inline chips */}
        {(present(item.fundingType) || present(item.targetDiagnosis) ||
          present(item.ageRange) || present(item.b2VisaEligible)) && (
          <Section title="Details">
            <div className="flex flex-wrap gap-1.5">
              {present(item.fundingType) && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary border border-border text-foreground">
                  {item.fundingType}
                </span>
              )}
              {present(item.targetDiagnosis) && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary border border-border text-foreground">
                  {item.targetDiagnosis}
                </span>
              )}
              {present(item.ageRange) && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary border border-border text-foreground">
                  Ages: {item.ageRange}
                </span>
              )}
              {present(item.b2VisaEligible) && item.b2VisaEligible.toLowerCase() === "yes" && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
                  B2 Visa Eligible
                </span>
              )}
            </div>
          </Section>
        )}

        {/* Application process */}
        {present(item.applicationProcess) && (
          <Section title="How to Apply">
            <p className="text-sm text-foreground leading-relaxed">{item.applicationProcess}</p>
          </Section>
        )}

        {/* Documents required */}
        {present(item.documentsRequired) && (
          <Section title="Documents Required">
            <p className="text-sm text-foreground leading-relaxed">{item.documentsRequired}</p>
          </Section>
        )}

        {/* Links */}
        {(present(item.website) || present(item.email) || present(item.phone)) && (
          <Section title="Contact">
            <div className="space-y-2">
              {present(item.website) && (
                <LinkButton
                  href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
                  icon={<Globe className="w-4 h-4" />}
                  label={item.website}
                />
              )}
              {present(item.email) && (
                <LinkButton
                  href={`mailto:${item.email}`}
                  icon={<Mail className="w-4 h-4" />}
                  label={item.email}
                />
              )}
              {present(item.phone) && (
                <LinkButton
                  href={`tel:${item.phone}`}
                  icon={<Phone className="w-4 h-4" />}
                  label={item.phone}
                />
              )}
            </div>
          </Section>
        )}

        {/* Bottom padding so last item clears the scroll shadow */}
        <div className="h-2" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GrantDetailPanel({ item, isSaved, onToggleSave, onClose }: Props) {
  const isMobile = useIsMobile();

  // Close on Escape
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Mobile backdrop */}
          {isMobile && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/30 z-20 md:hidden"
            />
          )}

          {/* Panel */}
          <motion.div
            key="panel"
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={[
              // Positioning
              "absolute z-30",
              // Mobile: bottom sheet
              isMobile
                ? "bottom-0 left-0 right-0 rounded-t-2xl max-h-[78dvh]"
                : "top-0 right-0 h-full w-[400px]",
              // Surfaces
              "bg-background border-border",
              isMobile ? "border-t" : "border-l",
              "shadow-2xl",
              // Flex
              "flex flex-col overflow-hidden",
            ].join(" ")}
          >
            {/* Mobile drag handle */}
            {isMobile && (
              <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
            )}

            <PanelContent
              item={item}
              isSaved={isSaved}
              onToggleSave={onToggleSave}
              onClose={onClose}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
