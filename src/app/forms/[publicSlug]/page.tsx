import React from "react";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb/db";
import { FormAdminAssignment, FormField } from "@/models/CustomForm";
import { PublicFormClient } from "./form-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ publicSlug: string }>;
}

export default async function PublicFormPage({ params }: Props) {
  const { publicSlug } = await params;

  await connectToDatabase();

  const assignment = await FormAdminAssignment.findOne({
    publicSlug: publicSlug.toLowerCase().trim(),
    isActive: true,
  })
    .populate("formId")
    .populate("adminId", "name designation branch")
    .lean();

  if (!assignment || !assignment.formId) {
    notFound();
  }

  const form = assignment.formId as any;
  const admin = assignment.adminId as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-slate-100 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-xl w-full mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-purple-700 to-indigo-800 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded">
              Verified Inquiry Portal
            </span>
            <span className="text-xs text-purple-200 font-medium">
              {admin?.name || "Authorized Branch"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            {form.name}
          </h1>
          {form.description && (
            <p className="mt-1 text-xs text-purple-100/90 leading-relaxed">
              {form.description}
            </p>
          )}
        </div>

        {/* Client Interactive Form */}
        <div className="p-8">
          <PublicFormClient fields={form.fields} publicSlug={publicSlug} />
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400">
        Powered by Real Estate Enterprise CRM • Protected by 3-Tier Multi-Tenant
        Security
      </div>
    </div>
  );
}
