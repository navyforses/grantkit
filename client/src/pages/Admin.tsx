/*
 * Admin Panel — GrantKit
 * Features: User management, Grant CRUD management with tabs
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { CATEGORIES } from "@/lib/constants";
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
  Database,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Check,
  AlertTriangle,
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

// ===== Category Label =====
const categoryLabels: Record<string, string> = {
  medical_treatment: "Medical Treatment",
  financial_assistance: "Financial Assistance",
  assistive_technology: "Assistive Technology",
  social_services: "Social Services",
  scholarships: "Scholarships",
  housing: "Housing",
  travel_transport: "Travel & Transport",
  international: "International",
  other: "Other",
};

// ===== Grant Form Modal =====
function GrantFormModal({
  mode,
  initialData,
  onClose,
  onSave,
  isPending,
}: {
  mode: "create" | "edit";
  initialData?: {
    itemId?: string;
    name: string;
    organization: string;
    description: string;
    category: string;
    type: "grant" | "resource";
    country: string;
    eligibility: string;
    website: string;
    phone: string;
    email: string;
    amount: string;
    status: string;
  };
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: initialData?.name || "",
    organization: initialData?.organization || "",
    description: initialData?.description || "",
    category: initialData?.category || "other",
    type: (initialData?.type || "grant") as "grant" | "resource",
    country: initialData?.country || "US",
    eligibility: initialData?.eligibility || "",
    website: initialData?.website || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    amount: initialData?.amount || "",
    status: initialData?.status || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "edit" && initialData?.itemId) {
      onSave({ itemId: initialData.itemId, ...form });
    } else {
      onSave(form);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-[#0f172a]">
            {mode === "create" ? "Add New Grant" : "Edit Grant"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              placeholder="Grant name..."
            />
          </div>

          {/* Organization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization</label>
            <input
              type="text"
              value={form.organization}
              onChange={(e) => updateField("organization", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              placeholder="Organization name..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
              placeholder="Describe the grant..."
            />
          </div>

          {/* Row: Category + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white"
              >
                {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {categoryLabels[c.value] || c.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white"
              >
                <option value="grant">Grant</option>
                <option value="resource">Resource</option>
              </select>
            </div>
          </div>

          {/* Row: Country + Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white"
              >
                <option value="US">🇺🇸 United States</option>
                <option value="International">🌍 International</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
              <input
                type="text"
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                placeholder="e.g., $5,000 - $25,000"
              />
            </div>
          </div>

          {/* Eligibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Eligibility</label>
            <textarea
              value={form.eligibility}
              onChange={(e) => updateField("eligibility", e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
              placeholder="Who is eligible..."
            />
          </div>

          {/* Row: Website + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                placeholder="contact@example.com"
              />
            </div>
          </div>

          {/* Row: Phone + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <input
                type="text"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                placeholder="e.g., Open, Rolling, Deadline..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !form.name.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {mode === "create" ? "Create Grant" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Delete Confirmation Modal =====
function DeleteConfirmModal({
  grantName,
  onConfirm,
  onCancel,
  isPending,
}: {
  grantName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Delete Grant</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to deactivate <strong>{grantName}</strong>? It will be hidden from the catalog but can be restored later.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Main Admin Component =====
export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "grants">("users");

  // Users state
  const [userSearch, setUserSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 15;

  // Grants state
  const [grantSearch, setGrantSearch] = useState("");
  const [grantCategoryFilter, setGrantCategoryFilter] = useState("all");
  const [grantPage, setGrantPage] = useState(1);
  const grantPageSize = 15;
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [editingGrant, setEditingGrant] = useState<any>(null);
  const [deletingGrant, setDeletingGrant] = useState<{ itemId: string; name: string } | null>(null);

  // Stabilize query inputs
  const userQueryInput = useMemo(
    () => ({ search: userSearch || undefined, statusFilter, page: userPage, pageSize: userPageSize }),
    [userSearch, statusFilter, userPage, userPageSize]
  );

  const grantQueryInput = useMemo(
    () => ({
      search: grantSearch || undefined,
      category: grantCategoryFilter !== "all" ? grantCategoryFilter : undefined,
      page: grantPage,
      pageSize: grantPageSize,
    }),
    [grantSearch, grantCategoryFilter, grantPage, grantPageSize]
  );

  const utils = trpc.useUtils();

  // User queries
  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
  });

  const { data: usersData, isLoading: usersLoading } = trpc.admin.users.useQuery(userQueryInput, {
    enabled: isAuthenticated && user?.role === "admin" && activeTab === "users",
    retry: false,
  });

  // Grant queries
  const { data: grantStats } = trpc.admin.grantStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
  });

  const { data: grantsData, isLoading: grantsLoading } = trpc.admin.grants.useQuery(grantQueryInput, {
    enabled: isAuthenticated && user?.role === "admin" && activeTab === "grants",
    retry: false,
  });

  // Mutations
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

  const createGrantMutation = trpc.admin.createGrant.useMutation({
    onSuccess: () => {
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
      setShowGrantForm(false);
    },
  });

  const updateGrantMutation = trpc.admin.updateGrant.useMutation({
    onSuccess: () => {
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
      setEditingGrant(null);
    },
  });

  const deleteGrantMutation = trpc.admin.deleteGrant.useMutation({
    onSuccess: () => {
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
      setDeletingGrant(null);
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
    utils.admin.invalidate();
  };

  const handleEditGrant = async (grant: any) => {
    setEditingGrant({
      itemId: grant.itemId,
      name: grant.name,
      organization: grant.organization,
      description: "",
      category: grant.category,
      type: grant.type,
      country: grant.country,
      eligibility: "",
      website: "",
      phone: "",
      email: "",
      amount: "",
      status: "",
    });

    // Fetch full details
    try {
      const detail = await utils.admin.grantDetail.fetch({ itemId: grant.itemId });
      if (detail) {
        setEditingGrant({
          itemId: detail.itemId,
          name: detail.name,
          organization: detail.organization,
          description: detail.description,
          category: detail.category,
          type: detail.type,
          country: detail.country,
          eligibility: detail.eligibility,
          website: detail.website,
          phone: detail.phone,
          email: detail.email,
          amount: detail.amount,
          status: detail.status,
        });
      }
    } catch (err) {
      console.error("Failed to fetch grant details:", err);
    }
  };

  const handleToggleActive = (grant: any) => {
    updateGrantMutation.mutate({
      itemId: grant.itemId,
      isActive: !grant.isActive,
    });
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
          <StatCard icon={Users} label="Total Users" value={stats?.total ?? 0} color="bg-[#1e3a5f]" />
          <StatCard icon={UserCheck} label="Active Subs" value={stats?.active ?? 0} color="bg-emerald-500" />
          <StatCard icon={Database} label="Total Grants" value={grantStats?.active ?? 0} color="bg-indigo-500" />
          <StatCard icon={XCircle} label="Cancelled" value={stats?.cancelled ?? 0} color="bg-red-500" />
          <StatCard icon={Clock} label="Past Due" value={stats?.pastDue ?? 0} color="bg-amber-500" />
          <StatCard icon={CreditCard} label="No Sub" value={stats?.none ?? 0} color="bg-gray-400" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-xl border border-gray-100 p-1 w-fit shadow-sm">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "users"
                ? "bg-[#1e3a5f] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab("grants")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "grants"
                ? "bg-[#1e3a5f] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Database className="w-4 h-4" />
            Grants
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "grants" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {grantStats?.active ?? 0}
            </span>
          </button>
        </div>

        {/* ===== USERS TAB ===== */}
        {activeTab === "users" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="text-base font-semibold text-[#0f172a]">Users</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] w-full sm:w-64"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setUserPage(1); }}
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
                        <p className="text-sm text-gray-400">No users found</p>
                      </td>
                    </tr>
                  ) : (
                    usersData.users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-[#1e3a5f]">
                                {(u.name || u.email || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{u.name || "—"}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[200px]">{u.email || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                        <td className="px-5 py-3.5"><StatusBadge status={u.subscriptionStatus} /></td>
                        <td className="px-5 py-3.5"><span className="text-sm text-gray-500">{formatDate(u.createdAt)}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm text-gray-500">{formatDate(u.lastSignedIn)}</span></td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.id !== user?.id && (
                              <button
                                onClick={() => updateRoleMutation.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })}
                                disabled={updateRoleMutation.isPending}
                                className="text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                title={u.role === "admin" ? "Demote to User" : "Promote to Admin"}
                              >
                                {u.role === "admin" ? "Demote" : "Promote"}
                              </button>
                            )}
                            <select
                              value={u.subscriptionStatus}
                              onChange={(e) => updateSubMutation.mutate({ userId: u.id, subscriptionStatus: e.target.value as any })}
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
                  Showing {((userPage - 1) * userPageSize) + 1}–{Math.min(userPage * userPageSize, usersData.total)} of {usersData.total}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage === 1} className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(usersData.totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (usersData.totalPages <= 5) pageNum = i + 1;
                    else if (userPage <= 3) pageNum = i + 1;
                    else if (userPage >= usersData.totalPages - 2) pageNum = usersData.totalPages - 4 + i;
                    else pageNum = userPage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => setUserPage(pageNum)} className={`w-8 h-8 text-sm rounded-md transition-colors ${userPage === pageNum ? "bg-[#1e3a5f] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => setUserPage((p) => Math.min(usersData.totalPages, p + 1))} disabled={userPage === usersData.totalPages} className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== GRANTS TAB ===== */}
        {activeTab === "grants" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Grants & Resources
                <span className="text-sm font-normal text-gray-400 ml-2">
                  {grantStats?.grants ?? 0} grants, {grantStats?.resources ?? 0} resources
                </span>
              </h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search grants..."
                    value={grantSearch}
                    onChange={(e) => { setGrantSearch(e.target.value); setGrantPage(1); }}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] w-full sm:w-56"
                  />
                </div>
                <select
                  value={grantCategoryFilter}
                  onChange={(e) => { setGrantCategoryFilter(e.target.value); setGrantPage(1); }}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white"
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {categoryLabels[c.value] || c.value}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowGrantForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Grant
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Grant</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Category</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Country</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Added</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grantsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Loading grants...</p>
                      </td>
                    </tr>
                  ) : !grantsData?.grants.length ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <Database className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No grants found</p>
                      </td>
                    </tr>
                  ) : (
                    grantsData.grants.map((g) => (
                      <tr key={g.itemId} className={`hover:bg-gray-50/50 transition-colors ${!g.isActive ? "opacity-50" : ""}`}>
                        <td className="px-5 py-3.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[280px]">{g.name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[280px]">{g.organization || "—"}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-gray-600">
                            {categoryLabels[g.category] || g.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            g.type === "grant" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                          }`}>
                            {g.type === "grant" ? "Grant" : "Resource"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-500">
                            {g.country === "US" ? "🇺🇸 US" : "🌍 Intl"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            g.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}>
                            {g.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-500">{formatDate(g.createdAt)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditGrant(g)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(g)}
                              disabled={updateGrantMutation.isPending}
                              className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                              title={g.isActive ? "Deactivate" : "Activate"}
                            >
                              {g.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setDeletingGrant({ itemId: g.itemId, name: g.name })}
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {grantsData && grantsData.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {((grantPage - 1) * grantPageSize) + 1}–{Math.min(grantPage * grantPageSize, grantsData.total)} of {grantsData.total}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setGrantPage((p) => Math.max(1, p - 1))} disabled={grantPage === 1} className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(grantsData.totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (grantsData.totalPages <= 5) pageNum = i + 1;
                    else if (grantPage <= 3) pageNum = i + 1;
                    else if (grantPage >= grantsData.totalPages - 2) pageNum = grantsData.totalPages - 4 + i;
                    else pageNum = grantPage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => setGrantPage(pageNum)} className={`w-8 h-8 text-sm rounded-md transition-colors ${grantPage === pageNum ? "bg-[#1e3a5f] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => setGrantPage((p) => Math.min(grantsData.totalPages, p + 1))} disabled={grantPage === grantsData.totalPages} className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showGrantForm && (
        <GrantFormModal
          mode="create"
          onClose={() => setShowGrantForm(false)}
          onSave={(data) => createGrantMutation.mutate(data)}
          isPending={createGrantMutation.isPending}
        />
      )}

      {editingGrant && (
        <GrantFormModal
          mode="edit"
          initialData={editingGrant}
          onClose={() => setEditingGrant(null)}
          onSave={(data) => updateGrantMutation.mutate(data)}
          isPending={updateGrantMutation.isPending}
        />
      )}

      {deletingGrant && (
        <DeleteConfirmModal
          grantName={deletingGrant.name}
          onConfirm={() => deleteGrantMutation.mutate({ itemId: deletingGrant.itemId })}
          onCancel={() => setDeletingGrant(null)}
          isPending={deleteGrantMutation.isPending}
        />
      )}
    </div>
  );
}
