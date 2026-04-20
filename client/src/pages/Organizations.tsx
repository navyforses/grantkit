/*
 * Organizations — catalog page with split view (list + map).
 *
 * Left:  list of organizations with search + country filter
 * Right: Google Maps with HQ/Branch markers, clustered, with an InfoWindow
 *        on marker click linking to the detail page
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import OrganizationsMap, { type OrgMapPoint } from "@/components/OrganizationsMap";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, Search } from "lucide-react";

const DEFAULT_LIMIT = 200;

export default function Organizations() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [bounds, setBounds] = useState<
    { swLat: number; swLng: number; neLat: number; neLng: number } | undefined
  >(undefined);
  const [activePoint, setActivePoint] = useState<OrgMapPoint | null>(null);

  // Debounce search input
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const listQuery = trpc.organizations.list.useQuery({
    country: country === "all" ? undefined : country,
    search: debouncedSearch || undefined,
    limit: DEFAULT_LIMIT,
    offset: 0,
  });

  const mapPointsQuery = trpc.organizations.mapPoints.useQuery({
    bounds,
    country: country === "all" ? undefined : country,
    limit: 2000,
  });

  const orgs = listQuery.data?.organizations ?? [];
  const total = listQuery.data?.total ?? 0;
  const points = mapPointsQuery.data?.points ?? [];

  // Derive available countries from list (ISO codes) for the dropdown.
  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const o of orgs) set.add(o.country);
    return Array.from(set).sort();
  }, [orgs]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={t.organizations.title}
        description={t.organizations.subtitle}
        canonicalPath="/organizations"
      />
      <Navbar />

      <main className="flex-1 container py-6">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-green" />
            {t.organizations.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t.organizations.subtitle}
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.organizations.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            aria-label={t.organizations.filters.country}
          >
            <option value="all">{t.organizations.filters.country}</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <LegendDot color="#1F4E78" label={t.organizations.mapLegend.hq} />
            <LegendDot color="#22C55E" label={t.organizations.mapLegend.branch} />
          </div>
        </div>

        {/* Split view */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,420px)_1fr] gap-4 h-[calc(100vh-260px)] min-h-[520px]">
          {/* List */}
          <div className="overflow-y-auto rounded-xl border border-border bg-card">
            {listQuery.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">
                {t.organizations.loading}
              </div>
            ) : orgs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                {t.organizations.empty}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {orgs.map((o) => (
                  <li key={o.orgId}>
                    <Link
                      href={`/organizations/${o.orgId}`}
                      className="block p-4 hover:bg-secondary transition-colors"
                    >
                      <div className="font-medium text-foreground line-clamp-2">
                        {o.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[o.city, o.country].filter(Boolean).join(", ")}
                        </span>
                        {o.branchesCount > 1 && (
                          <span className="inline-flex items-center gap-1 text-brand-green">
                            · {o.branchesCount} {t.organizations.detail.branches.toLowerCase()}
                          </span>
                        )}
                      </div>
                      {o.categories && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {o.categories.split(",").map((c) => c.trim()).join(" · ")}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!listQuery.isLoading && orgs.length > 0 && orgs.length < total && (
              <div className="p-3 text-xs text-muted-foreground text-center border-t border-border">
                {orgs.length} / {total}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="relative rounded-xl overflow-hidden border border-border bg-card">
            <OrganizationsMap
              points={points}
              onMarkerClick={setActivePoint}
              onBoundsChange={setBounds}
              emptyText={t.organizations.empty}
              errorText={t.map.error}
              ariaLabel={t.map.ariaLabel}
            />
            {activePoint && (
              <InfoCard
                point={activePoint}
                onClose={() => setActivePoint(null)}
                labels={{
                  viewDetails: t.organizations.detail.viewOnMap,
                  hq: t.organizations.mapLegend.hq,
                  branch: t.organizations.mapLegend.branch,
                }}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: "0 0 0 2px #fff" }}
      />
      {label}
    </span>
  );
}

function InfoCard({
  point,
  onClose,
  labels,
}: {
  point: OrgMapPoint;
  onClose: () => void;
  labels: { viewDetails: string; hq: string; branch: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:max-w-[360px] bg-background border border-border rounded-lg shadow-lg p-4 z-10"
      role="dialog"
      aria-label={point.name}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {point.branchType === "HQ" ? labels.hq : labels.branch}
          </div>
          <div className="font-semibold text-foreground line-clamp-2">{point.name}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <Link
        href={`/organizations/${point.orgId}`}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-green hover:underline"
      >
        {labels.viewDetails} →
      </Link>
    </div>
  );
}
