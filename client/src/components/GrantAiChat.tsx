/*
 * ⚠️ LEGACY — only imported by EntityDetail.tsx (/grant/:id fallback).
 * New AI-chat work should target OrgAiChat.tsx. See CLAUDE.md → LEGACY.
 *
 * GrantAiChat — Claude-style chat panel scoped to a single grant.
 *
 * Wraps AIChatBox and trpc.ai.grantChat with the grant's details baked
 * into every request (via buildGrantFocusContext). Consumed by the
 * GrantDetail page's "AI chat" tab and the map's slide-in panel.
 *
 * History is kept client-side; sending a new grant resets the thread.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { buildGrantFocusContext, type FocusedGrantContext } from "@/lib/grantFocusContext";
import { useLanguage } from "@/contexts/LanguageContext";

export interface GrantAiChatProps {
  /** Stable identifier — used to reset the chat when the caller swaps grants. */
  grantId: string;
  /**
   * Grant details prepended to every request. Pass as many fields as you
   * have — the context builder ignores missing ones.
   */
  grant: FocusedGrantContext;
  className?: string;
  /** When false the AIChatBox keeps its own header. Defaults to true (embedded). */
  hideHeader?: boolean;
}

export default function GrantAiChat({
  grantId,
  grant,
  className,
  hideHeader = true,
}: GrantAiChatProps) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastInput, setLastInput] = useState<{
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  } | null>(null);

  const grantChat = trpc.ai.grantChat.useMutation();

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const mutateRef = useRef(grantChat.mutate);
  mutateRef.current = grantChat.mutate;
  const resetRef = useRef(grantChat.reset);
  resetRef.current = grantChat.reset;

  // Reset the thread when the caller switches to a different grant.
  const prevGrantId = useRef(grantId);
  useEffect(() => {
    if (grantId !== prevGrantId.current) {
      setMessages([]);
      setLastInput(null);
      resetRef.current();
      prevGrantId.current = grantId;
    }
  }, [grantId]);

  const handleSend = useCallback(
    (content: string) => {
      const history = messagesRef.current
        .filter(
          (m): m is Message & { role: "user" | "assistant" } =>
            m.role === "user" || m.role === "assistant",
        )
        .map((m) => ({ role: m.role, content: m.content }));

      const apiMessage = buildGrantFocusContext(content, grant, language);
      const input = { message: apiMessage, history };
      setLastInput(input);
      setMessages((prev) => [...prev, { role: "user", content, timestamp: new Date() }]);

      mutateRef.current(input, {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply, timestamp: new Date() },
          ]);
        },
      });
    },
    [grant, language],
  );

  const handleRetry = useCallback(() => {
    if (!lastInput) return;
    mutateRef.current(lastInput, {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, timestamp: new Date() },
        ]);
      },
    });
  }, [lastInput]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setLastInput(null);
    resetRef.current();
  }, []);

  const suggestedPrompts = useMemo(
    () => t.aiAssistant.grantSuggestedPrompts ?? [
      t.aiAssistant.suggestedPrompts?.[0] ?? "How do I apply?",
      "Am I eligible?",
      "Tell me more",
    ],
    [t],
  );

  const truncatedName = grant.name.length > 30 ? grant.name.slice(0, 30) + "…" : grant.name;

  return (
    <AIChatBox
      className={className}
      messages={messages}
      onSendMessage={handleSend}
      onClearMessages={handleClear}
      isLoading={grantChat.isPending}
      error={grantChat.isError}
      onRetry={handleRetry}
      hideHeader={hideHeader}
      emptyStateMessage={t.aiAssistant.emptyState}
      suggestedPrompts={suggestedPrompts}
      placeholder={t.aiAssistant.focusPlaceholder.replace("{grantName}", truncatedName)}
      focusedGrant={grant}
      focusLabel={t.aiAssistant.focusLabel}
      removeFocusLabel={t.aiAssistant.removeFocus}
      newChatLabel={t.aiAssistant.newChat}
      copyLabel={t.aiAssistant.copy}
      errorMessage={t.aiAssistant.error}
      retryLabel={t.aiAssistant.retry}
    />
  );
}
