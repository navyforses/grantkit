import { trpc } from "@/lib/trpc";

/**
 * Live catalog counts for marketing copy (hero stats, "{count} grants" strings).
 * Each value is `undefined` while loading or when the API is unreachable —
 * there is deliberately no hardcoded fallback number (Phase 0.4 "truth in copy").
 */
export function useStats() {
  const opts = { retry: false, staleTime: 5 * 60 * 1000 };
  const grants = trpc.catalog.count.useQuery(undefined, opts);
  const organizations = trpc.organizations.count.useQuery(undefined, opts);
  // France beachhead (D5) — the hero leads with the FR count.
  const franceOrganizations = trpc.organizations.count.useQuery({ country: "FR" }, opts);
  const countries = trpc.organizations.countries.useQuery(undefined, opts);
  return {
    grants: grants.data?.total,
    organizations: organizations.data?.total,
    franceOrganizations: franceOrganizations.data?.total,
    countries: countries.data?.length,
  };
}

/** Renders a count for copy; "—" while unknown so no fake number is ever shown. */
export function formatStat(n: number | undefined): string {
  return n === undefined ? "—" : n.toLocaleString();
}
