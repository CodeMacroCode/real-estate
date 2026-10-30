'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  Search,
  Plus,
  RefreshCw,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  XCircle,
  HelpCircle,
  Phone,
  Mail,
  Copy,
  MessageSquare,
  FilePlus,
  Receipt,
  History,
  Pencil,
  Trash2,
  Download,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/SearchableSelect';
import Lead360Modal from '@/components/Lead360Modal';
import { toast } from 'sonner';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface ClientConfirmationItem {
  _id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  deliveryOrSiteAddress?: string;
  clientConfirmation: 'YES' | 'NO' | 'MAYBE';
  clientFeedback?: string;
  agreedDeliveryDate?: string;
  followUpDate?: string;
  rejectionReason?: string;
  quotationAmount?: number;
  quotationNumber?: string;
  invoiceUrl?: string;
  appointmentId?: { _id: string; agenda: string; meetingDate: string; quotationTitle?: string; quotationUrl?: string };
  leadId?: { _id: string; leadTitle: string };
  createdAt: string;
}

export default function ClientConfirmationsPage() {
  const [confirmations, setConfirmations] = useState<ClientConfirmationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentOptions, setAppointmentOptions] = useState<SearchableSelectOption[]>([]);

  // 360 Degree Timeline Modal
  const [selectedLeadIdFor360, setSelectedLeadIdFor360] = useState<string | null>(null);
  const [is360Open, setIs360Open] = useState(false);

  // Edit Confirmation Modal
  const [editingItem, setEditingItem] = useState<ClientConfirmationItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Log Form State
  const [formData, setFormData] = useState({
    appointmentId: '',
    clientConfirmation: 'YES' as 'YES' | 'NO' | 'MAYBE',
    clientFeedback: '',
    agreedDeliveryDate: '',
    followUpDate: '',
    rejectionReason: '',
    quotationAmount: '',
    quotationNumber: '',
    deliveryOrSiteAddress: '',
  });

  const fetchConfirmations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client-confirmations');
      const json = await res.json();
      if (json.success) {
        setConfirmations(json.data || []);
      } else {
        setError(json.error || 'Failed to load client confirmations');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAppointments = useCallback(async (query: string = '') => {
    try {
      const res = await fetch(`/api/appointments?status=Scheduled&search=${encodeURIComponent(query)}&limit=30`);
      const json = await res.json();
      if (json.success && json.data) {
        setAppointmentOptions(
          json.data.map((apt: any) => ({
            value: apt._id,
            label: `${apt.clientName} - ${new Date(apt.meetingDate).toLocaleDateString()}`,
            subLabel: `${apt.agenda} • ${apt.clientPhone}`,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load appointments', err);
    }
  }, []);

  useEffect(() => {
    fetchConfirmations();
  }, [fetchConfirmations]);

  useEffect(() => {
    if (isOpen) {
      fetchAppointments();
    }
  }, [isOpen, fetchAppointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.appointmentId) {
      toast.error('Please select an appointment');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/client-confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to record outcome');

      toast.success('Client decision logged successfully!');
      setIsOpen(false);
      setFormData({
        appointmentId: '',
        clientConfirmation: 'YES',
        clientFeedback: '',
        agreedDeliveryDate: '',
        followUpDate: '',
        rejectionReason: '',
        quotationAmount: '',
        quotationNumber: '',
        deliveryOrSiteAddress: '',
      });
      fetchConfirmations();
    } catch (err: any) {
      toast.error(err.message || 'Error saving confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirmation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete confirmation record for ${name}?`)) return;
    try {
      const res = await fetch(`/api/client-confirmations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Confirmation deleted');
        fetchConfirmations();
      } else {
        toast.error('Failed to delete confirmation');
      }
    } catch {
      toast.error('Error deleting record');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await fetch(`/api/client-confirmations/${editingItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientFeedback: editingItem.clientFeedback,
          agreedDeliveryDate: editingItem.agreedDeliveryDate,
          deliveryOrSiteAddress: editingItem.deliveryOrSiteAddress,
          quotationAmount: editingItem.quotationAmount,
          quotationNumber: editingItem.quotationNumber,
          rejectionReason: editingItem.rejectionReason,
        }),
      });

      if (!res.ok) throw new Error('Failed to update confirmation');
      toast.success('Updated confirmation details!');
      setIsEditOpen(false);
      setEditingItem(null);
      fetchConfirmations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (confirmations.length === 0) {
      toast.error('No confirmations to export');
      return;
    }

    const headers = [
      'Client Name',
      'Client Phone',
      'Client Email',
      'Outcome',
      'Quotation Amount',
      'Quotation Number',
      'Agreed Handover Date',
      'Follow-Up Date',
      'Feedback / Notes',
      'Date Logged',
    ];

    const rows = confirmations.map((c) => [
      `"${c.clientName || ''}"`,
      `"${c.clientPhone || ''}"`,
      `"${c.clientEmail || ''}"`,
      c.clientConfirmation,
      c.quotationAmount || 0,
      `"${c.quotationNumber || ''}"`,
      c.agreedDeliveryDate ? new Date(c.agreedDeliveryDate).toLocaleDateString() : '',
      c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : '',
      `"${(c.clientFeedback || c.rejectionReason || '').replace(/"/g, '""')}"`,
      new Date(c.createdAt).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `client-confirmations-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported Confirmations CSV!');
  };

  const filteredConfirmations = useMemo(() => {
    return confirmations.filter((item) => {
      const matchesOutcome = !outcomeFilter || item.clientConfirmation === outcomeFilter;
      const matchesSearch =
        !search ||
        item.clientName.toLowerCase().includes(search.toLowerCase()) ||
        item.clientPhone.includes(search) ||
        (item.clientEmail && item.clientEmail.toLowerCase().includes(search.toLowerCase()));
      return matchesOutcome && matchesSearch;
    });
  }, [confirmations, outcomeFilter, search]);

  const getOutcomeBadge = (outcome: 'YES' | 'NO' | 'MAYBE') => {
    switch (outcome) {
      case 'YES':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>YES (Deal Won)</span>
          </span>
        );
      case 'MAYBE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>MAYBE (Follow-up)</span>
          </span>
        );
      case 'NO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>NO (Closed Lost)</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
            <span>Client Confirmation Hub</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Post-meeting outcome gate: finalize won deals, trigger follow-ups, bind proposals, and graduate clients.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => fetchConfirmations()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Log Outcome</span>
          </button>
        </div>
      </div>

      {/* Outcome Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setOutcomeFilter('')}
          className={`p-3 rounded-xl border text-left transition ${
            outcomeFilter === ''
              ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Decisions</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{confirmations.length}</div>
        </button>

        <button
          type="button"
          onClick={() => setOutcomeFilter('YES')}
          className={`p-3 rounded-xl border text-left transition ${
            outcomeFilter === 'YES'
              ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase">Deals Won (YES)</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {confirmations.filter((c) => c.clientConfirmation === 'YES').length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setOutcomeFilter('MAYBE')}
          className={`p-3 rounded-xl border text-left transition ${
            outcomeFilter === 'MAYBE'
              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase">Follow-Up (MAYBE)</div>
          <div className="text-xl font-bold text-amber-600 mt-1">
            {confirmations.filter((c) => c.clientConfirmation === 'MAYBE').length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setOutcomeFilter('NO')}
          className={`p-3 rounded-xl border text-left transition ${
            outcomeFilter === 'NO'
              ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase">Closed Lost (NO)</div>
          <div className="text-xl font-bold text-rose-600 mt-1">
            {confirmations.filter((c) => c.clientConfirmation === 'NO').length}
          </div>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search confirmations by client name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
        />
      </div>

      {/* CONFIRMATION TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="w-8 h-8 text-emerald-600" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : filteredConfirmations.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Confirmations Recorded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Complete a client meeting and record an outcome (YES, NO, or MAYBE) to view records here.
            </p>
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Client &amp; Contact</TableHead>
                  <TableHead className="w-[140px]">Outcome</TableHead>
                  <TableHead className="w-[180px]">Quote / Deal Value</TableHead>
                  <TableHead className="w-[180px]">Next Step / Handover</TableHead>
                  <TableHead className="w-[200px]">Notes</TableHead>
                  <TableHead className="text-right">Row Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfirmations.map((item) => (
                  <TableRow key={item._id}>
                    {/* Client & In-cell Outreach */}
                    <TableCell>
                      <div className="font-bold text-slate-900">{item.clientName}</div>
                      {/* Phone with WhatsApp and Copy */}
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.clientPhone}</span>
                        <a
                          href={`https://wa.me/${item.clientPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="WhatsApp direct ping"
                        >
                          <MessageSquare className="size-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.clientPhone, 'phone number')}
                          className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                          title="Copy phone"
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>
                      {/* Email with 1-Click Gmail and Copy */}
                      {item.clientEmail && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{item.clientEmail}</span>
                          <a
                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(item.clientEmail)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                            title="Compose in Gmail"
                          >
                            <Mail className="size-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.clientEmail!, 'email address')}
                            className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                            title="Copy email"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                      )}
                    </TableCell>

                    {/* Outcome */}
                    <TableCell>{getOutcomeBadge(item.clientConfirmation)}</TableCell>

                    {/* Commercials / Quote */}
                    <TableCell>
                      {item.quotationAmount ? (
                        <div className="text-xs font-bold text-slate-900">
                          ₹{item.quotationAmount.toLocaleString()}
                          {item.quotationNumber && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              Ref #{item.quotationNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No quotation</span>
                      )}
                    </TableCell>

                    {/* Next step / Handover */}
                    <TableCell>
                      {item.clientConfirmation === 'YES' && item.agreedDeliveryDate && (
                        <div className="text-xs text-emerald-800 font-semibold">
                          Handover: {new Date(item.agreedDeliveryDate).toLocaleDateString()}
                        </div>
                      )}
                      {item.clientConfirmation === 'MAYBE' && item.followUpDate && (
                        <div className="text-xs text-amber-800 font-semibold">
                          Follow-up: {new Date(item.followUpDate).toLocaleDateString()}
                        </div>
                      )}
                      {item.clientConfirmation === 'NO' && item.rejectionReason && (
                        <div className="text-xs text-rose-700 italic">
                          Lost: {item.rejectionReason}
                        </div>
                      )}
                    </TableCell>

                    {/* Notes */}
                    <TableCell>
                      <span className="text-xs text-slate-600 line-clamp-2">
                        {item.clientFeedback || 'No feedback logged.'}
                      </span>
                    </TableCell>

                    {/* ROW ACTIONS (Quotation, Invoice, 360, Edit, Delete) */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* 1. Lead 360 Activity Timeline (<History />) */}
                        {item.leadId?._id && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeadIdFor360(item.leadId!._id);
                              setIs360Open(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                            title="Open Lead 360° Activity Timeline"
                          >
                            <History className="size-4" />
                          </button>
                        )}

                        {/* 2. Invoice Link (Strictly when YES and invoice exists) */}
                        {item.clientConfirmation === 'YES' && item.invoiceUrl && (
                          <a
                            href={item.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md transition"
                            title="View Attached Invoice PDF"
                          >
                            <Receipt className="size-4" />
                          </a>
                        )}

                        {/* 3. Edit Confirmation (<Pencil />) */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem({ ...item });
                            setIsEditOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="Edit Confirmation Details"
                        >
                          <Pencil className="size-4" />
                        </button>

                        {/* 4. Delete Confirmation (<Trash2 />) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteConfirmation(item._id, item.clientName)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition"
                          title="Delete Confirmation Record"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* RECORD OUTCOME MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Log Meeting Outcome</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Completed Meeting *
                </label>
                <SearchableSelect
                  placeholder="Search meeting..."
                  options={appointmentOptions}
                  value={formData.appointmentId}
                  onChange={(val) => setFormData({ ...formData, appointmentId: val })}
                  onSearchChange={fetchAppointments}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client Confirmation Outcome *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, clientConfirmation: 'YES' })}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.clientConfirmation === 'YES'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>YES (Deal Won)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, clientConfirmation: 'MAYBE' })}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.clientConfirmation === 'MAYBE'
                        ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>MAYBE (Follow-up)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, clientConfirmation: 'NO' })}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.clientConfirmation === 'NO'
                        ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>NO (Lost)</span>
                  </button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {formData.clientConfirmation === 'YES' && (
                <div className="space-y-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quotation / Deal Amount (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 8500000"
                        value={formData.quotationAmount}
                        onChange={(e) =>
                          setFormData({ ...formData, quotationAmount: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quotation Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. QT-2026-09"
                        value={formData.quotationNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, quotationNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Agreed Delivery / Registration Date
                    </label>
                    <input
                      type="date"
                      value={formData.agreedDeliveryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, agreedDeliveryDate: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {formData.clientConfirmation === 'MAYBE' && (
                <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Schedule Follow-Up Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.followUpDate}
                      onChange={(e) =>
                        setFormData({ ...formData, followUpDate: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              {formData.clientConfirmation === 'NO' && (
                <div className="space-y-3 bg-rose-50/50 p-3.5 rounded-xl border border-rose-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rejection Reason *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Price too high, chosen competitor"
                      value={formData.rejectionReason}
                      onChange={(e) =>
                        setFormData({ ...formData, rejectionReason: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client Feedback / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional client conversation notes..."
                  value={formData.clientFeedback}
                  onChange={(e) =>
                    setFormData({ ...formData, clientFeedback: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Record Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONFIRMATION MODAL */}
      {isEditOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Edit Confirmation Details</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quotation Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={editingItem.quotationAmount || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, quotationAmount: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quotation Ref Number
                  </label>
                  <input
                    type="text"
                    value={editingItem.quotationNumber || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, quotationNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agreed Handover Date
                </label>
                <input
                  type="date"
                  value={editingItem.agreedDeliveryDate ? new Date(editingItem.agreedDeliveryDate).toISOString().slice(0, 10) : ''}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, agreedDeliveryDate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client Feedback Notes
                </label>
                <textarea
                  rows={3}
                  value={editingItem.clientFeedback || ''}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, clientFeedback: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD 360 MODAL */}
      <Lead360Modal
        isOpen={is360Open}
        onClose={() => {
          setIs360Open(false);
          setSelectedLeadIdFor360(null);
        }}
        leadId={selectedLeadIdFor360}
      />
    </div>
  );
}
