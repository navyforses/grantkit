import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, DollarSign, Calendar, MessageCircle, Info, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export interface ParsedGrant {
  name: string;
  website?: string;
  organization?: string;
  amount?: string;
  country?: string;
  deadline?: string;
}

/**
 * Extracts structured grant data from an AI markdown response.
 * Looks for bold/heading titles nearest to each http link.
 */
export function parseGrantsFromResponse(text: string): ParsedGrant[] {
  const grants: ParsedGrant[] = [];
  const seen = new Set<string>();

  const linkPattern = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  let m: RegExpExecArray | null;

  while ((m = linkPattern.exec(text)) !== null) {
    const url = m[2];
    const linkIdx = m.index;

    // Look back up to 700 chars for the nearest bold title or numbered heading
    const lookbackStart = Math.max(0, linkIdx - 700);
    const lookback = text.substring(lookbackStart, linkIdx);

    const titlePattern =
      /(?:\*\*([^*\n]{3,80})\*\*|^#{1,4}\s+(.{3,80})$|\d+\.\s+\*\*([^*\n]{3,80})\*\*)/gm;
    const titles: string[] = [];
    let tm: RegExpExecArray | null;
    while ((tm = titlePattern.exec(lookback)) !== null) {
      const t = (tm[1] || tm[2] || tm[3] || "").trim();
      if (t) titles.push(t);
    }

    if (titles.length === 0) continue;
    const name = titles[titles.length - 1];

    if (seen.has(name)) continue;
    seen.add(name);

    const grant: ParsedGrant = { name, website: url };

    // Extract optional fields from the segment between the title and the link
    const lastTitlePos = lookback.lastIndexOf(name);
    const segment = lookback.substring(lastTitlePos);

    const orgMatch = segment.match(/[Oo]rganization[:\s]+([^\n*•\-\]]{1,60})/);
    if (orgMatch) grant.organization = orgMatch[1].trim().replace(/\*+/g, "");

    const amountMatch = segment.match(/[Aa]mount[:\s]+([^\n*•\-\]]{1,40})/);
    if (amountMatch) grant.amount = amountMatch[1].trim().replace(/\*+/g, "");

    const countryMatch = segment.match(/[Cc]ountry[:\s]+([^\n*•\-\]]{1,40})/);
    if (countryMatch) grant.country = countryMatch[1].trim().replace(/\*+/g, "");

    const deadlineMatch = segment.match(/[Dd]eadline[:\s]+([^\n*•\-\]]{1,40})/);
    if (deadlineMatch) grant.deadline = deadlineMatch[1].trim().replace(/\*+/g, "");

    grants.push(grant);
  }

  return grants;
}

interface GrantCardProps {
  grant: ParsedGrant;
  className?: string;
  isSelected?: boolean;
  onSelect?: (grant: ParsedGrant) => void;
  onAskAbout?: (grant: ParsedGrant) => void;
  askAboutLabel?: string;
  fullInfoLabel?: string;
}

export function GrantCard({
  grant,
  className,
  isSelected = false,
  onSelect,
  onAskAbout,
  askAboutLabel = "Ask about this grant",
  fullInfoLabel = "Full info",
}: GrantCardProps) {
  const isClickable = !!onSelect;

  return (
    <Card
      className={cn(
        "transition-all duration-200 border",
        isSelected
          ? "border-l-4 border-l-primary border-primary/30 shadow-md bg-primary/[0.03]"
          : "border-border/60 hover:shadow-md hover:-translate-y-0.5",
        isClickable && "cursor-pointer",
        className
      )}
      onClick={isClickable ? () => onSelect(grant) : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(grant);
              }
            }
          : undefined
      }
      aria-pressed={isClickable ? isSelected : undefined}
    >
      <CardContent className="p-3.5 space-y-2">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2 flex-1">
            {grant.name}
          </h3>
          {grant.website && (
            <a
              href={grant.website}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
              title="Visit website"
              aria-label="Visit website"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-4" />
            </a>
          )}
        </div>

        {grant.organization && (
          <p className="text-xs text-muted-foreground truncate">
            {grant.organization}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {grant.amount && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5 gap-0.5">
              <DollarSign className="size-2.5" />
              {grant.amount}
            </Badge>
          )}
          {grant.country && (
            <Badge variant="outline" className="text-xs h-5 px-1.5 gap-0.5">
              <MapPin className="size-2.5" />
              {grant.country}
            </Badge>
          )}
          {grant.deadline && (
            <Badge
              variant="outline"
              className="text-xs h-5 px-1.5 gap-0.5 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400"
            >
              <Calendar className="size-2.5" />
              {grant.deadline}
            </Badge>
          )}
        </div>

        {/* Expanded detail section */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div
                className="pt-2 mt-1 border-t border-border/60 space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Extra details shown when expanded */}
                <div className="space-y-1">
                  {grant.organization && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="size-3 shrink-0" />
                      <span>{grant.organization}</span>
                    </div>
                  )}
                  {grant.country && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span>{grant.country}</span>
                    </div>
                  )}
                  {grant.amount && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DollarSign className="size-3 shrink-0" />
                      <span>{grant.amount}</span>
                    </div>
                  )}
                  {grant.deadline && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3 shrink-0" />
                      <span>{grant.deadline}</span>
                    </div>
                  )}
                  {!grant.organization && !grant.country && !grant.amount && !grant.deadline && (
                    <p className="text-xs text-muted-foreground/70 italic">
                      Limited details available from AI response.
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  {onAskAbout && (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="h-7 text-xs flex-1 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAskAbout(grant);
                      }}
                    >
                      <MessageCircle className="size-3" />
                      {askAboutLabel}
                    </Button>
                  )}
                  {grant.website && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      asChild
                    >
                      <a
                        href={grant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="size-3" />
                        {fullInfoLabel}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
