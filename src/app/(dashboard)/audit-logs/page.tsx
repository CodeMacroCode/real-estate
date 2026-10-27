'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  History,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  User as UserIcon,
  Globe,
} from 'lucide-react';
import { IAuditLog, AuditAction } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { LoadingOverlay } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');

  // Diff Modal
  const [selectedLog, setSelectedLog] = useState<IAuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity', entityFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve audit trail');
      }

      setLogs(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error querying audit database');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleOpenDetail = (log: IAuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'create':
        return <Badge variant="success">Create</Badge>;
      case 'update':
        return <Badge variant="info">Update</Badge>;
      case 'delete':
        return <Badge variant="danger">Delete</Badge>;
      case 'login':
        return <Badge variant="purple">Login</Badge>;
      case 'logout':
        return <Badge variant="default">Logout</Badge>;
      case 'status_change':
        return <Badge variant="warning">Status Change</Badge>;
      case 'publish':
        return <Badge variant="success">Publish</Badge>;
      default:
        return <Badge variant="default">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Security & Compliance Audit Trail
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Section 58 Specification: Immutable audit records capturing actor, action, entity, entity ID, old/new values, IP address, and timestamp.
        </p>
      </div>

      {error && <Alert type="error" title="Error" message={error} onClose={() => setError(null)} />}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Filter by Action
          </label>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="status_change">Status Change</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="publish">Publish</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Filter by Entity Type
          </label>
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Entities</option>
            <option value="user">User</option>
            <option value="role">Role</option>
            <option value="session">Session</option>
            <option value="property">Property</option>
            <option value="lead">Lead</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingOverlay message="Querying audit records..." />
        ) : logs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Audit Records Found"
              description="No audit events matched your filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Timestamp</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Actor</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Action</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Entity & ID</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Source</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/75 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{log.actor.name}</div>
                      <div className="text-xs text-slate-500">{log.actor.email}</div>
                      <div className="text-[11px] font-mono text-purple-600">{log.actor.roleSlug}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-slate-800 uppercase">
                        {log.entity}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                        {log.entityId}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(log)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Payload</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold">{logs.length}</span> of{' '}
            <span className="font-semibold">{totalCount}</span> total audit events
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Audit Event Details"
        description={`Event ID: ${selectedLog?._id} | Entity: ${selectedLog?.entity}:${selectedLog?.entityId}`}
        maxWidth="2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 font-sans block text-[10px] uppercase font-semibold">Actor</span>
                <span className="text-slate-800 font-semibold">{selectedLog.actor.name} ({selectedLog.actor.roleSlug})</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block text-[10px] uppercase font-semibold">Timestamp</span>
                <span className="text-slate-800">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
            </div>

            {selectedLog.oldValues && (
              <div>
                <div className="font-sans font-semibold text-slate-700 uppercase text-[11px] mb-1">
                  Previous Values (Pre-mutation)
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.oldValues, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValues && (
              <div>
                <div className="font-sans font-semibold text-slate-700 uppercase text-[11px] mb-1">
                  Mutated Values (Post-mutation)
                </div>
                <pre className="bg-slate-900 text-emerald-300 p-3 rounded-lg overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.newValues, null, 2)}
                </pre>
              </div>
            )}

            {!selectedLog.oldValues && !selectedLog.newValues && (
              <p className="text-slate-500 italic font-sans">No additional payload recorded for this event.</p>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="font-sans rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
