/*
 * SocialMediaRow — chip-sized links to the org's social profiles.
 * Each chip renders a brand-neutral icon + platform name as an external
 * link. Platforms without a URL are skipped so the row collapses
 * cleanly when `socialMedia` JSON is partial.
 *
 * Returns null when there's nothing to show — caller doesn't guard.
 */

import { motion } from "framer-motion";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SOCIAL_PLATFORMS, type SocialMediaLinks } from "@/lib/orgEnrichment";

interface Props {
  links: SocialMediaLinks;
}

const ICONS: Record<keyof SocialMediaLinks, React.ReactNode> = {
  facebook: <Facebook className="w-3.5 h-3.5" aria-hidden />,
  linkedin: <Linkedin className="w-3.5 h-3.5" aria-hidden />,
  twitter: <Twitter className="w-3.5 h-3.5" aria-hidden />,
  instagram: <Instagram className="w-3.5 h-3.5" aria-hidden />,
  youtube: <Youtube className="w-3.5 h-3.5" aria-hidden />,
};

const LABELS: Record<keyof SocialMediaLinks, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  instagram: "Instagram",
  youtube: "YouTube",
};

export default function SocialMediaRow({ links }: Props) {
  const { t } = useLanguage();
  const e = t.orgEnrichment;

  const entries = SOCIAL_PLATFORMS.filter(
    (key) => typeof links[key] === "string" && links[key]!.trim().length > 0,
  );
  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-center gap-2"
      aria-label={e.socialTitle}
    >
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mr-1">
        {e.socialTitle}:
      </span>
      {entries.map((key) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border bg-muted/60 text-foreground/80 hover:text-foreground hover:border-[color:var(--brand-green)]/40 hover:bg-[color:var(--brand-green)]/5 transition-colors"
        >
          {ICONS[key]}
          <span>{LABELS[key]}</span>
        </a>
      ))}
    </motion.div>
  );
}
