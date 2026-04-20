/*
 * OrganizationDetail — single organization page.
 * Shows HQ info, all branches, and a map with markers for every branch.
 */

import { Link, useParams } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import OrganizationsMap, { type OrgMapPoint } from "@/components/OrganizationsMap";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react";

export default function OrganizationDetail() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { t } = useLanguage();

  const detailQuery = trpc.organizations.detail.useQuery(
    { orgId: orgId ?? "" },
    { enabled: Boolean(orgId) },
  );

  const org = detailQuery.data?.organization;
  const branches = detailQuery.data?.branches ?? [];

  if (!orgId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container py-10">
          <p className="text-muted-foreground">{t.organizations.empty}</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container py-10">
          <p className="text-muted-foreground">{t.organizations.loading}</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container py-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t.grantDetail.notFound}
          </h1>
          <p className="text-muted-foreground mb-4">{t.grantDetail.notFoundDesc}</p>
          <Link href="/organizations" className="text-brand-green hover:underline">
            ← {t.organizations.title}
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const mapPoints: OrgMapPoint[] = branches
    .filter((b) => b.latitude !== null && b.longitude !== null)
    .map((b) => ({
      branchId: b.branchId,
      orgId: b.orgId,
      name: org.name as unknown as string,
      branchType: b.branchType,
      latitude: Number(b.latitude),
      longitude: Number(b.longitude),
    }));

  const categories = (org.categories ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={String(org.name)}
        description={org.description ? String(org.description).slice(0, 160) : t.organizations.subtitle}
        canonicalPath={`/organizations/${orgId}`}
      />
      <Navbar />

      <main className="flex-1 container py-6">
        <nav className="text-sm text-muted-foreground mb-4">
          <Link href="/organizations" className="hover:text-foreground">
            {t.organizations.title}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{String(org.name)}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-start gap-3">
            <Building2 className="w-7 h-7 text-brand-green mt-1 shrink-0" />
            <span>{String(org.name)}</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {[org.city, org.state, org.country].filter(Boolean).join(", ")}
            </span>
            {categories.length > 0 && (
              <>
                <span>·</span>
                <span>{categories.join(" · ")}</span>
              </>
            )}
          </div>
          {org.description && (
            <p className="mt-3 text-foreground/90 max-w-3xl">
              {String(org.description)}
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,380px)_1fr] gap-6">
          {/* HQ + Contact card */}
          <aside className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                {t.organizations.detail.contact}
              </h2>
              <div className="space-y-2 text-sm">
                {org.hqAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-foreground">{org.hqAddress}</span>
                  </div>
                )}
                {org.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <a href={`tel:${org.phone}`} className="text-foreground hover:underline">
                      {org.phone}
                    </a>
                  </div>
                )}
                {org.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <a href={`mailto:${org.email}`} className="text-foreground hover:underline break-all">
                      {org.email}
                    </a>
                  </div>
                )}
                {org.website && (
                  <a
                    href={String(org.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-brand-green hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    {t.organizations.detail.visitWebsite}
                  </a>
                )}
              </div>
            </section>

            {org.officeHours && (
              <section className="rounded-xl border border-border bg-card p-4 text-sm">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  {t.detail.officeHours}
                </h2>
                <p className="text-foreground">{org.officeHours}</p>
              </section>
            )}

            {org.serviceArea && (
              <section className="rounded-xl border border-border bg-card p-4 text-sm">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  {t.map.serviceArea}
                </h2>
                <p className="text-foreground">{org.serviceArea}</p>
              </section>
            )}
          </aside>

          {/* Map + Branches */}
          <section className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-border bg-card h-[400px]">
              <OrganizationsMap
                points={mapPoints}
                emptyText={t.map.noLocation}
                errorText={t.map.error}
                ariaLabel={t.map.ariaLabel}
              />
            </div>

            <section>
              <h2 className="font-semibold text-lg text-foreground mb-3">
                {t.organizations.detail.branches} ({branches.length})
              </h2>
              {branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.map.noLocation}
                </p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {branches.map((b) => (
                    <li
                      key={b.branchId}
                      className="rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{
                            background: b.branchType === "HQ" ? "#1F4E78" : "#22C55E",
                          }}
                        />
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {b.branchType === "HQ"
                            ? t.organizations.mapLegend.hq
                            : t.organizations.mapLegend.branch}
                        </span>
                      </div>
                      <div className="text-foreground">
                        {[b.city, b.state, b.country].filter(Boolean).join(", ")}
                      </div>
                      {b.address && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b.address}
                        </div>
                      )}
                      {b.phone && (
                        <a href={`tel:${b.phone}`} className="text-xs text-muted-foreground hover:underline mt-1 inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {b.phone}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
