"use client";

import React from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

interface PortalContactClientProps {
  agencyBranding?: {
    adminId: string;
    agencyName: string;
    agencySlug: string;
    customDomain?: string;
    settings?: any;
  } | null;
}

export function PortalContactClient({
  agencyBranding,
}: PortalContactClientProps) {
  const settings = agencyBranding?.settings;

  const displayName =
    settings?.branding?.companyName ||
    agencyBranding?.agencyName ||
    "Real Estate Agency";
  const address =
    settings?.contact?.address ||
    "Civil Lines, Wardha Road Junction, Nagpur, Maharashtra 440001";
  const phone = settings?.contact?.phone || "+91 (0712) 256-8900";
  const email = settings?.contact?.email || "contact@propertyportal.in";
  const workingHours =
    settings?.contact?.workingHours || "Mon - Sat: 9:30 AM - 7:00 PM";
  const whatsapp = settings?.contact?.whatsappNumber;
  const mapUrl = settings?.contact?.googleMapsEmbedUrl;
  const latitude = settings?.contact?.latitude;
  const longitude = settings?.contact?.longitude;
  const badgeText = settings?.regulatory?.badgeText || "MahaRERA Approved Partner";
  const registrationNumber = settings?.regulatory?.registrationNumber;

  // Build pinpoint Google Map URL anchored strictly to the office coordinates or address
  const isEmbedUrlValid =
    mapUrl &&
    (mapUrl.includes("google.com/maps") ||
      mapUrl.trim().startsWith("<iframe") ||
      mapUrl.includes("maps.google.com"));

  const targetQuery = latitude && longitude
    ? `${latitude},${longitude}`
    : encodeURIComponent(address);

  // Use Google Maps with exact coordinates (q=${lat},${lng}) and output=embed which reliably places the red pin marker
  const mapEmbedSource = isEmbedUrlValid
    ? mapUrl
    : `https://maps.google.com/maps?q=${targetQuery}&z=16&output=embed`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Title */}
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <span className="text-xs uppercase tracking-[0.14em] font-bold text-brass block mb-1">
          Direct Customer Service &bull; Registry Office
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-green tracking-tight">
          Connect with {displayName}
        </h1>
        <p className="text-muted-ink text-xs sm:text-sm mt-2 leading-relaxed">
          Official headquarters location, phone assistance, and certified documentation desk.
        </p>
      </div>

      <div className="space-y-6">
        {/* Office Details Card */}
        <div className="bg-card-white border border-line p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-soft-line pb-4">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink-green">
                Headquarters &amp; Office Coordinates
              </h2>
              <p className="text-xs text-muted-ink mt-0.5">
                Authorized registration and client consultation office.
              </p>
            </div>
            <div className="flex items-center gap-2 text-brass text-xs font-semibold uppercase tracking-wider bg-paper px-3 py-1.5 border border-line">
              <ShieldCheck className="size-4" strokeWidth={1.5} />
              <span>{badgeText} {registrationNumber ? `• ${registrationNumber}` : ""}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs">
            <div className="flex items-start gap-3">
              <div className="size-9 bg-paper border border-line flex items-center justify-center shrink-0 text-brass">
                <MapPin className="size-4.5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-bold text-ink mb-1">Office Address</div>
                <p className="text-body-muted leading-relaxed">{address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-9 bg-paper border border-line flex items-center justify-center shrink-0 text-brass">
                <Phone className="size-4.5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-bold text-ink mb-1">Telephone Hotline</div>
                <p className="text-body-muted font-medium">{phone}</p>
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 mt-1 text-[11px]"
                  >
                    <MessageSquare className="size-3" />
                    Chat on WhatsApp
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-9 bg-paper border border-line flex items-center justify-center shrink-0 text-brass">
                <Mail className="size-4.5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-bold text-ink mb-1">Official Inquiries</div>
                <p className="text-body-muted">{email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-9 bg-paper border border-line flex items-center justify-center shrink-0 text-brass">
                <Clock className="size-4.5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-bold text-ink mb-1">Consultation Hours</div>
                <p className="text-body-muted">{workingHours}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Google Map Panel */}
        <div className="bg-card-white border border-line p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-xs font-bold text-ink-green uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="size-4 text-brass" />
              <span>Official Location Map</span>
            </div>
            <a
              href={
                latitude && longitude
                  ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
              }
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brass hover:text-brass/80 font-semibold underline flex items-center gap-1"
            >
              <span>Open in Maps</span>
            </a>
          </div>

          <div className="w-full h-96 bg-paper border border-line relative overflow-hidden">
            {mapEmbedSource.trim().startsWith("<iframe") ? (
              <div
                className="w-full h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0"
                dangerouslySetInnerHTML={{ __html: mapEmbedSource }}
              />
            ) : (
              <iframe
                src={mapEmbedSource}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Agency Location Map"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
