"use client";

import React, { useState } from "react";
import Link from "next/link";

interface PublicInquiryItem {
  id: string;
  inquiryType: string;
  name: string;
  phone: string;
  email?: string;
  whatsApp?: string;
  preferredDateTime: string | null;
  message?: string;
  status: "Pending" | "Converted_To_Lead" | "Appended_To_Existing_Lead";
  crmLead: {
    id: string;
    title: string;
    status: string;
  } | null;
  property: {
    id: string;
    title: string;
    propertyId: string;
  } | null;
  project: {
    id: string;
    name: string;
    projectId: string;
  } | null;
  createdAt: string;
}

interface PublicInquiriesClientProps {
  initialInquiries: PublicInquiryItem[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PublicInquiriesClient({
  initialInquiries,
  initialPagination,
}: PublicInquiriesClientProps) {
  const [filterType, setFilterType] = useState<string>("All");

  const filteredInquiries = initialInquiries.filter((inq) => {
    if (filterType === "All") return true;
    return inq.inquiryType === filterType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Converted_To_Lead":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            ✓ New Lead Converted
          </span>
        );
      case "Appended_To_Existing_Lead":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            ⚡ Appended (Deduplicated)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
            ● Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-gray-200 sm:flex sm:items-center sm:justify-between bg-gray-50">
        <div className="text-sm text-gray-700">
          Total Inquiries Captured:{" "}
          <span className="font-bold text-gray-900">{initialPagination.total}</span>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <label className="text-xs font-medium text-gray-600">Filter Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm text-xs py-1.5 px-3 focus:ring-indigo-500 focus:border-indigo-500 border"
          >
            <option value="All">All Types</option>
            <option value="Property">Property</option>
            <option value="Project">Project</option>
            <option value="Schedule_Visit">Schedule Visit</option>
            <option value="Requirement">Requirement</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {filteredInquiries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No website inquiries recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Visitor Info</th>
                <th className="px-6 py-3">Inquiry Type & Context</th>
                <th className="px-6 py-3">Message / Notes</th>
                <th className="px-6 py-3">Ingestion Status</th>
                <th className="px-6 py-3">CRM Lead Link</th>
                <th className="px-6 py-3">Received At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredInquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{inq.name}</div>
                    <div className="text-xs text-gray-500">{inq.phone}</div>
                    {inq.email && <div className="text-xs text-gray-400">{inq.email}</div>}
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 mb-1">
                      {inq.inquiryType}
                    </span>
                    {inq.property && (
                      <div className="text-xs font-medium text-indigo-600 line-clamp-1">
                        Prop: {inq.property.title} ({inq.property.propertyId})
                      </div>
                    )}
                    {inq.project && (
                      <div className="text-xs font-medium text-purple-600 line-clamp-1">
                        Project: {inq.project.name}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <p className="text-xs text-gray-700 line-clamp-2">{inq.message || "-"}</p>
                    {inq.preferredDateTime && (
                      <p className="text-xs text-indigo-600 font-medium mt-1" suppressHydrationWarning>
                        Visit: {new Date(inq.preferredDateTime).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(inq.status)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {inq.crmLead ? (
                      <Link
                        href={`/leads`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 block"
                      >
                        {inq.crmLead.title} &rarr;
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500" suppressHydrationWarning>
                    {new Date(inq.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

