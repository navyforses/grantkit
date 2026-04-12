/*
 * AI Grant Assistant — powered by MCP Toolbox for Databases
 *
 * Full-viewport split-view layout:
 *  - Collapsible header (hides after first message)
 *  - Left: chat box (full width on mobile, 58% on desktop when grants found)
 *  - Right: grant cards panel (desktop only, slides in when grants are extracted)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { GrantCard, parseGrantsFromResponse, type ParsedGrant } from "@/components/GrantCard";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Sparkles, Database, Globe, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Builds the context prefix injected into the API message when focus mode is active.
 * The user sees their original message in the chat; the API receives this enriched version.
 */
function buildGrantFocusContext(userMessage: string, grant: ParsedGrant): string {
  const lines = [
    `[GRANT FOCUS: User is asking about "${grant.name}"${grant.organization ? ` by "${grant.organization}"` : ""}.`,
    "Grant details:",
    grant.amount ? `Amount: ${grant.amount}` : null,
    grant.country ? `Location: ${grant.country}` : null,
    grant.deadline ? `Deadline: ${grant.deadline}` : null,
    grant.website ? `Website: ${grant.website}` : null,
    "Answer specifically about this grant/organization. If the question is unrelated, politely note the focus and offer to remove it for a general search.]",
  ].filter(Boolean);

  return `${lines.join(" ")}\n\n${userMessage}`;
}

export default function AiAssistant() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastInput, setLastInput] = useState<{
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  } | null>(null);
  const [extractedGrants, setExtractedGrants] = useState<ParsedGrant[]>([]);
  const [focusedGrant, setFocusedGrant] = useState<ParsedGrant | null>(null);
  const [selectedGrantName, setSelectedGrantName] = useState<string | null>(null);

  // Keep a ref so callbacks always see the current focusedGrant without stale closure
  const focusedGrantRef = useRef<ParsedGrant | null>(null);
  focusedGrantRef.current = focusedGrant;

  // Lock body scroll for full-viewport chat layout
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  const grantChat = trpc.ai.grantChat.useMutation();

  const handleClearMessages = useCallback(() => {
    setMessages([]);
    setLastInput(null);
    setExtractedGrants([]);
    setFocusedGrant(null);
    setSelectedGrantName(null);
    grantChat.reset();
  }, [grantChat]);

  const handleSend = useCallback(
    (content: string) => {
      const history = messages
        .filter(
          (m): m is { role: "user" | "assistant"; content: string; timestamp?: Date } =>
            m.role === "user" || m.role === "assistant"
        )
        .map((m) => ({ role: m.role, content: m.content }));

      // Show original message in chat; enrich for API if in focus mode
      const currentFocus = focusedGrantRef.current;
      const apiMessage = currentFocus
        ? buildGrantFocusContext(content, currentFocus)
        : content;

      const input = { message: apiMessage, history };
      setLastInput(input);
      setMessages((prev) => [...prev, { role: "user", content, timestamp: new Date() }]);
      grantChat.mutate(input, {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply, timestamp: new Date() },
          ]);
          // Only update extracted grants when not in focus mode
          if (!focusedGrantRef.current) {
            setExtractedGrants(parseGrantsFromResponse(data.reply));
          }
        },
      });
    },
    [messages, grantChat]
  );

  const handleRetry = useCallback(() => {
    if (!lastInput) return;
    grantChat.mutate(lastInput, {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, timestamp: new Date() },
        ]);
        if (!focusedGrantRef.current) {
          setExtractedGrants(parseGrantsFromResponse(data.reply));
        }
      },
    });
  }, [lastInput, grantChat]);

  /** Called when a grant card is clicked in the sidebar */
  const handleGrantSelect = useCallback((grant: ParsedGrant) => {
    // Toggle: clicking the already-selected card deselects it
    if (selectedGrantName === grant.name) {
      setSelectedGrantName(null);
    } else {
      setSelectedGrantName(grant.name);
    }
  }, [selectedGrantName]);

  /** Called when "Ask about this grant" button in the expanded card is clicked */
  const handleAskAbout = useCallback((grant: ParsedGrant) => {
    setFocusedGrant(grant);
    setSelectedGrantName(grant.name);
  }, []);

  /** Clears focus mode and appends an info notification to the chat */
  const handleClearFocus = useCallback(() => {
    const name = focusedGrantRef.current?.name;
    setFocusedGrant(null);
    if (name) {
      setMessages((prev) => [
        ...prev,
        {
          role: "info",
          content: `${t.aiAssistant.focusRemoved}: ${name}`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [t.aiAssistant.focusRemoved]);

  const FEATURE_PILLS = [
    { icon: Database, label: t.aiAssistant.liveDatabase },
    { icon: Globe, label: t.aiAssistant.countries },
    { icon: Search, label: t.aiAssistant.grants },
  ];

  const hasMessages = messages.length > 0;
  const hasGrants = extractedGrants.length > 0;

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-[100dvh] overflow-hidden flex flex-col bg-secondary">
      <SEO
        title="AI Grant Assistant — GrantKit"
        description="Find grants and support resources using natural language. Powered by AI and the live GrantKit database of 640+ grants across 29 countries."
        canonicalPath="/ai-assistant"
      />
      <Navbar />

      <main className="flex-1 min-h-0 container py-2 md:py-3 pb-20 md:pb-3 flex flex-col gap-3 max-w-7xl overflow-hidden">

        {/* ── Collapsible header — hides after first message ── */}
        <div
          className={cn(
            "shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
            hasMessages ? "max-h-0 opacity-0" : "max-h-[200px] opacity-100"
          )}
        >
          <div className="flex flex-col gap-2 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground leading-tight">
                  {t.aiAssistant.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {t.aiAssistant.subtitle}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground max-w-2xl">
              {t.aiAssistant.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {FEATURE_PILLS.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-card border border-border text-muted-foreground px-3 py-1 rounded-full"
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content: chat + optional grants panel ── */}
        <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">

          {/* Chat box */}
          <AIChatBox
            messages={messages}
            onSendMessage={handleSend}
            onClearMessages={handleClearMessages}
            isLoading={grantChat.isPending}
            error={grantChat.isError}
            onRetry={handleRetry}
            placeholder={t.aiAssistant.placeholder}
            className={cn(
              "min-h-0 flex-1",
              hasGrants && "lg:flex-none lg:w-[58%]"
            )}
            headerTitle={t.aiAssistant.title}
            emptyStateMessage={t.aiAssistant.emptyState}
            newChatLabel={t.aiAssistant.newChat}
            copyLabel={t.aiAssistant.copy}
            errorMessage={t.aiAssistant.error}
            retryLabel={t.aiAssistant.retry}
            suggestedPrompts={t.aiAssistant.suggestedPrompts}
            focusedGrant={focusedGrant}
            onClearFocus={handleClearFocus}
            focusLabel={t.aiAssistant.focusLabel}
            removeFocusLabel={t.aiAssistant.removeFocus}
            focusPlaceholder={t.aiAssistant.focusPlaceholder}
          />

          {/* ── Grants panel — desktop only, slides in when grants are extracted ── */}
          <AnimatePresence>
            {hasGrants && (
              <motion.div
                key="grants-panel"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="hidden lg:flex flex-col w-[42%] shrink-0 min-h-0 gap-3 overflow-hidden"
              >
                {/* Panel header */}
                <div className="shrink-0 flex items-center gap-2 px-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    {t.aiAssistant.panelTitle} ({extractedGrants.length})
                  </h2>
                </div>

                {/* Staggered grant cards */}
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-1">
                  {extractedGrants.map((grant, i) => (
                    <motion.div
                      key={`${grant.name}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.06 }}
                    >
                      <GrantCard
                        grant={grant}
                        isSelected={selectedGrantName === grant.name}
                        onSelect={handleGrantSelect}
                        onAskAbout={handleAskAbout}
                        askAboutLabel={t.aiAssistant.askAboutGrant}
                        fullInfoLabel={t.aiAssistant.fullInfo}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
