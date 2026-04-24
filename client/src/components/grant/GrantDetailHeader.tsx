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
          className="flex-shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Breadcrumb — hidden on xs, visible sm+ */}
        <nav aria-label="breadcrumb" className="hidden sm:flex items-center gap-1 flex-1 min-w-0 text-sm">
          {trail.map((item, i) => (
            <span key={i} className="flex items-center gap-1 text-muted-foreground">
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground transition-colors truncate max-w-[120px]">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate max-w-[120px]">{item.label}</span>
              )}
              <span aria-hidden>/</span>
            </span>
          ))}
          {current && (
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {current.label}
            </span>
          )}
        </nav>

        {/* Mobile: just the current title */}
        <span className="sm:hidden flex-1 min-w-0 text-sm font-medium truncate">
          {current?.label}
        </span>

        {/* Action cluster */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {isAuthenticated && onToggleSave && (
            <button
              type="button"
              onClick={onToggleSave}
              aria-label={isSaved ? savedLabel : saveLabel}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-muted transition-colors"
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isSaved ? savedLabel : saveLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onShare}
            aria-label={shareLabel}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-muted transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{shareLabel}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAi}
            aria-label={aiLabel}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-muted transition-colors text-primary"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{aiLabel}</span>
          </button>

          <button
            type="button"
            onClick={goBack}
            aria-label={closeLabel}
            className="p-1.5 rounded-md hover:bg-muted transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
