import React from "react";
import { getServerAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getSsrPublicInquiries } from "@/services/leadIngestionService";
import PublicInquiriesClient from "./PublicInquiriesClient";

export const metadata = {
  title: "Website Inquiries & Inbound Leads | CRM",
  description: "Manage and monitor real-time website inquiries, site visits, and deduplicated inbound leads.",
};

export const dynamic = "force-dynamic";

interface InquiriesPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function PublicInquiriesPage({ searchParams }: InquiriesPageProps) {
  const authContext = await getServerAuthContext();

  if (!authContext) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const adminId = authContext.user.parentAdminId
    ? (typeof authContext.user.parentAdminId === "object" ? (authContext.user.parentAdminId as any)._id : authContext.user.parentAdminId)
    : authContext.user._id;

  const data = await getSsrPublicInquiries(adminId.toString(), page, 25);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Inbound Website Inquiries
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time inquiries ingested from public portals with automatic CRM lead conversion and deduplication.
          </p>
        </div>
      </div>

      <PublicInquiriesClient
        initialInquiries={data.inquiries}
        initialPagination={data.pagination}
      />
    </div>
  );
}
