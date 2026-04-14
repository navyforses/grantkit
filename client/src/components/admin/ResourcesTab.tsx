/*
 * ResourcesTab — Admin panel tab for Supabase resources CRUD.
 * Orchestrates ResourceList, ResourceForm, and ResourceImport.
 */

import { useState, useCallback } from "react";
import { Plus, Upload, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { supabase, USE_SUPABASE } from "@/lib/supabase";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import ResourceList from "@/components/admin/ResourceList";
import ResourceForm from "@/components/admin/ResourceForm";
import ResourceImport from "@/components/admin/ResourceImport";
import type { ResourceFull } from "@/types/resources";

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({
  resource,
  onClose,
  onDeleted,
}: {
  resource: ResourceFull;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!supabase) return;
    setDeleting(true);
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
        <p className="text-sm text-foreground mb-5 bg-secondary rounded-lg px-3 py-2 font-medium truncate">
          {resource.title}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
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
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceFull | null>(null);
  const [deletingResource, setDeletingResource] = useState<ResourceFull | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (!USE_SUPABASE) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Supabase Not Configured</h3>
        <p className="text-sm text-muted-foreground">
          Add{" "}
          <code className="bg-secondary px-1 rounded">VITE_SUPABASE_URL</code> and{" "}
          <code className="bg-secondary px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your .env to
          manage resources.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Modals */}
      {showForm && (
        <ResourceForm mode="create" onClose={() => setShowForm(false)} onSaved={handleRefresh} />
      )}
      {editingResource && (
        <ResourceForm
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
      {showImport && (
        <ResourceImport
          onClose={() => setShowImport(false)}
          onImported={handleRefresh}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Supabase Resources</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <Upload className="w-4 h-4" />
            {t.resources.importCSV}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.resources.addResource}
          </button>
        </div>
      </div>

      {/* List */}
      <ResourceList
        onEdit={setEditingResource}
        onDelete={setDeletingResource}
        refreshKey={refreshKey}
      />
    </>
  );
}
