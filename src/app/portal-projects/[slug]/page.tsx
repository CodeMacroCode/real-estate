import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProjectBySlug } from "@/services/publicPortalService";

interface PublicProjectDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    agency?: string;
    adminId?: string;
  }>;
}

export async function generateMetadata({ params }: PublicProjectDetailPageProps) {
  const resolvedParams = await params;
  const project = await getPublicProjectBySlug(resolvedParams.slug);
  if (!project) {
    return { title: "Project Not Found" };
  }
  return {
    title: `${project.name} by ${project.developerName} - ${project.location.city}`,
    description: `Discover ${project.projectType} units at ${project.name} in ${project.location.city}.`,
  };
}

export default async function PublicProjectDetailPage({
  params,
  searchParams,
}: PublicProjectDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const project = await getPublicProjectBySlug(resolvedParams.slug);

  if (!project) {
    notFound();
  }

  // Determine agency slug or adminId to maintain tenant context on "Back to Projects"
  const agencySlug =
    resolvedSearchParams.agency ||
    project.agency?.agencySlug ||
    "";
  const backToProjectsHref = agencySlug
    ? `/portal-projects?agency=${agencySlug}`
    : resolvedSearchParams.adminId || project.agency?.adminId
    ? `/portal-projects?adminId=${resolvedSearchParams.adminId || project.agency?.adminId}`
    : "/portal-projects";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center space-x-2">
            <Link href={backToProjectsHref} className="hover:text-indigo-600 font-medium">
              &larr; Back to Projects
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">{project.name}</span>
          </div>

          {project.agency?.agencyName && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              <span>Agency: {project.agency.agencyName}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  {project.projectType} Development
                </span>
                <span className="text-xs font-mono text-slate-400">{project.projectId}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900">{project.name}</h1>
              <p className="text-sm font-medium text-slate-600 mt-1">By {project.developerName}</p>
              <p className="mt-2 text-sm text-slate-500">
                {project.location.address}, {project.location.city}
              </p>
              {project.reraNumber && (
                <div className="mt-4 inline-block bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700">
                  RERA Registered: {project.reraNumber}
                </div>
              )}
            </div>

            {project.description && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-2">About the Development</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
              </div>
            )}

            {project.amenities.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Project Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {project.amenities.map((item, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                      ★ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Inquire About {project.name}</h3>
              <p className="text-xs text-slate-500 mb-4">
                Receive official price sheets, floor plans, and site visit schedules.
              </p>

              <form action="/api/public/inquiries" method="POST" className="space-y-3">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="inquiryType" value="Project" />

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Priya Nair"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number (10 digits)</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    pattern="[0-9]{10}"
                    placeholder="9876543210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="priya@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-sm"
                >
                  Request Project Brochure
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

