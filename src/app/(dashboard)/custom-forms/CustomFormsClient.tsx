'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Layers,
  Building2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { FormCard, FormTemplate } from './frombuild';
import { FormBuilderDialog } from './form-builder-dialog';
import { AdminAssignmentDialog } from './admin-assignment-dialog';
import { AdminAssignmentsTab, FormAssignmentRow } from './admin-assignments-tab';
import { AdminImpactDialog } from './admin-impact-dialog';

interface CustomFormsClientProps {
  initialForms?: FormTemplate[];
  initialAssignments?: FormAssignmentRow[];
}

export function CustomFormsClient({
  initialForms = [],
  initialAssignments = [],
}: CustomFormsClientProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'assignments'>('library');
  const [forms, setForms] = useState<FormTemplate[]>(initialForms);
  const [assignments, setAssignments] = useState<FormAssignmentRow[]>(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedFormToEdit, setSelectedFormToEdit] = useState<FormTemplate | null>(null);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedFormToAssign, setSelectedFormToAssign] = useState<FormTemplate | null>(null);

  const [isImpactOpen, setIsImpactOpen] = useState(false);
  const [impactData, setImpactData] = useState<{
    adminId: string;
    adminName: string;
    formName: string;
    totalLeads: number;
    dynamicFormLeads: number;
    publicSlug?: string;
  } | null>(null);

  const fetchFormsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/custom-forms');
      const json = await res.json();
      if (json.success && json.data) {
        setForms(json.data.forms || []);
        setAssignments(json.data.assignments || []);
      } else {
        setError(json.error || 'Failed to fetch custom forms data');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteForm = async (form: FormTemplate) => {
    if (!confirm(`Are you sure you want to delete "${form.name}"?`)) return;

    try {
      const res = await fetch(`/api/custom-forms/${form._id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchFormsData();
      } else {
        alert(json.error || 'Failed to delete form');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting form');
    }
  };

  const handleOpenImpact = async (
    adminId: string,
    adminName: string,
    formName: string,
    publicSlug: string
  ) => {
    try {
      const res = await fetch(`/api/custom-forms/admin-impact/${adminId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setImpactData({
          adminId,
          adminName,
          formName,
          totalLeads: json.data.impact?.totalLeads || 0,
          dynamicFormLeads: json.data.impact?.dynamicFormLeads || 0,
          publicSlug,
        });
        setIsImpactOpen(true);
      } else {
        alert(json.error || 'Failed to query impact data');
      }
    } catch (err: any) {
      alert(err.message || 'Error communicating with server');
    }
  };

  // Filtered forms in library
  const filteredForms = useMemo(() => {
    if (!search.trim()) return forms;
    const q = search.toLowerCase();
    return forms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
    );
  }, [forms, search]);

  // Metric counters
  const totalTemplates = forms.length;
  const activeForms = forms.filter((f) => f.isActive).length;
  const assignedFormIds = new Set(assignments.map((a) => a.formId?._id));
  const unassignedForms = forms.filter((f) => !assignedFormIds.has(f._id)).length;

  return (
    <div className="space-y-6">
      {/* Top Tab Switcher & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeTab === 'library'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Form Library</span>
            <span className="text-xs bg-slate-100 px-1.5 py-0.2 rounded font-normal text-slate-500">
              {totalTemplates}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeTab === 'assignments'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>Admin Assignments</span>
            <span className="text-xs bg-slate-100 px-1.5 py-0.2 rounded font-normal text-slate-500">
              {assignments.length}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Counters */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-slate-400">Total: </span>
              <span className="font-bold text-slate-900">{totalTemplates}</span>
            </div>
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-slate-400">Active: </span>
              <span className="font-bold text-emerald-700">{activeForms}</span>
            </div>
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-slate-400">Unassigned: </span>
              <span className="font-bold text-amber-700">{unassignedForms}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchFormsData()}
              className="flex h-9 items-center gap-1.5 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
              title="Refresh forms"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedFormToEdit(null);
                setIsBuilderOpen(true);
              }}
              className="flex h-9 items-center gap-1.5 px-3.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Form</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" className="text-purple-600" />
          <span className="text-sm text-slate-500">Querying form schemas and deployments...</span>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : activeTab === 'library' ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="max-w-md relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search forms by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          {/* Grid Display */}
          {filteredForms.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Form Templates Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                Click &quot;Create New Form&quot; to design dynamic lead capture templates.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredForms.map((form) => {
                const assignedCount = assignments.filter((a) => a.formId?._id === form._id).length;
                return (
                  <FormCard
                    key={form._id}
                    form={form}
                    assignedCount={assignedCount}
                    onEdit={(f) => {
                      setSelectedFormToEdit(f);
                      setIsBuilderOpen(true);
                    }}
                    onAssign={(f) => {
                      setSelectedFormToAssign(f);
                      setIsAssignOpen(true);
                    }}
                    onDelete={handleDeleteForm}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Admin Assignments Tab */
        <AdminAssignmentsTab
          assignments={assignments}
          onOpenAssignDialog={() => {
            setSelectedFormToAssign(null);
            setIsAssignOpen(true);
          }}
          onOpenImpactDialog={handleOpenImpact}
        />
      )}

      {/* DIALOG 1: FORM BUILDER DIALOG */}
      <FormBuilderDialog
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setSelectedFormToEdit(null);
        }}
        onSaved={fetchFormsData}
        initialForm={selectedFormToEdit}
      />

      {/* DIALOG 2: ADMIN ASSIGNMENT DIALOG */}
      <AdminAssignmentDialog
        isOpen={isAssignOpen}
        onClose={() => {
          setIsAssignOpen(false);
          setSelectedFormToAssign(null);
        }}
        onAssigned={fetchFormsData}
        selectedForm={selectedFormToAssign}
        forms={forms}
      />

      {/* DIALOG 3: ADMIN IMPACT SAFETY DIALOG */}
      <AdminImpactDialog
        isOpen={isImpactOpen}
        onClose={() => {
          setIsImpactOpen(false);
          setImpactData(null);
        }}
        onConfirmed={fetchFormsData}
        adminData={impactData}
      />
    </div>
  );
}
