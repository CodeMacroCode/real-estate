'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  PhoneCall,
  MessageCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  Copy,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { SafeUser } from '@/types';
import Lead360Modal from '@/components/Lead360Modal';
import ClientQuickMessageModal from './ClientQuickMessageModal';
import ClientFormModal from './ClientFormModal';
import { toast } from 'sonner';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface ClientItem {
  _id: string;
  clientName: string;
  phone: string;
  email?: string;
  address?: string;
  companyName?: string;
  totalDealsWon: number;
  totalRevenue?: number;
  lastAgreedDeliveryDate?: string;
  status: 'Active' | 'Inactive' | 'VIP';
  notes?: string;
  adminId?: { name: string; email: string; designation?: string };
  leadId?: { _id: string; leadTitle: string; source: string };
  createdById?: { name: string; email: string };
  createdAt: string;
}

export default function ClientsPage() {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [roleSlug, setRoleSlug] = useState<string>('');
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 1. 360 Degree View Modal
  const [selectedLeadIdFor360, setSelectedLeadIdFor360] = useState<string | null>(null);
  const [is360Open, setIs360Open] = useState(false);

  // 2. Quick Messaging Dialog (WhatsApp / SMS / Email)
  const [selectedClientForMsg, setSelectedClientForMsg] = useState<ClientItem | null>(null);
  const [msgChannel, setMsgChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);

  // 3. Client Add / Edit Form Modal
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<ClientItem | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

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

  // Fetch Clients
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/clients?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setClients(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalCount(json.pagination?.total || 0);
      } else {
        setError(json.error || 'Failed to fetch clients');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClients();
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete client profile for ${name}?`)) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Client profile deleted');
        fetchClients();
      } else {
        toast.error('Failed to delete client');
      }
    } catch {
      toast.error('Error deleting client');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (clients.length === 0) {
      toast.error('No clients to export');
      return;
    }

    const headers = [
      'Client Name',
      'Phone',
      'Email',
      'Company Name',
      'Address',
      'Deals Won',
      'Total Revenue',
      'Status',
      'Registration Date',
    ];

    const rows = clients.map((c) => [
      `"${c.clientName || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.companyName || ''}"`,
      `"${c.address || ''}"`,
      c.totalDealsWon || 1,
      c.totalRevenue || 0,
      c.status,
      new Date(c.createdAt).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crm-client-directory-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported CRM Directory CSV!');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600" />
            <span>Client Information (CRM Directory)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Permanent accounts of graduated clients with won deals, contracts, and lifetime value tracking.
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
            onClick={() => fetchClients()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setSelectedClientForEdit(null);
              setFormMode('create');
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Verified Clients</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Graduated from successful deal meetings</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Active Engagements</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Award className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {clients.filter((c) => c.status === 'Active' || c.status === 'VIP').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active agreements & handovers pending</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tracked Deal Volume</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            ₹
            {clients
              .reduce((sum, c) => sum + (c.totalRevenue || 0), 0)
              .toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cumulative quotation revenue recorded</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients by name, phone, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="VIP">VIP</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="w-8 h-8 text-blue-600" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No client profiles yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              When an appointment is confirmed with outcome <strong>YES (Deal Won)</strong>, the prospect is automatically graduated into this permanent directory.
            </p>
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Client Profile</TableHead>
                  <TableHead className="w-[260px]">Contact &amp; In-Cell Outreach</TableHead>
                  <TableHead className="w-[160px]">Deals / Revenue</TableHead>
                  <TableHead className="w-[160px]">Handover Date</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right">Row Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell>
                      <div className="font-bold text-slate-900">{c.clientName}</div>
                      {c.companyName && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{c.companyName}</span>
                        </div>
                      )}
                      {c.leadId?.leadTitle && (
                        <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                          Origin: {c.leadId.leadTitle} ({c.leadId.source})
                        </div>
                      )}
                    </TableCell>

                    {/* Contact & In-Cell Quick Outreach */}
                    <TableCell>
                      {/* Phone with WhatsApp and Copy */}
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone}</span>
                        <a
                          href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="1-Click WhatsApp Trigger"
                        >
                          <MessageCircle className="size-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.phone, 'phone number')}
                          className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                          title="Copy phone"
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>

                      {/* Email with 1-Click Gmail and Copy */}
                      {c.email && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                          <a
                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(c.email)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                            title="1-Click Gmail Compose"
                          >
                            <Mail className="size-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(c.email!, 'email address')}
                            className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                            title="Copy email"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                      )}

                      {c.address && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate max-w-[180px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-bold text-slate-900">
                        {c.totalDealsWon} Deal{c.totalDealsWon > 1 ? 's' : ''} Won
                      </div>
                      {c.totalRevenue ? (
                        <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                          ₹{c.totalRevenue.toLocaleString()}
                        </div>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      {c.lastAgreedDeliveryDate ? (
                        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-emerald-600" />
                          <span>
                            {new Date(c.lastAgreedDeliveryDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Handover Complete</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.status === 'VIP'
                            ? 'bg-purple-100 text-purple-800'
                            : c.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.status}
                      </span>
                    </TableCell>

                    {/* ROW ACTIONS (MessageSquare, Mail, EyeIcon, Pencil, Trash2) */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* 1. Quick Messaging Dialog (<MessageSquare />) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientForMsg(c);
                            setMsgChannel('whatsapp');
                            setIsMsgModalOpen(true);
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                          title="Quick WhatsApp / SMS Template Dialog"
                        >
                          <MessageSquare className="size-4" />
                        </button>

                        {/* 2. Quick Email Outreach (<Mail />) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientForMsg(c);
                            setMsgChannel('email');
                            setIsMsgModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="Quick In-App Email Outreach"
                        >
                          <Mail className="size-4" />
                        </button>

                        {/* 3. View Client Leads Dossier / 360 (<Eye />) */}
                        {c.leadId?._id && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeadIdFor360(c.leadId!._id);
                              setIs360Open(true);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition"
                            title="View Client 360° Dossier & History"
                          >
                            <Eye className="size-4" />
                          </button>
                        )}

                        {/* 4. Edit Client Profile (<Pencil />) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientForEdit(c);
                            setFormMode('edit');
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="Edit Client Master Profile"
                        >
                          <Pencil className="size-4" />
                        </button>

                        {/* 5. Delete Client Profile (<Trash2 />) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteClient(c._id, c.clientName)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition"
                          title="Delete Client Profile"
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

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {clients.length} of {totalCount} clients
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

      {/* 1. LEAD 360 DEGREE MODAL */}
      <Lead360Modal
        isOpen={is360Open}
        onClose={() => {
          setIs360Open(false);
          setSelectedLeadIdFor360(null);
        }}
        leadId={selectedLeadIdFor360}
      />

      {/* 2. QUICK MESSAGING MODAL */}
      <ClientQuickMessageModal
        isOpen={isMsgModalOpen}
        onClose={() => {
          setIsMsgModalOpen(false);
          setSelectedClientForMsg(null);
        }}
        channel={msgChannel}
        client={selectedClientForMsg}
      />

      {/* 3. CLIENT FORM MODAL */}
      <ClientFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedClientForEdit(null);
        }}
        mode={formMode}
        client={selectedClientForEdit}
        onSuccess={() => {
          fetchClients();
        }}
      />
    </div>
  );
}
