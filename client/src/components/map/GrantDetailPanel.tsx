/*
 * GrantDetailPanel — Slide-in detail drawer for a selected map marker.
 *
 * Desktop (md+): 400px panel slides in from the right edge of the map container.
 * Mobile (<md):  full-width sheet slides up from the bottom (max 78dvh).
 *
 * Tabs:
 *   • Info  — grant details (Phase 5)
 *   • AI    — per-grant AI chat, pre-focused on the selected item (Phase 6)
 *
 * Opened when the user clicks an individual marker on the map (Phase 4).
 * Closed by the X button, the Escape key, or clicking the backdrop (mobile).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bookmark, BookmarkCheck, Globe, Mail, Phone,
  MapPin, Calendar, DollarSign, Tag, ExternalLink,
  Sparkles, Info,
} from "lucide-react";
import { type CatalogItem, CATEGORIES, getCategoryStyle } from "@/lib/constants";
import { useIsMobile } from "@/hooks/useMobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import type { ParsedGrant } from "@/components/GrantCard";
import { trpc } from "@/lib/trpc";
import { buildGrantFocusContext } from "@/lib/grantFocusContext";

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  item: CatalogItem | null;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
}

type Tab = "info" | "ai";

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

/** Convert CatalogItem to ParsedGrant for the AI focus chip. */
function toFocusGrant(item: CatalogItem): ParsedGrant {
  return {
    name: item.name,
    organization: present(item.organization) ?? undefined,
    country: present(item.country) ?? undefined,
    amount: present(item.amount) ?? undefined,
    deadline: present(item.deadline) ?? undefined,
    website: present(item.website) ?? undefined,
  };
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

// ── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex-shrink-0 flex border-b border-border">
      <button
        type="button"
        onClick={() => onChange("info")}
        className={[
          "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors",
          active === "info"
            ? "text-foreground border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground",
        ].join(" ")}
      >
        <Info className="w-3.5 h-3.5" />
        <span>{t.aiAssistant.fullInfo ?? "Info"}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("ai")}
        className={[
          "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors",
          active === "ai"
            ? "text-foreground border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground",
        ].join(" ")}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI Chat</span>
      </button>
    </div>
  );
}

// ── Info tab content ─────────────────────────────────────────────────────────

function InfoTabContent({ item }: { item: CatalogItem }) {
  const { tCategory } = useLanguage();

  const location = formatLocation(item.country, item.state, item.city);
  const catStyle  = getCategoryStyle(item.category);
  const catIcon   = categoryIcon(item.category);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">

      {/* Category + type badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={[
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
            catStyle,
          ].join(" ")}
        >
          <span>{catIcon}</span>
          <span>{tCategory(item.category)}</span>
        </span>
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
  );
}

// ── AI Chat tab content ──────────────────────────────────────────────────────

function AiTabContent({ item }: { item: CatalogItem }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastInput, setLastInput] = useState<{
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  } | null>(null);

  const grantChat = trpc.ai.grantChat.useMutation();

  const focusGrant = useMemo(() => toFocusGrant(item), [item]);

  // Reset chat when the selected grant changes
  const prevItemId = useRef(item.id);
  useEffect(() => {
    if (item.id !== prevItemId.current) {
      setMessages([]);
      setLastInput(null);
      grantChat.reset();
      prevItemId.current = item.id;
    }
  }, [item.id, grantChat]);

  const handleSend = useCallback(
    (content: string) => {
      const history = messages
        .filter(
          (m): m is Message & { role: "user" | "assistant" } =>
            m.role === "user" || m.role === "assistant",
        )
        .map((m) => ({ role: m.role, content: m.content }));

      const apiMessage = buildGrantFocusContext(content, focusGrant);
      const input = { message: apiMessage, history };
      setLastInput(input);
      setMessages((prev) => [...prev, { role: "user", content, timestamp: new Date() }]);

      grantChat.mutate(input, {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply, timestamp: new Date() },
          ]);
        },
      });
    },
    [messages, grantChat, focusGrant],
  );

  const handleRetry = useCallback(() => {
    if (!lastInput) return;
    grantChat.mutate(lastInput, {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, timestamp: new Date() },
        ]);
      },
    });
  }, [lastInput, grantChat]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setLastInput(null);
    grantChat.reset();
  }, [grantChat]);

  const suggestedPrompts = [
    t.aiAssistant.suggestedPrompts?.[0] ?? "How do I apply?",
    "Am I eligible for this?",
    "Tell me more about this grant",
  ];

  return (
    <AIChatBox
      className="flex-1 min-h-0 border-0 shadow-none rounded-none"
      messages={messages}
      onSendMessage={handleSend}
      onClearMessages={handleClear}
      isLoading={grantChat.isPending}
      error={grantChat.isError}
      onRetry={handleRetry}
      headerTitle={t.aiAssistant.title ?? "AI Assistant"}
      emptyStateMessage={t.aiAssistant.emptyState ?? "Ask me about this grant"}
      suggestedPrompts={suggestedPrompts}
      placeholder={
        (t.aiAssistant.focusPlaceholder ?? "Ask about {grantName}...").replace(
          "{grantName}",
          item.name.length > 30 ? item.name.slice(0, 30) + "…" : item.name,
        )
      }
      focusedGrant={focusGrant}
      focusLabel={t.aiAssistant.focusLabel ?? "Focus:"}
      removeFocusLabel={t.aiAssistant.removeFocus ?? "Remove focus"}
      newChatLabel={t.aiAssistant.newChat ?? "New chat"}
      copyLabel={t.aiAssistant.copy ?? "Copy"}
      errorMessage={t.aiAssistant.error ?? "An error occurred. Please try again."}
      retryLabel={t.aiAssistant.retry ?? "Retry"}
    />
  );
}

// ── Panel content (header + tabs + body) ─────────────────────────────────────

function PanelContent({
  item,
  isSaved,
  onToggleSave,
  onClose,
}: Props & { item: CatalogItem }) {
  const [tab, setTab] = useState<Tab>("info");

  // Reset to info tab when the grant changes
  const prevItemId = useRef(item.id);
  useEffect(() => {
    if (item.id !== prevItemId.current) {
      setTab("info");
      prevItemId.current = item.id;
    }
  }, [item.id]);

  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky header: name + actions ── */}
      <div className="flex-shrink-0 flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <h2 className="text-sm font-bold text-foreground leading-snug line-clamp-2 flex-1">
          {item.name}
        </h2>

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

      {/* ── Tab bar ── */}
      <TabBar active={tab} onChange={setTab} />

      {/* ── Tab content ── */}
      {tab === "info" ? (
        <InfoTabContent item={item} />
      ) : (
        <AiTabContent item={item} />
      )}
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
