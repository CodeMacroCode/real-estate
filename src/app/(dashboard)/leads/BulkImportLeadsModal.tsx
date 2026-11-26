"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FileSpreadsheet,
  X,
  FileDown,
  UploadCloud,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/models/CustomForm";
import { exportLeadsImportTemplate } from "@/lib/export/leadReportExport";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/ui/SearchableSelect";

interface BulkImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isSuperAdmin: boolean;
  adminOptions: SearchableSelectOption[];
  onSearchAdmins?: (query: string) => void;
}

interface DynamicColumnChip {
  key: string;
  label: string;
  header: string;
  required: boolean;
  optionalBadge?: boolean;
}

function isLeadTitleField(field: { id?: string; label?: string }): boolean {
  const label = (field.label || "").trim().toLowerCase();
  const id = (field.id || "").trim().toLowerCase();
  return (
    label === "lead title" ||
    label === "title" ||
    label === "lead title / inquiry topic" ||
    label === "inquiry topic" ||
    id === "leadtitle" ||
    id === "lead_title"
  );
}

function deriveColumnsFromFields(
  fields?: FormField[] | null,
): DynamicColumnChip[] {
  if (!fields || fields.length === 0) {
    return [
      {
        key: "leadTitle",
        label: "Lead Title / Inquiry Topic",
        header: "Lead Title / Inquiry Topic *",
        required: true,
      },
      {
        key: "client_name",
        label: "Client / Business Name",
        header: "Client / Business Name *",
        required: true,
      },
      {
        key: "client_phone",
        label: "Primary Phone Number",
        header: "Primary Phone Number *",
        required: true,
      },
      {
        key: "client_email",
        label: "Client Email",
        header: "Client Email",
        required: false,
      },
      {
        key: "client_address",
        label: "Address / Location",
        header: "Address / Location",
        required: false,
      },
      {
        key: "notes",
        label: "Notes (Optional)",
        header: "Notes (Optional)",
        required: false,
        optionalBadge: true,
      },
    ];
  }

  const sorted = [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasLeadTitle = sorted.some((f) => isLeadTitleField(f));
  const hasNotes = sorted.some(
    (f) => (f.label || "").trim().toLowerCase() === "notes",
  );

  const cols: DynamicColumnChip[] = [];

  if (!hasLeadTitle) {
    cols.push({
      key: "leadTitle",
      label: "Lead Title / Inquiry Topic",
      header: "Lead Title / Inquiry Topic *",
      required: true,
    });
  }

  for (const field of sorted) {
    const isRequired =
      Boolean(field.required) ||
      field.mapping === "client_name" ||
      field.mapping === "client_phone";
    cols.push({
      key: field.id,
      label: field.label,
      header: isRequired ? `${field.label} *` : field.label,
      required: isRequired,
    });
  }

  if (!hasNotes) {
    cols.push({
      key: "notes",
      label: "Notes (Optional)",
      header: "Notes (Optional)",
      required: false,
      optionalBadge: true,
    });
  }

  return cols;
}

export default function BulkImportLeadsModal({
  isOpen,
  onClose,
  onSuccess,
  isSuperAdmin,
  adminOptions,
  onSearchAdmins,
}: BulkImportLeadsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [assignedFormName, setAssignedFormName] = useState<string | null>(null);
  const [assignedFields, setAssignedFields] = useState<FormField[] | null>(null);
  const [formAssigned, setFormAssigned] = useState<boolean>(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    failedCount: number;
    totalRows: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (isSuperAdmin && !selectedAdminId) {
      setAssignedFields(null);
      setAssignedFormName(null);
      return;
    }

    let cancelled = false;
    async function loadDynamicForm() {
      setIsLoadingForm(true);
      try {
        const url =
          isSuperAdmin && selectedAdminId
            ? `/api/forms/assigned?adminId=${encodeURIComponent(selectedAdminId)}`
            : "/api/forms/assigned";
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;

        if (json.success && json.data?.assigned && json.data?.form) {
          setFormAssigned(true);
          setAssignedFormName(json.data.form.name || "Active Dynamic Form");
          setAssignedFields(json.data.form.fields || []);
        } else {
          setFormAssigned(false);
          setAssignedFormName(null);
          setAssignedFields(null);
        }
      } catch {
        if (!cancelled) {
          setFormAssigned(false);
          setAssignedFormName(null);
          setAssignedFields(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingForm(false);
        }
      }
    }

    loadDynamicForm();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isSuperAdmin, selectedAdminId]);

  const activeColumns = useMemo(
    () => deriveColumnsFromFields(assignedFields),
    [assignedFields],
  );

  const formColumnCount = useMemo(
    () => activeColumns.filter((c) => !c.optionalBadge).length,
    [activeColumns],
  );

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    if (isSuperAdmin && !selectedAdminId) {
      toast.error("Please select an Admin organization first.");
      return;
    }
    const slug = assignedFormName
      ? assignedFormName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : "leads";
    exportLeadsImportTemplate(
      activeColumns.map((c) => ({
        key: c.key,
        header: c.header,
        required: c.required,
      })),
      `${slug}-bulk-import-template.xlsx`,
    );
    toast.success("Excel template downloaded!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setImportResult(null);
  };

  const handleStartImport = async () => {
    if (isSuperAdmin && !selectedAdminId) {
      toast.error("Please select an Admin organization first.");
      return;
    }
    if (!selectedFile) {
      toast.error("Please choose an Excel (.xlsx) or CSV file first.");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (isSuperAdmin && selectedAdminId) {
        formData.append("adminId", selectedAdminId);
      }

      const res = await fetch("/api/leads/bulk-import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Bulk import failed");
      }

      const result = json.data;
      setImportResult(result);

      if (result.importedCount > 0) {
        toast.success(
          `Successfully imported ${result.importedCount} lead${
            result.importedCount === 1 ? "" : "s"
          }!`,
        );
        onSuccess();
        if (result.failedCount === 0) {
          setSelectedFile(null);
          onClose();
        }
      } else {
        toast.error("No leads were imported. Please check the row errors below.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import leads");
    } finally {
      setIsImporting(false);
    }
  };

  const canInteract = !isSuperAdmin || Boolean(selectedAdminId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Bulk Import Leads from Excel
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Template strictly matches your branch&apos;s active lead form
                fields without unnecessary columns.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close bulk import modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Super Admin Branch Selector */}
          {isSuperAdmin && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Target Admin Organization *
              </label>
              <SearchableSelect
                placeholder="Search Admin / Organization..."
                options={adminOptions}
                value={selectedAdminId}
                onChange={(val) => {
                  setSelectedAdminId(val);
                  setImportResult(null);
                }}
                onSearchChange={onSearchAdmins}
              />
            </div>
          )}

          {!formAssigned && canInteract && !isLoadingForm && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                No custom dynamic form is currently assigned to this branch.
                Using default standard lead columns.
              </span>
            </div>
          )}

          {/* STEP 1: DOWNLOAD TEMPLATE */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wide text-blue-900 uppercase">
                    STEP 1: DOWNLOAD TEMPLATE
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    .XLSX Format
                  </span>
                </div>
                <p className="text-xs text-blue-700/90 mt-1">
                  Download the Excel template generated directly from your
                  branch&apos;s active dynamic form
                  {assignedFormName ? ` (${assignedFormName})` : ""}.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isLoadingForm || !canInteract}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition shadow-2xs shrink-0 disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" />
                <span>Download Template</span>
              </button>
            </div>

            <div className="border-t border-blue-200/60 pt-3">
              <div className="text-xs font-semibold text-blue-900 mb-2">
                Active Form Columns ({formColumnCount}):
              </div>

              {isLoadingForm ? (
                <div className="flex items-center gap-2 text-xs text-blue-700 py-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading branch dynamic form fields...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeColumns.map((col) => (
                    <span
                      key={col.key}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        col.optionalBadge
                          ? "border border-dashed border-slate-300 bg-white/80 text-slate-500"
                          : "border border-blue-200 bg-white text-slate-700 shadow-2xs"
                      }`}
                    >
                      <span>{col.label}</span>
                      {col.required && (
                        <span className="text-rose-500 font-bold">*</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: UPLOAD COMPLETED FILE */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5">
            <div className="text-xs font-bold tracking-wide text-slate-800 uppercase">
              STEP 2: UPLOAD COMPLETED FILE
            </div>

            <div
              onClick={() => canInteract && fileInputRef.current?.click()}
              className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition ${
                canInteract
                  ? "cursor-pointer hover:border-blue-300"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-semibold text-blue-600 shrink-0">
                  Choose File
                </span>
                <span className="text-xs text-slate-600 truncate">
                  {selectedFile ? selectedFile.name : "No file chosen"}
                </span>
              </div>

              {selectedFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setImportResult(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded"
                >
                  Clear
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Import Result / Row Validation Errors */}
          {importResult && (
            <div
              className={`rounded-xl border p-3.5 text-xs space-y-2 ${
                importResult.failedCount === 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {importResult.failedCount === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <span>
                  Imported {importResult.importedCount} of{" "}
                  {importResult.totalRows} rows (
                  {importResult.failedCount} failed)
                </span>
              </div>

              {importResult.errors.length > 0 && (
                <ul className="max-h-28 overflow-y-auto space-y-1 pl-5 list-disc text-[11px] text-rose-700">
                  {importResult.errors.map((err, idx) => (
                    <li key={`${err.row}-${idx}`}>
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleStartImport}
              disabled={!selectedFile || isImporting || isLoadingForm || !canInteract}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Start Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
