import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, DollarSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export function GrantCard({ grant, className }: GrantCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/60",
        className
      )}
    >
      <CardContent className="p-3.5 space-y-2">
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
      </CardContent>
    </Card>
  );
}
