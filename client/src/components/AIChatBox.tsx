import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, User, Sparkles, RotateCcw, Copy, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

/**
 * Message type matching server-side LLM Message interface
 */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: Date;
};

export type AIChatBoxProps = {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onClearMessages?: () => void;
  isLoading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  placeholder?: string;
  className?: string;
  emptyStateMessage?: string;
  suggestedPrompts?: string[];
  newChatLabel?: string;
  copyLabel?: string;
  errorMessage?: string;
  retryLabel?: string;
};

/**
 * Strips non-Georgian / non-Latin Unicode blocks from AI responses
 * to prevent Bengali, Korean, Japanese, Chinese characters slipping in.
 */
function cleanNonGeorgianText(text: string): string {
  // Keep: Georgian (U+10A0–U+10FF), Extended Georgian (U+2D00–U+2D2F, U+1C90–U+1CBF),
  //       Latin, digits, punctuation, whitespace, common symbols, emoji
  return text.replace(/[\u0980-\u09FF\uAC00-\uD7AF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, "");
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AIChatBox({
  messages,
  onSendMessage,
  onClearMessages,
  isLoading = false,
  error = false,
  onRetry,
  placeholder = "Type your message...",
  className,
  emptyStateMessage = "Start a conversation with AI",
  suggestedPrompts,
  newChatLabel = "New chat",
  copyLabel = "Copy",
  errorMessage = "An error occurred. Please try again.",
  retryLabel = "Retry",
}: AIChatBoxProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter out system messages for display
  const displayMessages = messages.filter((msg) => msg.role !== "system");

  // Scroll to bottom when messages change or loading starts
  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;
    onSendMessage(trimmedInput);
    setInput("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-card text-card-foreground rounded-lg border shadow-sm min-h-0",
        className
      )}
    >
      {/* Card header with "New chat" button */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" />
          <span>AI Assistant</span>
        </div>
        {onClearMessages && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearMessages}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5 mr-1" />
            {newChatLabel}
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-hidden">
        {displayMessages.length === 0 && !error ? (
          <div className="flex h-full flex-col p-4">
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="size-12 opacity-20" />
                <p className="text-sm">{emptyStateMessage}</p>
              </div>

              {suggestedPrompts && suggestedPrompts.length > 0 && (
                <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onSendMessage(prompt)}
                      disabled={isLoading}
                      className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col space-y-4 p-4">
              {displayMessages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3 group",
                    message.role === "user"
                      ? "justify-end items-start"
                      : "justify-start items-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="size-4 text-primary" />
                    </div>
                  )}

                  <div className={cn("flex flex-col", message.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2.5",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-base dark:prose-invert max-w-none text-[15px]">
                          <Streamdown>{cleanNonGeorgianText(message.content)}</Streamdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-base">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {/* Timestamp + copy button */}
                    <div className={cn(
                      "flex items-center gap-1.5 mt-0.5 px-1",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}>
                      {message.timestamp && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </span>
                      )}
                      {message.role === "assistant" && (
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                          onClick={() => navigator.clipboard.writeText(message.content)}
                          aria-label={copyLabel}
                          title={copyLabel}
                        >
                          <Copy className="size-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="size-8 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                      <User className="size-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start items-start">
                  <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="rounded-lg px-4 py-3 bg-muted">
                    <div className="flex gap-1.5 items-center">
                      <div className="size-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                      <div className="size-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                      <div className="size-2 rounded-full bg-foreground/40 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && !isLoading && (
                <div className="flex gap-3 justify-start items-start">
                  <div className="size-8 shrink-0 mt-1 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="size-4 text-destructive" />
                  </div>
                  <div className="rounded-lg px-4 py-2.5 bg-destructive/10 text-destructive max-w-[80%]">
                    <p className="text-sm">{errorMessage}</p>
                    {onRetry && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                        className="mt-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        {retryLabel}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t bg-background/50 items-end shrink-0"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 max-h-32 resize-none min-h-9 text-base"
          rows={1}
          aria-label="შეკითხვა გრანტების შესახებ"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className="shrink-0 h-[38px] w-[38px]"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
