'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Search,
  Filter,
  Plus,
  Video,
  MapPin,
  Phone,
  Clock,
  User,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  FileText,
  FilePlus,
  Receipt,
  Pencil,
  Trash2,
  History,
  Download,
  XCircle,
  HelpCircle,
  UserCircle,
  Sparkles,
  MessageCircle,
  Copy,
  Target,
  Globe,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { SafeUser } from '@/types';
import ClientConfirmationModal from './ClientConfirmationModal';
import QuotationModal from './QuotationModal';
import InvoiceModal from './InvoiceModal';
import EditAppointmentModal from './EditAppointmentModal';
import Lead360Modal from '@/components/Lead360Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface AppointmentItem {
  _id: string;
  leadId: {
    _id: string;
    leadTitle: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    clientAddress?: string;
  };
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  agenda: string;
  meetingType: 'In-Person' | 'Virtual' | 'Call';
  meetingLocation?: string;
  meetingDate: string;
  durationMinutes: number;
  status: 'Scheduled' | 'Rescheduled' | 'Cancelled' | 'Completed';
  outcome?: 'YES' | 'NO' | 'MAYBE';
  meetingSequence?: number;
  previousAppointmentId?: string;
  nextAppointmentId?: string;
  googleCalendarLink?: string;
  googleCalendarEventId?: string;
  quotationTitle?: string;
  quotationAmount?: number;
  quotationUrl?: string;
  invoiceUrl?: string;
  invoiceName?: string;
  invoiceUploadedAt?: string;
  adminId?: { _id: string; name: string; email: string };
  assignedSubRoleId?: { _id: string; name: string; email: string; role?: any; roleId?: any };
  createdById?: { _id: string; name: string; email: string; role?: { name: string; slug: string }; roleId?: { name: string; slug: string } };
  confirmationId?: {
    clientConfirmation: 'YES' | 'NO' | 'MAYBE';
    clientFeedback?: string;
    agreedDeliveryDate?: string;
    followUpDate?: string;
    rejectionReason?: string;
  };
  createdAt: string;
}

export default function AppointmentsPage() {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [roleSlug, setRoleSlug] = useState<string>('');
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [kpiFilter, setKpiFilter] = useState<'all' | 'today' | 'upcoming' | 'pending' | 'yes' | 'maybe'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [kpiStats, setKpiStats] = useState({
    allCount: 0,
    todayCount: 0,
    upcomingCount: 0,
    pendingCount: 0,
    yesCount: 0,
    maybeCount: 0,
  });

  // Modals
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Client Confirmation Modal
  const [selectedAppointmentForConfirm, setSelectedAppointmentForConfirm] = useState<AppointmentItem | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // 2. 360 Degree Timeline Drawer
  const [selectedLeadIdFor360, setSelectedLeadIdFor360] = useState<string | null>(null);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);

  // 3. Quotation Modal
  const [selectedAppointmentForQuotation, setSelectedAppointmentForQuotation] = useState<AppointmentItem | null>(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);

  // 4. Invoice Modal
  const [selectedAppointmentForInvoice, setSelectedAppointmentForInvoice] = useState<AppointmentItem | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // 5. Edit Appointment Modal
  const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] = useState<AppointmentItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Leads options for scheduling
  const [leadOptions, setLeadOptions] = useState<SearchableSelectOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<SearchableSelectOption[]>([]);
  const [adminOptions, setAdminOptions] = useState<SearchableSelectOption[]>([]);

  // Schedule Form State
  const [newAppointment, setNewAppointment] = useState<{
    leadId: string;
    agenda: string;
    meetingType: 'Virtual' | 'In-Person' | 'Call';
    meetingLocation: string;
    meetingDate: string;
    durationMinutes: number;
    assignedSubRoleId: string;
  }>({
    leadId: '',
    agenda: '',
    meetingType: 'Virtual',
    meetingLocation: '',
    meetingDate: '',
    durationMinutes: 30,
    assignedSubRoleId: '',
  });

  const isSuperAdmin = roleSlug === 'super_admin';
  const isAdmin = roleSlug === 'admin';

  // Fetch current user
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (json.success && json.data) {
          setCurrentUser(json.data.user);
          setRoleSlug(json.data.role?.slug || '');
        }
      } catch (err) {
        console.error('Failed to load user', err);
      }
    }
    fetchMe();
  }, []);

  // Fetch Admins
  const fetchAdmins = useCallback(async (query: string = '') => {
    try {
      const res = await fetch(`/api/users?role=admin&search=${encodeURIComponent(query)}&limit=25`);
      const json = await res.json();
      if (json.success && json.data) {
        setAdminOptions(
          json.data.map((u: any) => ({
            value: u._id,
            label: `${u.name} (${u.email})`,
            subLabel: u.designation || 'Admin Organization',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch admins', err);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin, fetchAdmins]);

  // Fetch Leads for dropdown
  const fetchLeadOptions = useCallback(async (query: string = '') => {
    try {
      const res = await fetch(`/api/leads?search=${encodeURIComponent(query)}&limit=25`);
      const json = await res.json();
      if (json.success && json.data) {
        setLeadOptions(
          json.data.map((lead: any) => ({
            value: lead._id,
            label: `${lead.clientName} - ${lead.leadTitle}`,
            subLabel: `${lead.clientPhone} • ${lead.status}`,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch leads', err);
    }
  }, []);

  // Fetch Staff options for assignment
  const fetchStaffOptions = useCallback(async (query: string = '') => {
    try {
      const res = await fetch(`/api/staff?search=${encodeURIComponent(query)}&limit=25`);
      const json = await res.json();
      if (json.success && json.data) {
        setStaffOptions(
          json.data.map((staff: any) => ({
            value: staff._id,
            label: `${staff.name} (${staff.email})`,
            subLabel: staff.role?.name || staff.designation || 'Staff',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch staff', err);
    }
  }, []);

  useEffect(() => {
    if (isScheduleOpen) {
      fetchLeadOptions();
      fetchStaffOptions();
    }
  }, [isScheduleOpen, fetchLeadOptions, fetchStaffOptions]);

  // Fetch Appointments
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);
      if (selectedAdminId) params.append('adminId', selectedAdminId);

      // KPI filter mapping
      if (kpiFilter === 'today') params.append('dateFilter', 'today');
      if (kpiFilter === 'upcoming') params.append('dateFilter', 'upcoming');
      if (kpiFilter === 'pending') params.append('outcome', 'PENDING');
      if (kpiFilter === 'yes') params.append('outcome', 'YES');
      if (kpiFilter === 'maybe') params.append('outcome', 'MAYBE');

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setAppointments(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalCount(json.pagination?.total || 0);
        if (json.pagination?.stats) {
          setKpiStats(json.pagination.stats);
        }
      } else {
        setError(json.error || 'Failed to fetch appointments');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, selectedAdminId, kpiFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Create Appointment
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppointment.leadId || !newAppointment.meetingDate || !newAppointment.agenda) {
      toast.error('Lead, meeting date, and agenda are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppointment),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to schedule');

      toast.success('Appointment scheduled successfully!');
      setIsScheduleOpen(false);
      setNewAppointment({
        leadId: '',
        agenda: '',
        meetingType: 'Virtual',
        meetingLocation: '',
        meetingDate: '',
        durationMinutes: 30,
        assignedSubRoleId: '',
      });
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Error scheduling');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Appointment
  const handleDeleteAppointment = async (apt: AppointmentItem) => {
    if (!confirm(`Are you sure you want to delete meeting with ${apt.clientName}? This will also sync with Google Calendar.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${apt._id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to delete');

      toast.success('Appointment deleted successfully');
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting appointment');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (appointments.length === 0) {
      toast.error('No appointments to export');
      return;
    }

    const headers = [
      'Meeting Sequence',
      'Client Name',
      'Client Phone',
      'Client Email',
      'Meeting Date',
      'Duration (Mins)',
      'Meeting Type',
      'Location / Link',
      'Agenda',
      'Status',
      'Outcome',
      'Quotation Amount',
      'Host Executive',
    ];

    const rows = appointments.map((a) => [
      a.meetingSequence || 1,
      `"${a.clientName || ''}"`,
      `"${a.clientPhone || ''}"`,
      `"${a.clientEmail || ''}"`,
      `"${new Date(a.meetingDate).toLocaleString()}"`,
      a.durationMinutes || 30,
      a.meetingType || 'Virtual',
      `"${a.meetingLocation || a.googleCalendarLink || ''}"`,
      `"${(a.agenda || '').replace(/"/g, '""')}"`,
      a.status,
      a.outcome || 'Pending',
      a.quotationAmount || 0,
      `"${a.assignedSubRoleId?.name || 'Staff'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `appointment-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported CSV successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-blue-600" />
            <span>Appointments & Meetings Hub</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage multi-meeting chains, client decision gates, proposal templates, and Google Meet video links.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
            title="Export CSV report"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => fetchAppointments()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* 1. TOP TOOLBAR KPI FILTER CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {/* Card 1: All Meetings */}
        <button
          type="button"
          onClick={() => {
            setKpiFilter('all');
            setPage(1);
          }}
          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
            kpiFilter === 'all'
              ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-600 font-medium leading-none">All Meetings</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{kpiStats.allCount}</div>
          </div>
        </button>

        {/* Card 2: Today's Meetings */}
        <button
          type="button"
          onClick={() => {
            setKpiFilter('today');
            setPage(1);
          }}
          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
            kpiFilter === 'today'
              ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <div className="text-xs text-slate-600 font-medium leading-none">Today's Meetings</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{kpiStats.todayCount}</div>
          </div>
        </button>

        {/* Card 3: Upcoming */}
        <button
          type="button"
          onClick={() => {
            setKpiFilter('upcoming');
            setPage(1);
          }}
          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
            kpiFilter === 'upcoming'
              ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <div className="text-xs text-slate-600 font-medium leading-none">Upcoming</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{kpiStats.upcomingCount}</div>
          </div>
        </button>

        {/* Card 4: Pending Decision */}
        <button
          type="button"
          onClick={() => {
            setKpiFilter('pending');
            setPage(1);
          }}
          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
            kpiFilter === 'pending'
              ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <div className="text-xs text-slate-600 font-medium leading-none">Pending Decision</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{kpiStats.pendingCount}</div>
          </div>
        </button>

        {/* Card 5: Confirmed Deals */}
        <button
          type="button"
          onClick={() => {
            setKpiFilter('yes');
            setPage(1);
          }}
          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
            kpiFilter === 'yes'
              ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <div className="text-xs text-slate-600 font-medium leading-none">Confirmed Deals</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{kpiStats.yesCount}</div>
          </div>
        </button>

        {/* Card 6: Follow-ups */}
        <button
          type="button"
          onClick={() => {
            setKpiFilter('maybe');
            setPage(1);
          }}
          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
            kpiFilter === 'maybe'
              ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <div className="text-xs text-slate-600 font-medium leading-none">Follow-ups</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{kpiStats.maybeCount}</div>
          </div>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* APPOINTMENT LEDGER TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="w-8 h-8 text-blue-600" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 px-4">
            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No appointments found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Schedule your first client meeting or site visit directly from the Leads section or using the button above.
            </p>
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] whitespace-nowrap">SR.</TableHead>
                  <TableHead className="whitespace-nowrap">MEETING DATE</TableHead>
                  <TableHead className="whitespace-nowrap">CLIENT</TableHead>
                  <TableHead className="whitespace-nowrap">LEAD</TableHead>
                  <TableHead className="whitespace-nowrap">AGENDA</TableHead>
                  <TableHead className="whitespace-nowrap">MEETING MODE</TableHead>
                  <TableHead className="whitespace-nowrap">STATUS</TableHead>
                  <TableHead className="whitespace-nowrap">CLIENT CONFIRMATION</TableHead>
                  <TableHead className="whitespace-nowrap">CREATED BY ROLE</TableHead>
                  <TableHead className="whitespace-nowrap">RESPONSIBLE ENTITY</TableHead>
                  <TableHead className="whitespace-nowrap text-center">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((apt, index) => {
                  const isHistoricalMaybe = !!apt.nextAppointmentId || (apt.outcome === 'MAYBE' && apt.status === 'Completed');
                  const srNo = (page - 1) * limit + (index + 1);

                  return (
                    <TableRow key={apt._id}>
                      {/* 1. SR. NO. */}
                      <TableCell className="font-medium text-slate-600">
                        {srNo}
                      </TableCell>

                      {/* 2. MEETING DATE */}
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-800">
                          {new Date(apt.meetingDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}, {new Date(apt.meetingDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          }).toLowerCase()}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 mt-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Meeting #{apt.meetingSequence || 1}
                          </span>
                          {apt.googleCalendarLink ? (
                            <a
                              href={apt.googleCalendarLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition"
                            >
                              <CalendarIcon className="size-3 text-red-500" />
                              <span>Calendar</span>
                              <ExternalLink className="size-2.5 text-blue-500" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                              <CalendarIcon className="size-3 text-red-500" />
                              <span>Calendar</span>
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 3. CLIENT */}
                      <TableCell>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-slate-900 truncate max-w-[130px]" title={apt.clientName}>
                            {apt.clientName}
                          </span>
                          <span className="text-slate-400 text-xs tracking-widest cursor-default">•••</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-200/80 rounded-md text-slate-600 text-[11px]">
                          <span>{apt.clientPhone}</span>
                          <a
                            href={`https://wa.me/${apt.clientPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-500 hover:text-emerald-600"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="size-3" />
                          </a>
                          <a
                            href={`tel:${apt.clientPhone}`}
                            className="text-blue-500 hover:text-blue-600"
                            title="Call client"
                          >
                            <Phone className="size-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(apt.clientPhone);
                              toast.success('Phone copied to clipboard');
                            }}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copy phone"
                          >
                            <Copy className="size-2.5" />
                          </button>
                        </div>
                      </TableCell>

                      {/* 4. LEAD */}
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-800 truncate max-w-[150px]" title={apt.leadId?.leadTitle || '—'}>
                          {apt.leadId?.leadTitle || '—'}
                        </div>
                      </TableCell>

                      {/* 5. AGENDA */}
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-800">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500 flex-shrink-0" />
                          <span className="truncate max-w-[130px]" title={apt.agenda}>{apt.agenda}</span>
                        </div>
                      </TableCell>

                      {/* 6. MEETING MODE */}
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            {apt.meetingType === 'In-Person' ? (
                              <MapPin className="size-3 text-amber-600" />
                            ) : apt.meetingType === 'Virtual' ? (
                              <Video className="size-3 text-blue-600" />
                            ) : (
                              <Phone className="size-3 text-emerald-600" />
                            )}
                            <span>{apt.meetingType}</span>
                          </span>
                          {apt.meetingLocation && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-[120px]" title={apt.meetingLocation}>
                              <MapPin className="size-2.5 text-red-500 flex-shrink-0" />
                              <span className="truncate">{apt.meetingLocation}</span>
                              <ExternalLink className="size-2.5 text-slate-400" />
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 7. STATUS */}
                      <TableCell>
                        {apt.status === 'Completed' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                            Completed
                          </span>
                        )}
                        {apt.status === 'Rescheduled' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 inline-block">
                            Rescheduled
                          </span>
                        )}
                        {apt.status === 'Scheduled' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                            Scheduled
                          </span>
                        )}
                        {apt.status === 'Cancelled' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 inline-block">
                            Cancelled
                          </span>
                        )}
                      </TableCell>

                      {/* 8. CLIENT CONFIRMATION */}
                      <TableCell>
                        {!apt.outcome ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAppointmentForConfirm(apt);
                              setIsConfirmModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
                            title="Record Client Decision"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>Pending</span>
                          </button>
                        ) : apt.outcome === 'YES' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            <span>Confirmed</span>
                          </span>
                        ) : apt.outcome === 'MAYBE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <HelpCircle className="size-3 text-amber-600" />
                            <span>Follow-up</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="size-3 text-rose-600" />
                            <span>Declined</span>
                          </span>
                        )}
                      </TableCell>

                      {/* 9. CREATED BY ROLE */}
                      <TableCell>
                        <div className="text-xs text-slate-700 font-medium lowercase">
                          {apt.createdById?.roleId?.name?.toLowerCase() ||
                            apt.createdById?.role?.name?.toLowerCase() ||
                            apt.createdById?.roleId?.slug?.replace(/_/g, ' ') ||
                            'supervisor'}
                        </div>
                      </TableCell>

                      {/* 10. RESPONSIBLE ENTITY */}
                      <TableCell>
                        <div className="text-xs text-slate-700">
                          {apt.assignedSubRoleId ? (
                            <span>
                              {apt.assignedSubRoleId.roleId?.name || apt.assignedSubRoleId.role?.name || 'Staff'}: {apt.assignedSubRoleId.name}
                            </span>
                          ) : (
                            <span>Supervisor: {apt.adminId?.name || 'Assigned Supervisor'}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* 11. ACTIONS */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Outcome Status Pill (if outcome present) or Record Decision button */}
                          {apt.outcome === 'NO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-200">
                              <XCircle className="size-3 text-rose-500" />
                              <span>Declined</span>
                            </span>
                          )}
                          {apt.outcome === 'YES' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <CheckCircle2 className="size-3 text-emerald-500" />
                              <span>Confirmed</span>
                            </span>
                          )}
                          {apt.outcome === 'MAYBE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                              <HelpCircle className="size-3 text-amber-500" />
                              <span>Follow-up</span>
                            </span>
                          )}
                          {!apt.outcome && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAppointmentForConfirm(apt);
                                setIsConfirmModalOpen(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Record Client Decision"
                            >
                              <UserCircle className="size-4" />
                            </button>
                          )}

                          {/* 1. Lead Meeting History (<History />) */}
                          {apt.leadId?._id && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeadIdFor360(apt.leadId._id);
                                setIs360ModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                              title="View Lead 360° Meeting History"
                            >
                              <History className="size-4" />
                            </button>
                          )}

                          {/* 2. Quotation / Proposal (<FileText />) */}
                          {apt.outcome !== 'NO' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAppointmentForQuotation(apt);
                                setIsQuotationModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded transition"
                              title={apt.quotationTitle ? `Quotation: ${apt.quotationTitle}` : 'Attach Proposal / Quotation'}
                            >
                              <FileText className="size-4" />
                            </button>
                          )}

                          {/* 3. Invoice Button (when YES outcome) */}
                          {apt.outcome === 'YES' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAppointmentForInvoice(apt);
                                setIsInvoiceModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                              title={apt.invoiceUrl ? 'Invoice Attached' : 'Upload Invoice'}
                            >
                              <Receipt className="size-4" />
                            </button>
                          )}

                          {/* 4. Edit Appointment (<Pencil />) */}
                          {!isHistoricalMaybe && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAppointmentForEdit(apt);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit Appointment"
                            >
                              <Pencil className="size-4" />
                            </button>
                          )}

                          {/* 5. Delete Appointment (<Trash2 />) */}
                          {!isHistoricalMaybe && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAppointment(apt)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded transition"
                              title="Delete Appointment"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {appointments.length} of {totalCount} appointments
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SCHEDULE APPOINTMENT MODAL */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
              onClick={() => setIsScheduleOpen(false)}
            />

            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all w-full my-8 max-w-lg z-10 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  <span>Schedule Appointment / Meeting</span>
                </h3>
                <button
                  onClick={() => setIsScheduleOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Prospect / Lead *
                  </label>
                  <SearchableSelect
                    placeholder="Search prospect by name or phone..."
                    options={leadOptions}
                    value={newAppointment.leadId}
                    onChange={(val) => setNewAppointment({ ...newAppointment, leadId: val })}
                    onSearchChange={fetchLeadOptions}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Meeting Type *
                    </label>
                    <select
                      value={newAppointment.meetingType}
                      onChange={(e) =>
                        setNewAppointment({ ...newAppointment, meetingType: e.target.value as any })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Virtual">Virtual (Google Meet)</option>
                      <option value="In-Person">In-Person Visit</option>
                      <option value="Call">Phone Call</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newAppointment.meetingDate}
                      onChange={(e) =>
                        setNewAppointment({ ...newAppointment, meetingDate: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meeting Agenda *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Property Walkthrough & Pricing"
                    value={newAppointment.agenda}
                    onChange={(e) =>
                      setNewAppointment({ ...newAppointment, agenda: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsScheduleOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 1. CLIENT CONFIRMATION MODAL */}
      <ClientConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedAppointmentForConfirm(null);
        }}
        appointment={selectedAppointmentForConfirm}
        onSuccess={() => {
          fetchAppointments();
        }}
      />

      {/* 2. LEAD 360 DEGREE TIMELINE MODAL */}
      <Lead360Modal
        isOpen={is360ModalOpen}
        onClose={() => {
          setIs360ModalOpen(false);
          setSelectedLeadIdFor360(null);
        }}
        leadId={selectedLeadIdFor360}
      />

      {/* 3. QUOTATION MODAL */}
      <QuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => {
          setIsQuotationModalOpen(false);
          setSelectedAppointmentForQuotation(null);
        }}
        appointment={selectedAppointmentForQuotation}
        onSuccess={() => {
          fetchAppointments();
        }}
      />

      {/* 4. INVOICE MODAL */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedAppointmentForInvoice(null);
        }}
        appointment={selectedAppointmentForInvoice}
        onSuccess={() => {
          fetchAppointments();
        }}
      />

      {/* 5. EDIT APPOINTMENT MODAL */}
      <EditAppointmentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAppointmentForEdit(null);
        }}
        appointment={selectedAppointmentForEdit}
        onSuccess={() => {
          fetchAppointments();
        }}
      />
    </div>
  );
}
