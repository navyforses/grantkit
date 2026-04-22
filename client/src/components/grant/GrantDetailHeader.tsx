/*
 * GrantDetailHeader — sticky top bar for the grant detail page.
 *
 * Replaces the global Navbar on /grant/:id so the detail page reads as
 * a focused inspector (matches the approved Phase 5 mock). The user
 * navigates away via the back-arrow or ✕ button.
 *
 * Layout:
 *   [←] [breadcrumb: home / catalog / name]          [Save] [Share] [AI] [✕]
 *
 * On <sm the breadcrumb collapses to just the current item; the action
 * cluster stays the same.
 */

import { Link } from "wouter";
import { ArrowLeft, Bookmark, BookmarkCheck, Share2, Sparkles, X } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  breadcrumb: BreadcrumbItem[];    // last item is current page (href omitted)
  isAuthenticated: boolean;
  isSaved: boolean;
  saveLabel: string;
  savedLabel: string;
  shareLabel: string;
  aiLabel: string;
  closeLabel: string;
  backLabel: string;
  onToggleSave?: () => void;
  onShare: () => void;
  onOpenAi: () => void;
  backHref?: string;               // fallback when history is empty (default /catalog)
}

export default function GrantDetailHeader({
  breadcrumb,
  isAuthenticated,
  isSaved,
  saveLabel,
  savedLabel,
  shareLabel,
  aiLabel,
  closeLabel,
  backLabel,
  onToggleSave,
  onShare,
  onOpenAi,
  backHref = "/catalog",
}: Props) {
  const current = breadcrumb[breadcrumb.length - 1];
  const trail = breadcrumb.slice(0, -1);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = backHref;
    }
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 px-3 sm:px-5 h-12">
        <button
          type="button"
          onClick={goBack}
          aria-label={backLabel}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
          <ol className="flex items-center gap-1.5 text-[13px] text-muted-foreground/80 overflow-hidden">
            {trail.map((item, i) => (
              <li key={i} className="hidden sm:flex items-center gap-1.5 shrink-0">
                {item.href ? (
                  <Link href={item.href} className="hover:text-foreground/90 transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
                <span aria-hidden className="text-muted-foreground/40">/</span>
              </li>
            ))}
            <li className="min-w-0">
              <span
                className="text-foreground/90 font-medium truncate block"
                aria-current="page"
                title={current?.label}
              >
                {current?.label}
              </span>
            </li>
          </ol>
        </nav>

        <div className="shrink-0 flex items-center gap-0.5">
          {isAuthenticated && onToggleSave && (
            <button
              type="button"
              onClick={onToggleSave}
              aria-label={isSaved ? savedLabel : saveLabel}
              className={`flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium transition-colors ${
                isSaved
                  ? "text-yellow-400 hover:bg-yellow-400/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSaved ? savedLabel : saveLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onShare}
            aria-label={shareLabel}
            className="flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{shareLabel}</span>
          </button>
          <button
            type="button"
            onClick={onOpenAi}
            aria-label={aiLabel}
            className="flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium text-[color:var(--brand-green)] hover:bg-[color:var(--brand-green)]/10 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{aiLabel}</span>
          </button>
          <button
            type="button"
            onClick={goBack}
            aria-label={closeLabel}
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
