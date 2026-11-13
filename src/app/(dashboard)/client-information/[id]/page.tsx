"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageCircle,
  Eye,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileText,
  Receipt,
  Check,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import Lead360Modal from "@/components/Lead360Modal";
import QuotationModal from "@/app/(dashboard)/appointments/QuotationModal";
import InvoiceModal from "@/app/(dashboard)/appointments/InvoiceModal";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface LeadItem {
  _id: string;
  leadTitle: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  source: string;
  status: string;
  campaignName?: string;
  notes?: string;
  assignedSubRoleName?: string;
  rawSubmissionData?: Record<string, any>;
  latestAppointment?: {
    _id: string;
    clientName: string;
    quotationTitle?: string;
    quotationAmount?: number;
    quotationUrl?: string;
    invoiceUrl?: string;
    invoiceName?: string;
    outcome?: "YES" | "NO" | "MAYBE";
  } | null;
  adminId?: {
    _id: string;
    name: string;
    email: string;
    designation?: string;
    branch?: string;
  };
  assignedSubRoleId?: {
    _id: string;
    name: string;
    email: string;
    designation?: string;
    role?: string;
    roleId?: {
      name?: string;
      slug?: string;
    };
    branch?: string;
  };
  createdAt: string;
}

interface ClientDetail {
  _id: string;
  clientName: string;
  phone: string;
  email?: string;
  address?: string;
  companyName?: string;
  status: "Active" | "Inactive" | "VIP";
  notes?: string;
  createdAt: string;
  adminId?: {
    _id: string;
    name: string;
    email: string;
    designation?: string;
  };
  leadId?: LeadItem;
  leads?: LeadItem[];
}

export default function ClientProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter for leads table
  const [leadSearch, setLeadSearch] = useState("");

  // Column Visibility state & dropdown menu
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    srNo: true,
    workingDate: true,
    leadTitle: true,
    shopName: true,
    adminName: true,
    subRole: true,
    notes: true,
    status: true,
    actions: true,
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Close column dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#column-visibility-popover")) {
        setIsColumnDropdownOpen(false);
      }
    };
    if (isColumnDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isColumnDropdownOpen]);

  // Lead 360 modal state
  const [selectedLeadIdFor360, setSelectedLeadIdFor360] = useState<
    string | null
  >(null);
  const [is360Open, setIs360Open] = useState(false);

  // Quotation & Invoice modals state
  const [selectedAppointmentForQuotation, setSelectedAppointmentForQuotation] =
    useState<any>(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);

  const [selectedAppointmentForInvoice, setSelectedAppointmentForInvoice] =
    useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const fetchClientData = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setClient(json.data);
        if (typeof window !== "undefined" && json.data.clientName) {
          window.dispatchEvent(
            new CustomEvent("updateBreadcrumbLabel", {
              detail: { segment: clientId, label: json.data.clientName },
            })
          );
        }
      } else {
        setError(json.error || "Failed to load client details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load client profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  // Combine and deduplicate leads list
  const leadsList = useMemo(() => {
    if (!client) return [];
    const list: LeadItem[] = [];
    const seenIds = new Set<string>();

    if (Array.isArray(client.leads)) {
      for (const l of client.leads) {
        if (l && l._id && !seenIds.has(l._id)) {
          seenIds.add(l._id);
          list.push(l);
        }
      }
    }

    if (client.leadId && client.leadId._id && !seenIds.has(client.leadId._id)) {
      seenIds.add(client.leadId._id);
      list.unshift(client.leadId);
    }

    return list;
  }, [client]);

  // Filtered leads by search query
  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return leadsList;
    const q = leadSearch.toLowerCase().trim();
    return leadsList.filter(
      (l) =>
        (l.leadTitle && l.leadTitle.toLowerCase().includes(q)) ||
        (l.clientName && l.clientName.toLowerCase().includes(q)) ||
        (l.status && l.status.toLowerCase().includes(q)) ||
        (l.source && l.source.toLowerCase().includes(q))
    );
  }, [leadsList, leadSearch]);

  const cleanPhone = client?.phone?.replace(/[^0-9]/g, "") || "";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner className="w-8 h-8 text-blue-600" />
        <span className="text-xs text-slate-500 font-medium">
          Loading client dossier...
        </span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Link
          href="/client-information"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white shadow-2xs transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Clients</span>
        </Link>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error || "Client record not found"}
        </div>
      </div>
    );
  }

  const registeredDateStr = client.createdAt
    ? new Date(client.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/client-information"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Clients</span>
        </Link>

        <Link
          href="/leads"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Lead for this Client</span>
        </Link>
      </div>

      {/* Hero Client Information Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
          {/* Avatar & Profile Badge (Left Column) */}
          <div className="flex flex-col items-center text-center shrink-0 lg:w-48 lg:border-r lg:border-slate-100 lg:pr-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-400 p-0.5 bg-slate-50 shadow-sm flex items-center justify-center">
                <img
                  src={`https://api.dicebear.com/10.x/gaze/svg?tags=animation&seed=${encodeURIComponent(
                    client.clientName
                  )}`}
                  alt="Client Avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="absolute -top-1.5 -right-1 px-2.5 py-0.5 text-[10px] font-bold text-white bg-emerald-500 rounded-full shadow-2xs">
                Available
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 mt-3 truncate max-w-[190px]">
              {client.clientName}
            </h2>

            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              <span className="text-slate-400 font-medium">Status:</span>
              <span className="text-emerald-600 font-bold">
                {client.status || "Active"}
              </span>
            </div>
          </div>

          {/* Client Details Section (Right Column) */}
          <div className="flex-1 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Client Information
            </h3>

            {/* All Contact Info In ONE LINE: Phone Number, Email, Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. Phone Box */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Phone Number
                    </span>
                    <span className="text-sm font-semibold text-slate-900 block truncate">
                      {client.phone || "-"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                      title="WhatsApp Chat"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="Direct Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* 2. Email Box */}
              <div className="flex items-center p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Email Address
                    </span>
                    <span className="text-sm font-semibold text-slate-900 block truncate">
                      {client.email || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Address Box */}
              <div className="flex items-center p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Address
                    </span>
                    <span className="text-sm font-semibold text-slate-900 block truncate" title={client.address || "-"}>
                      {client.address || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Registration Info */}
            <div className="flex justify-end pt-1">
              <span className="text-[11px] text-slate-500 font-medium">
                Client Registered on{" "}
                <span className="text-slate-900 font-semibold">
                  {registeredDateStr}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar for Leads */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            placeholder="Search leads by title..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          />
        </div>

        {/* Column Visibility Selector */}
        <div className="relative" id="column-visibility-popover">
          <button
            type="button"
            onClick={() => setIsColumnDropdownOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Columns</span>
          </button>

          {isColumnDropdownOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
              <div className="pb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Toggle Columns
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {Object.values(visibleColumns).filter(Boolean).length} of {Object.values(visibleColumns).length} visible
                </span>
              </div>
              <div className="pt-2 space-y-1">
                {[
                  { key: "srNo", label: "Sr. No." },
                  { key: "workingDate", label: "Working Date" },
                  { key: "leadTitle", label: "Lead Title" },
                  { key: "shopName", label: "Shop Name" },
                  { key: "adminName", label: "Admin Name" },
                  { key: "subRole", label: "Sub Role & Assigned User" },
                  { key: "notes", label: "Notes" },
                  { key: "status", label: "Status" },
                  { key: "actions", label: "Actions" },
                ].map(({ key, label }) => {
                  const isChecked = visibleColumns[key as keyof typeof visibleColumns];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleColumn(key as keyof typeof visibleColumns)}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer select-none group"
                    >
                      <span className="group-hover:text-slate-900">{label}</span>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isChecked
                            ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                            : "border-slate-300 bg-white group-hover:border-slate-400"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#111827] hover:bg-[#111827] text-white">
              {visibleColumns.srNo && (
                <TableHead className="text-white text-xs font-bold uppercase tracking-wider py-3.5 text-center w-16">
                  Sr. No.
                </TableHead>
              )}
              {visibleColumns.workingDate && (
                <TableHead className="text-white text-xs font-bold uppercase tracking-wider py-3.5 text-center">
                  Working Date
                </TableHead>
              )}
              {visibleColumns.leadTitle && (
                <TableHead className="text-white text-xs font-bold uppercase tracking-wider py-3.5 text-center">
                  Lead Title
                </TableHead>
              )}
              {visibleColumns.shopName && (
                <TableHead className="text-white text-xs font-bold uppercase tracking-wider py-3.5 text-center">
                  Shop Name
                </TableHead>
              )}
              {visibleColumns.adminName && (
                <TableHead className="text-white text-xs font-bold uppercase tracking-wider py-3.5 text-center">
                  Admin Name
                </TableHead>
              )}
              {visibleColumns.subRole && (
                <TableHead className="text-white text-xs font-bold uppercase tracking-wider py-3.5 text-center">
                  Sub Role & Assigned User
                </TableHead>
              )}
              {visibleColumns.notes && (
                <TableHead className="text-white text-xs font-bold uppercase tracking-wider py-3.5 text-center">
                  Notes
                </TableHead>
              )}
              {visibleColumns.status && (
                <TableHead className="text-white text-xs font-bold uppercase tracking-wider py-3.5 text-center">
                  Status
                </TableHead>
              )}
              {visibleColumns.actions && (
                <TableHead className="text-white text-xs font-bold uppercase tracking-wider py-3.5 text-center w-36">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Object.values(visibleColumns).filter(Boolean).length || 1}
                  className="text-center py-12 text-xs text-slate-400"
                >
                  No associated leads found for this client.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead, idx) => {
                const leadWorkingDateStr = lead.createdAt
                  ? new Date(lead.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "-";

                // Shop name / clientName
                const shopName = client.companyName || lead.clientName || "-";

                // Admin Name
                const adminName =
                  lead.adminId?.name || client.adminId?.name || "-";

                // Sub role category & Sub role user name
                const subRoleCategory =
                  lead.assignedSubRoleId?.roleId?.name ||
                  lead.assignedSubRoleName ||
                  lead.assignedSubRoleId?.designation ||
                  lead.assignedSubRoleId?.role ||
                  "";

                const assignedUserName = lead.assignedSubRoleId?.name || "";

                // Notes or custom data
                const leadNotes = lead.notes || lead.campaignName || "-";

                return (
                  <TableRow
                    key={lead._id || idx}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {visibleColumns.srNo && (
                      <TableCell className="text-center text-xs font-medium text-slate-700 py-3">
                        {idx + 1}
                      </TableCell>
                    )}
                    {visibleColumns.workingDate && (
                      <TableCell className="text-center text-xs text-slate-600 py-3">
                        {leadWorkingDateStr}
                      </TableCell>
                    )}
                    {visibleColumns.leadTitle && (
                      <TableCell className="text-center text-xs font-semibold text-slate-900 py-3">
                        {lead.leadTitle}
                      </TableCell>
                    )}
                    {visibleColumns.shopName && (
                      <TableCell className="text-center text-xs text-slate-700 py-3">
                        {shopName}
                      </TableCell>
                    )}
                    {visibleColumns.adminName && (
                      <TableCell className="text-center text-xs font-medium text-slate-900 py-3">
                        {adminName}
                      </TableCell>
                    )}
                    {visibleColumns.subRole && (
                      <TableCell className="text-center text-xs text-slate-700 py-3">
                        {subRoleCategory || assignedUserName ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            {subRoleCategory && (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                {subRoleCategory}
                              </span>
                            )}
                            <span className="font-medium text-slate-900">
                              {assignedUserName || "—"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.notes && (
                      <TableCell className="text-center text-xs text-slate-600 py-3 max-w-[120px] truncate">
                        {leadNotes}
                      </TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell className="text-center py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            lead.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : lead.status === "Rejected"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : lead.status === "In-Progress"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
                      <TableCell className="text-center py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Lead 360 View */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeadIdFor360(lead._id);
                              setIs360Open(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition"
                            title="View Lead 360 Timeline"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. Quotation / Proposal Button */}
                          {lead.latestAppointment &&
                            lead.latestAppointment.outcome !== "NO" &&
                            lead.latestAppointment.outcome !== "MAYBE" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAppointmentForQuotation(
                                    lead.latestAppointment
                                  );
                                  setIsQuotationModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition"
                                title={
                                  lead.latestAppointment.quotationTitle
                                    ? `Quotation: ${lead.latestAppointment.quotationTitle}`
                                    : "Attach Proposal / Quotation"
                                }
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}

                          {/* 3. Invoice Button (only when outcome is YES) */}
                          {lead.latestAppointment &&
                            lead.latestAppointment.outcome === "YES" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAppointmentForInvoice(
                                    lead.latestAppointment
                                  );
                                  setIsInvoiceModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition"
                                title={
                                  lead.latestAppointment.invoiceUrl
                                    ? "Invoice Attached"
                                    : "Upload Invoice"
                                }
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Lead 360 Timeline Modal */}
      <Lead360Modal
        isOpen={is360Open}
        onClose={() => {
          setIs360Open(false);
          setSelectedLeadIdFor360(null);
        }}
        leadId={selectedLeadIdFor360}
      />

      {/* Quotation / Proposal Modal */}
      {isQuotationModalOpen && selectedAppointmentForQuotation && (
        <QuotationModal
          isOpen={isQuotationModalOpen}
          onClose={() => {
            setIsQuotationModalOpen(false);
            setSelectedAppointmentForQuotation(null);
          }}
          appointment={selectedAppointmentForQuotation}
          onSuccess={fetchClientData}
        />
      )}

      {/* Invoice Modal */}
      {isInvoiceModalOpen && selectedAppointmentForInvoice && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedAppointmentForInvoice(null);
          }}
          appointment={selectedAppointmentForInvoice}
          onSuccess={fetchClientData}
        />
      )}
    </div>
  );
}
