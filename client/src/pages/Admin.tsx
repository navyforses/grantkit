/*
 * Admin Panel — GrantKit
 * Features: User management, Grant CRUD management, Newsletter notifications
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { CATEGORIES } from "@/lib/constants";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import SEO from "@/components/SEO";
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
  Mail,
  Send,
  Bell,
  CheckCircle,
  XOctagon,
  Loader2,
  Download,
  FileSpreadsheet,
  Upload,
  FileUp,
  AlertCircle,
  CheckCircle2,
  Info,
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
  value: number | string;
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

// ===== Notification Status Badge =====
function NotifStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    sending: { bg: "bg-blue-50", text: "text-blue-700", icon: Loader2 },
    completed: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
    failed: { bg: "bg-red-50", text: "text-red-700", icon: XOctagon },
  };
  const c = config[status] || config.sending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon className={`w-3 h-3 ${status === "sending" ? "animate-spin" : ""}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

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
    applicationProcess?: string;
    deadline?: string;
    fundingType?: string;
    targetDiagnosis?: string;
    ageRange?: string;
    geographicScope?: string;
    documentsRequired?: string;
    b2VisaEligible?: string;
    state?: string;
    city?: string;
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
    applicationProcess: initialData?.applicationProcess || "",
    deadline: initialData?.deadline || "",
    fundingType: initialData?.fundingType || "",
    targetDiagnosis: initialData?.targetDiagnosis || "",
    ageRange: initialData?.ageRange || "",
    geographicScope: initialData?.geographicScope || "",
    documentsRequired: initialData?.documentsRequired || "",
    b2VisaEligible: initialData?.b2VisaEligible || "",
    state: initialData?.state || "",
    city: initialData?.city || "",
  });
  const [notifySubscribers, setNotifySubscribers] = useState(mode === "create");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "edit" && initialData?.itemId) {
      onSave({ itemId: initialData.itemId, ...form });
    } else {
      onSave({ ...form, notifySubscribers });
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
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
                type="text"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                placeholder="contact@..."
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
                placeholder="+1 (555) ..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <input
                type="text"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                placeholder="Open, Closed, Rolling..."
              />
            </div>
          </div>

          {/* ===== Enrichment Fields ===== */}
          <div className="border-t border-gray-100 pt-5 mt-2">
            <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#1e3a5f]" />
              Enrichment Details
            </h4>

            {/* Application Process */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Application Process</label>
              <textarea
                value={form.applicationProcess}
                onChange={(e) => updateField("applicationProcess", e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
                placeholder="Step-by-step application process..."
              />
            </div>

            {/* Row: Deadline + Funding Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label>
                <input
                  type="text"
                  value={form.deadline}
                  onChange={(e) => updateField("deadline", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  placeholder="Rolling, Dec 31, 2026..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Funding Type</label>
                <select
                  value={form.fundingType}
                  onChange={(e) => updateField("fundingType", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white"
                >
                  <option value="">Not specified</option>
                  <option value="one_time">One-Time</option>
                  <option value="recurring">Recurring</option>
                  <option value="reimbursement">Reimbursement</option>
                  <option value="varies">Varies</option>
                </select>
              </div>
            </div>

            {/* Row: Target Diagnosis + Age Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Diagnosis / Condition</label>
                <input
                  type="text"
                  value={form.targetDiagnosis}
                  onChange={(e) => updateField("targetDiagnosis", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  placeholder="Cancer, Rare Disease, Any..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Age Range</label>
                <input
                  type="text"
                  value={form.ageRange}
                  onChange={(e) => updateField("ageRange", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  placeholder="All Ages, Children (0-17), Adults..."
                />
              </div>
            </div>

            {/* Row: State + City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  placeholder="California, New York, Nationwide..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  placeholder="Los Angeles, New York City..."
                />
              </div>
            </div>

            {/* Row: Geographic Scope + B-2 Visa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Geographic Scope</label>
                <input
                  type="text"
                  value={form.geographicScope}
                  onChange={(e) => updateField("geographicScope", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  placeholder="Nationwide, State-specific..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">B-2 Visa Eligible</label>
                <select
                  value={form.b2VisaEligible}
                  onChange={(e) => updateField("b2VisaEligible", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white"
                >
                  <option value="">Not specified</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="uncertain">Uncertain</option>
                </select>
              </div>
            </div>

            {/* Documents Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Documents Required</label>
              <textarea
                value={form.documentsRequired}
                onChange={(e) => updateField("documentsRequired", e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
                placeholder="Medical records, proof of income, ID..."
              />
            </div>
          </div>

          {/* Notify Subscribers (only for create mode) */}
          {mode === "create" && (
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <input
                type="checkbox"
                id="notifySubscribers"
                checked={notifySubscribers}
                onChange={(e) => setNotifySubscribers(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="notifySubscribers" className="text-sm text-purple-800">
                <span className="font-medium">Notify newsletter subscribers</span>
                <span className="text-purple-600 block text-xs mt-0.5">
                  Send email notification about this new grant to all active subscribers
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !form.name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : mode === "create" ? (
                <Plus className="w-4 h-4" />
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

// ===== Delete Confirm Modal =====
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
          <h3 className="text-lg font-semibold text-[#0f172a]">Delete Grant</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to permanently delete <strong>"{grantName}"</strong>? This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Send Notification Modal =====
function SendNotificationModal({
  onClose,
  onSend,
  isPending,
}: {
  onClose: () => void;
  onSend: (grantItemIds: string[]) => void;
  isPending: boolean;
}) {
  const [grantSearch, setGrantSearch] = useState("");
  const [selectedGrants, setSelectedGrants] = useState<Array<{ itemId: string; name: string }>>([]);

  // Search recent grants to select from
  const { data: recentGrants } = trpc.admin.grants.useQuery({
    search: grantSearch,
    page: 1,
    pageSize: 10,
  });

  const toggleGrant = (grant: { itemId: string; name: string }) => {
    setSelectedGrants((prev) => {
      const exists = prev.find((g) => g.itemId === grant.itemId);
      if (exists) return prev.filter((g) => g.itemId !== grant.itemId);
      if (prev.length >= 20) return prev; // max 20
      return [...prev, grant];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Send className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0f172a]">Send Grant Notification</h3>
              <p className="text-xs text-gray-500">Select grants to notify subscribers about</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Selected Grants */}
        {selectedGrants.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 bg-purple-50/50">
            <p className="text-xs font-medium text-purple-700 mb-2">
              Selected ({selectedGrants.length}/20):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedGrants.map((g) => (
                <span
                  key={g.itemId}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white text-purple-700 rounded-full border border-purple-200 cursor-pointer hover:bg-purple-50"
                  onClick={() => toggleGrant(g)}
                >
                  {g.name.length > 30 ? g.name.substring(0, 30) + "..." : g.name}
                  <X className="w-3 h-3" />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search grants to include..."
              value={grantSearch}
              onChange={(e) => setGrantSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
            />
          </div>
        </div>

        {/* Grant List */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {recentGrants?.grants.map((g) => {
            const isSelected = selectedGrants.some((s) => s.itemId === g.itemId);
            return (
              <div
                key={g.itemId}
                onClick={() => toggleGrant({ itemId: g.itemId, name: g.name })}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                  isSelected ? "bg-purple-50 border border-purple-200" : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-purple-600 border-purple-600" : "border-gray-300"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{g.name}</p>
                  <p className="text-xs text-gray-400">
                    {categoryLabels[g.category] || g.category} · {g.country === "US" ? "🇺🇸 US" : "🌍 Intl"}
                  </p>
                </div>
              </div>
            );
          })}
          {recentGrants?.grants.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">No grants found</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {selectedGrants.length === 0
              ? "Select at least one grant"
              : `${selectedGrants.length} grant${selectedGrants.length > 1 ? "s" : ""} selected`}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSend(selectedGrants.map((g) => g.itemId))}
              disabled={isPending || selectedGrants.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to Subscribers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Main Admin Component =====
export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Tab state
  const [activeTab, setActiveTab] = useState<"users" | "grants" | "newsletter">("users");

  // Users tab state
  const [userSearch, setUserSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 20;

  // Grants tab state
  const [grantSearch, setGrantSearch] = useState("");
  const [grantCategoryFilter, setGrantCategoryFilter] = useState("all");
  const [grantPage, setGrantPage] = useState(1);
  const grantPageSize = 20;
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [editingGrant, setEditingGrant] = useState<any>(null);
  const [deletingGrant, setDeletingGrant] = useState<{ itemId: string; name: string } | null>(null);

  // Newsletter tab state
  const [showSendNotification, setShowSendNotification] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // ===== Queries =====
  const { data: stats } = trpc.admin.stats.useQuery();
  const { data: grantStats } = trpc.admin.grantStats.useQuery();
  const { data: newsletterStats } = trpc.admin.newsletterStats.useQuery();
  const { data: notifHistory } = trpc.admin.notificationHistory.useQuery({ limit: 20 });

  const { data: usersData, isLoading: usersLoading } = trpc.admin.users.useQuery({
    search: userSearch || undefined,
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
    page: userPage,
    pageSize: userPageSize,
  });

  const { data: grantsData, isLoading: grantsLoading } = trpc.admin.grants.useQuery({
    search: grantSearch || undefined,
    category: grantCategoryFilter !== "all" ? grantCategoryFilter : undefined,
    page: grantPage,
    pageSize: grantPageSize,
  });

  // ===== Mutations =====
  const updateRoleMutation = trpc.admin.updateRole.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      toast.success("User role updated");
    },
  });

  const updateSubMutation = trpc.admin.updateSubscription.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      utils.admin.stats.invalidate();
      toast.success("Subscription status updated");
    },
  });

  const createGrantMutation = trpc.admin.createGrant.useMutation({
    onSuccess: (data) => {
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
      utils.admin.notificationHistory.invalidate();
      setShowGrantForm(false);
      toast.success("Grant created successfully");
    },
  });

  const updateGrantMutation = trpc.admin.updateGrant.useMutation({
    onSuccess: () => {
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
      setEditingGrant(null);
      toast.success("Grant updated");
    },
  });

  const deleteGrantMutation = trpc.admin.deleteGrant.useMutation({
    onSuccess: () => {
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
      setDeletingGrant(null);
      toast.success("Grant deleted");
    },
  });

  const parseImportMutation = trpc.admin.parseImport.useMutation();
  const executeImportMutation = trpc.admin.executeImport.useMutation();

  const sendNotificationMutation = trpc.admin.sendNewGrantNotification.useMutation({
    onSuccess: (data) => {
      utils.admin.notificationHistory.invalidate();
      setShowSendNotification(false);
      if (data.success) {
        toast.success(`Notification sent to ${data.recipientCount} subscribers for ${data.grantCount} grant(s)`);
      } else {
        toast.error(data.error || "Failed to send notification");
      }
    },
    onError: (err) => {
      toast.error("Failed to send notification: " + err.message);
    },
  });

  // ===== Export Helpers =====
  const escapeCsvField = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  };

  const exportAsCSV = async () => {
    setIsExporting(true);
    try {
      const data = await utils.admin.exportGrants.fetch({
        category: grantCategoryFilter !== "all" ? grantCategoryFilter : undefined,
        includeInactive: true,
      });

      if (!data || data.length === 0) {
        toast.error("No grants to export");
        return;
      }

      const languages = ["en", "ka", "fr", "es", "ru"];
      const headers = [
        "Item ID", "Name", "Organization", "Description", "Category", "Type",
        "Country", "Eligibility", "Website", "Phone", "Email", "Amount",
        "Status", "Active", "Created At", "Updated At",
        ...languages.flatMap(lang => [`${lang.toUpperCase()} Name`, `${lang.toUpperCase()} Description`, `${lang.toUpperCase()} Eligibility`]),
      ];

      const rows = data.map(g => {
        const base = [
          g.itemId, g.name, g.organization, g.description, g.category, g.type,
          g.country, g.eligibility, g.website, g.phone, g.email, g.amount,
          g.status, g.isActive ? "Yes" : "No",
          g.createdAt ? new Date(g.createdAt).toISOString().split("T")[0] : "",
          g.updatedAt ? new Date(g.updatedAt).toISOString().split("T")[0] : "",
        ];
        const translationCols = languages.flatMap(lang => {
          const t = g.translations?.[lang];
          return [t?.name || "", t?.description || "", t?.eligibility || ""];
        });
        return [...base, ...translationCols].map(v => escapeCsvField(String(v || "")));
      });

      const bom = "\uFEFF";
      const csvContent = bom + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grantkit-grants-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} grants as CSV`);
    } catch (err) {
      toast.error("Export failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsExcel = async () => {
    setIsExporting(true);
    try {
      const data = await utils.admin.exportGrants.fetch({
        category: grantCategoryFilter !== "all" ? grantCategoryFilter : undefined,
        includeInactive: true,
      });

      if (!data || data.length === 0) {
        toast.error("No grants to export");
        return;
      }

      const languages = ["en", "ka", "fr", "es", "ru"];

      // Build tab-separated content for Excel-compatible format
      const headers = [
        "Item ID", "Name", "Organization", "Description", "Category", "Type",
        "Country", "Eligibility", "Website", "Phone", "Email", "Amount",
        "Status", "Active", "Created At", "Updated At",
        ...languages.flatMap(lang => [`${lang.toUpperCase()} Name`, `${lang.toUpperCase()} Description`, `${lang.toUpperCase()} Eligibility`]),
      ];

      const escapeTab = (v: string) => v.replace(/\t/g, " ").replace(/\n/g, " ");

      const rows = data.map(g => {
        const base = [
          g.itemId, g.name, g.organization, g.description, g.category, g.type,
          g.country, g.eligibility, g.website, g.phone, g.email, g.amount,
          g.status, g.isActive ? "Yes" : "No",
          g.createdAt ? new Date(g.createdAt).toISOString().split("T")[0] : "",
          g.updatedAt ? new Date(g.updatedAt).toISOString().split("T")[0] : "",
        ];
        const translationCols = languages.flatMap(lang => {
          const t = g.translations?.[lang];
          return [t?.name || "", t?.description || "", t?.eligibility || ""];
        });
        return [...base, ...translationCols].map(v => escapeTab(String(v || "")));
      });

      // Use XML Spreadsheet format for proper Excel support with Unicode
      const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Grants">
<Table>`;

      const escapeXml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

      const headerRow = `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>`;

      const dataRows = rows.map(row =>
        `<Row>${row.map(cell => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>`
      ).join("\n");

      const xmlFooter = `</Table>
</Worksheet>
</Workbook>`;

      const xmlContent = [xmlHeader, headerRow, dataRows, xmlFooter].join("\n");
      const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grantkit-grants-${new Date().toISOString().split("T")[0]}.xls`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} grants as Excel`);
    } catch (err) {
      toast.error("Export failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  // ===== Import Helpers =====
  const handleImportFileSelect = async (file: File) => {
    setImportFile(file);
    setIsImporting(true);

    try {
      // Read file as base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const format = file.name.toLowerCase().endsWith(".csv") ? "csv" as const : "excel" as const;

      const result = await parseImportMutation.mutateAsync({
        content: base64,
        filename: file.name,
        format,
      });

      setImportPreview(result);
      setImportStep("preview");
    } catch (err) {
      toast.error("Failed to parse file: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importPreview?.grants?.length) return;
    setIsImporting(true);
    setImportStep("importing");

    try {
      const result = await executeImportMutation.mutateAsync({
        grants: importPreview.grants,
      });

      setImportResult(result);
      setImportStep("done");
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
      toast.success(`Imported ${result.created} new, updated ${result.updated} existing grants`);
    } catch (err) {
      toast.error("Import failed: " + (err instanceof Error ? err.message : "Unknown error"));
      setImportStep("preview");
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setShowImportModal(false);
    setImportStep("upload");
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setIsImporting(false);
  };

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

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
      <SEO title="Admin Panel" noIndex />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
          <StatCard icon={Users} label="Total Users" value={stats?.total ?? 0} color="bg-[#1e3a5f]" />
          <StatCard icon={UserCheck} label="Active Subs" value={stats?.active ?? 0} color="bg-emerald-500" />
          <StatCard icon={Database} label="Total Grants" value={grantStats?.active ?? 0} color="bg-indigo-500" />
          <StatCard icon={Mail} label="Subscribers" value={newsletterStats?.active ?? 0} color="bg-purple-500" />
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
          <button
            onClick={() => setActiveTab("newsletter")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "newsletter"
                ? "bg-[#1e3a5f] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Mail className="w-4 h-4" />
            Newsletter
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "newsletter" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {newsletterStats?.active ?? 0}
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
                <div className="flex gap-2">
                  <button
                    onClick={exportAsCSV}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Export as CSV"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    CSV
                  </button>
                  <button
                    onClick={exportAsExcel}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Export as Excel"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                    Excel
                  </button>
                  <button
                    onClick={() => { resetImport(); setShowImportModal(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1e3a5f] bg-white border border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5 rounded-lg transition-colors"
                    title="Import grants from CSV/Excel"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <button
                    onClick={() => setShowGrantForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Grant
                  </button>
                </div>
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

        {/* ===== NEWSLETTER TAB ===== */}
        {activeTab === "newsletter" && (
          <div className="space-y-6">
            {/* Newsletter Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Active Subscribers</p>
                    <p className="text-2xl font-bold text-[#0f172a]">{newsletterStats?.active ?? 0}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {newsletterStats?.total ?? 0} total ({(newsletterStats?.total ?? 0) - (newsletterStats?.active ?? 0)} unsubscribed)
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Notifications Sent</p>
                    <p className="text-2xl font-bold text-[#0f172a]">{notifHistory?.length ?? 0}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {notifHistory?.filter((n) => n.status === "completed").length ?? 0} completed, {notifHistory?.filter((n) => n.status === "failed").length ?? 0} failed
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex items-center justify-center">
                <button
                  onClick={() => setShowSendNotification(true)}
                  className="inline-flex items-center gap-3 px-6 py-3 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm"
                >
                  <Send className="w-5 h-5" />
                  Send Grant Notification
                </button>
              </div>
            </div>

            {/* Notification History */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#0f172a]">Notification History</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Subject</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Grants</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Recipients</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Success</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {!notifHistory?.length ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <Mail className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No notifications sent yet</p>
                          <p className="text-xs text-gray-300 mt-1">Click "Send Grant Notification" to get started</p>
                        </td>
                      </tr>
                    ) : (
                      notifHistory.map((n) => {
                        let grantCount = 0;
                        try {
                          grantCount = JSON.parse(n.grantItemIds).length;
                        } catch { grantCount = 0; }

                        return (
                          <tr key={n.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{n.subject}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-gray-600">{grantCount}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-gray-600">{n.recipientCount}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm">
                                <span className="text-emerald-600">{n.successCount}</span>
                                {n.failCount > 0 && (
                                  <span className="text-red-500 ml-1">/ {n.failCount} failed</span>
                                )}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <NotifStatusBadge status={n.status} />
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-gray-500">{formatDateTime(n.sentAt)}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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

      {showSendNotification && (
        <SendNotificationModal
          onClose={() => setShowSendNotification(false)}
          onSend={(grantItemIds) => sendNotificationMutation.mutate({ grantItemIds })}
          isPending={sendNotificationMutation.isPending}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0f172a]">Import Grants</h3>
                  <p className="text-xs text-gray-400">
                    {importStep === "upload" && "Upload a CSV or Excel file"}
                    {importStep === "preview" && "Review parsed data before importing"}
                    {importStep === "importing" && "Importing grants..."}
                    {importStep === "done" && "Import completed"}
                  </p>
                </div>
              </div>
              <button onClick={resetImport} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Upload */}
              {importStep === "upload" && (
                <div className="space-y-6">
                  {/* Drop zone */}
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-[#1e3a5f]/40 transition-colors cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-[#1e3a5f]", "bg-[#1e3a5f]/5"); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove("border-[#1e3a5f]", "bg-[#1e3a5f]/5"); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-[#1e3a5f]", "bg-[#1e3a5f]/5");
                      const file = e.dataTransfer.files[0];
                      if (file) handleImportFileSelect(file);
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".csv,.xlsx,.xls";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleImportFileSelect(file);
                      };
                      input.click();
                    }}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-10 h-10 text-[#1e3a5f] mx-auto mb-3 animate-spin" />
                        <p className="text-sm font-medium text-gray-700">Parsing file...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700 mb-1">Drop your CSV or Excel file here</p>
                        <p className="text-xs text-gray-400">or click to browse</p>
                      </>
                    )}
                  </div>

                  {/* Format guide */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-2">Expected columns:</p>
                        <p className="text-xs leading-relaxed">
                          <strong>Required:</strong> Name, Category, Country<br />
                          <strong>Optional:</strong> Item ID (for updates), Organization, Description, Type, Eligibility, Website, Phone, Email, Amount, Status<br />
                          <strong>Translations:</strong> EN Name, EN Description, KA Name, KA Description, FR Name, etc.
                        </p>
                        <p className="text-xs mt-2 text-blue-500">
                          Tip: Export existing grants first to see the exact format.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Preview */}
              {importStep === "preview" && importPreview && (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{importPreview.validRows}</p>
                      <p className="text-xs text-emerald-600">Valid Rows</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{importPreview.skippedRows}</p>
                      <p className="text-xs text-amber-600">Skipped</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{importPreview.errors.length + (importPreview.duplicateErrors?.length || 0)}</p>
                      <p className="text-xs text-red-600">Errors</p>
                    </div>
                  </div>

                  {/* Errors */}
                  {(importPreview.errors.length > 0 || importPreview.duplicateErrors?.length > 0) && (
                    <div className="bg-red-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm font-medium text-red-700">Validation Errors</p>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {[...importPreview.errors, ...(importPreview.duplicateErrors || [])].slice(0, 20).map((err: any, i: number) => (
                          <p key={i} className="text-xs text-red-600">
                            Row {err.row}: [{err.field}] {err.message}
                          </p>
                        ))}
                        {(importPreview.errors.length + (importPreview.duplicateErrors?.length || 0)) > 20 && (
                          <p className="text-xs text-red-400 italic">...and {importPreview.errors.length + (importPreview.duplicateErrors?.length || 0) - 20} more</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preview table */}
                  {importPreview.grants.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <p className="text-xs font-medium text-gray-500">Preview (first 10 rows)</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50/50">
                              <th className="text-left px-3 py-2 font-medium text-gray-500">#</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Name</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Category</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Country</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Type</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">Translations</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {importPreview.grants.slice(0, 10).map((g: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-50/50">
                                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                <td className="px-3 py-2 text-gray-900 font-medium truncate max-w-[200px]">
                                  {g.itemId && <span className="text-blue-500 mr-1" title="Will update existing">↻</span>}
                                  {g.name}
                                </td>
                                <td className="px-3 py-2 text-gray-600">{g.category}</td>
                                <td className="px-3 py-2 text-gray-600">{g.country}</td>
                                <td className="px-3 py-2 text-gray-600">{g.type}</td>
                                <td className="px-3 py-2 text-gray-500">
                                  {Object.keys(g.translations).length > 0
                                    ? Object.keys(g.translations).map(l => l.toUpperCase()).join(", ")
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {importPreview.grants.length > 10 && (
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 text-center">
                          ...and {importPreview.grants.length - 10} more rows
                        </div>
                      )}
                    </div>
                  )}

                  {importFile && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Importing */}
              {importStep === "importing" && (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 text-[#1e3a5f] mx-auto mb-4 animate-spin" />
                  <p className="text-sm font-medium text-gray-700">Importing {importPreview?.grants?.length} grants...</p>
                  <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
                </div>
              )}

              {/* Step 4: Done */}
              {importStep === "done" && importResult && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-lg font-semibold text-gray-900">Import Complete</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{importResult.created}</p>
                      <p className="text-xs text-emerald-600">Created</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
                      <p className="text-xs text-blue-600">Updated</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{importResult.errors?.length || 0}</p>
                      <p className="text-xs text-red-600">Failed</p>
                    </div>
                  </div>

                  {importResult.errors?.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-red-700 mb-2">Failed Entries:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.errors.map((err: any, i: number) => (
                          <p key={i} className="text-xs text-red-600">
                            #{err.index + 1} "{err.name}": {err.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={resetImport}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {importStep === "done" ? "Close" : "Cancel"}
              </button>
              <div className="flex gap-2">
                {importStep === "preview" && (
                  <>
                    <button
                      onClick={() => { setImportStep("upload"); setImportPreview(null); setImportFile(null); }}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Upload Different File
                    </button>
                    <button
                      onClick={handleExecuteImport}
                      disabled={!importPreview?.grants?.length || isImporting}
                      className="px-6 py-2 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Import {importPreview?.grants?.length || 0} Grants
                    </button>
                  </>
                )}
                {importStep === "done" && (
                  <button
                    onClick={resetImport}
                    className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
