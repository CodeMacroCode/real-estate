import React from 'react';
import {
  FileText,
  UserCheck,
  Edit3,
  Link2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { FormField } from '@/models/CustomForm';

export interface FormTemplate {
  _id: string;
  name: string;
  description?: string;
  fields: FormField[];
  version: number;
  isActive: boolean;
  createdAt: string;
}

interface FormCardProps {
  form: FormTemplate;
  assignedCount?: number;
  onEdit: (form: FormTemplate) => void;
  onAssign: (form: FormTemplate) => void;
  onDelete: (form: FormTemplate) => void;
}

export function FormCard({
  form,
  assignedCount = 0,
  onEdit,
  onAssign,
  onDelete,
}: FormCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-purple-600" />
            v{form.version}
          </span>
          <span suppressHydrationWarning className="text-xs text-slate-400">
            {new Date(form.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <h3 className="mt-3 text-base font-bold text-slate-900">{form.name}</h3>
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
          {form.description || 'No internal description specified.'}
        </p>

        {/* Card Body (Field Pills) */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2.5">
            <span>Configured Fields</span>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {form.fields.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {form.fields.map((f) => {
              const isIdentityMapped = f.mapping !== 'none';
              return (
                <span
                  key={f.id}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${
                    isIdentityMapped
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                  title={
                    isIdentityMapped
                      ? `Mapped to ${f.mapping} (Permanent Lead Profile)`
                      : 'Raw Dynamic Attribute'
                  }
                >
                  {isIdentityMapped && <UserCheck className="w-3 h-3 text-emerald-600" />}
                  <span>{f.label}</span>
                  <span className="text-[9px] text-slate-400 uppercase">[{f.type}]</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs">
          {assignedCount > 0 ? (
            <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
              Assigned ({assignedCount} Admins)
            </span>
          ) : (
            <span className="text-slate-400 italic">Unassigned</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(form)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Edit Schema"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAssign(form)}
            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
            title="Assign to Admin"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(form)}
            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Delete Schema"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

