/*
 * Profile Page — GrantKit
 * Shows account information and subscription management
 * Users can view status, cancel, or resubscribe
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
      // Refetch subscription status
      utils.subscription.status.invalidate();
    },
  });

  const utils = trpc.useUtils();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Loading state
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    active: {
      icon: <CheckCircle className="w-5 h-5" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
    cancelled: {
      icon: <XCircle className="w-5 h-5" />,
      color: "text-red-500",
      bg: "bg-red-50 border-red-200",
    },
    past_due: {
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "text-amber-500",
      bg: "bg-amber-50 border-amber-200",
    },
    paused: {
      icon: <Pause className="w-5 h-5" />,
      color: "text-gray-500",
      bg: "bg-gray-50 border-gray-200",
    },
    none: {
      icon: <XCircle className="w-5 h-5" />,
      color: "text-gray-400",
      bg: "bg-gray-50 border-gray-200",
    },
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
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <SEO title="Profile" noIndex />
      <Navbar />

      <main className="flex-1 py-10 md:py-16">
        <div className="container max-w-2xl">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.profile.backToHome}
          </Link>

          {/* Page title */}
          <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight mb-8">
            {t.profile.title}
          </h1>

          {/* Account Information Card */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <h2 className="text-lg font-semibold text-[#0f172a]">{t.profile.accountInfo}</h2>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t.profile.name}</p>
                  <p className="text-sm font-medium text-[#0f172a] truncate">
                    {user?.name || "—"}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t.profile.email}</p>
                  <p className="text-sm font-medium text-[#0f172a] truncate">
                    {user?.email || "—"}
                  </p>
                </div>
              </div>

              {/* Member since */}
              <div className="flex items-center gap-3 py-3">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t.profile.memberSince}</p>
                  <p className="text-sm font-medium text-[#0f172a]">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <h2 className="text-lg font-semibold text-[#0f172a]">{t.profile.subscription}</h2>
            </div>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-6 ${config.color} ${config.bg}`}>
              {config.icon}
              {statusLabel[statusKey] || statusLabel.none}
            </div>

            {subStatus?.subscriptionStatus === "active" ? (
              /* Active subscription details */
              <div className="space-y-4">
                <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                  <Shield className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t.profile.plan}</p>
                    <p className="text-sm font-medium text-[#0f172a]">GrantKit Pro — $9/month</p>
                  </div>
                </div>

                {subStatus.subscriptionCurrentPeriodEnd && (
                  <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t.profile.nextBilling}</p>
                      <p className="text-sm font-medium text-[#0f172a]">
                        {new Date(subStatus.subscriptionCurrentPeriodEnd).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cancel button */}
                <div className="pt-4">
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    {t.profile.cancelSubscription}
                  </button>
                </div>
              </div>
            ) : (
              /* No active subscription — show subscribe CTA or admin notice */
              <div className="bg-gray-50 rounded-lg p-5 text-center">
                {user?.role === "admin" ? (
                  <p className="text-sm text-gray-500">
                    You have full access as an administrator.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 mb-4">{t.profile.subscribeDesc}</p>
                    <PricingCTA text={t.profile.subscribeCta} size="default" />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Logout button */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-6">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.profile.logoutButton}
            </button>
          </div>
        </div>
      </main>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-[#0f172a]">{t.profile.cancelConfirmTitle}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {t.profile.cancelConfirmDesc}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t.profile.cancelKeepButton}
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t.profile.cancelConfirmButton
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
