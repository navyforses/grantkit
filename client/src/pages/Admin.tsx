/*
 * Admin Panel — GrantKit
 * Features: User stats overview, user list with search/filter/pagination,
 * role management, subscription status management
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crown,
  RefreshCw,
  Search,
  Shield,
  Users,
  CreditCard,
  XCircle,
  Clock,
  Pause,
  UserCheck,
} from "lucide-react";

// ===== Stat Card =====
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#0f172a]">{value}</p>
    </div>
  );
}

// ===== Status Badge =====
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
    cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" },
    past_due: { bg: "bg-amber-50", text: "text-amber-700", label: "Past Due" },
    paused: { bg: "bg-blue-50", text: "text-blue-700", label: "Paused" },
    none: { bg: "bg-gray-50", text: "text-gray-500", label: "None" },
  };
  const c = config[status] || config.none;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ===== Role Badge =====
function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
        <Shield className="w-3 h-3" /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
      User
    </span>
  );
}

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Stabilize query inputs
  const queryInput = useMemo(
    () => ({ search: search || undefined, statusFilter, page, pageSize }),
    [search, statusFilter, page, pageSize]
  );

  const utils = trpc.useUtils();

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
  });

  const { data: usersData, isLoading: usersLoading } = trpc.admin.users.useQuery(queryInput, {
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
  });

  const updateRoleMutation = trpc.admin.updateRole.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      utils.admin.stats.invalidate();
    },
  });

  const updateSubMutation = trpc.admin.updateSubscription.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      utils.admin.stats.invalidate();
    },
  });

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-700 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-4">You do not have permission to access this page.</p>
          <Link href="/" className="text-[#1e3a5f] hover:underline text-sm">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleRefresh = () => {
    utils.admin.users.invalidate();
    utils.admin.stats.invalidate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-lg font-bold text-[#0f172a]">Admin Panel</h1>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats?.total ?? 0}
            color="bg-[#1e3a5f]"
          />
          <StatCard
            icon={UserCheck}
            label="Active"
            value={stats?.active ?? 0}
            color="bg-emerald-500"
          />
          <StatCard
            icon={XCircle}
            label="Cancelled"
            value={stats?.cancelled ?? 0}
            color="bg-red-500"
          />
          <StatCard
            icon={Clock}
            label="Past Due"
            value={stats?.pastDue ?? 0}
            color="bg-amber-500"
          />
          <StatCard
            icon={Pause}
            label="Paused"
            value={stats?.paused ?? 0}
            color="bg-blue-500"
          />
          <StatCard
            icon={CreditCard}
            label="No Sub"
            value={stats?.none ?? 0}
            color="bg-gray-400"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h2 className="text-base font-semibold text-[#0f172a]">Users</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] w-full sm:w-64"
                />
              </div>
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="past_due">Past Due</option>
                <option value="paused">Paused</option>
                <option value="none">No Subscription</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">User</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Subscription</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Joined</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Last Login</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usersLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <RefreshCw className="w-5 h-5 animate-spin text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Loading users...</p>
                    </td>
                  </tr>
                ) : !usersData?.users.length ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No users found</p>
                    </td>
                  </tr>
                ) : (
                  usersData.users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* User info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-[#1e3a5f]">
                              {(u.name || u.email || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                              {u.name || "—"}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">
                              {u.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="px-5 py-3.5">
                        <RoleBadge role={u.role} />
                      </td>
                      {/* Subscription */}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={u.subscriptionStatus} />
                      </td>
                      {/* Joined */}
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-500">{formatDate(u.createdAt)}</span>
                      </td>
                      {/* Last Login */}
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-500">{formatDate(u.lastSignedIn)}</span>
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role toggle */}
                          {u.id !== user?.id && (
                            <button
                              onClick={() =>
                                updateRoleMutation.mutate({
                                  userId: u.id,
                                  role: u.role === "admin" ? "user" : "admin",
                                })
                              }
                              disabled={updateRoleMutation.isPending}
                              className="text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                              title={u.role === "admin" ? "Demote to User" : "Promote to Admin"}
                            >
                              {u.role === "admin" ? "Demote" : "Promote"}
                            </button>
                          )}
                          {/* Subscription toggle */}
                          <select
                            value={u.subscriptionStatus}
                            onChange={(e) =>
                              updateSubMutation.mutate({
                                userId: u.id,
                                subscriptionStatus: e.target.value as any,
                              })
                            }
                            disabled={updateSubMutation.isPending}
                            className="text-xs px-2 py-1.5 rounded-md border border-gray-200 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/20 disabled:opacity-50"
                          >
                            <option value="none">None</option>
                            <option value="active">Active</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="past_due">Past Due</option>
                            <option value="paused">Paused</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usersData && usersData.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, usersData.total)} of {usersData.total} users
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(usersData.totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (usersData.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= usersData.totalPages - 2) {
                    pageNum = usersData.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded-md transition-colors ${
                        page === pageNum
                          ? "bg-[#1e3a5f] text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(usersData.totalPages, p + 1))}
                  disabled={page === usersData.totalPages}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
