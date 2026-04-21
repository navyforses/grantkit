/*
 * OrgAiChat — Claude-style chat panel scoped to a single organisation.
 *
 * Reuses `trpc.ai.grantChat` (the same endpoint that powers grant chat)
 * because the underlying `runGrantChatAssistant` already supports the
 * `fetch_org_website` tool and is framed for "grant or organisation"
 * context. The only difference versus GrantAiChat is the context
 * builder (buildOrgFocusContext) and the focus metadata object.
 *
 * History is kept client-side; swapping to a different org resets it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import type { ParsedGrant } from "@/components/GrantCard";
import { trpc } from "@/lib/trpc";
import { buildOrgFocusContext, type OrgFocus } from "@/lib/orgFocusContext";
import { useLanguage } from "@/contexts/LanguageContext";

export interface OrgAiChatProps {
  /** Stable identifier — used to reset the chat when the caller swaps orgs. */
  orgId: string;
  /** Organisation details that get prepended to every request. */
  org: OrgFocus;
  className?: string;
  hideHeader?: boolean;
}

export default function OrgAiChat({
  orgId,
  org,
  className,
  hideHeader = true,
}: OrgAiChatProps) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastInput, setLastInput] = useState<{
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  } | null>(null);

  const chat = trpc.ai.grantChat.useMutation();

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const mutateRef = useRef(chat.mutate);
  mutateRef.current = chat.mutate;
  const resetRef = useRef(chat.reset);
  resetRef.current = chat.reset;

  const prevOrgId = useRef(orgId);
  useEffect(() => {
    if (orgId !== prevOrgId.current) {
      setMessages([]);
      setLastInput(null);
      resetRef.current();
      prevOrgId.current = orgId;
    }
  }, [orgId]);

  const handleSend = useCallback(
    (content: string) => {
      const history = messagesRef.current
        .filter(
          (m): m is Message & { role: "user" | "assistant" } =>
            m.role === "user" || m.role === "assistant",
        )
        .map((m) => ({ role: m.role, content: m.content }));

      const apiMessage = buildOrgFocusContext(content, org, language);
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
    [org, language],
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
    () =>
      t.aiAssistant.grantSuggestedPrompts ?? [
        "What services does this organisation offer?",
        "Who is eligible for support here?",
        "How do I contact them?",
      ],
    [t],
  );

  // Adapt org to the ParsedGrant shape the AIChatBox focus chip expects.
  const focusedGrant: ParsedGrant = useMemo(
    () => ({
      name: org.name,
      organization: org.name,
      website: org.website || undefined,
      country: org.country || undefined,
    }),
    [org.name, org.website, org.country],
  );

  const truncatedName = org.name.length > 30 ? org.name.slice(0, 30) + "…" : org.name;

  return (
    <AIChatBox
      className={className}
      messages={messages}
      onSendMessage={handleSend}
      onClearMessages={handleClear}
      isLoading={chat.isPending}
      error={chat.isError}
      onRetry={handleRetry}
      hideHeader={hideHeader}
      emptyStateMessage={t.aiAssistant.emptyState}
      suggestedPrompts={suggestedPrompts}
      placeholder={t.aiAssistant.focusPlaceholder.replace("{grantName}", truncatedName)}
      focusedGrant={focusedGrant}
      focusLabel={t.aiAssistant.focusLabel}
      removeFocusLabel={t.aiAssistant.removeFocus}
      newChatLabel={t.aiAssistant.newChat}
      copyLabel={t.aiAssistant.copy}
      errorMessage={t.aiAssistant.error}
      retryLabel={t.aiAssistant.retry}
    />
  );
}
