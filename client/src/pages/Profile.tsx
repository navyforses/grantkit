/*
 * Profile Page — GrantKit
 * Shows account information and subscription management
 * Mobile: compact card layout, no footer, touch-friendly
 * Desktop: centered max-w-2xl layout
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricingCTA from "@/components/PricingCTA";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  User,
  Mail,
  Calendar,
  CreditCard,
  Shield,
  LogOut,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Pause,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";

export default function Profile() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { t } = useLanguage();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: subStatus, isLoading: subLoading } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const cancelMutation = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      setShowCancelDialog(false);
      utils.subscription.status.invalidate();
    },
  });

  const utils = trpc.useUtils();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  if (!authLoading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-card">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    active: { icon: <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    cancelled: { icon: <XCircle className="w-4 h-4 md:w-5 md:h-5" />, color: "text-red-500", bg: "bg-red-50 border-red-200" },
    past_due: { icon: <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />, color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
    paused: { icon: <Pause className="w-4 h-4 md:w-5 md:h-5" />, color: "text-muted-foreground", bg: "bg-secondary border-border" },
    none: { icon: <XCircle className="w-4 h-4 md:w-5 md:h-5" />, color: "text-muted-foreground/60", bg: "bg-secondary border-border" },
  };

  const statusKey = subStatus?.subscriptionStatus || "none";
  const config = statusConfig[statusKey] || statusConfig.none;

  const statusLabel: Record<string, string> = {
    active: t.profile.statusActive,
    cancelled: t.profile.statusCancelled,
    past_due: t.profile.statusPastDue,
    paused: t.profile.statusPaused,
    none: t.profile.statusNone,
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <SEO title="Profile" noIndex />
      <Navbar />

      <main className="flex-1 py-5 md:py-16 pb-24 md:pb-16">
        <div className="container px-4 md:px-0 max-w-2xl">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground active:text-primary md:hover:text-primary transition-colors mb-4 md:mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {t.profile.backToHome}
          </Link>

          {/* Page title */}
          <h1 className="text-xl md:text-3xl font-bold text-foreground tracking-tight mb-4 md:mb-8">
            {t.profile.title}
          </h1>

          {/* Account Information Card */}
          <div className="bg-card border border-border/80 rounded-xl p-4 md:p-6 mb-3 md:mb-6">
            <div className="flex items-center gap-2.5 md:gap-3 mb-4 md:mb-6">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <h2 className="text-base md:text-lg font-semibold text-foreground">{t.profile.accountInfo}</h2>
            </div>

            <div className="space-y-0">
              <div className="flex items-center gap-3 py-2.5 md:py-3 border-b border-border">
                <User className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs text-muted-foreground/60 uppercase tracking-wider mb-0.5">{t.profile.name}</p>
                  <p className="text-sm font-medium text-foreground truncate">{user?.name || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2.5 md:py-3 border-b border-border">
                <Mail className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs text-muted-foreground/60 uppercase tracking-wider mb-0.5">{t.profile.email}</p>
                  <p className="text-sm font-medium text-foreground truncate">{user?.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2.5 md:py-3">
                <Calendar className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs text-muted-foreground/60 uppercase tracking-wider mb-0.5">{t.profile.memberSince}</p>
                  <p className="text-sm font-medium text-foreground">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="bg-card border border-border/80 rounded-xl p-4 md:p-6 mb-3 md:mb-6">
            <div className="flex items-center gap-2.5 md:gap-3 mb-4 md:mb-6">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <h2 className="text-base md:text-lg font-semibold text-foreground">{t.profile.subscription}</h2>
            </div>

            <div className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full border text-xs md:text-sm font-medium mb-4 md:mb-6 ${config.color} ${config.bg}`}>
              {config.icon}
              {statusLabel[statusKey] || statusLabel.none}
            </div>

            {subStatus?.subscriptionStatus === "active" ? (
              <div className="space-y-0">
                <div className="flex items-center gap-3 py-2.5 md:py-3 border-b border-border">
                  <Shield className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] md:text-xs text-muted-foreground/60 uppercase tracking-wider mb-0.5">{t.profile.plan}</p>
                    <p className="text-sm font-medium text-foreground">{t.profile.planName}</p>
                  </div>
                </div>
                {subStatus.subscriptionCurrentPeriodEnd && (
                  <div className="flex items-center gap-3 py-2.5 md:py-3 border-b border-border">
                    <Calendar className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] md:text-xs text-muted-foreground/60 uppercase tracking-wider mb-0.5">{t.profile.nextBilling}</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(subStatus.subscriptionCurrentPeriodEnd).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                )}
                <div className="pt-3 md:pt-4">
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="text-xs md:text-sm text-red-500 active:text-red-600 md:hover:text-red-600 font-medium transition-colors py-1"
                  >
                    {t.profile.cancelSubscription}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-secondary rounded-lg p-4 md:p-5 text-center">
                {user?.role === "admin" ? (
                  <p className="text-xs md:text-sm text-muted-foreground">{t.profile.adminAccess}</p>
                ) : (
                  <>
                    <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">{t.profile.subscribeDesc}</p>
                    <PricingCTA text={t.profile.subscribeCta} size="default" />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Logout button */}
          <div className="bg-card border border-border/80 rounded-xl p-4 md:p-6">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground active:text-red-500 md:hover:text-red-500 transition-colors py-1"
            >
              <LogOut className="w-4 h-4" />
              {t.profile.logoutButton}
            </button>
          </div>
        </div>
      </main>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-card rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-md p-5 md:p-6 safe-area-bottom">
            <div className="flex items-center gap-3 mb-3 md:mb-4">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-red-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">{t.profile.cancelConfirmTitle}</h3>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mb-5 md:mb-6 leading-relaxed">
              {t.profile.cancelConfirmDesc}
            </p>
            <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center gap-2 md:gap-3 md:justify-end">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-4 py-3 md:py-2 text-sm font-medium text-foreground/80 bg-muted active:bg-muted md:hover:bg-muted rounded-xl md:rounded-lg transition-colors text-center"
              >
                {t.profile.cancelKeepButton}
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="px-4 py-3 md:py-2 text-sm font-medium text-white bg-red-500 active:bg-red-600 md:hover:bg-red-600 rounded-xl md:rounded-lg transition-colors disabled:opacity-50 text-center"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  t.profile.cancelConfirmButton
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
