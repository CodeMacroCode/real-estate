import React from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/session";
import { getSsrProperties } from "@/services/propertyService";
import { getSsrMasterOptions } from "@/services/masterService";
import { PropertiesClient } from "./PropertiesClient";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
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
  const category = params.category;
  const transactionType = params.transactionType;
  const status = params.status;
  const city = params.city;
  const page = parseInt(params.page || "1", 10);
  const limit = parseInt(params.limit || "20", 10);

  // SSR Data Preload: Direct MongoDB query with multi-tenant scoping and populated Owner/Project
  const [propertiesResult, masterOptions] = await Promise.all([
    getSsrProperties({
      userId: authContext.user._id,
      roleSlug,
      search,
      category,
      transactionType,
      status,
      city,
      page,
      limit,
    }),
    getSsrMasterOptions({
      userId: authContext.user._id,
      roleSlug,
    }),
  ]);

  const { properties, pagination } = propertiesResult;

  return (
    <div className="space-y-6">
      <PropertiesClient
        initialProperties={JSON.parse(JSON.stringify(properties))}
        pagination={pagination}
        masterOptions={JSON.parse(JSON.stringify(masterOptions))}
        currentUser={JSON.parse(JSON.stringify(authContext.user))}
        roleSlug={roleSlug}
      />
    </div>
  );
}

