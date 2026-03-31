/**
 * GrantDetailSkeleton — loading placeholder that mirrors the GrantDetail page layout.
 * Mobile: compact header + single-column cards.  Desktop: header + 3-col grid with sidebar.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function GrantDetailSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-secondary animate-in fade-in duration-200">
      {/* ===== MOBILE HEADER SKELETON ===== */}
      <div className="md:hidden bg-primary px-4 pt-4 pb-5">
        {/* Back + actions row */}
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-14 bg-white/10 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-full bg-white/10" />
            <Skeleton className="w-9 h-9 rounded-full bg-white/10" />
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-6 h-6 rounded bg-white/10" />
          <Skeleton className="h-5 w-20 rounded-full bg-white/10" />
          <Skeleton className="h-5 w-14 rounded bg-white/10" />
        </div>

        {/* Title */}
        <Skeleton className="h-6 w-4/5 bg-white/10 rounded mb-1.5" />
        <Skeleton className="h-6 w-3/5 bg-white/10 rounded mb-2" />

        {/* Organization */}
        <Skeleton className="h-4 w-40 bg-white/10 rounded mb-3" />

        {/* Quick stats chips */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-full bg-white/10" />
          <Skeleton className="h-7 w-28 rounded-full bg-white/10" />
          <Skeleton className="h-7 w-20 rounded-full bg-white/10" />
        </div>
      </div>

      {/* ===== DESKTOP HEADER SKELETON ===== */}
      <div className="hidden md:block bg-primary py-8">
        <div className="container">
          {/* Back link */}
          <Skeleton className="h-4 w-32 bg-white/10 rounded mb-4" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Badges */}
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="w-8 h-8 rounded bg-white/10" />
                <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
                <Skeleton className="h-5 w-16 rounded bg-white/10" />
              </div>

              {/* Title */}
              <Skeleton className="h-8 w-3/4 bg-white/10 rounded mb-2" />

              {/* Organization */}
              <Skeleton className="h-5 w-48 bg-white/10 rounded mb-3" />

              {/* Stats chips */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-32 rounded-full bg-white/10" />
                <Skeleton className="h-8 w-36 rounded-full bg-white/10" />
                <Skeleton className="h-8 w-24 rounded-full bg-white/10" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="w-10 h-10 rounded-md bg-white/10" />
              <Skeleton className="w-10 h-10 rounded-md bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT SKELETON ===== */}
      <div className="container px-4 md:px-0 py-4 md:py-8 flex-1 pb-28 md:pb-8">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          {/* Main content column */}
          <div className="lg:col-span-2 space-y-0 md:space-y-6">
            {/* Description card */}
            <div className="bg-card border border-border rounded-xl md:rounded-lg border-l-4 border-l-gray-300 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded bg-muted" />
                <Skeleton className="h-5 w-28 bg-muted rounded" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-full bg-muted rounded" />
                <Skeleton className="h-4 w-full bg-muted rounded" />
                <Skeleton className="h-4 w-11/12 bg-muted rounded" />
                <Skeleton className="h-4 w-4/5 bg-muted rounded" />
                <Skeleton className="h-4 w-full bg-muted rounded" />
                <Skeleton className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>

            {/* Eligibility card */}
            <div className="bg-card border border-border rounded-xl md:rounded-lg p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded bg-muted" />
                <Skeleton className="h-5 w-24 bg-muted rounded" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-full bg-muted rounded" />
                <Skeleton className="h-4 w-5/6 bg-muted rounded" />
                <Skeleton className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>

            {/* How to Apply card */}
            <div className="bg-card border border-border rounded-xl md:rounded-lg p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded bg-muted" />
                <Skeleton className="h-5 w-28 bg-muted rounded" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-full bg-muted rounded" />
                <Skeleton className="h-4 w-4/5 bg-muted rounded" />
              </div>
            </div>

            {/* Mobile-only: Contact card */}
            <div className="md:hidden bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-4 h-4 rounded bg-muted" />
                <Skeleton className="h-4 w-20 bg-muted rounded" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-48 bg-muted rounded" />
                <Skeleton className="h-4 w-36 bg-muted rounded" />
                <Skeleton className="h-4 w-44 bg-muted rounded" />
              </div>
            </div>

            {/* Mobile-only: Details card */}
            <div className="md:hidden bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-4 h-4 rounded bg-muted" />
                <Skeleton className="h-4 w-16 bg-muted rounded" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-3 w-16 bg-muted rounded mb-1" />
                    <Skeleton className="h-4 w-24 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Related Grants */}
            <div className="pt-2 md:pt-0">
              <Skeleton className="h-5 w-32 bg-muted rounded mb-3 md:mb-4" />
              {/* Mobile: horizontal scroll */}
              <div className="md:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-56 flex-shrink-0 bg-card border border-border rounded-xl border-l-4 border-l-gray-300 p-3.5">
                    <div className="flex items-start gap-2 mb-1.5">
                      <Skeleton className="w-5 h-5 rounded bg-muted shrink-0" />
                      <Skeleton className="h-4 w-full bg-muted rounded" />
                    </div>
                    <Skeleton className="h-3 w-full bg-muted rounded mb-1" />
                    <Skeleton className="h-3 w-3/4 bg-muted rounded mb-1.5" />
                    <Skeleton className="h-3 w-16 bg-emerald-100 rounded" />
                  </div>
                ))}
              </div>
              {/* Desktop: grid */}
              <div className="hidden md:grid sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-lg border-l-4 border-l-gray-300 p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Skeleton className="w-6 h-6 rounded bg-muted shrink-0" />
                      <Skeleton className="h-4 w-full bg-muted rounded" />
                    </div>
                    <Skeleton className="h-3 w-full bg-muted rounded mb-1" />
                    <Skeleton className="h-3 w-3/4 bg-muted rounded mb-1.5" />
                    <Skeleton className="h-3 w-20 bg-emerald-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== DESKTOP SIDEBAR SKELETON ===== */}
          <div className="hidden lg:block space-y-4">
            {/* Quick Info Card */}
            <div className="bg-card border border-border rounded-lg p-6">
              <Skeleton className="h-4 w-16 bg-muted rounded mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-4 h-4 rounded bg-muted mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-16 bg-muted rounded mb-1" />
                      <Skeleton className="h-4 w-28 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-card border border-border rounded-lg p-6">
              <Skeleton className="h-4 w-20 bg-muted rounded mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-36 bg-muted rounded" />
                <Skeleton className="h-4 w-32 bg-muted rounded" />
                <Skeleton className="h-4 w-40 bg-muted rounded" />
              </div>
              <Skeleton className="h-10 w-full bg-emerald-100 rounded-md mt-4" />
            </div>

            {/* Bookmark CTA */}
            <Skeleton className="h-10 w-full bg-muted rounded-md" />
          </div>
        </div>
      </div>

      {/* ===== MOBILE STICKY BOTTOM CTA SKELETON ===== */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-bottom">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-12 bg-emerald-100 rounded-xl" />
          <Skeleton className="w-12 h-12 bg-muted rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  );
}
