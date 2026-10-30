'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  Sliders,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FormField, FieldType, ClientFieldMapping } from '@/models/CustomForm';
import { FormTemplate } from './frombuild';

interface FormBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialForm?: FormTemplate | null;
}

// Preset templates
const PRESETS = [
  {
    name: 'Real Estate Inquiry',
    desc: 'Capture property interest, budget, and contact info',
    fields: [
      { id: 'f_name', label: 'Full Name', type: 'text' as const, required: true, mapping: 'client_name' as const, placeholder: 'e.g. Rahul Sharma', order: 1 },
      { id: 'f_phone', label: 'Primary Phone', type: 'phone' as const, required: true, mapping: 'client_phone' as const, placeholder: '+91 98765 43210', order: 2 },
      { id: 'f_email', label: 'Email Address', type: 'email' as const, required: false, mapping: 'client_email' as const, placeholder: 'name@example.com', order: 3 },
      { id: 'f_prop', label: 'Interested Property / Project', type: 'text' as const, required: true, mapping: 'none' as const, placeholder: 'e.g. Prestige Greenwoods 3BHK', order: 4 },
      { id: 'f_budget', label: 'Target Budget', type: 'select' as const, required: true, mapping: 'none' as const, options: ['₹50L - ₹75L', '₹75L - ₹1.2Cr', '₹1.2Cr - ₹2.5Cr', '₹2.5Cr+'], order: 5 },
      { id: 'f_notes', label: 'Specific Requirements', type: 'textarea' as const, required: false, mapping: 'none' as const, placeholder: 'Preferred floor, vaastu compliance...', order: 6 },
    ],
  },
  {
    name: 'Generic B2B Investor Lead',
    desc: 'For commercial spaces and bulk investors',
    fields: [
      { id: 'f_org', label: 'Organization / Company Name', type: 'text' as const, required: true, mapping: 'client_name' as const, placeholder: 'Acme Corp', order: 1 },
      { id: 'f_phone', label: 'Phone Number', type: 'phone' as const, required: true, mapping: 'client_phone' as const, placeholder: '+91...', order: 2 },
      { id: 'f_email', label: 'Business Email', type: 'email' as const, required: true, mapping: 'client_email' as const, placeholder: 'contact@acme.com', order: 3 },
      { id: 'f_inv', label: 'Investment Horizon', type: 'select' as const, required: true, mapping: 'none' as const, options: ['Immediate (30 Days)', 'Q1 2027', 'Long-term REIT'], order: 4 },
    ],
  },
];

function SortableFieldRow({
  field,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  field: FormField;
  index: number;
  total: number;
  onUpdate: (key: keyof FormField, val: any) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [optionsText, setOptionsText] = useState((field.options || []).join(', '));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-slate-400 hover:text-slate-600 p-1"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex flex-col">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove('up')}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-20 p-0.5"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove('down')}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-20 p-0.5"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          {/* Label */}
          <div className="md:col-span-4">
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdate('label', e.target.value)}
              placeholder="Field Label"
              className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Type */}
          <div className="md:col-span-3">
            <select
              value={field.type}
              onChange={(e) => onUpdate('type', e.target.value as FieldType)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="text">Single Line Text</option>
              <option value="textarea">Multi-line Text</option>
              <option value="number">Numeric Value</option>
              <option value="email">Email Address</option>
              <option value="phone">Phone Number</option>
              <option value="date">Date Picker</option>
              <option value="select">Dropdown Select</option>
              <option value="checkbox">Checkbox (Boolean)</option>
              <option value="file">File Upload</option>
            </select>
          </div>

          {/* Semantic Mapping */}
          <div className="md:col-span-3">
            <select
              value={field.mapping}
              onChange={(e) => onUpdate('mapping', e.target.value as ClientFieldMapping)}
              className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none focus:ring-1 ${
                field.mapping !== 'none'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <option value="none">None (Custom Field)</option>
              <option value="client_name">Client / Org Name (Required)</option>
              <option value="client_phone">Primary Phone (Required)</option>
              <option value="client_email">Client Email</option>
              <option value="client_address">Address / Location</option>
            </select>
          </div>

          {/* Required Checkbox */}
          <div className="md:col-span-2 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onUpdate('required', e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span>Req</span>
            </label>

            <button
              type="button"
              onClick={onRemove}
              className="text-slate-400 hover:text-rose-600 p-1"
              title="Delete field"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Select options row */}
      {field.type === 'select' && (
        <div className="pl-9 pr-2">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Dropdown Choices (comma-separated):
          </label>
          <input
            type="text"
            value={optionsText}
            onChange={(e) => {
              setOptionsText(e.target.value);
              const opts = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              onUpdate('options', opts);
            }}
            placeholder="Option A, Option B, Option C"
            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
          />
        </div>
      )}
    </div>
  );
}

export function FormBuilderDialog({
  isOpen,
  onClose,
  onSaved,
  initialForm,
}: FormBuilderDialogProps) {
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (initialForm) {
      setFormName(initialForm.name);
      setFormDescription(initialForm.description || '');
      setFields(initialForm.fields || []);
    } else {
      // Default initial fields
      setFormName('');
      setFormDescription('');
      setFields([
        {
          id: `f_${Date.now()}_1`,
          label: 'Client Name',
          type: 'text',
          required: true,
          mapping: 'client_name',
          placeholder: 'Full Client / Org Name',
          order: 1,
        },
        {
          id: `f_${Date.now()}_2`,
          label: 'Primary Phone',
          type: 'phone',
          required: true,
          mapping: 'client_phone',
          placeholder: '+91 98765 43210',
          order: 2,
        },
        {
          id: `f_${Date.now()}_3`,
          label: 'Email Address',
          type: 'email',
          required: false,
          mapping: 'client_email',
          placeholder: 'client@example.com',
          order: 3,
        },
      ]);
    }
    setValidationError(null);
    setActiveTab('editor');
  }, [initialForm, isOpen]);

  // Prevent outer background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddField = (type: FieldType) => {
    const newField: FormField = {
      id: `fld_${Date.now().toString(36)}`,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      type,
      required: false,
      mapping: 'none',
      placeholder: '',
      order: fields.length + 1,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
    };
    setFields([...fields, newField]);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, idx) => ({ ...item, order: idx + 1 }));
      });
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const reordered = arrayMove(fields, index, targetIndex);
    setFields(reordered.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    setFormName(preset.name);
    setFormDescription(preset.desc);
    setFields(
      preset.fields.map((f, i) => ({
        ...f,
        id: `f_${Date.now()}_${i}`,
      }))
    );
  };

  const handleSave = async () => {
    setValidationError(null);

    if (!formName.trim()) {
      setValidationError('Form Name is required.');
      return;
    }

    if (fields.length === 0) {
      setValidationError('Please configure at least one field.');
      return;
    }

    const hasNameMapping = fields.some((f) => f.mapping === 'client_name');
    const hasPhoneMapping = fields.some((f) => f.mapping === 'client_phone');

    if (!hasNameMapping) {
      setValidationError(
        'Validation Guard: Form must contain at least 1 field mapped to Client / Org Name.'
      );
      return;
    }

    if (!hasPhoneMapping) {
      setValidationError(
        'Validation Guard: Form must contain at least 1 field mapped to Primary Phone.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = initialForm
        ? `/api/custom-forms/${initialForm._id}`
        : '/api/custom-forms';
      const method = initialForm ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim(),
          fields,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSaved();
        onClose();
      } else {
        setValidationError(json.error || 'Failed to save form schema');
      }
    } catch (err: any) {
      setValidationError(err.message || 'Error communicating with server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-4xl z-10 border border-slate-200 overflow-hidden flex flex-col h-[90vh]">
        {/* Top Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>
                  {initialForm ? `Edit Form Schema: ${initialForm.name}` : 'Form Schema Designer'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                SuperAdmin Platform Engine • 3-Tier Multi-Tenant Dynamic Form Generator
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Switcher */}
              <div className="flex items-center rounded-lg bg-slate-200/70 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                    activeTab === 'editor'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Field Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                    activeTab === 'preview'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-purple-600" />
                  <span>Live Preview</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

        {/* Form Meta Fields & Presets */}
        <div className="p-6 border-b border-slate-100 bg-white space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Form Title *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Luxury Apartment Pre-Launch Inquiries"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Description
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Short purpose description for SuperAdmin library"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">
              Quick Templates:
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium transition"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'editor' ? (
            <div className="space-y-4">
              {/* Quick Add Bar */}
              <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-2">
                  Add New Form Field Control
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddField('text')}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-100 text-slate-700 rounded-md border border-slate-200 shadow-sm"
                  >
                    + Text
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField('textarea')}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-100 text-slate-700 rounded-md border border-slate-200 shadow-sm"
                  >
                    + Textarea
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField('number')}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-100 text-slate-700 rounded-md border border-slate-200 shadow-sm"
                  >
                    + Number
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField('email')}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-100 text-slate-700 rounded-md border border-slate-200 shadow-sm"
                  >
                    + Email
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField('phone')}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-100 text-slate-700 rounded-md border border-slate-200 shadow-sm"
                  >
                    + Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField('date')}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-100 text-slate-700 rounded-md border border-slate-200 shadow-sm"
                  >
                    + Date
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField('select')}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-100 text-slate-700 rounded-md border border-slate-200 shadow-sm"
                  >
                    + Dropdown
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField('checkbox')}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-100 text-slate-700 rounded-md border border-slate-200 shadow-sm"
                  >
                    + Checkbox
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField('file')}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-purple-100 text-slate-700 rounded-md border border-slate-200 shadow-sm"
                  >
                    + File Upload
                  </button>
                </div>
              </div>

              {/* Sortable Field List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2.5">
                    {fields.map((field, idx) => (
                      <SortableFieldRow
                        key={field.id}
                        field={field}
                        index={idx}
                        total={fields.length}
                        onUpdate={(k, v) => {
                          const updated = [...fields];
                          updated[idx] = { ...updated[idx], [k]: v };
                          setFields(updated);
                        }}
                        onRemove={() => setFields(fields.filter((_, i) => i !== idx))}
                        onMove={(dir) => handleMove(idx, dir)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            /* Live Form Preview */
            <div className="max-w-xl mx-auto p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-5">
              <div className="text-center pb-3 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">{formName || 'Form Title'}</h3>
                {formDescription && (
                  <p className="text-xs text-slate-500 mt-1">{formDescription}</p>
                )}
              </div>

              <div className="space-y-3.5">
                {fields.map((f) => (
                  <div key={f.id}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {f.label} {f.required && <span className="text-rose-500">*</span>}
                    </label>

                    {f.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        placeholder={f.placeholder || f.label}
                        disabled
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white opacity-80"
                      />
                    ) : f.type === 'select' ? (
                      <select
                        disabled
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white opacity-80"
                      >
                        <option value="">Select option...</option>
                        {(f.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input type="checkbox" disabled />
                        <span>{f.placeholder || f.label}</span>
                      </label>
                    ) : (
                      <input
                        type={f.type === 'phone' ? 'tel' : f.type}
                        placeholder={f.placeholder || f.label}
                        disabled
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white opacity-80"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled
                className="w-full py-2.5 text-xs font-bold text-white bg-purple-600 rounded-lg shadow-sm opacity-90"
              >
                Submit Form (Preview)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="text-xs text-slate-500">
            {fields.length} field(s) configured •{' '}
            <span className="font-semibold text-emerald-700">
              {fields.filter((f) => f.mapping !== 'none').length} mapped to permanent lead profile
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-sm transition"
            >
              {isSubmitting ? 'Saving Schema...' : 'Save Form Schema'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

