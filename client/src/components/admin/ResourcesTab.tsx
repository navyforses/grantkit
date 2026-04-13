/*
 * ResourcesTab — Admin panel tab for Supabase resources CRUD
 * Handles GRANT / SOCIAL / MEDICAL resources directly via Supabase client.
 */

import { useState, useCallback } from "react";
import { Link } from "wouter";
import {
  Plus, Search, Edit2, Trash2, ExternalLink, Loader2,
  CheckCircle2, XCircle, AlertTriangle, X, Check,
} from "lucide-react";
import { supabase, USE_SUPABASE } from "@/lib/supabase";
import { useResources } from "@/hooks/useResources";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "sonner";
import type { ResourceFull, ResourceType, ResourceStatus } from "@/types/resources";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
}

const TYPE_COLORS: Record<ResourceType, string> = {
  GRANT:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  SOCIAL:  "bg-blue-50 text-blue-700 border-blue-200",
  MEDICAL: "bg-purple-50 text-purple-700 border-purple-200",
};

// ── Resource Form ─────────────────────────────────────────────────────────────

interface ResourceFormData {
  title: string;
  resource_type: ResourceType;
  status: ResourceStatus;
  description: string;
  amount_min: string;
  amount_max: string;
  currency: string;
  deadline: string;
  eligibility: string;
  eligibility_details: string;
  source_name: string;
  source_url: string;
  application_url: string;
  is_featured: boolean;
  is_verified: boolean;
}

const EMPTY_FORM: ResourceFormData = {
  title: "",
  resource_type: "GRANT",
  status: "OPEN",
  description: "",
  amount_min: "",
  amount_max: "",
  currency: "USD",
  deadline: "",
  eligibility: "BOTH",
  eligibility_details: "",
  source_name: "",
  source_url: "",
  application_url: "",
  is_featured: false,
  is_verified: false,
};

function fromResource(r: ResourceFull): ResourceFormData {
  return {
    title: r.title,
    resource_type: r.resource_type,
    status: r.status,
    description: r.description,
    amount_min: r.amount_min != null ? String(r.amount_min) : "",
    amount_max: r.amount_max != null ? String(r.amount_max) : "",
    currency: r.currency,
    deadline: r.deadline ?? "",
    eligibility: r.eligibility,
    eligibility_details: r.eligibility_details ?? "",
    source_name: r.source_name ?? "",
    source_url: r.source_url ?? "",
    application_url: r.application_url ?? "",
    is_featured: r.is_featured,
    is_verified: r.is_verified,
  };
}

interface ResourceFormModalProps {
  mode: "create" | "edit";
  initialData?: ResourceFull;
  onClose: () => void;
  onSaved: () => void;
}

function ResourceFormModal({ mode, initialData, onClose, onSaved }: ResourceFormModalProps) {
  const [form, setForm] = useState<ResourceFormData>(
    initialData ? fromResource(initialData) : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (field: keyof ResourceFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      resource_type: form.resource_type,
      status: form.status,
      description: form.description.trim(),
      amount_min: form.amount_min ? Number(form.amount_min) : null,
      amount_max: form.amount_max ? Number(form.amount_max) : null,
      currency: form.currency,
      deadline: form.deadline || null,
      eligibility: form.eligibility,
      eligibility_details: form.eligibility_details.trim() || null,
      source_name: form.source_name.trim() || null,
      source_url: form.source_url.trim() || null,
      application_url: form.application_url.trim() || null,
      is_featured: form.is_featured,
      is_verified: form.is_verified,
      target_groups: [],
      disease_areas: [],
      is_rolling: false,
      view_count: 0,
    };

    try {
      if (mode === "create") {
        const { error } = await supabase
          .from("resources")
          .insert({ ...payload, slug: slugify(form.title) });
        if (error) throw error;
        toast.success("Resource created");
      } else if (initialData) {
        const { error } = await supabase
          .from("resources")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
        toast.success("Resource updated");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background";
  const labelCls = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground">
            {mode === "create" ? "New Resource" : "Edit Resource"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="Resource title" />
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.resource_type} onChange={(e) => set("resource_type", e.target.value)} className={inputCls}>
                <option value="GRANT">Grant</option>
                <option value="SOCIAL">Social Aid</option>
                <option value="MEDICAL">Medical</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={inputCls} placeholder="Brief description..." />
          </div>

          {/* Amount */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Amount Min ($)</label>
              <input type="number" min={0} value={form.amount_min} onChange={(e) => set("amount_min", e.target.value)} className={inputCls} placeholder="e.g. 1000" />
            </div>
            <div>
              <label className={labelCls}>Amount Max ($)</label>
              <input type="number" min={0} value={form.amount_max} onChange={(e) => set("amount_max", e.target.value)} className={inputCls} placeholder="e.g. 10000" />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="GEL">GEL</option>
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className={labelCls}>Deadline</label>
            <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className={inputCls} />
          </div>

          {/* Eligibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Eligibility</label>
              <select value={form.eligibility} onChange={(e) => set("eligibility", e.target.value)} className={inputCls}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="ORGANIZATION">Organization</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Eligibility Details</label>
              <input value={form.eligibility_details} onChange={(e) => set("eligibility_details", e.target.value)} className={inputCls} placeholder="Who qualifies..." />
            </div>
          </div>

          {/* Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Organization</label>
              <input value={form.source_name} onChange={(e) => set("source_name", e.target.value)} className={inputCls} placeholder="Organization name" />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input value={form.source_url} onChange={(e) => set("source_url", e.target.value)} className={inputCls} placeholder="https://..." />
            </div>
          </div>

          {/* Application URL */}
          <div>
            <label className={labelCls}>Application URL</label>
            <input value={form.application_url} onChange={(e) => set("application_url", e.target.value)} className={inputCls} placeholder="https://apply.example.com" />
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="font-medium text-foreground">Featured</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_verified} onChange={(e) => set("is_verified", e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="font-medium text-foreground">Verified</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {mode === "create" ? "Create" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ resource, onClose, onDeleted }: { resource: ResourceFull; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    // Soft-delete: set status to ARCHIVED
    const { error } = await supabase
      .from("resources")
      .update({ status: "ARCHIVED" })
      .eq("id", resource.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Resource archived");
      onDeleted();
      onClose();
    }
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Archive Resource</h3>
            <p className="text-sm text-muted-foreground">This will set status to ARCHIVED.</p>
          </div>
        </div>
        <p className="text-sm text-foreground mb-5 bg-secondary rounded-lg px-3 py-2 font-medium truncate">{resource.title}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function ResourcesTab() {
  const [typeFilter, setTypeFilter] = useState<ResourceType | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceFull | null>(null);
  const [deletingResource, setDeletingResource] = useState<ResourceFull | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: resources, loading, dispatch } = useResources(typeFilter);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    dispatch({ type: "RESET" });
  }, [dispatch]);

  const filtered = search
    ? resources.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.source_name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : resources;

  if (!USE_SUPABASE) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Supabase Not Configured</h3>
        <p className="text-sm text-muted-foreground">
          Add <code className="bg-secondary px-1 rounded">VITE_SUPABASE_URL</code> and{" "}
          <code className="bg-secondary px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your .env to manage resources.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Modals */}
      {showForm && (
        <ResourceFormModal
          mode="create"
          onClose={() => setShowForm(false)}
          onSaved={handleRefresh}
        />
      )}
      {editingResource && (
        <ResourceFormModal
          mode="edit"
          initialData={editingResource}
          onClose={() => setEditingResource(null)}
          onSaved={handleRefresh}
        />
      )}
      {deletingResource && (
        <DeleteConfirm
          resource={deletingResource}
          onClose={() => setDeletingResource(null)}
          onDeleted={handleRefresh}
        />
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Supabase Resources
            <span className="text-sm font-normal text-muted-foreground/60 ml-2">{filtered.length}</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search resources…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-52 bg-background"
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter ?? ""}
              onChange={(e) => setTypeFilter((e.target.value as ResourceType) || undefined)}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            >
              <option value="">All Types</option>
              <option value="GRANT">Grants</option>
              <option value="SOCIAL">Social Aid</option>
              <option value="MEDICAL">Medical</option>
            </select>

            {/* New */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Resource
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">No resources found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deadline</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flags</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 max-w-xs">
                      <p className="font-medium text-foreground truncate">{r.title}</p>
                      {r.source_name && <p className="text-xs text-muted-foreground truncate">{r.source_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TYPE_COLORS[r.resource_type]}`}>
                        {r.resource_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.amount_min != null
                        ? `${r.currency} ${r.amount_min.toLocaleString()}${r.amount_max && r.amount_max !== r.amount_min ? `–${r.amount_max.toLocaleString()}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.deadline ? new Date(r.deadline).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.is_featured && <span title="Featured"><CheckCircle2 className="w-4 h-4 text-amber-500" /></span>}
                        {r.is_verified && <span title="Verified"><CheckCircle2 className="w-4 h-4 text-blue-500" /></span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/resources/${r.slug}`} target="_blank">
                          <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground" title="View">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setEditingResource(r)}
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingResource(r)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                          title="Archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
