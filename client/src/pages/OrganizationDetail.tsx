/*
 * OrganizationDetail — single organisation page.
 *
 * Layout mirrors EntityDetail.tsx (grant page) so the two detail pages
 * feel like one product:
 *   - Sticky GrantDetailHeader (back · breadcrumb · Share · AI · Close)
 *   - 3-stat strip — Branches / Programs / Categories
 *   - Description + service area cards
 *   - Apply (Visit website) + PDF CTAs
 *   - Compact verified map (Google Places-backed OrganizationsMap)
 *   - 2-column office card (address banner + phone/email/website/hours)
 *   - Branches grid — the org-specific section that makes this page
 *     different from the grant page
 *   - AI chat opens in a right-side Sheet (OrgAiChat + full context)
 *
 * Save (bookmark) is hidden — `savedGrants` schema is grant-scoped; orgs
 * aren't savable today. Tracked alongside the other grant/org data gaps.
 */

import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowUpRight,
  Building2,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  LayoutGrid,
  Mail,
  MapPin,
  Network,
  Phone,
  Share2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import OrganizationsMap, { type OrgMapPoint } from "@/components/OrganizationsMap";
import OrgAiChat from "@/components/OrgAiChat";
import GrantDetailHeader from "@/components/grant/GrantDetailHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function OrganizationDetail() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { t, tCountry } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);

  const detailQuery = trpc.organizations.detail.useQuery(
    { orgId: orgId ?? "" },
    { enabled: Boolean(orgId) },
  );

  const org = detailQuery.data?.organization;
  const branches = detailQuery.data?.branches ?? [];

  const mapPoints: OrgMapPoint[] = useMemo(() => {
    if (!org) return [];
    return branches
      .filter((b) => b.latitude !== null && b.longitude !== null)
      .map((b) => ({
        branchId: b.branchId,
        orgId: b.orgId,
        name: String(org.name),
        branchType: b.branchType,
        latitude: Number(b.latitude),
        longitude: Number(b.longitude),
      }));
  }, [org, branches]);

  const categories = useMemo(
    () =>
      (org?.categories ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    [org?.categories],
  );

  // ── Loading / error / missing states ────────────────────────────────────
  if (!orgId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 container py-10 flex items-center justify-center">
          <p className="text-muted-foreground">{t.organizations.empty}</p>
        </main>
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 container py-10 flex items-center justify-center">
          <p className="text-muted-foreground">{t.organizations.loading}</p>
        </main>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 container py-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t.grantDetail.notFound}
          </h1>
          <p className="text-muted-foreground mb-4">{t.grantDetail.notFoundDesc}</p>
          <Link href="/catalog">
            <Button variant="outline" className="gap-2">
              <ChevronRight className="w-4 h-4 rotate-180" />
              {t.catalog.title}
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  // ── Derived display data ────────────────────────────────────────────────
  const orgName = String(org.name);
  const orgDescription = org.description ? String(org.description) : "";
  const translatedCountry = org.country ? tCountry(org.country) : "";
  const countryFlag = org.country === "US" ? "🇺🇸"
    : org.country === "International" ? "🌐"
    : org.country && org.country.length === 2 ? countryCodeToFlag(org.country)
    : "🌐";
  const locationDisplay = [org.city, org.state, translatedCountry].filter(Boolean).join(", ");
  const website = org.website ? String(org.website) : "";
  const websiteHref = website
    ? website.startsWith("http") ? website : `https://${website}`
    : "";

  // ── 3-card stat strip — always 3 values for orgs (unlike grants where
  //    several are DATA_GAPS). Matches the grant page's pattern visually.
  const statCards: Array<{ label: string; value: string; tone: "green" | "amber" | "blue"; icon: React.ReactNode }> = [
    {
      label: t.organizations.detail.statBranches,
      value: String(branches.length || org.branchesCount || 1),
      tone: "green",
      icon: <Network className="w-3.5 h-3.5" />,
    },
  ];
  if ((org.programsCount ?? 0) > 0) {
    statCards.push({
      label: t.organizations.detail.statPrograms,
      value: String(org.programsCount),
      tone: "amber",
      icon: <FileText className="w-3.5 h-3.5" />,
    });
  }
  if (categories.length > 0) {
    statCards.push({
      label: t.organizations.detail.statCategories,
      value: String(categories.length),
      tone: "blue",
      icon: <LayoutGrid className="w-3.5 h-3.5" />,
    });
  }

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleShare = () => {
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: orgName, url }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(url);
      toast.success(t.grantDetail.linkCopied);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const seoDescription = orgDescription
    ? orgDescription.slice(0, 160).replace(/\s+/g, " ").trim()
    : `${orgName} — ${t.organizations.subtitle}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={orgName}
        description={seoDescription}
        canonicalPath={`/organizations/${orgId}`}
      />

      <GrantDetailHeader
        breadcrumb={[
          { label: t.detail.breadcrumbHome, href: "/" },
          { label: t.catalog.title, href: "/catalog" },
          { label: orgName },
        ]}
        isAuthenticated={isAuthenticated}
        isSaved={false}
        saveLabel=""
        savedLabel=""
        shareLabel={t.grantDetail.share}
        aiLabel={t.detail.aiShort}
        closeLabel={t.detail.close}
        backLabel={t.detail.back}
        onShare={handleShare}
        onOpenAi={() => setAiOpen(true)}
      />

      {/* Main content */}
      <div className="container px-4 py-6 md:py-8 flex-1 pb-32 lg:pb-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8 xl:gap-10">

          {/* ═════ LEFT COLUMN ═════ */}
          <div className="space-y-5 min-w-0">

            {/* Badges: flag + category chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg leading-none" aria-hidden>{countryFlag}</span>
              {categories.slice(0, 4).map((cat, i) => (
                <span
                  key={i}
                  className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border border-border bg-muted/60 text-foreground/85"
                >
                  {cat}
                </span>
              ))}
              {categories.length > 4 && (
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-full text-muted-foreground">
                  +{categories.length - 4}
                </span>
              )}
            </div>

            {/* Title + subtitle line (location) */}
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-[32px] font-bold text-white leading-tight tracking-tight flex items-start gap-3">
                <Building2 className="w-6 h-6 lg:w-7 lg:h-7 text-[color:var(--brand-green)] mt-1 shrink-0" aria-hidden />
                <span>{orgName}</span>
              </h1>
              {locationDisplay && (
                <p className="text-muted-foreground mt-2 text-sm md:text-[15px] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70" aria-hidden />
                  {locationDisplay}
                </p>
              )}
            </div>

            {/* 3-card stat strip */}
            {statCards.length > 0 && (
              <div className={`grid gap-3 ${statCards.length === 1 ? "grid-cols-1" : statCards.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {statCards.map((card, i) => {
                  const tone =
                    card.tone === "green"
                      ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300"
                      : card.tone === "amber"
                      ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-300"
                      : "border-blue-500/25 bg-blue-500/[0.06] text-blue-300";
                  return (
                    <div key={i} className={`rounded-xl border ${tone} px-4 py-3`}>
                      <div className="flex items-center gap-1.5 mb-1 text-muted-foreground/80">
                        {card.icon}
                        <span className="text-[10px] uppercase tracking-wider font-medium">
                          {card.label}
                        </span>
                      </div>
                      <p className="text-xl md:text-2xl font-bold leading-tight truncate">
                        {card.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Description */}
            {orgDescription && (
              <div className="bg-muted/40 border border-border rounded-xl p-5 border-l-4 border-l-[color:var(--brand-green)]">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  {t.resourceDetail.descriptionTitle}
                </h2>
                <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed whitespace-pre-line">
                  {orgDescription}
                </p>
              </div>
            )}

            {/* Service area */}
            {org.serviceArea && (
              <div className="bg-muted/40 border border-border rounded-xl p-5">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  {t.map.serviceArea.replace(/\s*[:：]\s*\{area\}\s*$/, "")}
                </h2>
                <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed">
                  {org.serviceArea}
                </p>
              </div>
            )}

            {/* Desktop CTAs — Visit website + PDF. Share/AI live in header. */}
            {website && (
              <div className="hidden lg:flex gap-3">
                <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button className="w-full h-12 bg-[color:var(--brand-green)] hover:bg-[color:var(--brand-green)]/90 text-white font-semibold gap-2 rounded-xl text-[15px]">
                    <ArrowUpRight className="w-4 h-4" />
                    {t.organizations.detail.visitWebsite}
                  </Button>
                </a>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="h-12 px-5 rounded-xl border-border text-foreground/80 hover:bg-muted hover:text-foreground gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {t.detail.downloadPdf}
                </Button>
              </div>
            )}
          </div>

          {/* ═════ RIGHT COLUMN ═════ */}
          <div className="space-y-5 mt-5 lg:mt-0">

            {/* Compact verified map */}
            {mapPoints.length > 0 && (
              <div className="bg-muted/40 border border-border rounded-xl overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {t.detail.locationTitle}
                  </h2>
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-xl overflow-hidden border border-border/60 h-[280px]">
                    <OrganizationsMap
                      points={mapPoints}
                      emptyText={t.map.noLocation}
                      errorText={t.map.error}
                      ariaLabel={t.map.ariaLabel}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Office / Contact card — address banner + 2-col grid */}
            <div className="bg-muted/40 border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                {t.organizations.detail.contact}
              </h2>
              {org.hqAddress && (
                <div className="mb-4 pb-4 border-b border-border/60 flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70 mt-0.5" />
                  <p className="text-sm text-foreground/85 leading-relaxed">{org.hqAddress}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {website && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-[color:var(--brand-green)] hover:text-foreground transition-colors min-w-0"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.organizations.detail.visitWebsite}</span>
                  </a>
                )}
                {org.phone && (
                  <a
                    href={`tel:${org.phone}`}
                    className="flex items-center gap-2 text-sm text-foreground/85 hover:text-foreground transition-colors min-w-0"
                  >
                    <Phone className="w-4 h-4 shrink-0 text-[color:var(--brand-green)]" />
                    <span className="truncate">{org.phone}</span>
                  </a>
                )}
                {org.email && (
                  <a
                    href={`mailto:${org.email}`}
                    className="flex items-center gap-2 text-sm text-foreground/85 hover:text-foreground transition-colors min-w-0"
                  >
                    <Mail className="w-4 h-4 shrink-0 text-[color:var(--brand-green)]" />
                    <span className="truncate">{org.email}</span>
                  </a>
                )}
                {org.officeHours && (
                  <div className="flex items-center gap-2 text-sm text-foreground/85 min-w-0">
                    <Clock className="w-4 h-4 shrink-0 text-[color:var(--brand-green)]" />
                    <span className="truncate" title={org.officeHours}>{org.officeHours}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Branches — the feature that makes the org page different
                from the grant page. Keeps the verified HQ + Google Places
                branch list in a grid that matches the card styling above. */}
            {branches.length > 0 && (
              <div className="bg-muted/40 border border-border rounded-xl p-5">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Network className="w-3.5 h-3.5 text-[color:var(--brand-green)]" />
                  {t.organizations.detail.branches}
                  <span className="text-muted-foreground/70 font-normal">({branches.length})</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {branches.map((b) => (
                    <li
                      key={b.branchId}
                      className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          aria-hidden
                          style={{
                            background:
                              b.branchType === "HQ" ? "#1F4E78" : "#22C55E",
                          }}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          {b.branchType === "HQ"
                            ? t.organizations.mapLegend.hq
                            : t.organizations.mapLegend.branch}
                        </span>
                      </div>
                      <div className="text-foreground/90 font-medium">
                        {[b.city, b.state, b.country].filter(Boolean).join(", ")}
                      </div>
                      {b.address && (
                        <div className="text-xs text-muted-foreground/80 mt-0.5 leading-relaxed">
                          {b.address}
                        </div>
                      )}
                      {b.phone && (
                        <a
                          href={`tel:${b.phone}`}
                          className="text-xs text-muted-foreground hover:text-foreground mt-1.5 inline-flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {b.phone}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI chat — opens from the header. OrgAiChat keeps the existing
          fetch_org_website tool so the assistant can pull fresh facts
          from the org's website when needed. */}
      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-[color:var(--brand-green)]" aria-hidden />
              <span>{t.aiAssistant.chatTab}</span>
              <span className="text-muted-foreground/70 font-normal truncate">· {orgName}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            <OrgAiChat
              className="h-full border-0 rounded-none bg-background"
              orgId={orgId}
              org={{
                name: orgName,
                description: orgDescription || null,
                address: org.hqAddress ?? null,
                city: org.city ?? null,
                state: org.state ?? null,
                country: org.country ?? null,
                phone: org.phone ?? null,
                email: org.email ?? null,
                website: website || null,
                serviceArea: org.serviceArea ?? null,
                categories: org.categories ?? null,
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile sticky bottom CTA — sits above MobileBottomNav (h ≈ 56 px) */}
      {website && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-bottom">
          <div className="flex gap-2">
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full h-12 bg-[color:var(--brand-green)] active:bg-[color:var(--brand-green)]/90 text-white font-semibold gap-2 rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
                {t.organizations.detail.visitWebsite}
              </Button>
            </a>
            <Button
              variant="outline"
              className="h-12 w-12 shrink-0 rounded-xl border-border text-foreground/80"
              onClick={handleShare}
              aria-label={t.grantDetail.share}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Desktop footer */}
      <div className="hidden lg:block">
        <Footer />
      </div>

      {/* Mobile footer */}
      <div className="lg:hidden px-4 pb-36 pt-4 border-t border-border/60 flex items-center justify-center gap-4 text-[11px] text-muted-foreground/50">
        <Link href="/privacy" className="hover:text-muted-foreground transition-colors">{t.nav.legal}</Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className="hover:text-muted-foreground transition-colors">Terms</Link>
        <span aria-hidden>·</span>
        <span>© {new Date().getFullYear()} GrantKit</span>
      </div>
    </div>
  );
}

/**
 * Convert an ISO alpha-2 country code into a regional indicator flag emoji.
 * Returns the globe emoji for unknown codes. Purely cosmetic — used in the
 * badge row next to the title.
 */
function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2 || !/^[A-Z]{2}$/.test(upper)) return "🌐";
  const base = 0x1f1e6;
  return (
    String.fromCodePoint(base + upper.charCodeAt(0) - 65) +
    String.fromCodePoint(base + upper.charCodeAt(1) - 65)
  );
}
