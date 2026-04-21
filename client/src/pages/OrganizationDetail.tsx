/*
 * OrganizationDetail — single organisation page.
 *
 * Layout:
 *   - Framer-motion entrance animation on open
 *   - Breadcrumb + header (name + location + categories)
 *   - Info / AI chat tab switcher (mirrors EntityDetail.tsx)
 *   - Info tab: contact card (address/phone/email/website), description,
 *               service area, map, branches list
 *   - AI tab:   OrgAiChat — chat that can fetch the org's website with
 *               `fetch_org_website` tool for fresh facts
 */

import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Globe,
  Info,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import OrganizationsMap, { type OrgMapPoint } from "@/components/OrganizationsMap";
import OrgAiChat from "@/components/OrgAiChat";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

export default function OrganizationDetail() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"info" | "ai">("info");

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
        name: org.name as unknown as string,
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
          <Link href="/catalog" className="text-brand-green hover:underline">
            ← {t.catalog.title}
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const orgName = String(org.name);
  const orgDescription = org.description ? String(org.description) : "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={orgName}
        description={orgDescription ? orgDescription.slice(0, 160) : t.organizations.subtitle}
        canonicalPath={`/organizations/${orgId}`}
      />
      <Navbar />

      {/* Entrance animation wraps everything below the navbar so breadcrumb,
          header, and tabs slide in together. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex flex-col"
      >
        <main className="flex-1 flex flex-col">
          {/* Breadcrumb */}
          <nav className="container pt-6 text-sm text-muted-foreground">
            <Link href="/catalog" className="hover:text-foreground">
              {t.catalog.title}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{orgName}</span>
          </nav>

          {/* Header */}
          <header className="container pt-4 pb-4">
            <h1 className="text-3xl font-bold text-foreground flex items-start gap-3">
              <Building2 className="w-7 h-7 text-brand-green mt-1 shrink-0" />
              <span>{orgName}</span>
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
          </header>

          {/* Info / AI tab switcher */}
          <div
            role="tablist"
            aria-label={orgName}
            className="border-b border-border bg-background"
          >
            <div className="container flex items-center gap-1">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "info"}
                onClick={() => setActiveTab("info")}
                className={`relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors ${
                  activeTab === "info"
                    ? "text-[color:var(--brand-green)]"
                    : "text-muted-foreground hover:text-foreground/90"
                }`}
              >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                {t.aiAssistant.fullInfo}
                {activeTab === "info" && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--brand-green)]"
                  />
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "ai"}
                onClick={() => setActiveTab("ai")}
                className={`relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors ${
                  activeTab === "ai"
                    ? "text-[color:var(--brand-green)]"
                    : "text-muted-foreground hover:text-foreground/90"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {t.aiAssistant.chatTab}
                {activeTab === "ai" && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--brand-green)]"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Animated tab body */}
          <AnimatePresence mode="wait">
            {activeTab === "info" ? (
              <motion.section
                key="info"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="container py-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,380px)_1fr] gap-6">
                  {/* Left column — contact + description */}
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
                            <a
                              href={`tel:${org.phone}`}
                              className="text-foreground hover:underline"
                            >
                              {org.phone}
                            </a>
                          </div>
                        )}
                        {org.email && (
                          <div className="flex items-start gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <a
                              href={`mailto:${org.email}`}
                              className="text-foreground hover:underline break-all"
                            >
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

                    {orgDescription && (
                      <section className="rounded-xl border border-border bg-card p-4">
                        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                          {t.detail.descriptionTitle}
                        </h2>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                          {orgDescription}
                        </p>
                      </section>
                    )}

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

                  {/* Right column — map + branches */}
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
                                    background:
                                      b.branchType === "HQ" ? "#1F4E78" : "#22C55E",
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
                                <a
                                  href={`tel:${b.phone}`}
                                  className="text-xs text-muted-foreground hover:underline mt-1 inline-flex items-center gap-1"
                                >
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
              </motion.section>
            ) : (
              <motion.section
                key="ai"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="container py-6 flex-1 pb-32 lg:pb-10"
              >
                <div className="mx-auto max-w-6xl h-[calc(100dvh-16rem)] min-h-[520px]">
                  <OrgAiChat
                    className="h-full border-border bg-muted/30"
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
                      website: org.website ? String(org.website) : null,
                      serviceArea: org.serviceArea ?? null,
                      categories: org.categories ?? null,
                    }}
                  />
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </motion.div>

      <Footer />
    </div>
  );
}
