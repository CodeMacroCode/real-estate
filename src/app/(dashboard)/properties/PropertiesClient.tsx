"use client";

import React, { useState, useTransition, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Tag,
  DollarSign,
  TrendingUp,
  Globe,
  Trash2,
  Eye,
  Sliders,
  CheckCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  FolderLock,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { SsrPropertyItem } from "@/services/propertyService";
import { SsrMasterOption } from "@/services/masterService";
import { SafeUser } from "@/types";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  InfiniteScrollSelect,
  SelectOption,
} from "@/components/ui/InfiniteScrollSelect";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { DateRangeFilter } from "@/app/componets/ui/DateRangeFilter";

interface PropertiesClientProps {
  initialProperties: SsrPropertyItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  masterOptions?: SsrMasterOption[];
  currentUser: SafeUser;
  roleSlug: string;
}

export function PropertiesClient({
  initialProperties,
  pagination,
  masterOptions = [],
  currentUser,
  roleSlug,
}: PropertiesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("category") || "ALL",
  );
  const [transTypeFilter, setTransTypeFilter] = useState(
    searchParams.get("transactionType") || "ALL",
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "ALL",
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Status & Client Allocation Modal state (like Project Section)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetProperty, setStatusTargetProperty] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [propertyStatusForm, setPropertyStatusForm] = useState({
    status: "Available",
    clientId: "",
    notes: "",
  });
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [clientSelectionMode, setClientSelectionMode] = useState<"existing" | "new">("existing");
  const [newClientForm, setNewClientForm] = useState({
    clientName: "",
    phone: "",
    email: "",
    address: "",
    companyName: "",
    status: "Active",
    notes: "",
  });

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients?limit=50");
      const json = await res.json();
      if (res.ok && json.data) {
        setClientsList(json.data);
      }
    } catch {
      // ignore
    }
  };

  const handleOpenStatusModal = (property: any) => {
    setStatusTargetProperty(property);
    setPropertyStatusForm({
      status: property.status || "Available",
      clientId: "",
      notes: "",
    });
    setClientSelectionMode("existing");
    setNewClientForm({
      clientName: "",
      phone: "",
      email: "",
      address: "",
      companyName: "",
      status: "Active",
      notes: "",
    });
    fetchClients();
    setIsStatusModalOpen(true);
  };

  const handleUpdatePropertyStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTargetProperty) return;

    try {
      setIsUpdatingStatus(true);
      let targetClientId = propertyStatusForm.clientId;

      // If user chose "new client", register the client in CRM first
      if (
        (propertyStatusForm.status === "Booked" ||
          propertyStatusForm.status === "Sold" ||
          propertyStatusForm.status === "Hold" ||
          propertyStatusForm.status === "Rented" ||
          propertyStatusForm.status === "Leased") &&
        clientSelectionMode === "new"
      ) {
        if (!newClientForm.clientName.trim() || !newClientForm.phone.trim()) {
          toast.error("New client name and phone are required");
          setIsUpdatingStatus(false);
          return;
        }

        const clientRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newClientForm),
        });
        const clientJson = await clientRes.json();
        if (!clientRes.ok || !clientJson.data?._id) {
          throw new Error(clientJson.message || clientJson.error || "Failed to register new client");
        }
        targetClientId = clientJson.data._id;
        toast.success(`Client ${clientJson.data.clientName} registered in CRM!`);
      }

      const res = await fetch(`/api/properties/${statusTargetProperty._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...propertyStatusForm,
          clientId: targetClientId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update property status");

      toast.success(
        `Property ${statusTargetProperty.propertyId} status updated to ${propertyStatusForm.status}! Added to Client Track Record.`
      );
      setIsStatusModalOpen(false);
      setStatusTargetProperty(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Owners list for linking dropdown with Infinite Scroll & Search
  const [ownerOptions, setOwnerOptions] = useState<SelectOption[]>([]);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerPage, setOwnerPage] = useState(1);
  const [ownerHasNextPage, setOwnerHasNextPage] = useState(false);
  const [ownerIsLoading, setOwnerIsLoading] = useState(false);
  const [ownerIsFetchingNextPage, setOwnerIsFetchingNextPage] = useState(false);
  const [selectedOwnerLabel, setSelectedOwnerLabel] = useState("");

  // Live Master Options state (initially populated via SSR, refreshed from API on demand)
  const [liveMasterOptions, setLiveMasterOptions] = useState<SsrMasterOption[]>(masterOptions);
  const [isMastersLoading, setIsMastersLoading] = useState(false);

  // Function to dynamically refresh all master settings from API in a single unified hit
  const refreshMasterOptions = async () => {
    try {
      setIsMastersLoading(true);
      const res = await fetch("/api/masters");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setLiveMasterOptions(json.data);
        }
      }
    } catch (err) {
      console.error("Error refreshing master options:", err);
    } finally {
      setIsMastersLoading(false);
    }
  };

  const ownersFetchedRef = useRef(false);

  // Fetch owners with pagination & search
  const fetchOwners = async (page: number, search: string, append = false) => {
    if (page === 1) {
      setOwnerIsLoading(true);
    } else {
      setOwnerIsFetchingNextPage(true);
    }

    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search.trim()) q.set("search", search.trim());

      const res = await fetch(`/api/owners?${q.toString()}`);
      const json = await res.json();

      if (json.data && Array.isArray(json.data)) {
        const formatted: SelectOption[] = json.data.map((o: any) => ({
          value: o._id,
          label: `${o.name} (${o.mobile})`,
        }));

        setOwnerOptions((prev) => (append ? [...prev, ...formatted] : formatted));
        const totalPages = json.meta?.totalPages || 1;
        setOwnerHasNextPage(page < totalPages);
        setOwnerPage(page);
        ownersFetchedRef.current = true;
      }
    } catch (err) {
      console.error("Failed to load owners:", err);
    } finally {
      setOwnerIsLoading(false);
      setOwnerIsFetchingNextPage(false);
    }
  };

  // Trigger search change
  const handleOwnerSearchChange = useCallback((newSearch: string) => {
    setOwnerSearch(newSearch);
    fetchOwners(1, newSearch, false);
  }, []);

  // Trigger fetch next page
  const handleOwnerFetchNextPage = () => {
    if (!ownerIsFetchingNextPage && ownerHasNextPage) {
      fetchOwners(ownerPage + 1, ownerSearch, true);
    }
  };

  // Fetch owners on-demand when dropdown is opened (lazy load)
  const handleOwnerOpen = () => {
    if (!ownersFetchedRef.current && ownerOptions.length === 0) {
      fetchOwners(1, ownerSearch, false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    propertyCategory: "Residential",
    propertyType: "apartment",
    transactionType: "Sale",
    status: "Available",
    ownerId: "",
    city: "Bengaluru",
    address: "",
    price: 9500000,
    monthlyRent: 0,
    carpetArea: 1250,
    areaUnit: "Sq. Ft.",
    bedrooms: 3,
    bathrooms: 2,
    furnishing: "Unfurnished",
    amenities: [] as string[],
    publishOnWebsite: true,
  });
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(
    null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Image Preview Modal State
  const [previewMedia, setPreviewMedia] = useState<{
    title: string;
    propertyId: string;
    images: string[];
    currentIndex: number;
  } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master Settings Options Extracted & Filtered from liveMasterOptions
  const propertyTypeSelectOptions: SelectOption[] = useMemo(() => {
    const active = liveMasterOptions
      .filter((o) => o.category === "property_types" && o.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    if (active.length > 0) {
      return active.map((o) => ({ value: o.value, label: o.label }));
    }
    return [
      { value: "apartment", label: "Apartment" },
      { value: "villa", label: "Villa" },
      { value: "penthouse", label: "Penthouse" },
      { value: "office_space", label: "Office Space" },
      { value: "retail_shop", label: "Retail Shop" },
      { value: "residential_plot", label: "Residential Plot" },
    ];
  }, [liveMasterOptions]);

  const transactionTypeSelectOptions: SelectOption[] = useMemo(() => {
    const active = liveMasterOptions
      .filter((o) => o.category === "transaction_types" && o.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    if (active.length > 0) {
      return active.map((o) => ({ value: o.label, label: o.label }));
    }
    return [
      { value: "Sale", label: "Sale" },
      { value: "Rent", label: "Rent" },
      { value: "Lease", label: "Lease" },
    ];
  }, [liveMasterOptions]);

  const propertyStatusSelectOptions: SelectOption[] = useMemo(() => {
    const active = liveMasterOptions
      .filter((o) => o.category === "property_statuses" && o.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    if (active.length > 0) {
      return active.map((o) => ({ value: o.label, label: o.label }));
    }
    return [
      { value: "Available", label: "Available" },
      { value: "Hold", label: "Hold" },
      { value: "Sold", label: "Sold" },
      { value: "Rented", label: "Rented" },
      { value: "Archived", label: "Archived" },
    ];
  }, [liveMasterOptions]);

  const furnishingSelectOptions: SelectOption[] = useMemo(() => {
    const active = liveMasterOptions
      .filter((o) => o.category === "furnishing_options" && o.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    if (active.length > 0) {
      return active.map((o) => ({ value: o.label, label: o.label }));
    }
    return [
      { value: "Unfurnished", label: "Unfurnished" },
      { value: "Semi-Furnished", label: "Semi-Furnished" },
      { value: "Fully-Furnished", label: "Fully-Furnished" },
    ];
  }, [liveMasterOptions]);

  const amenitiesOptions = liveMasterOptions
    .filter((o) => o.category === "amenities" && o.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const bodyData = new FormData();
        bodyData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: bodyData,
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to upload image");
        if (json.data?.fileUrl) {
          setUploadedImages((prev) => [...prev, json.data.fileUrl]);
        }
      }
      toast.success("Image(s) uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeUploadedImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Fetch owners only on modal open / demand (not duplicated on page load)
  useEffect(() => {
    if (isCreateModalOpen || isEditModalOpen) {
      if (!ownersFetchedRef.current) {
        fetchOwners(1, "", false);
      }
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  const handleFilterChange = (
    newSearch?: string,
    newCat?: string,
    newTrans?: string,
    newStatus?: string,
    startDate?: string | null,
    endDate?: string | null
  ) => {
    const s = newSearch !== undefined ? newSearch : search;
    const c = newCat !== undefined ? newCat : categoryFilter;
    const t = newTrans !== undefined ? newTrans : transTypeFilter;
    const st = newStatus !== undefined ? newStatus : statusFilter;

    const params = new URLSearchParams(searchParams.toString());
    if (s.trim()) params.set("search", s.trim());
    else params.delete("search");

    if (c && c !== "ALL") params.set("category", c);
    else params.delete("category");

    if (t && t !== "ALL") params.set("transactionType", t);
    else params.delete("transactionType");

    if (st && st !== "ALL") params.set("status", st);
    else params.delete("status");

    if (startDate !== undefined) {
      if (startDate) params.set("startDate", startDate);
      else params.delete("startDate");
    }
    if (endDate !== undefined) {
      if (endDate) params.set("endDate", endDate);
      else params.delete("endDate");
    }

    params.set("page", "1");

    startTransition(() => {
      router.push(`/properties?${params.toString()}`);
    });
  };

  const handleOpenDetail = async (p: SsrPropertyItem) => {
    try {
      setLoadingDetail(true);
      setIsDetailModalOpen(true);
      const res = await fetch(`/api/properties/${p._id}`);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to load property details");
      setSelectedProperty(json.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load details");
      setIsDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.ownerId || !formData.city.trim()) {
      toast.error("Title, Owner, and City are mandatory");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          propertyCategory: formData.propertyCategory,
          propertyType: formData.propertyType,
          transactionType: formData.transactionType,
          status: formData.status,
          ownerId: formData.ownerId,
          location: { address: formData.address, city: formData.city },
          pricing: {
            price:
              formData.transactionType === "Sale"
                ? Number(formData.price)
                : undefined,
            monthlyRent:
              formData.transactionType !== "Sale"
                ? Number(formData.monthlyRent)
                : undefined,
          },
          areaDetails: {
            carpetArea: Number(formData.carpetArea),
            areaUnit: formData.areaUnit,
          },
          residentialSpecs: {
            bedrooms: Number(formData.bedrooms),
            bathrooms: Number(formData.bathrooms),
            furnishing: formData.furnishing,
          },
          amenities: formData.amenities,
          media: {
            featuredImage: uploadedImages[0] || "",
            images: uploadedImages,
          },
          publishing: {
            publishOnWebsite: formData.publishOnWebsite,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create property");

      toast.success(`Property ${json.data.propertyId} listed successfully`);
      setIsCreateModalOpen(false);
      setUploadedImages([]);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (p: SsrPropertyItem) => {
    setEditingPropertyId(p._id);
    const ownerName = p.owner?.name ? `${p.owner.name} (${p.owner?.mobile || ""})` : "";
    setSelectedOwnerLabel(ownerName);
    setFormData({
      title: p.title || "",
      propertyCategory: p.propertyCategory || "Residential",
      propertyType: p.propertyType || "apartment",
      transactionType: p.transactionType || "Sale",
      status: p.status || "Available",
      ownerId: p.owner?._id || "",
      city: p.location?.city || "Bengaluru",
      address: p.location?.address || "",
      price: p.pricing?.price || 0,
      monthlyRent: p.pricing?.monthlyRent || 0,
      carpetArea: p.areaDetails?.carpetArea || 0,
      areaUnit: p.areaDetails?.areaUnit || "Sq. Ft.",
      bedrooms: p.bedrooms || 3,
      bathrooms: p.bathrooms || 2,
      furnishing: p.furnishing || "Unfurnished",
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      publishOnWebsite: Boolean(p.publishing?.publishOnWebsite),
    });
    setUploadedImages([]);
    refreshMasterOptions();
    setIsEditModalOpen(true);
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPropertyId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/properties/${editingPropertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          propertyCategory: formData.propertyCategory,
          propertyType: formData.propertyType,
          transactionType: formData.transactionType,
          status: formData.status,
          ownerId: formData.ownerId,
          location: { address: formData.address, city: formData.city },
          pricing: {
            price:
              formData.transactionType === "Sale"
                ? Number(formData.price)
                : undefined,
            monthlyRent:
              formData.transactionType !== "Sale"
                ? Number(formData.monthlyRent)
                : undefined,
          },
          areaDetails: {
            carpetArea: Number(formData.carpetArea),
            areaUnit: formData.areaUnit,
          },
          residentialSpecs: {
            bedrooms: Number(formData.bedrooms),
            bathrooms: Number(formData.bathrooms),
            furnishing: formData.furnishing,
          },
          amenities: formData.amenities,
          ...(uploadedImages.length > 0
            ? {
                media: {
                  featuredImage: uploadedImages[0],
                  images: uploadedImages,
                },
              }
            : {}),
          publishing: {
            publishOnWebsite: formData.publishOnWebsite,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update property");

      toast.success("Property updated successfully");
      setIsEditModalOpen(false);
      setEditingPropertyId(null);
      setUploadedImages([]);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to update property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = async (p: SsrPropertyItem) => {
    if (
      !confirm(`Are you sure you want to delete ${p.title} (${p.propertyId})?`)
    )
      return;

    try {
      const res = await fetch(`/api/properties/${p._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete property");

      toast.success("Property removed from inventory");
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete property");
    }
  };

  const handleTogglePublish = async (p: SsrPropertyItem) => {
    const nextState = !p.publishing?.publishOnWebsite;
    try {
      const res = await fetch(`/api/properties/${p._id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishOnWebsite: nextState,
        }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to update publishing state");

      toast.success(
        json.data.message ||
          (nextState ? "Published to website!" : "Taken offline"),
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Publishing toggle failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Building2 className="size-6 text-blue-600" />
            Properties Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Residential, commercial, plot, and pre-leased investment listings
            with automated unpublish rules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedOwnerLabel("");
            refreshMasterOptions();
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer"
        >
          <Plus className="size-4" />
          Add Property Listing
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, property ID, city, address, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFilterChange(search);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="w-full sm:w-auto min-w-[200px]">
            <DateRangeFilter
              placeholder="Filter by listing date..."
              className="w-full"
              defaultStartDate={searchParams.get("startDate")}
              defaultEndDate={searchParams.get("endDate")}
              onDateRangeChange={(start, end, startStr, endStr) => {
                const s = startStr || (start && !isNaN(start.getTime()) ? start.toISOString() : null);
                const e = endStr || (end && !isNaN(end.getTime()) ? end.toISOString() : null);
                handleFilterChange(undefined, undefined, undefined, undefined, s, e);
              }}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              handleFilterChange(undefined, e.target.value);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Categories</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Land">Land / Plots</option>
            <option value="Special Investment">Special Investment</option>
          </select>

          <select
            value={transTypeFilter}
            onChange={(e) => {
              setTransTypeFilter(e.target.value);
              handleFilterChange(undefined, undefined, e.target.value);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Transactions</option>
            <option value="Sale">For Sale</option>
            <option value="Rent">For Rent</option>
            <option value="Lease">For Lease</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              handleFilterChange(
                undefined,
                undefined,
                undefined,
                e.target.value,
              );
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Hold">Hold</option>
            <option value="Booked">Booked</option>
            <option value="Sold">Sold</option>
            <option value="Rented">Rented</option>
            <option value="Leased">Leased</option>
          </select>

          <button
            type="button"
            onClick={() =>
              handleFilterChange(
                search,
                categoryFilter,
                transTypeFilter,
                statusFilter,
              )
            }
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <TableHead className="w-14 shrink-0">Photo</TableHead>
              <TableHead className="whitespace-nowrap">Property ID</TableHead>
              <TableHead className="min-w-[200px]">Property Details</TableHead>
              <TableHead className="whitespace-nowrap">
                Owner (Mandatory)
              </TableHead>
              <TableHead className="whitespace-nowrap">
                Category / Type
              </TableHead>
              <TableHead className="whitespace-nowrap">
                Pricing / Rent
              </TableHead>
              <TableHead className="text-center whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="text-center whitespace-nowrap">
                Website Live
              </TableHead>
              <TableHead className="whitespace-nowrap">Created Date</TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialProperties.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-32 text-center text-xs text-slate-400"
                >
                  No properties found in inventory.
                </TableCell>
              </TableRow>
            ) : (
              initialProperties.map((p) => {
                const allImages = [
                  ...(p.media?.featuredImage ? [p.media.featuredImage] : []),
                  ...(Array.isArray(p.media?.images) ? p.media.images : []),
                ].filter((img, idx, arr) => arr.indexOf(img) === idx);
                const displayImage = allImages[0];

                return (
                  <TableRow
                    key={p._id}
                    className="hover:bg-slate-50/80 transition text-xs"
                  >
                    <TableCell className="w-14">
                      {displayImage ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewMedia({
                              title: p.title,
                              propertyId: p.propertyId,
                              images: allImages,
                              currentIndex: 0,
                            })
                          }
                          className="relative group block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition"
                          title="Click to view full image gallery"
                        >
                          <img
                            src={displayImage}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                          />
                          {allImages.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[9px] px-1 font-semibold rounded-tl">
                              +{allImages.length - 1}
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <Building2 className="size-5" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 whitespace-nowrap">
                      {p.propertyId}
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {p.title}
                      </div>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-1 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <MapPin className="size-3 text-slate-400 shrink-0" />
                          {p.location?.city}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-medium text-slate-600">
                          {p.areaDetails?.carpetArea ||
                            p.areaDetails?.builtUpArea ||
                            0}{" "}
                          {p.areaDetails?.areaUnit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {p.owner?.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.owner?.mobile}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {p.propertyCategory}
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize">
                        {p.propertyType?.replace(/_/g, " ")} (
                        {p.transactionType})
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {p.pricing?.price ? (
                        <div className="font-bold text-slate-900">
                          ₹{p.pricing.price.toLocaleString("en-IN")}
                        </div>
                      ) : p.pricing?.monthlyRent ? (
                        <div className="font-bold text-emerald-600">
                          ₹{p.pricing.monthlyRent.toLocaleString("en-IN")}/mo
                        </div>
                      ) : (
                        "Negotiable"
                      )}
                      {p.investmentSpecs?.grossYieldPercent ? (
                        <div className="text-[10px] font-bold text-purple-600">
                          {p.investmentSpecs.grossYieldPercent}% Gross Yield
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === "Available"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.status === "Sold"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : p.status === "Rented" || p.status === "Leased"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(p)}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                            p.publishing?.publishOnWebsite
                              ? "text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100"
                              : "text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100"
                          }`}
                          title={
                            p.publishing?.publishOnWebsite
                              ? "Click to take offline"
                              : "Click to publish on website"
                          }
                        >
                          <Globe
                            className={`size-3 ${p.publishing?.publishOnWebsite ? "text-emerald-600" : "text-slate-400"}`}
                          />
                          {p.publishing?.publishOnWebsite
                            ? "Live (Publish)"
                            : "Offline"}
                        </button>

                        {p.publishing?.publishOnWebsite && (
                          <a
                            href={`/portal-properties/${p.publishing.slug || p.propertyId.toLowerCase()}${currentUser?.agencySlug ? `?agency=${currentUser.agencySlug}` : ""}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Open live customer view on agency website portal"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {p.createdAt ? (
                        <div className="flex flex-col">
                          <span
                            className="font-medium text-slate-800"
                            suppressHydrationWarning
                          >
                            {new Date(p.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span
                            className="text-[10px] text-slate-400"
                            suppressHydrationWarning
                          >
                            {new Date(p.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition cursor-pointer"
                          title="Change Property Status & Allocate Client"
                        >
                          <FolderLock className="size-3.5 text-emerald-600" />
                          <span>Status / Allocate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          title="View Property Full Specs"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                          title="Edit Property Specs & Price"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProperty(p)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Delete Property"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{initialProperties.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{pagination.total}</span> total properties
            </div>

            {/* Rows Per Page Limit Selector */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-slate-600">Rows per page:</span>
              <select
                value={pagination.limit}
                onChange={(e) => {
                  const newLimit = e.target.value;
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("limit", newLimit);
                  params.set("page", "1");
                  startTransition(() => {
                    router.push(`/properties?${params.toString()}`);
                  });
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, pagination.page - 1)));
                startTransition(() => {
                  router.push(`/properties?${params.toString()}`);
                });
              }}
              disabled={pagination.page <= 1 || isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.min(pagination.totalPages, pagination.page + 1)));
                startTransition(() => {
                  router.push(`/properties?${params.toString()}`);
                });
              }}
              disabled={pagination.page >= pagination.totalPages || isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Property Full Specs Modal */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">
                      {selectedProperty?.title}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                      {selectedProperty?.propertyId}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedProperty?.status === "Available"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : selectedProperty?.status === "Sold"
                            ? "bg-purple-900 text-white"
                            : selectedProperty?.status === "Booked"
                              ? "bg-[#dcf836] text-slate-950 font-bold"
                              : selectedProperty?.status === "Hold"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {selectedProperty?.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Category: {selectedProperty?.propertyCategory} • Type:{" "}
                    {selectedProperty?.propertyType} • Transaction:{" "}
                    {selectedProperty?.transactionType}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              {loadingDetail ? (
                <div className="text-center py-16 text-slate-400">
                  Loading full property specifications...
                </div>
              ) : selectedProperty ? (
                <>
                  {/* CLIENT BUY / BOOK / HOLD TRACK RECORD CARD */}
                  {selectedProperty.booking ? (
                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="size-4 text-indigo-600" />
                          <span className="font-bold text-slate-900 text-xs">
                            Buyer / Client Allotment & Track Record
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-indigo-700">
                          {selectedProperty.booking.bookingNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Client Name
                          </span>
                          <span className="font-bold text-slate-900 text-xs">
                            {selectedProperty.booking.clientId?.clientName || "—"}
                          </span>
                          <span className="block text-[11px] text-slate-500 font-mono">
                            {selectedProperty.booking.clientId?.phone}
                          </span>
                          {selectedProperty.booking.clientId?._id && (
                            <a
                              href={`/client-information/${selectedProperty.booking.clientId._id}`}
                              className="text-blue-600 hover:underline text-[10px] font-semibold mt-1 inline-block"
                            >
                              Open Client CRM Profile &rarr;
                            </a>
                          )}
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-indigo-100 font-mono">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                            Deal Value & Balance
                          </span>
                          <div className="text-slate-900 font-bold text-xs">
                            Agreement: ₹{Number(selectedProperty.booking.agreementValue || 0).toLocaleString("en-IN")}
                          </div>
                          <div className="text-emerald-700 font-semibold text-[11px]">
                            Paid: ₹{Number(selectedProperty.booking.totalPaid || 0).toLocaleString("en-IN")}
                          </div>
                          <div className="text-rose-600 font-semibold text-[11px]">
                            Pending: ₹{Number(selectedProperty.booking.balanceAmount || 0).toLocaleString("en-IN")}
                          </div>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Allotment Stage & Locker
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                              selectedProperty.booking.bookingStatus === "Sold"
                                ? "bg-slate-900 text-white"
                                : selectedProperty.booking.bookingStatus === "Booked"
                                  ? "bg-[#dcf836] text-slate-950 font-bold"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {selectedProperty.booking.bookingStatus}
                          </span>
                          <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-medium">
                            <FolderLock className="size-3 text-slate-400" />
                            <span>{selectedProperty.booking.documents?.length || 0} Locker Files</span>
                          </div>
                          <a
                            href="/bookings"
                            className="text-indigo-600 hover:underline text-[10px] font-semibold inline-block mt-0.5"
                          >
                            Open in Client Track Record &rarr;
                          </a>
                        </div>
                      </div>

                      {/* Bank Loan summary if active */}
                      {selectedProperty.booking.loanDetails?.isLoanRequired && (
                        <div className="p-2.5 bg-white rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">
                              Bank Financing: {selectedProperty.booking.loanDetails.bankName || "Bank Loan"}
                            </span>
                            <span className="text-slate-500 block text-[11px]">
                              Status: {selectedProperty.booking.loanDetails.loanStatus || "In Process"} • A/C: {selectedProperty.booking.loanDetails.loanAccountNumber || "—"}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-slate-500 block text-[10px]">Sanctioned</span>
                            <span className="font-bold text-slate-900">
                              ₹{Number(selectedProperty.booking.loanDetails.sanctionedAmount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <div>
                          <span className="font-bold text-emerald-900">
                            Status: Available for Sale / Rent
                          </span>
                          <p className="text-[11px] text-emerald-700">
                            No buyer or tenant currently holding or booked on this property.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          handleOpenStatusModal(selectedProperty);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-2xs"
                      >
                        Allocate to Client &rarr;
                      </button>
                    </div>
                  )}

                  {/* Pricing & Valuation Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                        Asking Price / Rent
                      </span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                        {selectedProperty.pricing?.price
                          ? `₹${Number(selectedProperty.pricing.price).toLocaleString("en-IN")}`
                          : selectedProperty.pricing?.monthlyRent
                            ? `₹${Number(selectedProperty.pricing.monthlyRent).toLocaleString("en-IN")}/mo`
                            : "Negotiable"}
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                        Carpet / Area
                      </span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedProperty.areaDetails?.carpetArea ||
                          selectedProperty.areaDetails?.builtUpArea ||
                          0}{" "}
                        {selectedProperty.areaDetails?.areaUnit}
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                        Rate per Unit Area
                      </span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                        {selectedProperty.pricing?.pricePerUnitArea
                          ? `₹${Number(selectedProperty.pricing.pricePerUnitArea).toLocaleString("en-IN")}/${selectedProperty.areaDetails?.areaUnit || "sq ft"}`
                          : "—"}
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                        Negotiable
                      </span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedProperty.pricing?.isNegotiable ? "Yes (Flexible)" : "Fixed Price"}
                      </div>
                    </div>
                  </div>

                  {/* Owner & Location Grid */}
                  <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-500">
                        Owner Details:
                      </span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedProperty.ownerId?.name || "—"}
                      </div>
                      <div className="text-slate-500 font-mono">
                        {selectedProperty.ownerId?.mobile}
                      </div>
                      {selectedProperty.ownerId?.email && (
                        <div className="text-slate-400 text-[11px]">
                          {selectedProperty.ownerId.email}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">
                        Location:
                      </span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedProperty.location?.city}
                      </div>
                      <div className="text-slate-500">
                        {selectedProperty.location?.address}
                      </div>
                      {selectedProperty.location?.landmark && (
                        <div className="text-slate-400 text-[11px]">
                          Landmark: {selectedProperty.location.landmark}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project / Unit Interlink (if linked to a project) */}
                  {selectedProperty.projectId && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 uppercase text-[10px] font-bold block">
                          Linked Real Estate Project
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {selectedProperty.projectId.name}
                        </span>
                        <span className="text-slate-500 block text-[11px]">
                          Developer: {selectedProperty.projectId.developerName || "—"} • RERA: {selectedProperty.projectId.reraNumber || "—"}
                        </span>
                      </div>
                      {selectedProperty.unitId && (
                        <div className="text-right">
                          <span className="text-slate-400 uppercase text-[10px] font-bold block">
                            Unit Details
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {selectedProperty.unitId.towerName} • {selectedProperty.unitId.unitNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pre-Leased Commercial Investment Metrics */}
                  {selectedProperty.investmentSpecs?.grossYieldPercent ? (
                    <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200">
                      <div className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
                        <TrendingUp className="size-4" />
                        Pre-Leased Commercial Investment Metrics
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                        <div>
                          <div className="text-slate-500">Monthly Rent:</div>
                          <div className="font-bold text-slate-900">
                            ₹
                            {selectedProperty.investmentSpecs.currentMonthlyRent?.toLocaleString(
                              "en-IN",
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">
                            Expected Annual Rent:
                          </div>
                          <div className="font-bold text-slate-900">
                            ₹
                            {selectedProperty.investmentSpecs.expectedAnnualRent?.toLocaleString(
                              "en-IN",
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">
                            Calculated ROI / Yield:
                          </div>
                          <div className="font-bold text-purple-700">
                            {selectedProperty.investmentSpecs.grossYieldPercent}
                            %
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Amenities Tags */}
                  {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                    <div className="p-3.5 border border-slate-200 rounded-xl bg-white space-y-1.5">
                      <span className="font-bold text-slate-800 text-xs block">
                        Features & Amenities:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProperty.amenities.map((am: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                          >
                            ✓ {am}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description Notes */}
                  {selectedProperty.description && (
                    <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                      <span className="font-bold text-slate-800 text-xs block">
                        Property Description & Highlights:
                      </span>
                      <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">
                        {selectedProperty.description}
                      </p>
                    </div>
                  )}

                  {/* Website CMS Publishing Status */}
                  <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50">
                    <div>
                      <span className="font-semibold text-slate-800">
                        Website CMS Publishing:
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {selectedProperty.publishing?.publishOnWebsite
                          ? "This listing is live on company portal for customers."
                          : "This listing is offline and hidden from customers."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedProperty.publishing?.publishOnWebsite && (
                        <a
                          href={`/portal-properties/${selectedProperty.publishing.seo?.slug || selectedProperty.propertyId.toLowerCase()}${currentUser?.agencySlug ? `?agency=${currentUser.agencySlug}` : ""}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1 transition"
                        >
                          <ExternalLink className="size-3.5" />
                          View on Website
                        </a>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Plus className="size-4 text-blue-600" />
                Add New Property to Inventory
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateProperty}
              className="p-5 overflow-y-auto space-y-3.5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spacious 3BHK Apartment with Balcony"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property Images (Upload)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {isUploading && (
                    <p className="text-[11px] text-blue-600 mt-0.5">
                      Uploading image(s)...
                    </p>
                  )}
                  {uploadedImages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {uploadedImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="relative size-10 rounded-lg overflow-hidden border border-slate-200 group"
                        >
                          <img
                            src={imgUrl}
                            alt={`Upload ${idx + 1}`}
                            className="size-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(idx)}
                            className="absolute inset-0 bg-red-600/75 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Owner (Mandatory) *
                  </label>
                  <InfiniteScrollSelect
                    value={formData.ownerId}
                    onChange={(val, label) => {
                      setFormData({ ...formData, ownerId: val });
                      if (label) setSelectedOwnerLabel(label);
                    }}
                    placeholder="-- Search / Choose Landlord or Owner --"
                    options={ownerOptions}
                    isLoading={ownerIsLoading}
                    hasNextPage={ownerHasNextPage}
                    isFetchingNextPage={ownerIsFetchingNextPage}
                    fetchNextPage={handleOwnerFetchNextPage}
                    onSearchChange={handleOwnerSearchChange}
                    onOpen={handleOwnerOpen}
                    selectedLabel={selectedOwnerLabel}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property Type (from Master Settings) *
                  </label>
                  <SearchSelect
                    value={formData.propertyType}
                    onChange={(val) =>
                      setFormData({ ...formData, propertyType: val })
                    }
                    placeholder="Search / Select Property Type..."
                    options={propertyTypeSelectOptions}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Type *
                  </label>
                  <SearchSelect
                    value={formData.transactionType}
                    onChange={(val) =>
                      setFormData({ ...formData, transactionType: val })
                    }
                    placeholder="Search / Select Transaction..."
                    options={transactionTypeSelectOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status*
                  </label>
                  <SearchSelect
                    value={formData.status}
                    onChange={(val) =>
                      setFormData({ ...formData, status: val })
                    }
                    placeholder="Search / Select Status..."
                    options={propertyStatusSelectOptions}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {formData.transactionType === "Sale" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sale Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Rent (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyRent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthlyRent: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Carpet Area (Sq. Ft.)
                  </label>
                  <input
                    type="number"
                    value={formData.carpetArea}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        carpetArea: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Address / Locality *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100ft Road, Near Metro Station"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Furnishing, Bedrooms, Bathrooms & Amenities from Master Settings */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Furnishing (Master Settings)
                  </label>
                  <SearchSelect
                    value={formData.furnishing}
                    onChange={(val) =>
                      setFormData({ ...formData, furnishing: val })
                    }
                    placeholder="Search / Select Furnishing..."
                    options={furnishingSelectOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bedrooms / BHK
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bedrooms: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bathrooms: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Property Amenities (Master Settings)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {amenitiesOptions.length > 0
                      ? amenitiesOptions.map((opt) => {
                          const isChecked = formData.amenities.includes(
                            opt.label,
                          );
                          return (
                            <button
                              key={opt._id}
                              type="button"
                              onClick={() => {
                                const updated = isChecked
                                  ? formData.amenities.filter(
                                      (a) => a !== opt.label,
                                    )
                                  : [...formData.amenities, opt.label];
                                setFormData({
                                  ...formData,
                                  amenities: updated,
                                });
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                                isChecked
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isChecked ? "✓ " : "+ "}
                              {opt.label}
                            </button>
                          );
                        })
                      : [
                          "Gym",
                          "Swimming Pool",
                          "Clubhouse",
                          "24/7 Security",
                          "Power Backup",
                          "Covered Parking",
                        ].map((am) => {
                          const isChecked = formData.amenities.includes(am);
                          return (
                            <button
                              key={am}
                              type="button"
                              onClick={() => {
                                const updated = isChecked
                                  ? formData.amenities.filter((a) => a !== am)
                                  : [...formData.amenities, am];
                                setFormData({
                                  ...formData,
                                  amenities: updated,
                                });
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                                isChecked
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isChecked ? "✓ " : "+ "}
                              {am}
                            </button>
                          );
                        })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Listing..." : "Save Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Edit className="size-4 text-indigo-600" />
                Edit Property Details
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPropertyId(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUpdateProperty}
              className="p-5 overflow-y-auto space-y-3.5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Add More Images (Upload)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {isUploading && (
                    <p className="text-[11px] text-indigo-600 mt-0.5">
                      Uploading image(s)...
                    </p>
                  )}
                  {uploadedImages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {uploadedImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="relative size-10 rounded-lg overflow-hidden border border-slate-200 group"
                        >
                          <img
                            src={imgUrl}
                            alt={`Upload ${idx + 1}`}
                            className="size-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(idx)}
                            className="absolute inset-0 bg-red-600/75 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Owner (Mandatory) *
                  </label>
                  <InfiniteScrollSelect
                    value={formData.ownerId}
                    onChange={(val, label) => {
                      setFormData({ ...formData, ownerId: val });
                      if (label) setSelectedOwnerLabel(label);
                    }}
                    placeholder="-- Search / Choose Landlord or Owner --"
                    options={ownerOptions}
                    isLoading={ownerIsLoading}
                    hasNextPage={ownerHasNextPage}
                    isFetchingNextPage={ownerIsFetchingNextPage}
                    fetchNextPage={handleOwnerFetchNextPage}
                    onSearchChange={handleOwnerSearchChange}
                    onOpen={handleOwnerOpen}
                    selectedLabel={selectedOwnerLabel}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property Type (from Master Settings) *
                  </label>
                  <SearchSelect
                    value={formData.propertyType}
                    onChange={(val) =>
                      setFormData({ ...formData, propertyType: val })
                    }
                    placeholder="Search / Select Property Type..."
                    options={propertyTypeSelectOptions}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Type *
                  </label>
                  <SearchSelect
                    value={formData.transactionType}
                    onChange={(val) =>
                      setFormData({ ...formData, transactionType: val })
                    }
                    placeholder="Search / Select Transaction..."
                    options={transactionTypeSelectOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status*
                  </label>
                  <SearchSelect
                    value={formData.status}
                    onChange={(val) =>
                      setFormData({ ...formData, status: val })
                    }
                    placeholder="Search / Select Status..."
                    options={propertyStatusSelectOptions}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {formData.transactionType === "Sale" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sale Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Rent (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyRent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthlyRent: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Carpet Area (Sq. Ft.)
                  </label>
                  <input
                    type="number"
                    value={formData.carpetArea}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        carpetArea: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Address / Locality *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Furnishing, Bedrooms, Bathrooms & Amenities in Edit Modal */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Furnishing (Master Settings)
                  </label>
                  <SearchSelect
                    value={formData.furnishing}
                    onChange={(val) =>
                      setFormData({ ...formData, furnishing: val })
                    }
                    placeholder="Search / Select Furnishing..."
                    options={furnishingSelectOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bedrooms / BHK
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bedrooms: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bathrooms: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Property Amenities (Master Settings)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {amenitiesOptions.length > 0
                      ? amenitiesOptions.map((opt) => {
                          const isChecked = formData.amenities.includes(
                            opt.label,
                          );
                          return (
                            <button
                              key={opt._id}
                              type="button"
                              onClick={() => {
                                const updated = isChecked
                                  ? formData.amenities.filter(
                                      (a) => a !== opt.label,
                                    )
                                  : [...formData.amenities, opt.label];
                                setFormData({
                                  ...formData,
                                  amenities: updated,
                                });
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                                isChecked
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isChecked ? "✓ " : "+ "}
                              {opt.label}
                            </button>
                          );
                        })
                      : [
                          "Gym",
                          "Swimming Pool",
                          "Clubhouse",
                          "24/7 Security",
                          "Power Backup",
                          "Covered Parking",
                        ].map((am) => {
                          const isChecked = formData.amenities.includes(am);
                          return (
                            <button
                              key={am}
                              type="button"
                              onClick={() => {
                                const updated = isChecked
                                  ? formData.amenities.filter((a) => a !== am)
                                  : [...formData.amenities, am];
                                setFormData({
                                  ...formData,
                                  amenities: updated,
                                });
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                                isChecked
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isChecked ? "✓ " : "+ "}
                              {am}
                            </button>
                          );
                        })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingPropertyId(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Updating..." : "Update Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox / Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between text-white pb-3 px-1">
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  <span className="font-mono text-blue-400">
                    [{previewMedia.propertyId}]
                  </span>
                  <span>{previewMedia.title}</span>
                </div>
                {previewMedia.images.length > 1 && (
                  <div className="text-xs text-slate-300">
                    Photo {previewMedia.currentIndex + 1} of{" "}
                    {previewMedia.images.length}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                title="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Main Image Display */}
            <div className="relative w-full flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden border border-white/10 max-h-[75vh]">
              <img
                src={previewMedia.images[previewMedia.currentIndex]}
                alt={previewMedia.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl select-none"
              />

              {/* Prev / Next controls if multiple images */}
              {previewMedia.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewMedia((prev) =>
                        prev
                          ? {
                              ...prev,
                              currentIndex:
                                (prev.currentIndex - 1 + prev.images.length) %
                                prev.images.length,
                            }
                          : null,
                      )
                    }
                    className="absolute left-3 p-2 text-white bg-black/60 hover:bg-black/90 rounded-full border border-white/20 transition cursor-pointer"
                    title="Previous Photo"
                  >
                    <ChevronLeft className="size-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewMedia((prev) =>
                        prev
                          ? {
                              ...prev,
                              currentIndex:
                                (prev.currentIndex + 1) % prev.images.length,
                            }
                          : null,
                      )
                    }
                    className="absolute right-3 p-2 text-white bg-black/60 hover:bg-black/90 rounded-full border border-white/20 transition cursor-pointer"
                    title="Next Photo"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails row if multiple images */}
            {previewMedia.images.length > 1 && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto max-w-full py-1 px-2">
                {previewMedia.images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setPreviewMedia((prev) =>
                        prev ? { ...prev, currentIndex: idx } : null,
                      )
                    }
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition flex-shrink-0 cursor-pointer ${
                      idx === previewMedia.currentIndex
                        ? "border-blue-500 ring-2 ring-blue-400"
                        : "border-white/20 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* MODAL: PROPERTY STATUS & CLIENT ALLOCATION (Like Project Section) */}
      {isStatusModalOpen && statusTargetProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <FolderLock className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {statusTargetProperty.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {statusTargetProperty.propertyId} • {statusTargetProperty.propertyCategory} ({statusTargetProperty.propertyType})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePropertyStatus} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Carpet / Built-up Area
                  </span>
                  <span className="font-bold text-slate-800">
                    {statusTargetProperty.areaDetails?.carpetArea || statusTargetProperty.areaDetails?.builtUpArea || 0} {statusTargetProperty.areaDetails?.areaUnit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Price / Rent
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    {statusTargetProperty.pricing?.price
                      ? `₹${Number(statusTargetProperty.pricing.price).toLocaleString("en-IN")}`
                      : statusTargetProperty.pricing?.monthlyRent
                        ? `₹${Number(statusTargetProperty.pricing.monthlyRent).toLocaleString("en-IN")}/mo`
                        : "Negotiable"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Property Status *
                </label>
                <select
                  value={propertyStatusForm.status}
                  onChange={(e) =>
                    setPropertyStatusForm({
                      ...propertyStatusForm,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Available">Available (Active for Sale/Rent)</option>
                  <option value="Hold">Hold (Temporary Token Hold)</option>
                  <option value="Booked">Booked (Reserved with Buyer)</option>
                  <option value="Sold">Sold (Contract Closed)</option>
                  <option value="Rented">Rented</option>
                  <option value="Leased">Leased</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Client Allocation Section (Existing vs. New Client) */}
              {(propertyStatusForm.status === "Booked" ||
                propertyStatusForm.status === "Sold" ||
                propertyStatusForm.status === "Hold" ||
                propertyStatusForm.status === "Rented" ||
                propertyStatusForm.status === "Leased") && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">
                      Buyer / Client Allocation
                    </label>
                    <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setClientSelectionMode("existing")}
                        className={`px-2 py-0.5 rounded-md transition ${
                          clientSelectionMode === "existing"
                            ? "bg-white text-emerald-700 shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Existing Client
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientSelectionMode("new")}
                        className={`px-2 py-0.5 rounded-md transition ${
                          clientSelectionMode === "new"
                            ? "bg-white text-emerald-700 shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        + New Client
                      </button>
                    </div>
                  </div>

                  {clientSelectionMode === "existing" ? (
                    <div>
                      <select
                        value={propertyStatusForm.clientId}
                        onChange={(e) =>
                          setPropertyStatusForm({
                            ...propertyStatusForm,
                            clientId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">
                          -- Choose Buyer Client from CRM Directory --
                        </option>
                        {clientsList.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.clientName} ({c.phone})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Select a buyer client to log this property in their Client Track Record & Document Locker.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1 border-t border-slate-200/60 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Client Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={newClientForm.clientName}
                            onChange={(e) =>
                              setNewClientForm({
                                ...newClientForm,
                                clientName: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. 9876543210"
                            value={newClientForm.phone}
                            onChange={(e) =>
                              setNewClientForm({
                                ...newClientForm,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            placeholder="client@example.com"
                            value={newClientForm.email}
                            onChange={(e) =>
                              setNewClientForm({
                                ...newClientForm,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Company (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Company Name"
                            value={newClientForm.companyName}
                            onChange={(e) =>
                              setNewClientForm({
                                ...newClientForm,
                                companyName: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Address / Location
                        </label>
                        <input
                          type="text"
                          placeholder="Residential / City Address"
                          value={newClientForm.address}
                          onChange={(e) =>
                            setNewClientForm({
                              ...newClientForm,
                              address: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Agreement signed, Token received, Loan applied..."
                  value={propertyStatusForm.notes}
                  onChange={(e) =>
                    setPropertyStatusForm({
                      ...propertyStatusForm,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingStatus ? "Updating..." : "Save Status & Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
