import React from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/session";
import { getSsrProjects } from "@/services/projectService";
import { getSsrMasterOptions } from "@/services/masterService";
import { ProjectsClient } from "./ProjectsClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login");
  }

  const roleSlug = authContext.role?.slug || "";
  const params = await searchParams;

  const search = params.search;
  const projectType = params.projectType;
  const constructionStatus = params.constructionStatus;
  const city = params.city;
  const startDate = params.startDate;
  const endDate = params.endDate;
  const page = parseInt(params.page || "1", 10);
  const limit = parseInt(params.limit || "20", 10);

  // SSR Data Preload: Projects and Master Settings options for dynamic dropdowns & amenities
  const [projectsResult, masterOptions] = await Promise.all([
    getSsrProjects({
      userId: authContext.user._id,
      roleSlug,
      search,
      projectType,
      constructionStatus,
      city,
      startDate,
      endDate,
      page,
      limit,
    }),
    getSsrMasterOptions({
      userId: authContext.user._id,
      roleSlug,
    }),
  ]);

  const { projects, pagination } = projectsResult;

  return (
    <div className="space-y-6">
      <ProjectsClient
        initialProjects={JSON.parse(JSON.stringify(projects))}
        pagination={pagination}
        masterOptions={JSON.parse(JSON.stringify(masterOptions))}
        currentUser={JSON.parse(JSON.stringify(authContext.user))}
        roleSlug={roleSlug}
      />
    </div>
  );
}

