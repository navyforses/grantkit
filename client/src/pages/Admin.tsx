/**
 * Admin Panel — GrantKit
 * Features: User management, Grant CRUD management, Newsletter notifications
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { CATEGORIES } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
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

import type { Translations } from "@/i18n/types";

type AdminT = Translations["admin"];

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
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// ===== Status Badge =====
function StatusBadge({ status, t }: { status: string; t: AdminT }) {
  const config: Record<string, { bg: string; text: string; key: keyof AdminT }> = {
    active: { bg: "bg-emerald-50", text: "text-emerald-700", key: "statusActive" },
    cancelled: { bg: "bg-red-50", text: "text-red-700", key: "statusCancelled" },
    past_due: { bg: "bg-amber-50", text: "text-amber-700", key: "statusPastDue" },
    paused: { bg: "bg-blue-50", text: "text-blue-700", key: "statusPaused" },
    none: { bg: "bg-secondary", text: "text-muted-foreground", key: "statusNone" },
  };
  const c = config[status] || config.none;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {t[c.key] as string}
    </span>
  );
}

// ===== Role Badge =====
function RoleBadge({ role, t }: { role: string; t: AdminT }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
        <Shield className="w-3 h-3" /> {t.roleAdmin}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
      {t.roleUser}
    </span>
  );
}

// ===== Notification Status Badge =====
function NotifStatusBadge({ status, t }: { status: string; t: AdminT }) {
  const config: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    sending: { bg: "bg-blue-50", text: "text-blue-700", icon: Loader2 },
    completed: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
    failed: { bg: "bg-red-50", text: "text-red-700", icon: XOctagon },
  };
  const c = config[status] || config.sending;
  const Icon = c.icon;
  const label = status === "completed" ? t.completed : status === "failed" ? t.failed : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon className={`w-3 h-3 ${status === "sending" ? "animate-spin" : ""}`} />
      {label}
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
  t,
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
  t: AdminT;
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

  const categoryLabels: Record<string, string> = {
    medical_treatment: t.catMedicalTreatment,
    financial_assistance: t.catFinancialAssistance,
    assistive_technology: t.catAssistiveTechnology,
    social_services: t.catSocialServices,
    scholarships: t.catScholarships,
    housing: t.catHousing,
    travel_transport: t.catTravelTransport,
    international: t.catInternational,
    other: t.catOther,
  };

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
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {mode === "create" ? t.addNewGrant : t.editGrant}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground/60" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">
              {t.formName} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder={t.phGrantName}
            />
          </div>

          {/* Organization */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formOrganization}</label>
            <input
              type="text"
              value={form.organization}
              onChange={(e) => updateField("organization", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder={t.phOrganization}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formDescription}</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder={t.phDescription}
            />
          </div>

          {/* Row: Category + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                {t.formCategory} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
              >
                {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {categoryLabels[c.value] || c.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                {t.formType} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
              >
                <option value="grant">{t.typeGrant}</option>
                <option value="resource">{t.typeResource}</option>
              </select>
            </div>
          </div>

          {/* Row: Country + Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                {t.formCountry} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
              >
                <option value="US">🇺🇸 {t.unitedStates}</option>
                <option value="International">🌍 {t.international}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formAmount}</label>
              <input
                type="text"
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={t.phAmount}
              />
            </div>
          </div>

          {/* Eligibility */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formEligibility}</label>
            <textarea
              value={form.eligibility}
              onChange={(e) => updateField("eligibility", e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder={t.phEligibility}
            />
          </div>

          {/* Row: Website + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formWebsite}</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={t.phWebsite}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formEmail}</label>
              <input
                type="text"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={t.phEmail}
              />
            </div>
          </div>

          {/* Row: Phone + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formPhone}</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={t.phPhone}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formStatus}</label>
              <input
                type="text"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={t.phStatus}
              />
            </div>
          </div>

          {/* ===== Enrichment Fields ===== */}
          <div className="border-t border-border pt-5 mt-2">
            <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              {t.enrichmentDetails}
            </h4>

            {/* Application Process */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formApplicationProcess}</label>
              <textarea
                value={form.applicationProcess}
                onChange={(e) => updateField("applicationProcess", e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder={t.phApplicationProcess}
              />
            </div>

            {/* Row: Deadline + Funding Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formDeadline}</label>
                <input
                  type="text"
                  value={form.deadline}
                  onChange={(e) => updateField("deadline", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t.phDeadline}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formFundingType}</label>
                <select
                  value={form.fundingType}
                  onChange={(e) => updateField("fundingType", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
                >
                  <option value="">{t.notSpecified}</option>
                  <option value="one_time">{t.oneTime}</option>
                  <option value="recurring">{t.recurring}</option>
                  <option value="reimbursement">{t.reimbursement}</option>
                  <option value="varies">{t.varies}</option>
                </select>
              </div>
            </div>

            {/* Row: Target Diagnosis + Age Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formTargetDiagnosis}</label>
                <input
                  type="text"
                  value={form.targetDiagnosis}
                  onChange={(e) => updateField("targetDiagnosis", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t.phTargetDiagnosis}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formAgeRange}</label>
                <input
                  type="text"
                  value={form.ageRange}
                  onChange={(e) => updateField("ageRange", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t.phAgeRange}
                />
              </div>
            </div>

            {/* Row: State + City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formState}</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t.phState}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formCity}</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t.phCity}
                />
              </div>
            </div>

            {/* Row: Geographic Scope + B-2 Visa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formGeographicScope}</label>
                <input
                  type="text"
                  value={form.geographicScope}
                  onChange={(e) => updateField("geographicScope", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t.phGeographicScope}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formB2Visa}</label>
                <select
                  value={form.b2VisaEligible}
                  onChange={(e) => updateField("b2VisaEligible", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
                >
                  <option value="">{t.notSpecified}</option>
                  <option value="yes">{t.yes}</option>
                  <option value="no">{t.no}</option>
                  <option value="uncertain">{t.uncertain}</option>
                </select>
              </div>
            </div>

            {/* Documents Required */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">{t.formDocumentsRequired}</label>
              <textarea
                value={form.documentsRequired}
                onChange={(e) => updateField("documentsRequired", e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder={t.phDocuments}
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
                className="w-4 h-4 text-purple-600 border-border rounded focus:ring-purple-500"
              />
              <label htmlFor="notifySubscribers" className="text-sm text-purple-800">
                <span className="font-medium">{t.notifySubscribers}</span>
                <span className="text-purple-600 block text-xs mt-0.5">
                  {t.notifySubscribersDesc}
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-muted rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending || !form.name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-[#162d4a] rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : mode === "create" ? (
                <Plus className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {mode === "create" ? t.createGrant : t.saveChanges}
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
  t,
}: {
  grantName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  t: AdminT;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t.deleteGrant}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {t.deleteConfirm.replace("{name}", grantName)}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-muted rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {t.deleteBtn}
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
  t,
}: {
  onClose: () => void;
  onSend: (grantItemIds: string[]) => void;
  isPending: boolean;
  t: AdminT;
}) {
  const [grantSearch, setGrantSearch] = useState("");
  const [selectedGrants, setSelectedGrants] = useState<Array<{ itemId: string; name: string }>>([]);

  const categoryLabels: Record<string, string> = {
    medical_treatment: t.catMedicalTreatment,
    financial_assistance: t.catFinancialAssistance,
    assistive_technology: t.catAssistiveTechnology,
    social_services: t.catSocialServices,
    scholarships: t.catScholarships,
    housing: t.catHousing,
    travel_transport: t.catTravelTransport,
    international: t.catInternational,
    other: t.catOther,
  };

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
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Send className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t.sendNotification}</h3>
              <p className="text-xs text-muted-foreground">{t.selectGrantsToNotify}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground/60" />
          </button>
        </div>

        {/* Selected Grants */}
        {selectedGrants.length > 0 && (
          <div className="px-6 py-3 border-b border-border bg-purple-50/50">
            <p className="text-xs font-medium text-purple-700 mb-2">
              {t.selected} ({selectedGrants.length}/20):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedGrants.map((g) => (
                <span
                  key={g.itemId}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-card text-purple-700 rounded-full border border-purple-200 cursor-pointer hover:bg-purple-50"
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
        <div className="px-6 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder={t.searchGrantsToInclude}
              value={grantSearch}
              onChange={(e) => setGrantSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
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
                  isSelected ? "bg-purple-50 border border-purple-200" : "hover:bg-secondary border border-transparent"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-purple-600 border-purple-600" : "border-border"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground/60">
                    {categoryLabels[g.category] || g.category} · {g.country === "US" ? "🇺🇸 US" : "🌍 Intl"}
                  </p>
                </div>
              </div>
            );
          })}
          {recentGrants?.grants.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground/60">{t.noGrantsFound}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedGrants.length === 0
              ? t.selectAtLeastOne
              : t.grantsSelected.replace("{count}", String(selectedGrants.length))}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-muted rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={() => onSend(selectedGrants.map((g) => g.itemId))}
              disabled={isPending || selectedGrants.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t.sendToSubscribers}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ===== Main Admin Component =====
export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const a = t.admin;
  const utils = trpc.useUtils();

  // Tab state
  const [activeTab, setActiveTab] = useState<"users" | "grants" | "newsletter">("users");

  // Users tab state
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
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
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Newsletter state
  const [showSendNotification, setShowSendNotification] = useState(false);

  // Category labels
  const categoryLabels: Record<string, string> = {
    medical_treatment: a.catMedicalTreatment,
    financial_assistance: a.catFinancialAssistance,
    assistive_technology: a.catAssistiveTechnology,
    social_services: a.catSocialServices,
    scholarships: a.catScholarships,
    housing: a.catHousing,
    travel_transport: a.catTravelTransport,
    international: a.catInternational,
    other: a.catOther,
  };

  // ===== Queries =====
  const { data: usersData, isLoading: usersLoading } = trpc.admin.users.useQuery({
    search: userSearch,
    statusFilter: userStatusFilter === "all" ? undefined : userStatusFilter,
    page: userPage,
    pageSize: userPageSize,
  });

  const { data: grantsData, isLoading: grantsLoading } = trpc.admin.grants.useQuery({
    search: grantSearch,
    category: grantCategoryFilter === "all" ? undefined : grantCategoryFilter,
    page: grantPage,
    pageSize: grantPageSize,
  });

  const { data: grantStats } = trpc.admin.grantStats.useQuery();
  const { data: newsletterStats } = trpc.admin.newsletterStats.useQuery();
  const { data: notifHistory } = trpc.admin.notificationHistory.useQuery();

  // ===== Mutations =====
  const updateRoleMutation = trpc.admin.updateRole.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      toast.success(a.toastRoleUpdated);
    },
  });

  const updateSubMutation = trpc.admin.updateSubscription.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      toast.success(a.toastSubUpdated);
    },
  });

  const createGrantMutation = trpc.admin.createGrant.useMutation({
    onSuccess: () => {
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
      setShowGrantForm(false);
      toast.success(a.toastGrantCreated);
    },
  });

  const updateGrantMutation = trpc.admin.updateGrant.useMutation({
    onSuccess: () => {
      utils.admin.grants.invalidate();
      setEditingGrant(null);
      toast.success(a.toastGrantUpdated);
    },
  });

  const deleteGrantMutation = trpc.admin.deleteGrant.useMutation({
    onSuccess: () => {
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
      setDeletingGrant(null);
      toast.success(a.toastGrantDeleted);
    },
  });

  const sendNotificationMutation = trpc.admin.sendNewGrantNotification.useMutation({
    onSuccess: () => {
      utils.admin.notificationHistory.invalidate();
      utils.admin.newsletterStats.invalidate();
      setShowSendNotification(false);
      toast.success(a.toastGrantCreated); // reuse
    },
  });

  // ===== Handlers =====
  const formatDate = (ts: number | Date | null) => {
    if (!ts) return "—";
    const d = ts instanceof Date ? ts : new Date(ts);
    return d.toLocaleDateString();
  };

  const formatDateTime = (ts: number | Date | null) => {
    if (!ts) return "—";
    const d = ts instanceof Date ? ts : new Date(ts);
    return d.toLocaleString();
  };

  const handleEditGrant = (g: any) => {
    setEditingGrant({
      itemId: g.itemId,
      name: g.name,
      organization: g.organization || "",
      description: g.description || "",
      category: g.category,
      type: g.type,
      country: g.country,
      eligibility: g.eligibility || "",
      website: g.website || "",
      phone: g.phone || "",
      email: g.email || "",
      amount: g.amount || "",
      status: g.status || "",
      applicationProcess: g.applicationProcess || "",
      deadline: g.deadline || "",
      fundingType: g.fundingType || "",
      targetDiagnosis: g.targetDiagnosis || "",
      ageRange: g.ageRange || "",
      geographicScope: g.geographicScope || "",
      documentsRequired: g.documentsRequired || "",
      b2VisaEligible: g.b2VisaEligible || "",
      state: g.state || "",
      city: g.city || "",
    });
  };

  const handleToggleActive = (g: any) => {
    updateGrantMutation.mutate({
      itemId: g.itemId,
      isActive: !g.isActive,
    });
  };

  // Export functions
  const exportAsCSV = async () => {
    setIsExporting(true);
    try {
      const allGrants = await utils.admin.grants.fetch({ page: 1, pageSize: 9999 });
      if (!allGrants?.grants.length) {
        toast.error(a.toastNoGrantsExport);
        return;
      }
      const headers = ["Item ID", "Name", "Organization", "Category", "Type", "Country", "State", "City", "Amount", "Eligibility", "Website", "Phone", "Email", "Status", "Active", "Description"];
      const rows = allGrants.grants.map((g) => [
        g.itemId, g.name, g.organization || "", g.category, g.type, g.country, g.state || "", g.city || "",
        g.amount || "", g.eligibility || "", g.website || "", g.phone || "", g.email || "", g.status || "",
        g.isActive ? "Yes" : "No", (g.description || "").replace(/"/g, '""'),
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grantkit-grants-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(a.toastExportFailed);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsExcel = async () => {
    setIsExporting(true);
    try {
      const allGrants = await utils.admin.grants.fetch({ page: 1, pageSize: 9999 });
      if (!allGrants?.grants.length) {
        toast.error(a.toastNoGrantsExport);
        return;
      }
      const headers = ["Item ID", "Name", "Organization", "Category", "Type", "Country", "State", "City", "Amount", "Eligibility", "Website", "Phone", "Email", "Status", "Active", "Description"];
      const rows = allGrants.grants.map((g) => [
        g.itemId, g.name, g.organization || "", g.category, g.type, g.country, g.state || "", g.city || "",
        g.amount || "", g.eligibility || "", g.website || "", g.phone || "", g.email || "", g.status || "",
        g.isActive ? "Yes" : "No", g.description || "",
      ]);
      // Simple XML-based Excel
      let xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
      xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
      xml += "<Worksheet ss:Name=\"Grants\"><Table>";
      xml += "<Row>" + headers.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join("") + "</Row>";
      rows.forEach((row) => {
        xml += "<Row>" + row.map((v) => `<Cell><Data ss:Type="String">${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>`).join("") + "</Row>";
      });
      xml += "</Table></Worksheet></Workbook>";
      const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grantkit-grants-${new Date().toISOString().slice(0, 10)}.xls`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(a.toastExportFailed);
    } finally {
      setIsExporting(false);
    }
  };

  // Import handlers
  const resetImport = () => {
    setShowImportModal(false);
    setImportStep("upload");
    setImportPreview(null);
    setImportResult(null);
    setImportFile(null);
    setIsImporting(false);
  };

  const handleImportFileSelect = async (file: File) => {
    setImportFile(file);
    setIsImporting(true);
    try {
      const text = await file.text();
      // Parse CSV
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error("File must have header + data rows");
      const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
      const nameIdx = headers.findIndex((h) => h === "name");
      const catIdx = headers.findIndex((h) => h === "category");
      const countryIdx = headers.findIndex((h) => h === "country");
      const itemIdIdx = headers.findIndex((h) => h === "item id" || h === "itemid");
      const orgIdx = headers.findIndex((h) => h === "organization");
      const descIdx = headers.findIndex((h) => h === "description");
      const typeIdx = headers.findIndex((h) => h === "type");
      const eligIdx = headers.findIndex((h) => h === "eligibility");
      const webIdx = headers.findIndex((h) => h === "website");
      const phoneIdx = headers.findIndex((h) => h === "phone");
      const emailIdx = headers.findIndex((h) => h === "email");
      const amountIdx = headers.findIndex((h) => h === "amount");
      const statusIdx = headers.findIndex((h) => h === "status");
      const stateIdx = headers.findIndex((h) => h === "state");
      const cityIdx = headers.findIndex((h) => h === "city");

      const grants: any[] = [];
      const errors: any[] = [];
      let skippedRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        const name = nameIdx >= 0 ? cols[nameIdx] : "";
        const category = catIdx >= 0 ? cols[catIdx] : "";
        const country = countryIdx >= 0 ? cols[countryIdx] : "";

        if (!name) { skippedRows++; continue; }
        if (!category) { errors.push({ row: i + 1, field: "Category", message: "Missing category" }); continue; }

        grants.push({
          itemId: itemIdIdx >= 0 ? cols[itemIdIdx] : undefined,
          name,
          category,
          country: country || "US",
          organization: orgIdx >= 0 ? cols[orgIdx] : "",
          description: descIdx >= 0 ? cols[descIdx] : "",
          type: typeIdx >= 0 && cols[typeIdx] === "resource" ? "resource" : "grant",
          eligibility: eligIdx >= 0 ? cols[eligIdx] : "",
          website: webIdx >= 0 ? cols[webIdx] : "",
          phone: phoneIdx >= 0 ? cols[phoneIdx] : "",
          email: emailIdx >= 0 ? cols[emailIdx] : "",
          amount: amountIdx >= 0 ? cols[amountIdx] : "",
          status: statusIdx >= 0 ? cols[statusIdx] : "",
          state: stateIdx >= 0 ? cols[stateIdx] : "",
          city: cityIdx >= 0 ? cols[cityIdx] : "",
          translations: {},
        });
      }

      setImportPreview({ grants, errors, duplicateErrors: [], validRows: grants.length, skippedRows });
      setImportStep("preview");
    } catch (err: any) {
      toast.error(a.toastParseFailed + ": " + (err.message || "Unknown error"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importPreview?.grants?.length) return;
    setImportStep("importing");
    setIsImporting(true);
    try {
      let created = 0, updated = 0;
      const importErrors: any[] = [];
      for (let i = 0; i < importPreview.grants.length; i++) {
        const g = importPreview.grants[i];
        try {
          if (g.itemId) {
            await utils.client.admin.updateGrant.mutate(g);
            updated++;
          } else {
            await utils.client.admin.createGrant.mutate(g);
            created++;
          }
        } catch (err: any) {
          importErrors.push({ index: i, name: g.name, error: err.message || "Unknown error" });
        }
      }
      setImportResult({ created, updated, errors: importErrors });
      setImportStep("done");
      utils.admin.grants.invalidate();
      utils.admin.grantStats.invalidate();
    } catch {
      toast.error(a.toastImportFailed);
      setImportStep("preview");
    } finally {
      setIsImporting(false);
    }
  };

  // ===== Loading / Auth Check =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">{a.accessDenied}</h1>
          <p className="text-sm text-muted-foreground mb-6">{a.noPermission}</p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> {a.returnHome}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <SEO title="Admin Panel" />

      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                {a.title}
              </h1>
            </div>
          </div>
          <button
            onClick={() => {
              utils.admin.users.invalidate();
              utils.admin.grants.invalidate();
              utils.admin.grantStats.invalidate();
              utils.admin.newsletterStats.invalidate();
              utils.admin.notificationHistory.invalidate();
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground/80 hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {a.refresh}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Users} label={a.totalUsers} value={usersData?.total ?? 0} color="bg-blue-500" />
          <StatCard icon={UserCheck} label={a.activeSubs} value={
            usersData?.users.filter((u) => u.subscriptionStatus === "active").length ?? 0
          } color="bg-emerald-500" />
          <StatCard icon={Database} label={a.totalGrants} value={grantStats?.total ?? 0} color="bg-purple-500" />
          <StatCard icon={Mail} label={a.subscribers} value={newsletterStats?.active ?? 0} color="bg-amber-500" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card rounded-xl p-1 border border-border shadow-sm w-fit">
          {([
            { key: "users" as const, icon: Users, label: a.tabUsers },
            { key: "grants" as const, icon: Database, label: a.tabGrants },
            { key: "newsletter" as const, icon: Mail, label: a.tabNewsletter },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground/80 hover:bg-secondary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== USERS TAB ===== */}
        {activeTab === "users" && (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                {a.usersTitle}
                <span className="text-sm font-normal text-muted-foreground/60 ml-2">{usersData?.total ?? 0}</span>
              </h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    placeholder={a.searchUsers}
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full sm:w-56"
                  />
                </div>
                <select
                  value={userStatusFilter}
                  onChange={(e) => { setUserStatusFilter(e.target.value); setUserPage(1); }}
                  className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
                >
                  <option value="all">{a.allStatuses}</option>
                  <option value="active">{a.statusActive}</option>
                  <option value="cancelled">{a.statusCancelled}</option>
                  <option value="past_due">{a.statusPastDue}</option>
                  <option value="paused">{a.statusPaused}</option>
                  <option value="none">{a.noSubscription}</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thUser}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thRole}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thSubscription}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thJoined}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thLastLogin}</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground/60">{a.loadingUsers}</p>
                      </td>
                    </tr>
                  ) : !usersData?.users.length ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground/60">{a.noUsersFound}</p>
                      </td>
                    </tr>
                  ) : (
                    usersData.users.map((u) => (
                      <tr key={u.id} className="hover:bg-secondary transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                              {u.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{u.name || "—"}</p>
                              <p className="text-xs text-muted-foreground/60 truncate">{u.email || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><RoleBadge role={u.role} t={a} /></td>
                        <td className="px-5 py-3.5"><StatusBadge status={u.subscriptionStatus} t={a} /></td>
                        <td className="px-5 py-3.5"><span className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm text-muted-foreground">{formatDate(u.lastSignedIn)}</span></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            {u.id !== user?.id && (
                              <button
                                onClick={() => updateRoleMutation.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })}
                                disabled={updateRoleMutation.isPending}
                                className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                                title={u.role === "admin" ? a.demote : a.promote}
                              >
                                {u.role === "admin" ? a.demote : a.promote}
                              </button>
                            )}
                            <select
                              value={u.subscriptionStatus}
                              onChange={(e) => updateSubMutation.mutate({ userId: u.id, subscriptionStatus: e.target.value as any })}
                              disabled={updateSubMutation.isPending}
                              className="text-xs px-2 py-1.5 rounded-md border border-border text-muted-foreground bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                            >
                              <option value="none">{a.statusNone}</option>
                              <option value="active">{a.statusActive}</option>
                              <option value="cancelled">{a.statusCancelled}</option>
                              <option value="past_due">{a.statusPastDue}</option>
                              <option value="paused">{a.statusPaused}</option>
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
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {a.showing} {((userPage - 1) * userPageSize) + 1}–{Math.min(userPage * userPageSize, usersData.total)} / {usersData.total}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage === 1} className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(usersData.totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (usersData.totalPages <= 5) pageNum = i + 1;
                    else if (userPage <= 3) pageNum = i + 1;
                    else if (userPage >= usersData.totalPages - 2) pageNum = usersData.totalPages - 4 + i;
                    else pageNum = userPage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => setUserPage(pageNum)} className={`w-8 h-8 text-sm rounded-md transition-colors ${userPage === pageNum ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => setUserPage((p) => Math.min(usersData.totalPages, p + 1))} disabled={userPage === usersData.totalPages} className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== GRANTS TAB ===== */}
        {activeTab === "grants" && (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                {a.grantsTitle}
                <span className="text-sm font-normal text-muted-foreground/60 ml-2">
                  {grantStats?.grants ?? 0} {a.typeGrant.toLowerCase()}, {grantStats?.resources ?? 0} {a.typeResource.toLowerCase()}
                </span>
              </h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    placeholder={a.searchGrants}
                    value={grantSearch}
                    onChange={(e) => { setGrantSearch(e.target.value); setGrantPage(1); }}
                    className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full sm:w-56"
                  />
                </div>
                <select
                  value={grantCategoryFilter}
                  onChange={(e) => { setGrantCategoryFilter(e.target.value); setGrantPage(1); }}
                  className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
                >
                  <option value="all">{a.allCategories}</option>
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                    title="CSV"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    CSV
                  </button>
                  <button
                    onClick={exportAsExcel}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                    title="Excel"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                    Excel
                  </button>
                  <button
                    onClick={() => { resetImport(); setShowImportModal(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary bg-card border border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
                    title={a.importBtn}
                  >
                    <Upload className="w-4 h-4" />
                    {a.importBtn}
                  </button>
                  <button
                    onClick={() => setShowGrantForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-[#162d4a] rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {a.addGrant}
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thGrant}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thCategory}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thType}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thCountry}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thStatus}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thAdded}</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grantsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground/60">{a.loadingGrants}</p>
                      </td>
                    </tr>
                  ) : !grantsData?.grants.length ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <Database className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground/60">{a.noGrantsFound}</p>
                      </td>
                    </tr>
                  ) : (
                    grantsData.grants.map((g) => (
                      <tr key={g.itemId} className={`hover:bg-secondary transition-colors ${!g.isActive ? "opacity-50" : ""}`}>
                        <td className="px-5 py-3.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[280px]">{g.name}</p>
                            <p className="text-xs text-muted-foreground/60 truncate max-w-[280px]">{g.organization || "—"}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-muted-foreground">{categoryLabels[g.category] || g.category}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            g.type === "grant" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                          }`}>
                            {g.type === "grant" ? a.typeGrant : a.typeResource}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-muted-foreground">
                            {g.country === "US" ? `🇺🇸 ${a.unitedStates}` : `🌍 ${a.international}`}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            g.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}>
                            {g.isActive ? a.activeStatus : a.inactiveStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-muted-foreground">{formatDate(g.createdAt)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditGrant(g)}
                              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors"
                              title={a.editGrant}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(g)}
                              disabled={updateGrantMutation.isPending}
                              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                              title={g.isActive ? a.inactiveStatus : a.activeStatus}
                            >
                              {g.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setDeletingGrant({ itemId: g.itemId, name: g.name })}
                              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title={a.deleteGrant}
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
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {a.showing} {((grantPage - 1) * grantPageSize) + 1}–{Math.min(grantPage * grantPageSize, grantsData.total)} / {grantsData.total}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setGrantPage((p) => Math.max(1, p - 1))} disabled={grantPage === 1} className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(grantsData.totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (grantsData.totalPages <= 5) pageNum = i + 1;
                    else if (grantPage <= 3) pageNum = i + 1;
                    else if (grantPage >= grantsData.totalPages - 2) pageNum = grantsData.totalPages - 4 + i;
                    else pageNum = grantPage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => setGrantPage(pageNum)} className={`w-8 h-8 text-sm rounded-md transition-colors ${grantPage === pageNum ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => setGrantPage((p) => Math.min(grantsData.totalPages, p + 1))} disabled={grantPage === grantsData.totalPages} className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 transition-colors">
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
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{a.activeSubscribers}</p>
                    <p className="text-2xl font-bold text-foreground">{newsletterStats?.active ?? 0}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  {newsletterStats?.total ?? 0} {a.totalSubscribers} ({(newsletterStats?.total ?? 0) - (newsletterStats?.active ?? 0)} {a.unsubscribed})
                </p>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{a.notificationsSent}</p>
                    <p className="text-2xl font-bold text-foreground">{notifHistory?.length ?? 0}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  {notifHistory?.filter((n) => n.status === "completed").length ?? 0} {a.completed}, {notifHistory?.filter((n) => n.status === "failed").length ?? 0} {a.failed}
                </p>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex items-center justify-center">
                <button
                  onClick={() => setShowSendNotification(true)}
                  className="inline-flex items-center gap-3 px-6 py-3 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm"
                >
                  <Send className="w-5 h-5" />
                  {a.sendGrantNotification}
                </button>
              </div>
            </div>

            {/* Notification History */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">{a.notificationHistory}</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thSubject}</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thGrantsCol}</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thRecipients}</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thSuccess}</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thStatus}</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{a.thSentAt}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {!notifHistory?.length ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <Mail className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground/60">{a.noNotifications}</p>
                          <p className="text-xs text-muted-foreground/40 mt-1">{a.noNotificationsHint}</p>
                        </td>
                      </tr>
                    ) : (
                      notifHistory.map((n) => {
                        let grantCount = 0;
                        try {
                          grantCount = JSON.parse(n.grantItemIds).length;
                        } catch { grantCount = 0; }

                        return (
                          <tr key={n.id} className="hover:bg-secondary transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-medium text-foreground truncate max-w-[250px]">{n.subject}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-muted-foreground">{grantCount}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-muted-foreground">{n.recipientCount}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm">
                                <span className="text-emerald-600">{n.successCount}</span>
                                {n.failCount > 0 && (
                                  <span className="text-red-500 ml-1">/ {n.failCount} {a.failed}</span>
                                )}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <NotifStatusBadge status={n.status} t={a} />
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-muted-foreground">{formatDateTime(n.sentAt)}</span>
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
          t={a}
        />
      )}

      {editingGrant && (
        <GrantFormModal
          mode="edit"
          initialData={editingGrant}
          onClose={() => setEditingGrant(null)}
          onSave={(data) => updateGrantMutation.mutate(data)}
          isPending={updateGrantMutation.isPending}
          t={a}
        />
      )}

      {deletingGrant && (
        <DeleteConfirmModal
          grantName={deletingGrant.name}
          onConfirm={() => deleteGrantMutation.mutate({ itemId: deletingGrant.itemId })}
          onCancel={() => setDeletingGrant(null)}
          isPending={deleteGrantMutation.isPending}
          t={a}
        />
      )}

      {showSendNotification && (
        <SendNotificationModal
          onClose={() => setShowSendNotification(false)}
          onSend={(grantItemIds) => sendNotificationMutation.mutate({ grantItemIds })}
          isPending={sendNotificationMutation.isPending}
          t={a}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{a.importGrants}</h3>
                  <p className="text-xs text-muted-foreground/60">
                    {importStep === "upload" && a.importStepUpload}
                    {importStep === "preview" && a.importStepPreview}
                    {importStep === "importing" && a.importStepImporting}
                    {importStep === "done" && a.importStepDone}
                  </p>
                </div>
              </div>
              <button onClick={resetImport} className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Upload */}
              {importStep === "upload" && (
                <div className="space-y-4">
                  {/* Drop zone */}
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/40 transition-colors cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
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
                        <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
                        <p className="text-sm font-medium text-foreground/80">{a.parsingFile}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm font-medium text-foreground/80 mb-1">{a.dropFileHere}</p>
                        <p className="text-xs text-muted-foreground/60">{a.orClickBrowse}</p>
                      </>
                    )}
                  </div>

                  {/* Format guide */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-2">{a.expectedColumns}:</p>
                        <p className="text-xs leading-relaxed">
                          <strong>{a.requiredColumns}:</strong> Name, Category, Country<br />
                          <strong>{a.optionalColumns}:</strong> Item ID, Organization, Description, Type, Eligibility, Website, Phone, Email, Amount, Status<br />
                          <strong>{a.translationColumns}:</strong> EN Name, EN Description, KA Name, KA Description, FR Name, etc.
                        </p>
                        <p className="text-xs mt-2 text-blue-500">{a.importTip}</p>
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
                      <p className="text-xs text-emerald-600">{a.validRows}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{importPreview.skippedRows}</p>
                      <p className="text-xs text-amber-600">{a.skipped}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{importPreview.errors.length + (importPreview.duplicateErrors?.length || 0)}</p>
                      <p className="text-xs text-red-600">{a.errors}</p>
                    </div>
                  </div>

                  {/* Errors */}
                  {(importPreview.errors.length > 0 || importPreview.duplicateErrors?.length > 0) && (
                    <div className="bg-red-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm font-medium text-red-700">{a.validationErrors}</p>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {[...importPreview.errors, ...(importPreview.duplicateErrors || [])].slice(0, 20).map((err: any, i: number) => (
                          <p key={i} className="text-xs text-red-600">
                            Row {err.row}: [{err.field}] {err.message}
                          </p>
                        ))}
                        {(importPreview.errors.length + (importPreview.duplicateErrors?.length || 0)) > 20 && (
                          <p className="text-xs text-red-400 italic">...{a.andMoreRows.replace("{count}", String(importPreview.errors.length + (importPreview.duplicateErrors?.length || 0) - 20))}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preview table */}
                  {importPreview.grants.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-secondary border-b border-border">
                        <p className="text-xs font-medium text-muted-foreground">{a.previewRows}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-secondary">
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">{a.formName}</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">{a.formCategory}</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">{a.formCountry}</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">{a.formType}</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">{a.translationColumns}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {importPreview.grants.slice(0, 10).map((g: any, i: number) => (
                              <tr key={i} className="hover:bg-secondary">
                                <td className="px-3 py-2 text-muted-foreground/60">{i + 1}</td>
                                <td className="px-3 py-2 text-foreground font-medium truncate max-w-[200px]">
                                  {g.itemId && <span className="text-blue-500 mr-1" title="Will update existing">↻</span>}
                                  {g.name}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{g.category}</td>
                                <td className="px-3 py-2 text-muted-foreground">{g.country}</td>
                                <td className="px-3 py-2 text-muted-foreground">{g.type}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {Object.keys(g.translations).length > 0
                                    ? Object.keys(g.translations).map((l: string) => l.toUpperCase()).join(", ")
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {importPreview.grants.length > 10 && (
                        <div className="px-4 py-2 bg-secondary border-t border-border text-xs text-muted-foreground/60 text-center">
                          ...{a.andMoreRows.replace("{count}", String(importPreview.grants.length - 10))}
                        </div>
                      )}
                    </div>
                  )}

                  {importFile && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Importing */}
              {importStep === "importing" && (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-sm font-medium text-foreground/80">{a.importingGrants.replace("{count}", String(importPreview?.grants?.length || 0))}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{a.thisMayTakeMoment}</p>
                </div>
              )}

              {/* Step 4: Done */}
              {importStep === "done" && importResult && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-lg font-semibold text-foreground">{a.importComplete}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{importResult.created}</p>
                      <p className="text-xs text-emerald-600">{a.created}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
                      <p className="text-xs text-blue-600">{a.updated}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{importResult.errors?.length || 0}</p>
                      <p className="text-xs text-red-600">{a.failed}</p>
                    </div>
                  </div>

                  {importResult.errors?.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-red-700 mb-2">{a.failedEntries}:</p>
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
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <button
                onClick={resetImport}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {importStep === "done" ? a.close : a.cancel}
              </button>
              <div className="flex gap-2">
                {importStep === "preview" && (
                  <>
                    <button
                      onClick={() => { setImportStep("upload"); setImportPreview(null); setImportFile(null); }}
                      className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors"
                    >
                      {a.uploadDifferentFile}
                    </button>
                    <button
                      onClick={handleExecuteImport}
                      disabled={!importPreview?.grants?.length || isImporting}
                      className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-[#162d4a] rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {a.importNGrants.replace("{count}", String(importPreview?.grants?.length || 0))}
                    </button>
                  </>
                )}
                {importStep === "done" && (
                  <button
                    onClick={resetImport}
                    className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    {a.done}
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
