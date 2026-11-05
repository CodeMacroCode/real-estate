"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  PhoneIncoming,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Mail,
  Phone,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileSpreadsheet,
  AlertTriangle,
  Upload,
  Calendar,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Trash2,
  BookUser,
  History,
  Users,
  UserPlus,
  Loader2,
} from "lucide-react";
import ScheduleAppointmentModal from "./ScheduleAppointmentModal";
import Lead360Modal from "@/components/Lead360Modal";
import { DateRangeFilter } from "@/app/componets/ui/DateRangeFilter";
import { Spinner } from "@/components/ui/Spinner";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/ui/SearchableSelect";
import { SafeUser } from "@/types";
import { FormField } from "@/models/CustomForm";
import { toast } from "sonner";
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
  source: "Meta" | "LinkedIn" | "GoogleAds" | "DynamicForm" | "Manual";
  campaignName?: string;
  status: "Pending" | "Assigned" | "In-Progress" | "Completed" | "Rejected";
  budget?: number;
  preferredProperty?: string;
  notes?: string;
  rawSubmissionData?: Record<string, any>;
  adminId?: { _id: string; name: string; email: string };
  assignedSubRoleId?: {
    _id: string;
    name: string;
    email: string;
    role?: any;
    roleId?: any;
  };
  assignedSubRoleName?: string;
  appointmentScheduled?: boolean;
  appointmentId?: string;
  createdById?: {
    _id: string;
    name: string;
    email: string;
    role?: { name: string; slug: string };
    roleId?: { name: string; slug: string };
  };
  createdAt: string;
}

interface AssignedFormResponse {
  assigned: boolean;
  message?: string;
  form: {
    _id: string;
    name: string;
    description?: string;
    version: number;
    fields: FormField[];
  } | null;
}

interface LeadsClientProps {
  initialUser: SafeUser;
  initialRoleSlug: string;
  initialLeads: LeadItem[];
  initialTotalPages: number;
  initialTotalCount: number;
  initialStats: {
    allCount: number;
    newCount: number;
    inProgressCount: number;
    completedCount: number;
    rejectedCount: number;
  };
  initialAssignedForm?: AssignedFormResponse | null;
  initialAdmins?: any[];
  initialSubRoles?: any[];
}

export function LeadsClient({
  initialUser,
  initialRoleSlug,
  initialLeads,
  initialTotalPages,
  initialTotalCount,
  initialStats,
  initialAssignedForm,
  initialAdmins = [],
  initialSubRoles = [],
}: LeadsClientProps) {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(initialUser);
  const [roleSlug, setRoleSlug] = useState<string>(initialRoleSlug);
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
    startStr?: string;
    endStr?: string;
  }>({
    start: null,
    end: null,
  });

  // Dropdown options
  const [adminOptions, setAdminOptions] = useState<SearchableSelectOption[]>(
    [],
  );
  const [staffOptions, setStaffOptions] = useState<SearchableSelectOption[]>(
    [],
  );
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [subRolesList, setSubRolesList] = useState<
    { _id: string; name: string; slug: string }[]
  >([]);
  const [selectedSubRoleId, setSelectedSubRoleId] = useState("");
  const [isRolesLoading, setIsRolesLoading] = useState(false);

  // Client Search & Auto-fill options
  const [clientOptions, setClientOptions] = useState<SearchableSelectOption[]>(
    [],
  );
  const [isClientSearchLoading, setIsClientSearchLoading] = useState(false);
  const [rawClientsList, setRawClientsList] = useState<any[]>([]);
  const [selectedExistingClientId, setSelectedExistingClientId] = useState("");
  const [isClientNameDropdownOpen, setIsClientNameDropdownOpen] =
    useState(false);
  const clientSearchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(initialTotalPages || 1);
  const [totalCount, setTotalCount] = useState(initialTotalCount || (initialLeads ? initialLeads.length : 0));

  // Assigned Dynamic Form Schema state
  const [assignedFormInfo, setAssignedFormInfo] =
    useState<AssignedFormResponse | null>(null);
  const [isFormSchemaLoading, setIsFormSchemaLoading] = useState(false);
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>({});

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedLeadToEdit, setSelectedLeadToEdit] = useState<LeadItem | null>(
    null,
  );

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedLeadForAssign, setSelectedLeadForAssign] =
    useState<LeadItem | null>(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appointment Modal state
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [selectedLeadForAppointment, setSelectedLeadForAppointment] =
    useState<LeadItem | null>(null);

  // Lead 360 Degree View Modal state
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);
  const [selectedLeadIdFor360, setSelectedLeadIdFor360] = useState<
    string | null
  >(null);

  // Form base state
  const [formAdminId, setFormAdminId] = useState("");
  const [leadStatus, setLeadStatus] = useState<string>("Pending");

  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";
  const isSalesManager = roleSlug === "sales_manager";
  const canAssign = isSuperAdmin || isAdmin || isSalesManager;

  // Lock body scroll when dialog is active
  useEffect(() => {
    if (isModalOpen || isAssignOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isAssignOpen]);

  // Fetch current user
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success && json.data) {
          setCurrentUser(json.data.user);
          setRoleSlug(json.data.role?.slug || "");
        }
      } catch (err) {
        console.error("Failed to load user info", err);
      }
    }
    fetchMe();
  }, []);

  // Fetch Admins for SuperAdmin filter / selector
  const fetchAdmins = useCallback(async (query: string = "") => {
    try {
      const res = await fetch(
        `/api/users?role=admin&search=${encodeURIComponent(query)}&limit=25`,
      );
      const json = await res.json();
      if (json.success && json.data) {
        setAdminOptions(
          json.data.map((u: any) => ({
            value: u._id,
            label: `${u.name} (${u.email})`,
            subLabel: u.designation || "Admin Organization",
          })),
        );
      }
    } catch (err) {
      console.error("Failed to fetch admins", err);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);

  // Fetch Sub-Roles for Category filter in Assignment
  const fetchSubRoles = useCallback(async () => {
    setIsRolesLoading(true);
    try {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (json.success && json.data) {
        // Filter out super_admin and admin: only keep operational sub-roles
        const subRoles = json.data.filter(
          (r: any) => r.slug !== "super_admin" && r.slug !== "admin",
        );
        setSubRolesList(subRoles);
      }
    } catch (err) {
      console.error("Failed to fetch sub-roles", err);
    } finally {
      setIsRolesLoading(false);
    }
  }, []);

  // Fetch Staff for Assignment (optionally filtered by sub-role)
  const fetchStaffMembers = useCallback(
    async (query: string = "", roleIdParam?: string) => {
      setIsStaffLoading(true);
      try {
        const targetAdmin =
          selectedLeadForAssign?.adminId?._id ||
          (isAdmin ? currentUser?._id : formAdminId);

        const params = new URLSearchParams({
          search: query,
          limit: "50",
        });
        if (targetAdmin) params.append("parentAdminId", targetAdmin);
        const effectiveRoleId =
          roleIdParam !== undefined ? roleIdParam : selectedSubRoleId;
        if (effectiveRoleId) params.append("roleId", effectiveRoleId);

        const res = await fetch(`/api/staff?${params.toString()}`);
        const json = await res.json();
        if (json.success && json.data) {
          setStaffOptions(
            json.data.map((s: any) => ({
              value: s._id,
              label: `${s.name} (${s.email})`,
              subLabel: s.role?.name || s.designation || "Staff",
            })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch staff members", err);
      } finally {
        setIsStaffLoading(false);
      }
    },
    [
      selectedLeadForAssign,
      isAdmin,
      currentUser?._id,
      formAdminId,
      selectedSubRoleId,
    ],
  );

  useEffect(() => {
    if (isAssignOpen) {
      fetchSubRoles();
      setSelectedSubRoleId("");
      setSelectedExecutiveId("");
      fetchStaffMembers("", "");
    }
  }, [isAssignOpen]);

  const handleSelectClientSuggestion = (client: any) => {
    if (!assignedFormInfo?.form?.fields) return;
    const updated = { ...dynamicAnswers };
    for (const f of assignedFormInfo.form.fields) {
      if (f.mapping === "client_name") updated[f.id] = client.clientName;
      if (f.mapping === "client_phone") updated[f.id] = client.phone || "";
      if (f.mapping === "client_email") updated[f.id] = client.email || "";
      if (f.mapping === "client_address") updated[f.id] = client.address || "";
    }
    setDynamicAnswers(updated);
    setSelectedExistingClientId(client._id);
    setIsClientNameDropdownOpen(false);
  };

  // Search existing clients to auto-populate form
  const fetchClientsForSearch = useCallback(
    async (query: string = "") => {
      setIsClientSearchLoading(true);
      try {
        const params = new URLSearchParams({
          search: query,
          limit: "25",
        });
        if (isSuperAdmin && formAdminId) {
          params.append("adminId", formAdminId);
        }
        const res = await fetch(`/api/clients?${params.toString()}`);
        const json = await res.json();
        if (json.success && json.data) {
          setRawClientsList(json.data);
          setClientOptions(
            json.data.map((c: any) => ({
              value: c._id,
              label: `${c.clientName} (${c.phone})`,
              subLabel: c.email || c.companyName || "Existing Client",
            })),
          );
        }
      } catch (err) {
        console.error("Failed to search clients", err);
      } finally {
        setIsClientSearchLoading(false);
      }
    },
    [isSuperAdmin, formAdminId],
  );

  useEffect(() => {
    if (isModalOpen && modalMode === "create") {
      fetchClientsForSearch("");
    }
  }, [isModalOpen, modalMode, fetchClientsForSearch]);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (sourceFilter) params.append("source", sourceFilter);
      if (selectedAdminId) params.append("adminId", selectedAdminId);
      if (dateRange.startStr || (dateRange.start && !isNaN(dateRange.start.getTime()))) {
        params.append(
          "startDate",
          dateRange.startStr || dateRange.start!.toISOString()
        );
      }
      if (dateRange.endStr || (dateRange.end && !isNaN(dateRange.end.getTime()))) {
        params.append(
          "endDate",
          dateRange.endStr || dateRange.end!.toISOString()
        );
      }

      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setLeads(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalCount(json.pagination?.total || 0);
      } else {
        setError(json.error || "Failed to fetch leads");
      }
    } catch (err: any) {
      setError(err.message || "Error connecting to server");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, sourceFilter, selectedAdminId, dateRange]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // FETCH THE SPECIFIC ASSIGNED DYNAMIC FORM FOR CURRENT/SELECTED ADMIN
  const fetchAssignedForm = useCallback(async (targetAdmin?: string) => {
    setIsFormSchemaLoading(true);
    try {
      const url = targetAdmin
        ? `/api/forms/assigned?adminId=${targetAdmin}`
        : "/api/forms/assigned";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setAssignedFormInfo(json.data);
      } else {
        setAssignedFormInfo({
          assigned: false,
          message: "No form generated by Super Admin",
          form: null,
        });
      }
    } catch (err) {
      console.error("Failed to fetch assigned form", err);
      setAssignedFormInfo({
        assigned: false,
        message: "Error loading form schema",
        form: null,
      });
    } finally {
      setIsFormSchemaLoading(false);
    }
  }, []);

  // Trigger loading assigned form when modal opens or Super Admin switches target admin
  useEffect(() => {
    if (isModalOpen) {
      if (isSuperAdmin) {
        if (formAdminId) {
          fetchAssignedForm(formAdminId);
        } else {
          setAssignedFormInfo(null);
        }
      } else {
        // Admin or Sub-Role: endpoint resolves their admin automatically
        fetchAssignedForm();
      }
    }
  }, [isModalOpen, formAdminId, isSuperAdmin, fetchAssignedForm]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setModalMode("create");
    setSelectedLeadToEdit(null);
    setFormAdminId("");
    setLeadStatus("Pending");
    setDynamicAnswers({});
    setSelectedExistingClientId("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (lead: LeadItem) => {
    setModalMode("edit");
    setSelectedLeadToEdit(lead);
    const adminIdVal = lead.adminId?._id || "";
    setFormAdminId(adminIdVal);
    setLeadStatus(lead.status);

    // Populate dynamic answers from lead canonical and rawSubmissionData
    const initialAnswers: Record<string, any> = {
      ...(lead.rawSubmissionData || {}),
    };

    setDynamicAnswers(initialAnswers);
    setIsModalOpen(true);
  };

  // Save Lead (Add or Edit)
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !assignedFormInfo ||
      !assignedFormInfo.assigned ||
      !assignedFormInfo.form
    ) {
      alert(
        "Cannot save: No dynamic form is assigned to this Admin organization.",
      );
      return;
    }

    if (isSuperAdmin && !formAdminId) {
      alert("Super Admin must choose an Admin organization first.");
      return;
    }

    // Extract mapped canonical fields from dynamic answers
    let clientName = "";
    let clientPhone = "";
    let clientEmail = "";
    let clientAddress = "";
    let customLeadTitle = "";
    let budget: any = undefined;
    const rawSubmissionData: Record<string, any> = {};

    for (const field of assignedFormInfo.form.fields) {
      const val = dynamicAnswers[field.id];

      if (field.required && (val === undefined || val === null || val === "")) {
        alert(`Required field missing: ${field.label}`);
        return;
      }

      // Check if user specifically entered a Lead Title field
      const labelLower = (field.label || "").toLowerCase();
      const idLower = (field.id || "").toLowerCase();
      if (
        labelLower === "lead title" ||
        labelLower === "title" ||
        idLower === "leadtitle" ||
        idLower === "lead_title"
      ) {
        if (val) customLeadTitle = String(val).trim();
      }

      if (field.mapping === "client_name") {
        if (!clientName) clientName = String(val || "").trim();
      } else if (field.mapping === "client_phone") {
        if (!clientPhone) clientPhone = String(val || "").trim();
      } else if (field.mapping === "client_email") {
        if (!clientEmail)
          clientEmail = String(val || "")
            .trim()
            .toLowerCase();
      } else if (field.mapping === "client_address") {
        if (!clientAddress) clientAddress = String(val || "").trim();
      } else {
        rawSubmissionData[field.label || field.id] = val;
      }
    }

    if (!clientName || !clientPhone) {
      alert("Form must provide values for Client Name and Primary Phone.");
      return;
    }

    // Use customLeadTitle if filled in the form, otherwise fallback cleanly
    const finalizedLeadTitle =
      customLeadTitle ||
      (selectedLeadToEdit?.leadTitle &&
      !selectedLeadToEdit.leadTitle.startsWith("Inquiry:")
        ? selectedLeadToEdit.leadTitle
        : `${clientName} - ${assignedFormInfo.form.name}`);

    setIsSubmitting(true);
    try {
      const leadPayload = {
        leadTitle: finalizedLeadTitle,
        clientName,
        clientPhone,
        clientEmail: clientEmail || undefined,
        clientAddress: clientAddress || undefined,
        status: leadStatus,
        source: selectedLeadToEdit?.source || "Manual",
        rawSubmissionData,
        adminId: isSuperAdmin ? formAdminId : undefined,
      };

      const endpoint =
        modalMode === "create"
          ? "/api/leads"
          : `/api/leads/${selectedLeadToEdit?._id}`;
      const method = modalMode === "create" ? "POST" : "PUT";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadPayload),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchLeads();
      } else {
        alert(json.error || "Failed to save lead");
      }
    } catch (err: any) {
      alert(err.message || "Error saving lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Assignment
  const handleAssignSubmit = async () => {
    if (!selectedLeadForAssign || !selectedExecutiveId) {
      alert("Please select a staff member to assign");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadForAssign._id,
          assignedSubRoleId: selectedExecutiveId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAssignOpen(false);
        setSelectedLeadForAssign(null);
        setSelectedExecutiveId("");
        fetchLeads();
      } else {
        alert(json.error || "Failed to assign lead");
      }
    } catch (err: any) {
      alert(err.message || "Error assigning lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "Meta":
        return (
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[11px] font-semibold">
            Meta Ads
          </span>
        );
      case "LinkedIn":
        return (
          <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-[11px] font-semibold">
            LinkedIn
          </span>
        );
      case "GoogleAds":
        return (
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
            Google Ads
          </span>
        );
      case "DynamicForm":
        return (
          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[11px] font-semibold">
            Dynamic Form
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
            Manual
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
            Pending
          </span>
        );
      case "Assigned":
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
            Assigned
          </span>
        );
      case "In-Progress":
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
            In-Progress
          </span>
        );
      case "Completed":
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
            Completed
          </span>
        );
      case "Rejected":
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
            Rejected
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <PhoneIncoming className="w-6 h-6 text-blue-600" />
            Leads &amp; Inquiries
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSuperAdmin
              ? "Platform-wide inbound leads across all organizations, dynamic forms, and advertising channels."
              : isAdmin
                ? "Inbound inquiries from Social Media (Meta/LinkedIn/Google) and dynamic forms for your organization."
                : "Your assigned client inquiries, follow-ups, and scheduled meetings."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLeads()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search client, phone, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In-Progress">In-Progress</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Inbound Sources</option>
              <option value="Meta">Meta (Facebook/Instagram)</option>
              <option value="LinkedIn">LinkedIn Lead Gen</option>
              <option value="GoogleAds">Google Ads</option>
              <option value="DynamicForm">Dynamic Form Builder</option>
              <option value="Manual">Manual Entry</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <DateRangeFilter
              placeholder="Filter by created date..."
              className="w-full"
              onDateRangeChange={(start, end, startStr, endStr) => {
                setDateRange({ start, end, startStr, endStr });
                setPage(1);
              }}
            />
          </div>

          {/* Admin Selector for Super Admin */}
          {isSuperAdmin && (
            <div>
              <SearchableSelect
                placeholder="Filter by Admin Org..."
                options={adminOptions}
                value={selectedAdminId}
                onChange={setSelectedAdminId}
                onSearchChange={fetchAdmins}
              />
            </div>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" className="text-blue-600" />
            <span className="text-sm text-slate-500">Loading inquiries...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center">
            <PhoneIncoming className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">
              No Leads Found
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              There are currently no inbound inquiries matching your filter
              criteria.
            </p>
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] whitespace-nowrap">
                    Date
                  </TableHead>
                  <TableHead className="w-[220px]">
                    Lead Title / Inquiry
                  </TableHead>
                  <TableHead className="w-[180px]">Client Name</TableHead>
                  <TableHead className="w-[190px]">Contact Details</TableHead>
                  <TableHead className="w-[140px]">Created By (Role)</TableHead>
                  <TableHead className="w-[130px]">Type Source</TableHead>
                  {isSuperAdmin && (
                    <TableHead className="w-[150px]">Admin Org</TableHead>
                  )}
                  <TableHead className="w-[160px]">Assigned To</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[160px] text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead._id}>
                    {/* Date Column */}
                    <TableCell className="whitespace-nowrap">
                      <div className="text-xs font-semibold text-slate-800" suppressHydrationWarning>
                        {lead.createdAt
                          ? new Date(lead.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "-"}
                      </div>
                      {lead.createdAt && (
                        <div className="text-[11px] text-slate-400" suppressHydrationWarning>
                          {new Date(lead.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </TableCell>

                    {/* Column 1: Lead Title */}
                    <TableCell>
                      <div
                        className="font-semibold text-slate-900 max-w-[220px] truncate"
                        title={lead.leadTitle}
                      >
                        {lead.leadTitle}
                      </div>
                      {lead.budget ? (
                        <div className="mt-1">
                          <span className="text-emerald-700 text-xs font-semibold bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full inline-block">
                            Budget: ₹{lead.budget.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ) : null}
                    </TableCell>

                    {/* Column 2: Client Name */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {lead.clientName
                            ? lead.clientName.charAt(0).toUpperCase()
                            : "C"}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {lead.clientName}
                          </div>
                          {lead.clientAddress && (
                            <div
                              className="text-[11px] text-slate-400 truncate max-w-[150px]"
                              title={lead.clientAddress}
                            >
                              {lead.clientAddress}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Column 3: Contact Details */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.clientPhone}</span>
                        {/* 1-Click WhatsApp Trigger */}
                        <a
                          href={`https://wa.me/${lead.clientPhone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="size-3.5" />
                        </a>
                      </div>
                      {lead.clientEmail && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.clientEmail}</span>
                          {/* 1-Click Gmail Outreach */}
                          <a
                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.clientEmail)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Compose in Gmail"
                          >
                            <Mail className="size-3 text-red-500" />
                          </a>
                        </div>
                      )}
                    </TableCell>

                    {/* Column 4: Created By (Role) */}
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-800">
                        {lead.createdById?.roleId?.name ||
                          lead.createdById?.role?.name ||
                          lead.createdById?.roleId?.slug?.replace(/_/g, " ") ||
                          (lead.source === "DynamicForm"
                            ? "Visitor (Form)"
                            : "Admin")}
                      </div>
                      {lead.createdById?.name && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {lead.createdById.name}
                        </div>
                      )}
                    </TableCell>

                    {/* Column 5: Type Source */}
                    <TableCell>
                      {getSourceBadge(lead.source)}
                      {lead.campaignName && (
                        <div
                          className="text-[11px] text-slate-500 mt-1 truncate max-w-[120px]"
                          title={lead.campaignName}
                        >
                          {lead.campaignName}
                        </div>
                      )}
                    </TableCell>

                    {isSuperAdmin && (
                      <TableCell>
                        <span className="text-xs font-medium text-slate-800">
                          {lead.adminId?.name || "Unassigned Org"}
                        </span>
                      </TableCell>
                    )}

                    <TableCell>
                      {lead.assignedSubRoleId ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {lead.assignedSubRoleId.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-800">
                              {lead.assignedSubRoleId.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Sales Executive
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs italic text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Unassigned
                        </span>
                      )}
                    </TableCell>

                    <TableCell>{getStatusBadge(lead.status)}</TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. Schedule Appointment / Site Visit (<Calendar />) - Hidden for Completed & Rejected */}
                        {lead.status !== "Completed" &&
                          lead.status !== "Rejected" &&
                          (lead.appointmentScheduled ? (
                            <span
                              className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 border border-emerald-200 cursor-not-allowed select-none"
                              title="Appointment already scheduled for this lead"
                            >
                              <CheckCircle2 className="size-4" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeadForAppointment(lead);
                                setIsAppointmentOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition"
                              title="Schedule Client Appointment / Site Visit"
                            >
                              <Calendar className="size-4" />
                            </button>
                          ))}

                        {/* 2. Assign / Reassign Lead (<UserPlus />) - Hidden for Completed & Rejected */}
                        {canAssign &&
                          lead.status !== "Completed" &&
                          lead.status !== "Rejected" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeadForAssign(lead);
                                setSelectedExecutiveId(
                                  lead.assignedSubRoleId?._id || "",
                                );
                                setIsAssignOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition"
                              title={
                                lead.assignedSubRoleId
                                  ? "Reassign Executive"
                                  : "Assign to Executive"
                              }
                            >
                              <UserPlus className="size-4" />
                            </button>
                          )}

                        {/* 3. Edit Lead Form (<Edit2 />) */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(lead)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition"
                          title="Edit Lead Details"
                        >
                          <Edit2 className="size-4" />
                        </button>

                        {/* 4. Lead 360 Degree Timeline (<History />) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLeadIdFor360(lead._id);
                            setIs360ModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 border border-transparent hover:border-purple-200 transition"
                          title="Open Lead 360° Activity Timeline"
                        >
                          <History className="size-4" />
                        </button>

                        {/* 5. Delete Lead Button (<Trash2 />) */}
                        {(isSuperAdmin || isAdmin) && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Are you sure you want to permanently delete lead "${lead.leadTitle}"? All associated appointments will also be removed.`,
                                )
                              )
                                return;
                              try {
                                const res = await fetch(
                                  `/api/leads/${lead._id}`,
                                  { method: "DELETE" },
                                );
                                if (res.ok) {
                                  toast.success("Lead deleted successfully");
                                  fetchLeads();
                                } else {
                                  const json = await res.json();
                                  toast.error(
                                    json.error || "Failed to delete lead",
                                  );
                                }
                              } catch (err: any) {
                                toast.error("Error deleting lead");
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                            title="Permanently Delete Lead"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Footer */}
        {leads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-800">{leads.length}</span> of{" "}
                <span className="font-semibold text-slate-800">{totalCount || leads.length}</span> total leads
              </div>
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-slate-600">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
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
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="text-xs font-semibold text-slate-700 px-2">
                Page {page} of {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DYNAMIC LEAD ADD / EDIT MODAL POWERED BY ASSIGNED FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Dialog Box - Stable container */}
          <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-xl max-h-[90vh] flex flex-col z-10 border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header (Pinned) */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                    <span>
                      {modalMode === "create"
                        ? "Add New Lead"
                        : "Edit Lead Details"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Powered by SuperAdmin Dynamic Form Schema Assignment
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleSaveLead}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* If Super Admin, they must pick which Admin organization to query and assign to */}
                {isSuperAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Target Admin Organization *
                    </label>
                    <SearchableSelect
                      placeholder="Search Admin..."
                      options={adminOptions}
                      value={formAdminId}
                      onChange={(val) => {
                        setFormAdminId(val);
                        setDynamicAnswers({});
                      }}
                      onSearchChange={fetchAdmins}
                    />
                  </div>
                )}

                {/* Dynamic Form Schema Rendering */}
                {isFormSchemaLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Spinner size="md" className="text-purple-600" />
                    <span className="text-xs text-slate-500">
                      Querying assigned form schema from Super Admin...
                    </span>
                  </div>
                ) : isSuperAdmin && !formAdminId ? (
                  <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl text-xs text-purple-800 text-center">
                    Please select an Admin Organization above to load its
                    assigned dynamic form.
                  </div>
                ) : !assignedFormInfo?.assigned || !assignedFormInfo?.form ? (
                  /* EXACT ALERT REQUIRED BY USER SPEC */
                  <div className="p-5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span>No Form Generated by Super Admin</span>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-800">
                      {assignedFormInfo?.message ||
                        "There is currently no active dynamic lead capture form assigned to this organization. The Super Admin must design a form in the Form Builder and assign it to this Admin organization before manual leads can be created or edited."}
                    </p>
                  </div>
                ) : (
                  /* Dynamic Form Fields Rendered from SuperAdmin's Assigned Schema */
                  <div className="space-y-4 pt-2">
                    {assignedFormInfo.form.fields.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label}{" "}
                          {field.required && (
                            <span className="text-rose-500">*</span>
                          )}
                          {field.mapping !== "none" && (
                            <span className="ml-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-normal">
                              Maps to {field.mapping}
                            </span>
                          )}
                        </label>

                        {field.type === "textarea" ? (
                          <textarea
                            rows={3}
                            required={field.required}
                            placeholder={field.placeholder || field.label}
                            value={
                              dynamicAnswers[field.id] !== undefined
                                ? dynamicAnswers[field.id]
                                : selectedLeadToEdit?.rawSubmissionData?.[
                                    field.label
                                  ] || ""
                            }
                            onChange={(e) =>
                              setDynamicAnswers((prev) => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        ) : field.type === "select" ? (
                          <select
                            required={field.required}
                            value={
                              dynamicAnswers[field.id] !== undefined
                                ? dynamicAnswers[field.id]
                                : selectedLeadToEdit?.rawSubmissionData?.[
                                    field.label
                                  ] || ""
                            }
                            onChange={(e) =>
                              setDynamicAnswers((prev) => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                          >
                            <option value="">Select option...</option>
                            {(field.options || []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "checkbox" ? (
                          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={Boolean(dynamicAnswers[field.id])}
                              onChange={(e) =>
                                setDynamicAnswers((prev) => ({
                                  ...prev,
                                  [field.id]: e.target.checked,
                                }))
                              }
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>{field.placeholder || field.label}</span>
                          </label>
                        ) : field.type === "file" ? (
                          <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center cursor-pointer hover:border-purple-300">
                            <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <span className="text-xs text-slate-500">
                              Upload document (optional)
                            </span>
                          </div>
                        ) : (field.mapping as string) === "client_name" ? (
                          <div className="relative">
                            <input
                              type="text"
                              required={field.required}
                              placeholder={field.placeholder || field.label}
                              value={
                                dynamicAnswers[field.id] !== undefined
                                  ? dynamicAnswers[field.id]
                                  : selectedLeadToEdit?.clientName || ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setDynamicAnswers((prev) => ({
                                  ...prev,
                                  [field.id]: val,
                                }));
                                if (clientSearchTimeoutRef.current) {
                                  clearTimeout(clientSearchTimeoutRef.current);
                                }
                                if (val.trim().length > 0) {
                                  setIsClientNameDropdownOpen(true);
                                  clientSearchTimeoutRef.current = setTimeout(
                                    () => {
                                      fetchClientsForSearch(val.trim());
                                    },
                                    500,
                                  );
                                } else {
                                  setIsClientNameDropdownOpen(false);
                                }
                              }}
                              onFocus={() => {
                                const currentVal =
                                  dynamicAnswers[field.id] ||
                                  selectedLeadToEdit?.clientName ||
                                  "";
                                if (
                                  currentVal.trim().length > 0 &&
                                  rawClientsList.length > 0
                                ) {
                                  setIsClientNameDropdownOpen(true);
                                }
                              }}
                              className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            {isClientSearchLoading && (
                              <div className="absolute right-3 top-2.5 flex items-center pointer-events-none">
                                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                              </div>
                            )}
                            {isClientNameDropdownOpen &&
                              rawClientsList.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                                  {rawClientsList.map((client) => (
                                    <div
                                      key={client._id}
                                      onClick={() =>
                                        handleSelectClientSuggestion(client)
                                      }
                                      className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between group transition-colors"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <div className="text-sm font-semibold text-slate-800 truncate">
                                          {client.clientName}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                          {client.phone && (
                                            <span className="flex items-center gap-1">
                                              📞 {client.phone}
                                            </span>
                                          )}
                                          {client.email && (
                                            <span className="flex items-center gap-1 truncate">
                                              ✉️ {client.email}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 group-hover:bg-purple-600 group-hover:text-white rounded border border-slate-200 group-hover:border-purple-600 transition-colors shrink-0"
                                      >
                                        Select
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        ) : (
                          <input
                            type={field.type === "phone" ? "tel" : field.type}
                            required={field.required}
                            placeholder={field.placeholder || field.label}
                            value={
                              dynamicAnswers[field.id] !== undefined
                                ? dynamicAnswers[field.id]
                                : field.mapping === "client_phone"
                                  ? selectedLeadToEdit?.clientPhone || ""
                                  : field.mapping === "client_email"
                                    ? selectedLeadToEdit?.clientEmail || ""
                                    : field.mapping === "client_address"
                                      ? selectedLeadToEdit?.clientAddress || ""
                                      : selectedLeadToEdit?.rawSubmissionData?.[
                                          field.label
                                        ] || ""
                            }
                            onChange={(e) =>
                              setDynamicAnswers((prev) => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                </div>

                {/* Footer (Pinned) */}
                <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !assignedFormInfo?.assigned ||
                      !assignedFormInfo?.form ||
                      (isSuperAdmin && !formAdminId)
                    }
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 shadow-sm transition"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : modalMode === "create"
                        ? "Create Lead"
                        : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
        </div>
      )}

      {/* ASSIGN LEAD MODAL */}
      {isAssignOpen && selectedLeadForAssign && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAssignOpen(false)}
          />

          {/* Modal Dialog - Stable Container */}
          <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-lg max-h-[90vh] flex flex-col z-10 border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header (Pinned) */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70 shrink-0">
              <h3 className="text-base font-bold text-slate-900">
                Assign Lead to Executive
              </h3>
              <button
                onClick={() => setIsAssignOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="font-semibold text-slate-800">
                  {selectedLeadForAssign.leadTitle}
                </div>
                <div className="text-slate-500 mt-1">
                  Client: {selectedLeadForAssign.clientName} (
                  {selectedLeadForAssign.clientPhone})
                </div>
              </div>

              {/* Step 1: Sub-Role Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Sub-Role Category *
                </label>
                <select
                  value={selectedSubRoleId}
                  onChange={(e) => {
                    const newRoleId = e.target.value;
                    setSelectedSubRoleId(newRoleId);
                    setSelectedExecutiveId("");
                    fetchStaffMembers("", newRoleId);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- All Sub-Role Categories --</option>
                  {subRolesList.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Filter staff members by their designated department or
                  sub-role.
                </p>
              </div>

              {/* Step 2: Executive / User Selection */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Staff Member / User *
                </label>
                <SearchableSelect
                  placeholder={
                    isStaffLoading
                      ? "Loading staff members..."
                      : staffOptions.length === 0
                        ? "No staff found for this category"
                        : "Search staff by name or email..."
                  }
                  options={staffOptions}
                  value={selectedExecutiveId}
                  onChange={setSelectedExecutiveId}
                  onSearchChange={(q) =>
                    fetchStaffMembers(q, selectedSubRoleId)
                  }
                  isLoading={isStaffLoading}
                />
              </div>
            </div>

            {/* Footer (Pinned) */}
            <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !selectedExecutiveId}
                onClick={handleAssignSubmit}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm transition"
              >
                {isSubmitting ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SCHEDULE APPOINTMENT MODAL */}
      <ScheduleAppointmentModal
        isOpen={isAppointmentOpen}
        onClose={() => {
          setIsAppointmentOpen(false);
          setSelectedLeadForAppointment(null);
        }}
        lead={selectedLeadForAppointment}
        onSuccess={() => {
          fetchLeads();
        }}
      />

      {/* LEAD 360 DEGREE TIMELINE MODAL */}
      <Lead360Modal
        isOpen={is360ModalOpen}
        onClose={() => {
          setIs360ModalOpen(false);
          setSelectedLeadIdFor360(null);
        }}
        leadId={selectedLeadIdFor360}
      />
    </div>
  );
}
