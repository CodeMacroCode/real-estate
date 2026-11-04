import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicPropertyBySlug } from "@/services/publicPortalService";
import { PropertyDetailInquiryForm } from "@/components/property/PropertyDetailInquiryForm";

interface PublicPropertyDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    agency?: string;
    adminId?: string;
  }>;
}

export async function generateMetadata({ params }: PublicPropertyDetailPageProps) {
  const resolvedParams = await params;
  const property = await getPublicPropertyBySlug(resolvedParams.slug);
  if (!property) {
    return { title: "Property Not Found" };
  }
  return {
    title: `${property.title} - ${property.location.city}`,
    description: `${property.propertyType} for ${property.transactionType} in ${property.location.city}.`,
  };
}

/**
 * SSR Server Component for Property Detail Page.
 * Renders full sanitized public details with direct Lead Inquiry form.
 */
export default async function PublicPropertyDetailPage({
  params,
  searchParams,
}: PublicPropertyDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const property = await getPublicPropertyBySlug(resolvedParams.slug);

  if (!property) {
    notFound();
  }

  // Determine agency slug or adminId to maintain tenant context on "Back to Listings"
  const agencySlug =
    resolvedSearchParams.agency ||
    property.agency?.agencySlug ||
    "";
  const backToListingsHref = agencySlug
    ? `/portal-properties?agency=${agencySlug}`
    : resolvedSearchParams.adminId || property.agency?.adminId
    ? `/portal-properties?adminId=${resolvedSearchParams.adminId || property.agency?.adminId}`
    : "/portal-properties";

  const formatPrice = () => {
    if (property.transactionType === "Rent" && property.pricing.monthlyRent) {
      return `₹${property.pricing.monthlyRent.toLocaleString("en-IN")}/month`;
    }
    if (property.pricing.price) {
      if (property.pricing.price >= 10000000) {
        return `₹${(property.pricing.price / 10000000).toFixed(2)} Cr`;
      }
      return `₹${(property.pricing.price / 100000).toFixed(2)} Lakh`;
    }
    return "Price on Request";
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center space-x-2">
            <Link href={backToListingsHref} className="hover:text-indigo-600 font-medium">
              &larr; Back to Listings
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">{property.title}</span>
          </div>

          {property.agency?.agencyName && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              <span>Agency: {property.agency.agencyName}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  {property.propertyCategory} &bull; {property.propertyType}
                </span>
                <span className="text-xs font-mono text-slate-400">ID: {property.propertyId}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{property.title}</h1>
              <p className="mt-2 text-sm text-slate-500">
                {property.location.address}, {property.location.city}
                {property.location.pincode && ` - ${property.location.pincode}`}
              </p>

              <div className="mt-6 flex flex-wrap items-baseline gap-4 pt-6 border-t border-slate-100">
                <span className="text-3xl font-extrabold text-indigo-600">{formatPrice()}</span>
                {property.pricing.isNegotiable && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    Negotiable
                  </span>
                )}
                {property.pricing.pricePerUnitArea && (
                  <span className="text-xs text-slate-400">
                    ₹{property.pricing.pricePerUnitArea.toLocaleString("en-IN")} / {property.areaDetails.areaUnit}
                  </span>
                )}
              </div>
            </div>

            {/* Gallery / Images */}
            {property.media.images && property.media.images.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Property Gallery</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {property.media.images.map((img, idx) => (
                    <div key={idx} className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100">
                      <img src={img} alt={`${property.title} photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specs & Configuration */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Property Overview</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-slate-400 text-xs">Carpet Area</dt>
                  <dd className="font-semibold text-slate-800">
                    {property.areaDetails.carpetArea ? `${property.areaDetails.carpetArea} ${property.areaDetails.areaUnit}` : "N/A"}
                  </dd>
                </div>
                {property.residentialSpecs && (
                  <>
                    <div>
                      <dt className="text-slate-400 text-xs">Bedrooms</dt>
                      <dd className="font-semibold text-slate-800">{property.residentialSpecs.bedrooms} BHK</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 text-xs">Bathrooms</dt>
                      <dd className="font-semibold text-slate-800">{property.residentialSpecs.bathrooms}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 text-xs">Furnishing</dt>
                      <dd className="font-semibold text-slate-800">{property.residentialSpecs.furnishing}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 text-xs">Facing</dt>
                      <dd className="font-semibold text-slate-800">{property.residentialSpecs.facing || "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 text-xs">Possession</dt>
                      <dd className="font-semibold text-slate-800">{property.residentialSpecs.possessionStatus || "Ready"}</dd>
                    </div>
                  </>
                )}
                {/* Investment Specs if applicable */}
                {Boolean(property.investmentSpecs?.grossYieldPercent && property.investmentSpecs.grossYieldPercent > 0) && (
                  <div>
                    <dt className="text-slate-400 text-xs">Annual Gross Yield</dt>
                    <dd className="font-semibold text-emerald-600">{property.investmentSpecs?.grossYieldPercent}% p.a.</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Features & Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                      ✓ {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Lead Contact Box (Public Ingestion Hook) */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Inquire About This Property</h3>
              <p className="text-xs text-slate-500 mb-4">
                Schedule a private site visit or get verified documentation.
              </p>

              <PropertyDetailInquiryForm
                propertyId={property.id}
                propertyTitle={property.title}
                propertyCode={property.propertyId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

