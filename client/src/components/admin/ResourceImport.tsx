/**
 * ResourceImport — CSV bulk import for Supabase resources.
 * Uses PapaParse for CSV parsing, Supabase JS client for batch insert.
 * Logs each import to the import_logs table.
 *
 * Expected CSV columns:
 *   title, resource_type, category_ids, country_codes, status,
 *   amount_min, amount_max, currency, deadline, source_url, description
 */
import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, X, AlertCircle, CheckCircle2, Loader2, FileText, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CsvRow {
  title: string;
  resource_type: string;
  category_ids: string;
  country_codes: string;
  status: string;
  amount_min: string;
  amount_max: string;
  currency: string;
  deadline: string;
  source_url: string;
  description: string;
  [key: string]: string;
}

interface ImportResult {
  total: number;
  success: number;
  errors: Array<{ row: number; title: string; error: string }>;
}

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
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 5)
  );
}

const VALID_TYPES = new Set(["GRANT", "SOCIAL", "MEDICAL"]);
const VALID_STATUSES = new Set(["OPEN", "CLOSED", "UPCOMING", "ONGOING", "ARCHIVED"]);

const EXAMPLE_CSV = `title,resource_type,category_ids,country_codes,status,amount_min,amount_max,currency,deadline,source_url,description
Example Grant,GRANT,GRANT.STARTUP,US,OPEN,1000,50000,USD,2025-12-31,https://example.com,A sample grant for testing imports.
Example Social Aid,SOCIAL,SOCIAL.HOUSING,GB,OPEN,,,GBP,,https://example.org,Social housing assistance for UK residents.`;

// ── Component ─────────────────────────────────────────────────────────────────

interface ResourceImportProps {
  onClose: () => void;
  onImported: () => void;
}

export default function ResourceImport({ onClose, onImported }: ResourceImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    Papa.parse<CsvRow>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        setHeaders(parsed.meta.fields ?? []);
        setRows(parsed.data.slice(0, 200)); // preview max 200 rows
      },
      error: (err) => {
        toast.error(`Parse error: ${err.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".csv")) handleFile(f);
      else toast.error("Please drop a .csv file");
    },
    [handleFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!rows.length || !supabase) return;
    setImporting(true);

    const errors: ImportResult["errors"] = [];
    let success = 0;

    const BATCH = 30;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const payloads: Record<string, unknown>[] = [];
      const categoryMaps: Array<{ rowIdx: number; categoryIds: string[] }> = [];
      const locationMaps: Array<{ rowIdx: number; countryCodes: string[] }> = [];

      for (let bi = 0; bi < batch.length; bi++) {
        const row = batch[bi];
        const rowNum = i + bi + 2; // 1-indexed + header row
        try {
          const resType = (row.resource_type ?? "GRANT").trim().toUpperCase();
          if (!VALID_TYPES.has(resType)) throw new Error(`Invalid resource_type: "${resType}"`);
          const status = (row.status ?? "OPEN").trim().toUpperCase();
          if (!VALID_STATUSES.has(status)) throw new Error(`Invalid status: "${status}"`);
          const title = (row.title ?? "").trim();
          if (!title) throw new Error("Title is required");

          payloads.push({
            title,
            slug: slugify(title),
            description: (row.description ?? "").trim(),
            resource_type: resType,
            status,
            currency: (row.currency ?? "USD").trim() || "USD",
            amount_min: row.amount_min ? Number(row.amount_min) : null,
            amount_max: row.amount_max ? Number(row.amount_max) : null,
            deadline: row.deadline?.trim() || null,
            source_url: row.source_url?.trim() || null,
            target_groups: [],
            disease_areas: [],
            is_rolling: false,
            is_featured: false,
            is_verified: false,
            view_count: 0,
            eligibility: "BOTH",
            published_at: new Date().toISOString(),
          });
          categoryMaps.push({
            rowIdx: payloads.length - 1,
            categoryIds: row.category_ids
              ? row.category_ids.split("|").map((s) => s.trim()).filter(Boolean)
              : [],
          });
          locationMaps.push({
            rowIdx: payloads.length - 1,
            countryCodes: row.country_codes
              ? row.country_codes.split("|").map((s) => s.trim()).filter(Boolean)
              : [],
          });
        } catch (err: unknown) {
          errors.push({ row: rowNum, title: row.title ?? "", error: (err as Error).message });
        }
      }

      if (payloads.length === 0) continue;

      const { data: inserted, error } = await supabase
        .from("resources")
        .insert(payloads)
        .select("id, slug");

      if (error) {
        for (let bi = 0; bi < payloads.length; bi++) {
          errors.push({ row: i + bi + 2, title: String(payloads[bi].title), error: error.message });
        }
        continue;
      }

      if (!inserted) continue;
      const slugToId: Record<string, string> = {};
      for (const r of inserted) slugToId[r.slug] = r.id;

      // Insert categories + locations
      const catRows: Array<{ resource_id: string; category_id: string; is_primary: boolean }> = [];
      const locRows: Array<{ resource_id: string; country_code: string; is_nationwide: boolean }> = [];

      for (const cm of categoryMaps) {
        const rid = slugToId[payloads[cm.rowIdx].slug as string];
        if (!rid) continue;
        for (let ci = 0; ci < cm.categoryIds.length; ci++) {
          catRows.push({ resource_id: rid, category_id: cm.categoryIds[ci], is_primary: ci === 0 });
        }
      }
      for (const lm of locationMaps) {
        const rid = slugToId[payloads[lm.rowIdx].slug as string];
        if (!rid) continue;
        for (const code of lm.countryCodes) {
          locRows.push({ resource_id: rid, country_code: code, is_nationwide: true });
        }
      }

      if (catRows.length > 0) await supabase.from("resource_categories").insert(catRows);
      if (locRows.length > 0) await supabase.from("resource_locations").insert(locRows);

      success += inserted.length;
    }

    // Log to import_logs
    await supabase.from("import_logs").insert({
      filename: file?.name ?? "unknown",
      total_rows: rows.length,
      success_count: success,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : null,
    });

    setResult({ total: rows.length, success, errors });
    setImporting(false);

    if (success > 0) {
      toast.success(`${success} resources imported`);
      onImported();
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([EXAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grantkit-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Import CSV</h2>
              <p className="text-xs text-muted-foreground">
                title, resource_type, category_ids, country_codes, status, amount_min, amount_max, currency, deadline, source_url, description
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Drop zone */}
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-secondary/30 transition-all"
            >
              <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Drop your CSV file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* File info */}
          {file && !result && (
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{rows.length} rows detected</p>
              </div>
              <button type="button" onClick={() => { setFile(null); setRows([]); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Preview: first 5 rows */}
          {rows.length > 0 && !result && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Preview (first 5 rows)
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/50">
                      {["title", "resource_type", "status", "country_codes"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-secondary/20">
                        <td className="px-3 py-2 max-w-[180px] truncate">{row.title}</td>
                        <td className="px-3 py-2">{row.resource_type}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2">{row.country_codes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{result.total}</p>
                  <p className="text-xs text-muted-foreground">Total rows</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{result.success}</p>
                  <p className="text-xs text-emerald-600">Imported</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${result.errors.length > 0 ? "bg-red-50" : "bg-secondary/30"}`}>
                  {result.errors.length > 0 && <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />}
                  <p className={`text-2xl font-bold ${result.errors.length > 0 ? "text-red-600" : "text-foreground"}`}>
                    {result.errors.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">
                      <span className="font-medium">Row {e.row}</span> ({e.title}): {e.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Template
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-muted rounded-lg transition-colors"
            >
              {result ? "Close" : "Cancel"}
            </button>
            {rows.length > 0 && !result && (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? "Importing…" : `Import ${rows.length} rows`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
