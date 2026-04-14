/**
 * ResourceForm — Create / Edit form for Supabase resources.
 * Fields change based on selected resource_type (GRANT / SOCIAL / MEDICAL).
 * Uses Supabase JS client directly.
 */
import { useState } from "react";
import { X, ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useCategories, useCountries } from "@/hooks/useResources";
import type { ResourceFull, ResourceType, ResourceStatus, Eligibility, ClinicalPhase } from "@/types/resources";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 70)
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36)
  );
}

// ── Form data type ────────────────────────────────────────────────────────────

interface ResourceFormData {
  resource_type: ResourceType;
  title: string;
  title_ka: string;
  title_fr: string;
  title_es: string;
  title_ru: string;
  description: string;
  description_ka: string;
  description_fr: string;
  description_es: string;
  description_ru: string;
  status: ResourceStatus;
  eligibility: Eligibility;
  eligibility_details: string;
  source_url: string;
  source_name: string;
  application_url: string;
  target_groups: string[];
  // GRANT-specific
  amount_min: string;
  amount_max: string;
  currency: string;
  deadline: string;
  // MEDICAL-specific
  clinical_trial_phase: ClinicalPhase | "";
  nct_id: string;
  disease_areas: string[];
  // Location
  latitude: string;
  longitude: string;
  address: string;
  // Flags
  is_featured: boolean;
  is_verified: boolean;
  is_rolling: boolean;
}

const EMPTY: ResourceFormData = {
  resource_type: "GRANT",
  title: "",
  title_ka: "",
  title_fr: "",
  title_es: "",
  title_ru: "",
  description: "",
  description_ka: "",
  description_fr: "",
  description_es: "",
  description_ru: "",
  status: "OPEN",
  eligibility: "BOTH",
  eligibility_details: "",
  source_url: "",
  source_name: "",
  application_url: "",
  target_groups: [],
  amount_min: "",
  amount_max: "",
  currency: "USD",
  deadline: "",
  clinical_trial_phase: "",
  nct_id: "",
  disease_areas: [],
  latitude: "",
  longitude: "",
  address: "",
  is_featured: false,
  is_verified: false,
  is_rolling: false,
};

function fromExisting(r: ResourceFull): ResourceFormData {
  return {
    resource_type: r.resource_type,
    title: r.title,
    title_ka: r.title_ka ?? "",
    title_fr: r.title_fr ?? "",
    title_es: r.title_es ?? "",
    title_ru: r.title_ru ?? "",
    description: r.description,
    description_ka: r.description_ka ?? "",
    description_fr: r.description_fr ?? "",
    description_es: r.description_es ?? "",
    description_ru: r.description_ru ?? "",
    status: r.status,
    eligibility: r.eligibility,
    eligibility_details: r.eligibility_details ?? "",
    source_url: r.source_url ?? "",
    source_name: r.source_name ?? "",
    application_url: r.application_url ?? "",
    target_groups: r.target_groups ?? [],
    amount_min: r.amount_min != null ? String(r.amount_min) : "",
    amount_max: r.amount_max != null ? String(r.amount_max) : "",
    currency: r.currency ?? "USD",
    deadline: r.deadline ? r.deadline.slice(0, 10) : "",
    clinical_trial_phase: r.clinical_trial_phase ?? "",
    nct_id: r.nct_id ?? "",
    disease_areas: r.disease_areas ?? [],
    latitude: r.latitude != null ? String(r.latitude) : "",
    longitude: r.longitude != null ? String(r.longitude) : "",
    address: r.address ?? "",
    is_featured: r.is_featured,
    is_verified: r.is_verified,
    is_rolling: r.is_rolling,
  };
}

const TARGET_GROUP_OPTIONS = ["Children", "Disabled", "Veterans", "Immigrants", "Students", "Elderly"];
const DISEASE_AREA_OPTIONS = ["Cancer", "Rare Disease", "Neurological", "Cardiovascular", "Autoimmune", "Infectious", "Pediatric", "Mental Health", "Genetic", "Autoimmune"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface ResourceFormProps {
  mode: "create" | "edit";
  initialData?: ResourceFull;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResourceForm({ mode, initialData, onClose, onSaved }: ResourceFormProps) {
  const [form, setForm] = useState<ResourceFormData>(
    initialData ? fromExisting(initialData) : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    initialData?.categories?.map((c) => c.id) ?? [],
  );
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>(
    initialData?.locations?.map((l) => l.country_code) ?? [],
  );

  const { data: categories } = useCategories(form.resource_type);
  const { data: countries } = useCountries();

  const set = <K extends keyof ResourceFormData>(field: K, value: ResourceFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleTargetGroup = (g: string) => {
    set(
      "target_groups",
      form.target_groups.includes(g)
        ? form.target_groups.filter((x) => x !== g)
        : [...form.target_groups, g],
    );
  };

  const toggleDiseaseArea = (a: string) => {
    set(
      "disease_areas",
      form.disease_areas.includes(a)
        ? form.disease_areas.filter((x) => x !== a)
        : [...form.disease_areas, a],
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleCountry = (code: string) => {
    setSelectedCountryCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  };

  const handleSave = async (andNew = false) => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!supabase) {
      toast.error("Supabase not configured");
      return;
    }
    setSaving(true);

    const payload = {
      resource_type: form.resource_type,
      title: form.title.trim(),
      title_ka: form.title_ka.trim() || null,
      title_fr: form.title_fr.trim() || null,
      title_es: form.title_es.trim() || null,
      title_ru: form.title_ru.trim() || null,
      description: form.description.trim(),
      description_ka: form.description_ka.trim() || null,
      description_fr: form.description_fr.trim() || null,
      description_es: form.description_es.trim() || null,
      description_ru: form.description_ru.trim() || null,
      status: form.status,
      eligibility: form.eligibility,
      eligibility_details: form.eligibility_details.trim() || null,
      source_url: form.source_url.trim() || null,
      source_name: form.source_name.trim() || null,
      application_url: form.application_url.trim() || null,
      target_groups: form.target_groups,
      amount_min: form.amount_min ? Number(form.amount_min) : null,
      amount_max: form.amount_max ? Number(form.amount_max) : null,
      currency: form.currency,
      deadline: form.deadline || null,
      clinical_trial_phase: form.clinical_trial_phase || null,
      nct_id: form.nct_id.trim() || null,
      disease_areas: form.disease_areas,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      address: form.address.trim() || null,
      is_featured: form.is_featured,
      is_verified: form.is_verified,
      is_rolling: form.is_rolling,
      view_count: 0,
    };

    try {
      let resourceId: string;

      if (mode === "create") {
        const { data, error } = await supabase
          .from("resources")
          .insert({ ...payload, slug: slugify(form.title), published_at: new Date().toISOString() })
          .select("id")
          .single();
        if (error) throw error;
        resourceId = data.id;
        toast.success("Resource created");
      } else {
        if (!initialData) throw new Error("No initial data");
        const { error } = await supabase
          .from("resources")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
        resourceId = initialData.id;
        toast.success("Resource updated");
      }

      // Sync categories
      await supabase.from("resource_categories").delete().eq("resource_id", resourceId);
      if (selectedCategoryIds.length > 0) {
        await supabase.from("resource_categories").insert(
          selectedCategoryIds.map((cid, i) => ({
            resource_id: resourceId,
            category_id: cid,
            is_primary: i === 0,
          })),
        );
      }

      // Sync locations
      await supabase.from("resource_locations").delete().eq("resource_id", resourceId);
      if (selectedCountryCodes.length > 0) {
        await supabase.from("resource_locations").insert(
          selectedCountryCodes.map((code) => ({
            resource_id: resourceId,
            country_code: code,
            is_nationwide: true,
          })),
        );
      }

      onSaved();
      if (andNew) {
        setForm(EMPTY);
        setSelectedCategoryIds([]);
        setSelectedCountryCodes([]);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputCls =
    "w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background";
  const labelCls =
    "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1";
  const chipActiveCls =
    "px-2.5 py-1 text-[11px] font-medium rounded-full border bg-primary/10 border-primary/50 text-primary";
  const chipIdleCls =
    "px-2.5 py-1 text-[11px] font-medium rounded-full border bg-background/60 border-border text-foreground hover:bg-secondary";

  const isGrant = form.resource_type === "GRANT";
  const isMedical = form.resource_type === "MEDICAL";
  const isSocial = form.resource_type === "SOCIAL";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground">
            {mode === "create" ? "New Resource" : "Edit Resource"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select
                value={form.resource_type}
                onChange={(e) => set("resource_type", e.target.value as ResourceType)}
                className={inputCls}
              >
                <option value="GRANT">Grant</option>
                <option value="SOCIAL">Social Aid</option>
                <option value="MEDICAL">Medical</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as ResourceStatus)}
                className={inputCls}
              >
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Title (EN) */}
          <div>
            <label className={labelCls}>Title (EN) *</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Resource title"
              className={inputCls}
            />
          </div>

          {/* Description (EN) */}
          <div>
            <label className={labelCls}>Description (EN) *</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Brief description…"
              className={inputCls}
            />
          </div>

          {/* Translations (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowTranslations((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {showTranslations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Translations (KA, FR, ES, RU)
            </button>
            {showTranslations && (
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
                {(["ka", "fr", "es", "ru"] as const).map((lang) => (
                  <div key={lang} className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Title ({lang.toUpperCase()})</label>
                      <input
                        value={form[`title_${lang}` as keyof ResourceFormData] as string}
                        onChange={(e) => set(`title_${lang}` as keyof ResourceFormData, e.target.value as never)}
                        className={inputCls}
                        placeholder={`Title in ${lang}`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Description ({lang.toUpperCase()})</label>
                      <textarea
                        value={form[`description_${lang}` as keyof ResourceFormData] as string}
                        onChange={(e) => set(`description_${lang}` as keyof ResourceFormData, e.target.value as never)}
                        rows={2}
                        className={inputCls}
                        placeholder={`Description in ${lang}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Source Name</label>
              <input value={form.source_name} onChange={(e) => set("source_name", e.target.value)} className={inputCls} placeholder="Organization name" />
            </div>
            <div>
              <label className={labelCls}>Source URL</label>
              <input type="url" value={form.source_url} onChange={(e) => set("source_url", e.target.value)} className={inputCls} placeholder="https://…" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Application URL</label>
            <input type="url" value={form.application_url} onChange={(e) => set("application_url", e.target.value)} className={inputCls} placeholder="https://…" />
          </div>

          {/* Eligibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Eligibility</label>
              <select value={form.eligibility} onChange={(e) => set("eligibility", e.target.value as Eligibility)} className={inputCls}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="ORGANIZATION">Organization</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Eligibility Details</label>
              <input value={form.eligibility_details} onChange={(e) => set("eligibility_details", e.target.value)} className={inputCls} placeholder="Details…" />
            </div>
          </div>

          {/* GRANT-specific: Amount + Deadline */}
          {(isGrant || isSocial) && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Amount Min</label>
                <input type="number" min={0} value={form.amount_min} onChange={(e) => set("amount_min", e.target.value)} className={inputCls} placeholder="e.g. 1000" />
              </div>
              <div>
                <label className={labelCls}>Amount Max</label>
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
          )}

          {(isGrant || isMedical) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Deadline</label>
                <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_rolling}
                    onChange={(e) => set("is_rolling", e.target.checked)}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-sm text-foreground">Rolling deadline</span>
                </label>
              </div>
            </div>
          )}

          {/* MEDICAL-specific */}
          {isMedical && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Clinical Phase</label>
                  <select
                    value={form.clinical_trial_phase}
                    onChange={(e) => set("clinical_trial_phase", e.target.value as ClinicalPhase | "")}
                    className={inputCls}
                  >
                    <option value="">None</option>
                    <option value="PHASE_1">Phase 1</option>
                    <option value="PHASE_2">Phase 2</option>
                    <option value="PHASE_3">Phase 3</option>
                    <option value="PHASE_4">Phase 4</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>NCT ID</label>
                  <input value={form.nct_id} onChange={(e) => set("nct_id", e.target.value)} className={inputCls} placeholder="NCT12345678" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Disease Areas</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {DISEASE_AREA_OPTIONS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleDiseaseArea(a)}
                      className={form.disease_areas.includes(a) ? chipActiveCls : chipIdleCls}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Target Groups — GRANT and SOCIAL */}
          {(isGrant || isSocial) && (
            <div>
              <label className={labelCls}>Target Groups</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {TARGET_GROUP_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleTargetGroup(g)}
                    className={form.target_groups.includes(g) ? chipActiveCls : chipIdleCls}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <label className={labelCls}>Categories</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {categories.flatMap((parent) => [
                  parent,
                  ...(parent.children ?? []),
                  ...(parent.children?.flatMap((c) => c.children ?? []) ?? []),
                ]).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={selectedCategoryIds.includes(cat.id) ? chipActiveCls : chipIdleCls}
                  >
                    {cat.icon && <span className="mr-0.5">{cat.icon}</span>}
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Locations */}
          <div>
            <label className={labelCls}>Countries</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {countries.slice(0, 20).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggleCountry(c.code)}
                  className={selectedCountryCodes.includes(c.code) ? chipActiveCls : chipIdleCls}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Lat/Lng + Address */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Latitude</label>
              <input type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} className={inputCls} placeholder="e.g. 40.7128" />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} className={inputCls} placeholder="e.g. -74.0060" />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} placeholder="Street address…" />
            </div>
          </div>

          {/* Flags */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="accent-primary w-4 h-4" />
              <span className="text-sm text-foreground">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_verified} onChange={(e) => set("is_verified", e.target.checked)} className="accent-primary w-4 h-4" />
              <span className="text-sm text-foreground">Verified</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          {mode === "create" && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save & Add Another
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" ? "Create Resource" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
