"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";

export type ExportReportFormat = "csv" | "excel" | "pdf";

interface ExportReportMenuProps {
  onExport: (format: ExportReportFormat) => void | Promise<void>;
  exportingFormat: ExportReportFormat | null;
  disabled?: boolean;
}

export function ExportReportMenu({
  onExport,
  exportingFormat,
  disabled = false,
}: ExportReportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleSelect = (format: ExportReportFormat) => {
    setIsOpen(false);
    onExport(format);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled || exportingFormat !== null}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex h-9 items-center gap-2 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition shadow-xs disabled:opacity-50 whitespace-nowrap"
      >
        {exportingFormat ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        ) : (
          <FileDown className="w-4 h-4 text-slate-600" />
        )}
        <span>
          {exportingFormat
            ? `Exporting ${exportingFormat.toUpperCase()}...`
            : "Export Report"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 overflow-hidden z-50"
        >
          <div className="px-3.5 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100">
            Export As
          </div>
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect("csv")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect("excel")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect("pdf")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left"
            >
              <FileDown className="w-4 h-4 text-slate-600" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
