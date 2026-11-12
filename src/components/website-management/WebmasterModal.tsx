"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Building,
  Palette,
  Phone,
  Globe,
  ShieldCheck,
  Layout,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Search,
  MapPin,
} from "lucide-react";

interface WebmasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminId: string;
  agencySlug: string;
  initialSettings: any;
  onSaved?: () => void;
}

export function WebmasterModal({
  isOpen,
  onClose,
  adminId,
  agencySlug,
  initialSettings,
  onSaved,
}: WebmasterModalProps) {
  const [activeTab, setActiveTab] = useState<
    "branding" | "hero" | "theme" | "contact" | "social" | "regulatory" | "footer"
  >("branding");

  const [formData, setFormData] = useState<any>(initialSettings || {});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoResults, setGeoResults] = useState<any[]>([]);
  const [geoError, setGeoError] = useState("");

  const MAPTILER_KEY = "CWVeoDxzhkO07kO693u0";

  const handleSearchLocation = async () => {
    const query = formData.contact?.address;
    if (!query || !query.trim()) {
      setGeoError("Please enter an office address or locality first to search.");
      return;
    }

    setGeocoding(true);
    setGeoError("");
    setGeoResults([]);

    try {
      const res = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query.trim())}.json?key=${MAPTILER_KEY}&limit=5`
      );
      const json = await res.json();
      if (!res.ok || !json.features || json.features.length === 0) {
        setGeoError("No exact match found for this query. Try adding city/state.");
        return;
      }

      setGeoResults(json.features);
    } catch (err: any) {
      setGeoError("Failed to connect to location search service.");
    } finally {
      setGeocoding(false);
    }
  };

  const handleSelectLocation = (feature: any) => {
    const [lng, lat] = feature.center || [undefined, undefined];
    if (lat !== undefined && lng !== undefined) {
      setFormData((prev: any) => ({
        ...prev,
        contact: {
          ...(prev.contact || {}),
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
          city:
            feature.context?.find((c: any) => c.id?.startsWith("place"))?.text ||
            prev.contact?.city ||
            "",
        },
      }));
    }
    setGeoResults([]);
  };

  // Sync formData whenever initialSettings changes or modal opens
  useEffect(() => {
    if (initialSettings) {
      setFormData(initialSettings);
    }
  }, [initialSettings]);

  if (!isOpen) return null;

  const handleChange = (section: string, key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  const adjustBrightness = (hex: string, percent: number) => {
    try {
      const num = parseInt(hex.replace("#", ""), 16);
      const r = Math.max(0, Math.min(255, ((num >> 16) + Math.round(255 * (percent / 100)))));
      const g = Math.max(0, Math.min(255, (((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100)))));
      const b = Math.max(0, Math.min(255, ((num & 0x0000ff) + Math.round(255 * (percent / 100)))));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    } catch {
      return hex;
    }
  };

  const handlePrimaryColorChange = (newPrimary: string) => {
    // Automatically derive a complementary deepColor so footers, blueprint headers, and darker cards match flawlessly
    const derivedDeep = adjustBrightness(newPrimary, -25);
    setFormData((prev: any) => ({
      ...prev,
      theme: {
        ...(prev.theme || {}),
        primaryColor: newPrimary,
        deepColor: derivedDeep,
      },
    }));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "banner",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    if (type === "logo") setUploadingLogo(true);
    if (type === "banner") setUploadingBanner(true);

    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload image file to server");
      }

      const fileUrl = json.data?.fileUrl || json.fileUrl;
      if (!fileUrl) {
        throw new Error("Server did not return a valid file URL");
      }

      if (type === "logo") {
        handleChange("branding", "logoUrl", fileUrl);
      } else {
        handleChange("hero", "customBannerUrl", fileUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload file");
    } finally {
      if (type === "logo") setUploadingLogo(false);
      if (type === "banner") setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/website-management/settings?adminId=${adminId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update website settings");
      }

      setSaveSuccess(true);
      if (onSaved) onSaved();

      // Automatically close the modal after brief confirmation
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const themePresets = [
    {
      name: "Classic Emerald & Brass",
      primary: "#0e3b2e",
      deep: "#0b2d22",
      accent: "#b5822c",
      paper: "#f6f2ea",
    },
    {
      name: "Royal Navy & Gold",
      primary: "#0f233a",
      deep: "#0a1726",
      accent: "#c59b27",
      paper: "#f5f6f8",
    },
    {
      name: "Slate & Terracotta",
      primary: "#1f2421",
      deep: "#141715",
      accent: "#c85a32",
      paper: "#f7f5f2",
    },
    {
      name: "Rich Burgundy & Gold",
      primary: "#3b111a",
      deep: "#260b11",
      accent: "#d4a359",
      paper: "#fcf8f6",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Webmaster Customizer
              </span>
              <span className="text-xs text-slate-500 font-mono">
                /portal-properties?agency={agencySlug}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Customize Agency Public Website
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/portal-properties?agency=${agencySlug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition"
            >
              <span>Live Portal</span>
              <ExternalLink className="size-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tab Row */}
        <div className="flex border-b border-slate-200 bg-white overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab("branding")}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "branding"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building className="size-4" />
            <span>Logo &amp; Brand</span>
          </button>

          <button
            onClick={() => setActiveTab("hero")}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "hero"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layout className="size-4" />
            <span>Hero &amp; Banners</span>
          </button>

          <button
            onClick={() => setActiveTab("theme")}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "theme"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Palette className="size-4" />
            <span>Theme Colors</span>
          </button>

          <button
            onClick={() => setActiveTab("contact")}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "contact"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Phone className="size-4" />
            <span>Contact &amp; Map</span>
          </button>

          <button
            onClick={() => setActiveTab("social")}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "social"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="size-4" />
            <span>Social Platforms</span>
          </button>

          <button
            onClick={() => setActiveTab("regulatory")}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "regulatory"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="size-4" />
            <span>RERA Badge</span>
          </button>

          <button
            onClick={() => setActiveTab("footer")}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "footer"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layout className="size-4" />
            <span>Footer Section</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Settings saved successfully! Refreshing live portal...</span>
            </div>
          )}

          {/* 1. Branding Tab */}
          {activeTab === "branding" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Company Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Agency Name
                  </label>
                  <input
                    type="text"
                    value={formData.branding?.companyName || ""}
                    onChange={(e) => handleChange("branding", "companyName", e.target.value)}
                    placeholder="e.g. Prasad Realty"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tagline / Subtext
                  </label>
                  <input
                    type="text"
                    value={formData.branding?.tagline || ""}
                    onChange={(e) => handleChange("branding", "tagline", e.target.value)}
                    placeholder="e.g. Property Portal • RERA Approved"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Logo (Server Upload)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs transition">
                    <Upload className="size-4 text-blue-600" />
                    <span>{uploadingLogo ? "Uploading file..." : "Upload Logo Image"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      disabled={uploadingLogo}
                      onChange={(e) => handleFileUpload(e, "logo")}
                      className="hidden"
                    />
                  </label>

                  {formData.branding?.logoUrl ? (
                    <div className="flex items-center gap-2">
                      <div className="h-10 px-2 border border-slate-200 rounded flex items-center justify-center bg-slate-50">
                        <img
                          src={formData.branding.logoUrl}
                          alt="Logo Preview"
                          className="max-h-8 max-w-[120px] object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange("branding", "logoUrl", "")}
                        className="text-xs text-rose-600 hover:underline font-semibold"
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      No custom logo uploaded. System will use monogram icon.
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: PNG, JPG, WEBP, SVG. Files are stored on server and served via persistent URL.
                </p>
              </div>
            </div>
          )}

          {/* 2. Hero & Banner Tab */}
          {activeTab === "hero" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Hero Section Banners &amp; Titles</h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Eyebrow Text (Small Uppercase Label)
                </label>
                <input
                  type="text"
                  value={formData.hero?.eyebrowText || ""}
                  onChange={(e) => handleChange("hero", "eyebrowText", e.target.value)}
                  placeholder="e.g. OFFICIAL REAL ESTATE GAZETTE • NAGPUR CENTRAL"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hero Big Headline
                </label>
                <input
                  type="text"
                  value={formData.hero?.headline || ""}
                  onChange={(e) => handleChange("hero", "headline", e.target.value)}
                  placeholder="e.g. Find a home with the paperwork already in order."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hero Description / Subheading
                </label>
                <textarea
                  rows={3}
                  value={formData.hero?.subheadline || ""}
                  onChange={(e) => handleChange("hero", "subheadline", e.target.value)}
                  placeholder="Direct buyer exchange featuring RERA-sanctioned apartments, clear-title layouts..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Hero Right Visual Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition ${
                      (formData.hero?.bannerType || "default_svg") === "default_svg"
                        ? "border-blue-600 bg-blue-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bannerType"
                      checked={(formData.hero?.bannerType || "default_svg") === "default_svg"}
                      onChange={() => handleChange("hero", "bannerType", "default_svg")}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Classic Architectural Skyline (SVG)</div>
                      <div className="text-[11px] text-slate-500">
                        Crisp, dark green &amp; brass skyline with lit windows and sun disc.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition ${
                      formData.hero?.bannerType === "custom_image"
                        ? "border-blue-600 bg-blue-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bannerType"
                      checked={formData.hero?.bannerType === "custom_image"}
                      onChange={() => handleChange("hero", "bannerType", "custom_image")}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Custom Image Banner</div>
                      <div className="text-[11px] text-slate-500">
                        Upload or provide a high-res landscape banner image.
                      </div>
                    </div>
                  </label>
                </div>

                {formData.hero?.bannerType === "custom_image" && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Custom Banner Image (Server Upload)
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs transition">
                        <Upload className="size-4 text-blue-600" />
                        <span>{uploadingBanner ? "Uploading banner..." : "Upload Banner Image"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploadingBanner}
                          onChange={(e) => handleFileUpload(e, "banner")}
                          className="hidden"
                        />
                      </label>

                      {formData.hero?.customBannerUrl && (
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-20 border border-slate-200 rounded overflow-hidden bg-slate-50">
                            <img
                              src={formData.hero.customBannerUrl}
                              alt="Banner Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleChange("hero", "customBannerUrl", "")}
                            className="text-xs text-rose-600 hover:underline font-semibold"
                          >
                            Remove Banner
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Recommended aspect: 16:9 or 520x300. Uploaded files are safely stored on the server.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Theme Colors Tab */}
          {activeTab === "theme" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Website Theme Palette</h3>
              <p className="text-xs text-slate-500">
                Choose a pre-matched editorial palette or customize primary and accent colors directly.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {themePresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setFormData((prev: any) => ({
                        ...prev,
                        theme: {
                          primaryColor: preset.primary,
                          deepColor: preset.deep,
                          accentColor: preset.accent,
                          paperColor: preset.paper,
                        },
                      }));
                    }}
                    className={`p-3 text-left border rounded-xl hover:shadow-xs transition ${
                      formData.theme?.primaryColor === preset.primary
                        ? "border-blue-600 ring-2 ring-blue-500/20"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div
                        className="size-5 rounded border"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="size-5 rounded border"
                        style={{ backgroundColor: preset.accent }}
                      />
                      <div
                        className="size-5 rounded border"
                        style={{ backgroundColor: preset.paper }}
                      />
                    </div>
                    <div className="text-xs font-bold text-slate-800">{preset.name}</div>
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Brand Color (Hero, Titles, Border)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.theme?.primaryColor || "#0e3b2e"}
                      onChange={(e) => handlePrimaryColorChange(e.target.value)}
                      className="size-9 rounded border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.theme?.primaryColor || "#0e3b2e"}
                      onChange={(e) => handlePrimaryColorChange(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Accent Color (Buttons, Badges, Labels)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.theme?.accentColor || "#b5822c"}
                      onChange={(e) => handleChange("theme", "accentColor", e.target.value)}
                      className="size-9 rounded border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.theme?.accentColor || "#b5822c"}
                      onChange={(e) => handleChange("theme", "accentColor", e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Background Color (Page Paper Canvas)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.theme?.paperColor || "#f6f2ea"}
                      onChange={(e) => handleChange("theme", "paperColor", e.target.value)}
                      className="size-9 rounded border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.theme?.paperColor || "#f6f2ea"}
                      onChange={(e) => handleChange("theme", "paperColor", e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Live Mini Preview Demo */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Live Site Demo Preview (Auto-Updates with Color Picker)
                </div>
                <div
                  className="rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                  style={{ backgroundColor: formData.theme?.paperColor || "#f6f2ea" }}
                >
                  {/* Demo Header */}
                  <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-6 flex items-center justify-center font-bold text-white text-[10px]"
                        style={{ backgroundColor: formData.theme?.primaryColor || "#0e3b2e" }}
                      >
                        PR
                      </div>
                      <span
                        className="font-serif font-bold text-xs"
                        style={{ color: formData.theme?.primaryColor || "#0e3b2e" }}
                      >
                        {formData.branding?.companyName || "Agency Demo"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                      <span>Buy</span>
                      <span>Rent</span>
                      <span>Projects</span>
                      <button
                        type="button"
                        className="px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider"
                        style={{ backgroundColor: formData.theme?.primaryColor || "#0e3b2e" }}
                      >
                        CRM Portal
                      </button>
                    </div>
                  </div>

                  {/* Demo Hero & Banner Frame */}
                  <div
                    className="p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 border-b-2"
                    style={{
                      backgroundColor: formData.theme?.primaryColor || "#0e3b2e",
                      borderColor: formData.theme?.accentColor || "#b5822c",
                    }}
                  >
                    <div className="space-y-1.5 max-w-md">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider block"
                        style={{ color: formData.theme?.accentColor || "#b5822c" }}
                      >
                        {formData.hero?.eyebrowText || "OFFICIAL PROPERTY GAZETTE"}
                      </span>
                      <h4 className="font-serif text-base font-bold leading-tight">
                        {formData.hero?.headline || "Find a home with the paperwork already in order."}
                      </h4>
                      <p className="text-[11px] opacity-80 line-clamp-2">
                        {formData.hero?.subheadline || "Direct buyer exchange with verified freehold residences."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Mini Banner Frame Preview */}
                      <div
                        className="w-24 h-14 border-2 p-1 rounded flex items-center justify-center text-[9px] font-bold text-center"
                        style={{
                          backgroundColor:
                            formData.theme?.deepColor ||
                            adjustBrightness(formData.theme?.primaryColor || "#0e3b2e", -25),
                          borderColor: formData.theme?.accentColor || "#b5822c",
                          color: formData.theme?.accentColor || "#b5822c",
                        }}
                      >
                        Banner Frame
                      </div>
                      <button
                        type="button"
                        className="px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-sm"
                        style={{ backgroundColor: formData.theme?.accentColor || "#b5822c" }}
                      >
                        Search
                      </button>
                    </div>
                  </div>

                  {/* Demo 03 — Architectural Blueprint Header Preview */}
                  <div className="p-4 space-y-3">
                    <div
                      className="p-3 text-white flex items-center justify-between border-b"
                      style={{
                        backgroundColor:
                          formData.theme?.deepColor ||
                          adjustBrightness(formData.theme?.primaryColor || "#0e3b2e", -25),
                        borderColor: formData.theme?.primaryColor || "#0e3b2e",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="size-6 border flex items-center justify-center text-[10px] font-bold"
                          style={{
                            backgroundColor: formData.theme?.primaryColor || "#0e3b2e",
                            borderColor: formData.theme?.accentColor || "#b5822c",
                            color: formData.theme?.accentColor || "#b5822c",
                          }}
                        >
                          03
                        </div>
                        <div>
                          <div
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: formData.theme?.accentColor || "#b5822c" }}
                          >
                            Architectural Blueprint
                          </div>
                          <div className="text-xs font-serif font-bold">
                            Interactive Floor Blueprint &amp; Inspection
                          </div>
                        </div>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 font-bold uppercase"
                        style={{
                          backgroundColor: formData.theme?.accentColor || "#b5822c",
                          color: "#1d2a24",
                        }}
                      >
                        Verified
                      </span>
                    </div>

                    {/* Demo Card on Paper Background */}
                    <div className="flex items-center gap-3">
                      <div className="bg-white border p-3 rounded shadow-xs flex-1 border-slate-200">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span
                            className="font-bold text-sm"
                            style={{ color: formData.theme?.primaryColor || "#0e3b2e" }}
                          >
                            ₹ 75.00 L
                          </span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 border"
                            style={{
                              borderColor: formData.theme?.accentColor || "#b5822c",
                              color: formData.theme?.accentColor || "#b5822c",
                            }}
                          >
                            Verified
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 font-semibold">
                          Luxury 3 BHK Sanctioned Residence
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Wardha Road &bull; 1,450 Sq. Ft.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Demo Footer Section Preview */}
                  <div
                    className="p-4 text-xs border-t-2"
                    style={{
                      backgroundColor:
                        formData.theme?.deepColor ||
                        adjustBrightness(formData.theme?.primaryColor || "#0e3b2e", -25),
                      borderColor: formData.theme?.primaryColor || "#0e3b2e",
                      color: formData.theme?.paperColor || "#f6f2ea",
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-2 pb-2 border-b border-white/10">
                      <span className="font-serif font-bold">
                        {formData.branding?.companyName || "Agency Footer"}
                      </span>
                      <span
                        className="text-[10px] font-bold tracking-widest uppercase"
                        style={{ color: formData.theme?.accentColor || "#b5822c" }}
                      >
                        Certified Partner
                      </span>
                    </div>
                    <div className="text-[10px] opacity-70 flex justify-between">
                      <span>© {new Date().getFullYear()} {formData.branding?.companyName || "Pandit Realty"}. All rights reserved.</span>
                      <span style={{ color: formData.theme?.accentColor || "#b5822c" }}>Maharashtra Certified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Contact & Map Tab */}
          {activeTab === "contact" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Office Contact &amp; Google Map</h3>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Office Physical Address
                  </label>
                  <button
                    type="button"
                    onClick={handleSearchLocation}
                    disabled={geocoding}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                    title="Find exact GPS Coordinates (Lat & Long) using MapTiler search"
                  >
                    {geocoding ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Search className="size-3.5" />
                    )}
                    <span>{geocoding ? "Locating..." : "Auto-Locate Coordinates"}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={formData.contact?.address || ""}
                  onChange={(e) => handleChange("contact", "address", e.target.value)}
                  placeholder="e.g. Block no 3, Plot no 14,24 Mannoday, prince society, Wathoda Rd, Nagpur"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                {geoError && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="size-3.5" />
                    {geoError}
                  </p>
                )}

                {geoResults.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider block">
                      Select matching location to set pin coordinates:
                    </span>
                    {geoResults.map((feat: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectLocation(feat)}
                        className="w-full text-left p-2 rounded bg-white hover:bg-blue-100/70 border border-slate-200 text-xs text-slate-800 flex items-start gap-2 transition"
                      >
                        <MapPin className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">{feat.place_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Lat: {feat.center[1]?.toFixed(4)}, Long: {feat.center[0]?.toFixed(4)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.contact?.city || ""}
                    onChange={(e) => handleChange("contact", "city", e.target.value)}
                    placeholder="Nagpur"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Mobile / Phone
                  </label>
                  <input
                    type="text"
                    value={formData.contact?.phone || ""}
                    onChange={(e) => handleChange("contact", "phone", e.target.value)}
                    placeholder="+91 (0712) 256-8900"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact?.email || ""}
                    onChange={(e) => handleChange("contact", "email", e.target.value)}
                    placeholder="contact@agency.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp Chat Number (with country code)
                  </label>
                  <input
                    type="text"
                    value={formData.contact?.whatsappNumber || ""}
                    onChange={(e) => handleChange("contact", "whatsappNumber", e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Working Hours
                  </label>
                  <input
                    type="text"
                    value={formData.contact?.workingHours || ""}
                    onChange={(e) => handleChange("contact", "workingHours", e.target.value)}
                    placeholder="e.g. Mon - Sat: 9:30 AM - 7:00 PM"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Latitude (e.g. 21.1278)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.contact?.latitude ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "contact",
                        "latitude",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 21.1278"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Longitude (e.g. 79.1396)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.contact?.longitude ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "contact",
                        "longitude",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 79.1396"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Live Location Map Marker Preview */}
              {(formData.contact?.latitude && formData.contact?.longitude) || formData.contact?.address ? (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="size-4 text-rose-600" />
                      Live Map Pin Preview (Marker drops exactly on your office coordinates)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formData.contact?.latitude && formData.contact?.longitude
                        ? `${formData.contact.latitude}, ${formData.contact.longitude}`
                        : "Address Query"}
                    </span>
                  </div>
                  <div className="w-full h-44 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                    <iframe
                      src={`https://maps.google.com/maps?q=${
                        formData.contact?.latitude && formData.contact?.longitude
                          ? `${formData.contact.latitude},${formData.contact.longitude}`
                          : encodeURIComponent(formData.contact?.address || "")
                      }&z=16&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      title="Customizer Live Map Pin Preview"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Maps Custom Embed URL (Optional Override)
                </label>
                <input
                  type="text"
                  value={formData.contact?.googleMapsEmbedUrl || ""}
                  onChange={(e) => handleChange("contact", "googleMapsEmbedUrl", e.target.value)}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  If Latitude &amp; Longitude are given, the map automatically places a precise red pin at your exact office location.
                </p>
              </div>
            </div>
          )}

          {/* 5. Social Media Tab */}
          {activeTab === "social" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Social Media Handles &amp; Links</h3>
              <p className="text-xs text-slate-500">
                These show in the public footer and on your dedicated contact page.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facebook</label>
                  <input
                    type="text"
                    value={formData.socialLinks?.facebook || ""}
                    onChange={(e) => handleChange("socialLinks", "facebook", e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={formData.socialLinks?.instagram || ""}
                    onChange={(e) => handleChange("socialLinks", "instagram", e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn</label>
                  <input
                    type="text"
                    value={formData.socialLinks?.linkedin || ""}
                    onChange={(e) => handleChange("socialLinks", "linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">YouTube</label>
                  <input
                    type="text"
                    value={formData.socialLinks?.youtube || ""}
                    onChange={(e) => handleChange("socialLinks", "youtube", e.target.value)}
                    placeholder="https://youtube.com/@..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. Regulatory & RERA Tab */}
          {activeTab === "regulatory" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Regulatory &amp; RERA Customization</h3>
              <p className="text-xs text-slate-500">
                Customize the authority stamp appearing on your header, hero trust strip, and footer.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RERA Badge Title
                </label>
                <input
                  type="text"
                  value={formData.regulatory?.badgeText || ""}
                  onChange={(e) => handleChange("regulatory", "badgeText", e.target.value)}
                  placeholder="e.g. MahaRERA Approved Partner or RERA Karnataka Approved"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RERA License / Registration Number
                </label>
                <input
                  type="text"
                  value={formData.regulatory?.registrationNumber || ""}
                  onChange={(e) => handleChange("regulatory", "registrationNumber", e.target.value)}
                  placeholder="e.g. A50500012345"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* 7. Footer Tab */}
          {activeTab === "footer" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Footer Text Customizer</h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Footer Brand Blurb (About the Agency)
                </label>
                <textarea
                  rows={3}
                  value={formData.footer?.aboutText || ""}
                  onChange={(e) => handleChange("footer", "aboutText", e.target.value)}
                  placeholder="Official verified customer property exchange. Curating 100% RERA-registered developments..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Copyright Text
                </label>
                <input
                  type="text"
                  value={formData.footer?.copyrightText || ""}
                  onChange={(e) => handleChange("footer", "copyrightText", e.target.value)}
                  placeholder="e.g. © 2026 Prasad Realty. All rights reserved."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Changes apply in real-time to your agency URL.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving Customization...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Save Customization</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

