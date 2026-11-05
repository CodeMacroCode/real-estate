"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { DateRangeFilter } from "@/app/componets/ui/DateRangeFilter";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export interface PublicInquiryItem {
  id: string;
  inquiryType: string;
  name: string;
  phone: string;
  email?: string;
  whatsApp?: string;
  preferredDateTime: string | null;
  message?: string;
  status: "Pending" | "Converted_To_Lead" | "Appended_To_Existing_Lead";
  crmLead: {
    id: string;
    title: string;
    status: string;
  } | null;
  property: {
    id: string;
    title: string;
    propertyId: string;
  } | null;
  project: {
    id: string;
    name: string;
    projectId: string;
  } | null;
  createdAt: string;
}

export interface PublicInquiriesClientProps {
  initialInquiries: PublicInquiryItem[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PublicInquiriesClient({
  initialInquiries,
  initialPagination,
}: PublicInquiriesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentType = searchParams.get("type") || "All";

  const handleTypeChange = (newType: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newType === "All") {
      params.delete("type");
    } else {
      params.set("type", newType);
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`/inquiries?${params.toString()}`);
    });
  };

  const handleDateRangeChange = (
    start: Date | null,
    end: Date | null,
    startStr?: string,
    endStr?: string
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (startStr || (start && !isNaN(start.getTime()))) {
      params.set("startDate", startStr || start!.toISOString());
    } else {
      params.delete("startDate");
    }
    if (endStr || (end && !isNaN(end.getTime()))) {
      params.set("endDate", endStr || end!.toISOString());
    } else {
      params.delete("endDate");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`/inquiries?${params.toString()}`);
    });
  };

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit);
    params.set("page", "1");
    startTransition(() => {
      router.push(`/inquiries?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    startTransition(() => {
      router.push(`/inquiries?${params.toString()}`);
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Converted_To_Lead":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ✓ New Lead Converted
          </span>
        );
      case "Appended_To_Existing_Lead":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            ⚡ Appended (Deduplicated)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            ● Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
        <div className="text-xs text-slate-600 font-medium">
          Total Inquiries Captured:{" "}
          <span className="font-bold text-slate-900">{initialPagination.total}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="w-full sm:w-auto min-w-[200px]">
            <DateRangeFilter
              placeholder="Filter by inquiry date..."
              className="w-full"
              defaultStartDate={searchParams.get("startDate")}
              defaultEndDate={searchParams.get("endDate")}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Type:</span>
            </label>
            <select
              value={currentType}
              onChange={(e) => handleTypeChange(e.target.value)}
              disabled={isPending}
              className="rounded-lg border border-slate-200 shadow-2xs text-xs py-1.5 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Property">Property</option>
              <option value="Project">Project</option>
              <option value="Schedule_Visit">Schedule Visit</option>
              <option value="Requirement">Requirement</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {initialInquiries.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-sm text-slate-500">No website inquiries recorded yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-700 bg-slate-900 hover:bg-slate-900">
                <TableHead className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap text-center w-12">
                  Sr.
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Visitor Info
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Inquiry Type & Context
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Message / Notes
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap text-center">
                  Ingestion Status
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  CRM Lead Link
                </TableHead>
                <TableHead className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Received At
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialInquiries.map((inq, idx) => (
                <TableRow key={inq.id} className="hover:bg-slate-50/80 transition">
                  <TableCell className="text-center text-slate-500 font-mono text-xs px-4 py-3">
                    {(initialPagination.page - 1) * initialPagination.limit + idx + 1}
                  </TableCell>

                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 text-xs">{inq.name}</div>
                    <div className="text-xs text-slate-600 font-mono">{inq.phone}</div>
                    {inq.email && <div className="text-[11px] text-slate-400">{inq.email}</div>}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 mb-1">
                      {inq.inquiryType}
                    </span>
                    {inq.property && (
                      <div className="text-xs font-medium text-blue-600 line-clamp-1">
                        Prop: {inq.property.title} ({inq.property.propertyId})
                      </div>
                    )}
                    {inq.project && (
                      <div className="text-xs font-medium text-purple-600 line-clamp-1">
                        Project: {inq.project.name}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="px-4 py-3 max-w-[280px]">
                    <p className="text-xs text-slate-700 line-clamp-2">{inq.message || "-"}</p>
                    {inq.preferredDateTime && (
                      <p className="text-xs text-blue-600 font-medium mt-1" suppressHydrationWarning>
                        Visit: {new Date(inq.preferredDateTime).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                    {getStatusBadge(inq.status)}
                  </TableCell>

                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    {inq.crmLead ? (
                      <Link
                        href={`/leads`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 block"
                      >
                        {inq.crmLead.title} &rarr;
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </TableCell>

                  <TableCell className="px-4 py-3 whitespace-nowrap text-xs text-slate-500" suppressHydrationWarning>
                    {new Date(inq.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination & Limits Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{initialInquiries.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{initialPagination.total}</span> total inquiries
            </div>

            {/* Rows Per Page Limit Selector */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-slate-600">Rows per page:</span>
              <select
                value={initialPagination.limit}
                onChange={(e) => handleLimitChange(e.target.value)}
                disabled={isPending}
                className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, initialPagination.page - 1))}
              disabled={initialPagination.page <= 1 || isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Page {initialPagination.page} of {initialPagination.totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(Math.min(initialPagination.totalPages, initialPagination.page + 1))}
              disabled={initialPagination.page >= initialPagination.totalPages || isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
