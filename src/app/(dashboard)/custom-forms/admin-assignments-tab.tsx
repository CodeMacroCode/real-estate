"use client";

import React, { useState } from "react";
import {
  Building2,
  Copy,
  Check,
  ExternalLink,
  Link2,
  Unlink,
  AlertTriangle,
} from "lucide-react";
import { FormTemplate } from "./frombuild";
import { formatDate } from "@/lib/dateUtils";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

export interface FormAssignmentRow {
  _id: string;
  formId: { _id: string; name: string; version: number; fields?: any[] };
  adminId: {
    _id: string;
    name: string;
    email: string;
    designation?: string;
    branch?: string;
  };
  publicSlug: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminAssignmentsTabProps {
  assignments: FormAssignmentRow[];
  onOpenAssignDialog: () => void;
  onOpenImpactDialog: (
    adminId: string,
    adminName: string,
    formName: string,
    publicSlug: string,
  ) => void;
}

export function AdminAssignmentsTab({
  assignments,
  onOpenAssignDialog,
  onOpenImpactDialog,
}: AdminAssignmentsTabProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCopy = (slug: string) => {
    const url = `${window.location.origin}/forms/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Admin Organization Form Deployments
          </h2>
          <p className="text-xs text-slate-500">
            Active public landing URLs generating inbound leads directly into
            each Admin&apos;s pipeline.
          </p>
        </div>

        <button
          onClick={onOpenAssignDialog}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 shadow-sm transition"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>+ Assign Form to Admin</span>
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {assignments.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">
              No Admin Assignments Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Select an Admin organization to assign a dynamic lead capture form
              template.
            </p>
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-5 py-3.5">Admin Organization</TableHead>
                  <TableHead className="px-5 py-3.5">Assigned Form Template</TableHead>
                  <TableHead className="px-5 py-3.5">Deployment Status</TableHead>
                  <TableHead className="px-5 py-3.5">Public Live URL</TableHead>
                  <TableHead className="px-5 py-3.5">Assigned Date</TableHead>
                  <TableHead className="px-5 py-3.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((row) => (
                  <TableRow key={row._id} className="hover:bg-slate-50/75 transition">
                    <TableCell className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {row.adminId?.name || "Admin"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {row.adminId?.email} • {row.adminId?.branch || "HQ"}
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <div className="font-semibold text-purple-700">
                        {row.formId?.name || "Custom Form"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Version {row.formId?.version || 1} •{" "}
                        {row.formId?.fields?.length || 0} fields
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      {row.isActive ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live & Active
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">
                          Inactive
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          /forms/{row.publicSlug}
                        </span>
                        <button
                          onClick={() => handleCopy(row.publicSlug)}
                          className="p-1 text-slate-400 hover:text-purple-600 transition"
                          title="Copy Full URL"
                        >
                          {copiedSlug === row.publicSlug ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={`/forms/${row.publicSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-blue-600 transition"
                          title="Open Form in New Tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </TableCell>

                    <TableCell suppressHydrationWarning className="px-5 py-4 text-slate-500">
                      {formatDate(row.createdAt)}
                    </TableCell>

                    <TableCell className="px-5 py-4 text-right">
                      <button
                        onClick={() =>
                          onOpenImpactDialog(
                            row.adminId?._id,
                            row.adminId?.name || "Admin",
                            row.formId?.name || "Custom Form",
                            row.publicSlug,
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition"
                      >
                        <Unlink className="w-3 h-3" />
                        <span>Unassign</span>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
