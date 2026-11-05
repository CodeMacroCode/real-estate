"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Layers,
  Plus,
  Search,
  Building,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  Globe,
  Trash2,
  Eye,
  Sliders,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Upload,
  Edit,
  History,
  Tag,
  UserCheck,
  Building2,
  X,
  ChevronLeft,
} from "lucide-react";
import { SsrProjectItem } from "@/services/projectService";
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
import { SearchSelect, SearchOption } from "@/components/ui/SearchSelect";
import { DateRangeFilter } from "@/app/componets/ui/DateRangeFilter";

interface ProjectsClientProps {
  initialProjects: SsrProjectItem[];
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

export function ProjectsClient({
  initialProjects,
  pagination,
  masterOptions = [],
  currentUser,
  roleSlug,
}: ProjectsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [projectTypeFilter, setProjectTypeFilter] = useState(searchParams.get("projectType") || "ALL");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("constructionStatus") || "ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [selectedStructureData, setSelectedStructureData] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);

  // New Unit Modal
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [selectedProjectIdForUnit, setSelectedProjectIdForUnit] = useState<string>("");
  const [unitForm, setUnitForm] = useState({
    towerName: "Tower A",
    floorNumber: 1,
    unitNumber: "",
    unitType: "2BHK",
    carpetArea: 950,
    price: 6500000,
    status: "Available",
  });

  // Live Master Options state (SSR initial, updated on demand from /api/masters)
  const [liveMasterOptions, setLiveMasterOptions] = useState<SsrMasterOption[]>(masterOptions);
  const [isMastersLoading, setIsMastersLoading] = useState(false);

  // Single unified fetch for all master settings
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

  // Master Settings Options Extracted & Filtered
  const projectTypeSelectOptions: SearchOption[] = useMemo(() => {
    const active = liveMasterOptions
      .filter((o) => o.category === "property_types" && o.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    if (active.length > 0) {
      return active.map((o) => ({ value: o.label, label: o.label }));
    }
    return [
      { value: "Residential", label: "Residential" },
      { value: "Commercial", label: "Commercial" },
      { value: "Mixed-Use", label: "Mixed-Use" },
      { value: "Township", label: "Township" },
    ];
  }, [liveMasterOptions]);

  const projectStatusSelectOptions: SearchOption[] = useMemo(() => {
    const active = liveMasterOptions
      .filter((o) => o.category === "property_statuses" && o.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    if (active.length > 0) {
      return active.map((o) => ({ value: o.label, label: o.label }));
    }
    return [
      { value: "Pre-Launch", label: "Pre-Launch" },
      { value: "Under Construction", label: "Under Construction" },
      { value: "Ready to Move", label: "Ready to Move" },
    ];
  }, [liveMasterOptions]);

  const furnishingSelectOptions: SearchOption[] = useMemo(() => {
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

  // Project form state
  const [formData, setFormData] = useState({
    name: "",
    developerName: "",
    projectType: "Residential",
    constructionStatus: "Under Construction",
    city: "Bengaluru",
    address: "",
    reraNumber: "",
    furnishing: "Unfurnished",
    amenities: [] as string[],
    isPublishedOnWebsite: true,
  });
  const [uploadedCoverImage, setUploadedCoverImage] = useState<string>("");
  const [uploadedProjectImages, setUploadedProjectImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Project Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    developerName: "",
    projectType: "Residential",
    constructionStatus: "Under Construction",
    city: "Bengaluru",
    address: "",
    reraNumber: "",
    furnishing: "Unfurnished",
    amenities: [] as string[],
    isPublishedOnWebsite: true,
  });
  const [editCoverImage, setEditCoverImage] = useState<string>("");
  const [editProjectImages, setEditProjectImages] = useState<string[]>([]);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);

  // Unit Status & Transaction Management Modal State
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState<any>(null);
  const [unitAuditHistory, setUnitAuditHistory] = useState<any[]>([]);
  const [loadingUnitDetail, setLoadingUnitDetail] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitStatusUpdate, setUnitStatusUpdate] = useState({
    status: "Available",
    clientId: "",
    notes: "",
  });
  const [clientsList, setClientsList] = useState<Array<{ _id: string; clientName: string; phone: string }>>([]);

  // Image Preview Lightbox State
  const [previewMedia, setPreviewMedia] = useState<{
    title: string;
    projectId: string;
    images: string[];
    currentIndex: number;
  } | null>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingImage(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const data = new FormData();
        data.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: data,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Failed to upload ${file.name}`);
        return json.data.fileUrl;
      });

      const urls = await Promise.all(uploadPromises);
      if (!uploadedCoverImage && urls.length > 0) {
        setUploadedCoverImage(urls[0]);
      }
      setUploadedProjectImages((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} image(s) uploaded successfully`);
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFilterChange = (
    newSearch?: string,
    newType?: string,
    newStatus?: string,
    startDate?: string | null,
    endDate?: string | null
  ) => {
    const s = newSearch !== undefined ? newSearch : search;
    const t = newType !== undefined ? newType : projectTypeFilter;
    const st = newStatus !== undefined ? newStatus : statusFilter;

    const params = new URLSearchParams(searchParams.toString());
    if (s.trim()) params.set("search", s.trim());
    else params.delete("search");

    if (t && t !== "ALL") params.set("projectType", t);
    else params.delete("projectType");

    if (st && st !== "ALL") params.set("constructionStatus", st);
    else params.delete("constructionStatus");

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
      router.push(`/projects?${params.toString()}`);
    });
  };

  const handleOpenStructure = async (p: SsrProjectItem) => {
    try {
      setLoadingStructure(true);
      setIsStructureModalOpen(true);
      const res = await fetch(`/api/projects/${p._id}?view=structure`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load project structure");
      setSelectedStructureData(json.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load project structure");
      setIsStructureModalOpen(false);
    } finally {
      setLoadingStructure(false);
    }
  };

  const handleTogglePublish = async (project: SsrProjectItem) => {
    try {
      const nextState = !project.isPublishedOnWebsite;
      const res = await fetch(`/api/projects/${project._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublishedOnWebsite: nextState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update project status");

      toast.success(
        nextState
          ? `Project "${project.name}" published to website portal`
          : `Project "${project.name}" unpublished from website portal`
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Could not update publish state");
    }
  };

  const handleOpenEdit = (p: SsrProjectItem) => {
    setEditingProjectId(p._id);
    setEditFormData({
      name: p.name,
      developerName: p.developerName,
      projectType: p.projectType,
      constructionStatus: p.constructionStatus,
      city: p.location?.city || "Bengaluru",
      address: p.location?.address || "",
      reraNumber: p.reraNumber || "",
      furnishing: (p as any).furnishing || "Unfurnished",
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      isPublishedOnWebsite: p.isPublishedOnWebsite,
    });
    const imgs = p.images || [];
    setEditCoverImage(p.coverImage || imgs[0] || "");
    setEditProjectImages(imgs.length > 0 ? imgs : p.coverImage ? [p.coverImage] : []);
    refreshMasterOptions();
    setIsEditModalOpen(true);
  };

  const handleEditFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingEditImage(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const data = new FormData();
        data.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: data,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Failed to upload ${file.name}`);
        return json.data.fileUrl;
      });

      const urls = await Promise.all(uploadPromises);
      if (!editCoverImage && urls.length > 0) {
        setEditCoverImage(urls[0]);
      }
      setEditProjectImages((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} image(s) uploaded successfully`);
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setIsUploadingEditImage(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/projects/${editingProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name,
          developerName: editFormData.developerName,
          projectType: editFormData.projectType,
          constructionStatus: editFormData.constructionStatus,
          reraNumber: editFormData.reraNumber,
          amenities: editFormData.amenities,
          furnishing: editFormData.furnishing,
          isPublishedOnWebsite: editFormData.isPublishedOnWebsite,
          location: {
            city: editFormData.city,
            address: editFormData.address,
          },
          media: {
            coverImage: editCoverImage || editProjectImages[0] || "",
            images: editProjectImages,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update project");

      toast.success("Project updated successfully");
      setIsEditModalOpen(false);
      setEditingProjectId(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleOpenUnitDetail = async (unit: any) => {
    try {
      setLoadingUnitDetail(true);
      setIsUnitModalOpen(true);
      setSelectedUnitForDetail(unit);
      setUnitStatusUpdate({
        status: unit.status,
        clientId: unit.bookedByClientId || "",
        notes: "",
      });
      fetchClients();

      const res = await fetch(`/api/projects/units/${unit._id}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setSelectedUnitForDetail(json.data.unit);
        setUnitAuditHistory(json.data.auditHistory || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load unit details");
    } finally {
      setLoadingUnitDetail(false);
    }
  };

  const handleUpdateUnitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitForDetail) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/projects/units/${selectedUnitForDetail._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitStatusUpdate),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update unit status");

      toast.success(`Unit ${selectedUnitForDetail.unitNumber} status updated to ${unitStatusUpdate.status}`);
      setIsUnitModalOpen(false);
      setSelectedUnitForDetail(null);

      // Refresh current structure view
      if (selectedStructureData?.project?._id) {
        const structRes = await fetch(`/api/projects/${selectedStructureData.project._id}?view=structure`);
        const structJson = await structRes.json();
        if (structRes.ok && structJson.data) {
          setSelectedStructureData(structJson.data);
        }
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to update unit status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.developerName.trim() || !formData.city.trim()) {
      toast.error("Project name, developer, and city are mandatory");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          location: { address: formData.address, city: formData.city },
          amenities: formData.amenities,
          furnishing: formData.furnishing,
          media: {
            coverImage: uploadedCoverImage || uploadedProjectImages[0] || "",
            images: uploadedProjectImages,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create project");

      toast.success(`Project ${json.data.projectId} created successfully`);
      setIsCreateModalOpen(false);
      setUploadedCoverImage("");
      setUploadedProjectImages([]);
      setFormData({
        name: "",
        developerName: "",
        projectType: projectTypeSelectOptions[0]?.label || "Residential",
        constructionStatus: projectStatusSelectOptions[0]?.label || "Under Construction",
        city: "Bengaluru",
        address: "",
        reraNumber: "",
        furnishing: "Unfurnished",
        amenities: [],
        isPublishedOnWebsite: true,
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.unitNumber.trim()) {
      toast.error("Unit number is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/projects/${selectedProjectIdForUnit}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add unit");

      toast.success(`Unit ${json.data.unitNumber} added successfully`);
      setIsAddUnitModalOpen(false);
      setUnitForm({
        towerName: "Tower A",
        floorNumber: 1,
        unitNumber: "",
        unitType: "2BHK",
        carpetArea: 950,
        price: 6500000,
        status: "Available",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to add unit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Layers className="size-6 text-blue-600" />
            Projects & Structural Hierarchy
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            SSR Pre-rendered project inventory across towers, blocks, floors, and individual units with live status counters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            refreshMasterOptions();
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer"
        >
          <Plus className="size-4" />
          Create New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name, developer, city, or ID..."
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
              placeholder="Filter by created date..."
              className="w-full"
              defaultStartDate={searchParams.get("startDate")}
              defaultEndDate={searchParams.get("endDate")}
              onDateRangeChange={(start, end, startStr, endStr) => {
                const s = startStr || (start && !isNaN(start.getTime()) ? start.toISOString() : null);
                const e = endStr || (end && !isNaN(end.getTime()) ? end.toISOString() : null);
                handleFilterChange(undefined, undefined, undefined, s, e);
              }}
            />
          </div>

          <select
            value={projectTypeFilter}
            onChange={(e) => {
              setProjectTypeFilter(e.target.value);
              handleFilterChange(undefined, e.target.value, undefined);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Project Types</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Mixed-Use">Mixed-Use</option>
            <option value="Township">Township</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              handleFilterChange(undefined, undefined, e.target.value);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pre-Launch">Pre-Launch</option>
            <option value="Under Construction">Under Construction</option>
            <option value="Ready to Move">Ready to Move</option>
          </select>

          <button
            type="button"
            onClick={() => handleFilterChange(search, projectTypeFilter, statusFilter)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Search
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <TableHead className="w-14 shrink-0">Photo</TableHead>
              <TableHead className="whitespace-nowrap">Project ID</TableHead>
              <TableHead className="min-w-[180px]">Project & Developer</TableHead>
              <TableHead className="whitespace-nowrap">Type & Status</TableHead>
              <TableHead className="whitespace-nowrap">City & Location</TableHead>
              <TableHead className="text-center whitespace-nowrap">Live Units Rollup</TableHead>
              <TableHead className="text-center whitespace-nowrap">Website Display</TableHead>
              <TableHead className="whitespace-nowrap">Created Date</TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions & Structure</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-400">
                  No projects found. Create your first real estate project above.
                </TableCell>
              </TableRow>
            ) : (
              initialProjects.map((p) => {
                const allImages = [
                  ...(p.coverImage ? [p.coverImage] : []),
                  ...(Array.isArray(p.images) ? p.images : []),
                ].filter((img, idx, arr) => arr.indexOf(img) === idx);
                const displayImage = allImages[0];

                return (
                <TableRow key={p._id} className="hover:bg-slate-50/80 transition text-xs">
                  <TableCell className="w-14">
                    {displayImage ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewMedia({
                            title: p.name,
                            projectId: p.projectId,
                            images: allImages,
                            currentIndex: 0,
                          })
                        }
                        className="relative group block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition"
                        title="Click to view full project images"
                      >
                        <img
                          src={displayImage}
                          alt={p.name}
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
                    {p.projectId}
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    <div className="font-semibold text-slate-900 leading-snug">{p.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">By {p.developerName}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium text-slate-800">{p.projectType}</div>
                    <div className="text-[10px] text-slate-400">{p.constructionStatus}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-700 font-medium">
                      <MapPin className="size-3 text-slate-400" />
                      {p.location?.city}
                    </div>
                    {p.location?.address && (
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                        {p.location.address}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 text-[11px]">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" title="Available">
                        {p.availableUnits} Avail
                      </span>
                      <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="Booked">
                        {p.bookedUnits} B
                      </span>
                      <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200" title="Sold">
                        {p.soldUnits} S
                      </span>
                      <span className="text-slate-400 text-[10px]" title="Total Units">
                        ({p.totalUnits} T)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(p)}
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                          p.isPublishedOnWebsite
                            ? "text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100"
                            : "text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                        title={p.isPublishedOnWebsite ? "Click to take project offline" : "Click to publish project to website portal"}
                      >
                        <Globe className={`size-3 ${p.isPublishedOnWebsite ? "text-emerald-600" : "text-slate-400"}`} />
                        {p.isPublishedOnWebsite ? "Live on Web" : "Offline"}
                      </button>

                      {p.isPublishedOnWebsite && (
                        <a
                          href={`/portal-projects/${p.slug || p.projectId.toLowerCase()}${currentUser?.agencySlug ? `?agency=${currentUser.agencySlug}` : ""}`}
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
                        <span className="font-medium text-slate-800" suppressHydrationWarning>
                          {new Date(p.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400" suppressHydrationWarning>
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
                      <Link
                        href={`/projects/${encodeURIComponent(p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition cursor-pointer"
                        title="Open Project Inventory Tree & Elevation"
                      >
                        <Eye className="size-3.5" />
                        <span>Tree Structure</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                        title="Edit Project Details"
                      >
                        <Edit className="size-4" />
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
              Showing <span className="font-semibold text-slate-800">{initialProjects.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{pagination.total}</span> total projects
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
                    router.push(`/projects?${params.toString()}`);
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
                  router.push(`/projects?${params.toString()}`);
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
                  router.push(`/projects?${params.toString()}`);
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

      {/* Structural Tree Modal */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Layers className="size-5 text-blue-600" />
                  Structural Hierarchy Tree
                </h3>
                {selectedStructureData?.project && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedStructureData.project.name} ({selectedStructureData.project.projectId}) • By{" "}
                    {selectedStructureData.project.developerName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStructureModalOpen(false);
                  setSelectedStructureData(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {loadingStructure ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  Loading structural towers, floors, and units...
                </div>
              ) : selectedStructureData?.structure?.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No towers or units added to this project yet. Click &quot;Add Unit&quot; from the table.
                </div>
              ) : (
                selectedStructureData?.structure?.map((tower: any) => (
                  <div key={tower.towerName} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100/80 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building className="size-4 text-blue-600" />
                        {tower.towerName}
                      </span>
                      <span className="text-[11px] font-normal text-slate-500">
                        {tower.floors.length} Floors
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      {tower.floors.map((fl: any) => (
                        <div key={fl.floorNumber} className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                          <div className="w-16 shrink-0 text-xs font-bold text-slate-500 pt-1">
                            Floor {fl.floorNumber}
                          </div>
                          <div className="flex-1 flex flex-wrap gap-2">
                            {fl.units.map((u: any) => (
                              <button
                                key={u._id}
                                type="button"
                                onClick={() => handleOpenUnitDetail(u)}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs flex flex-col gap-0.5 text-left transition hover:ring-2 hover:ring-blue-400 cursor-pointer ${
                                  u.status === "Available"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                                    : u.status === "Booked"
                                    ? "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                                    : u.status === "Sold"
                                    ? "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100"
                                    : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                                }`}
                                title="Click to view full unit transaction tracks & change status"
                              >
                                <div className="font-bold flex items-center justify-between gap-2">
                                  <span>{u.unitNumber}</span>
                                  <span className="text-[10px] font-semibold">{u.unitType}</span>
                                </div>
                                <div className="text-[10px] opacity-80">
                                  ₹{Number(u.price).toLocaleString("en-IN")} • {u.status}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {isAddUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Plus className="size-4 text-emerald-600" />
                Add Unit to Project
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUnit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tower / Block Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitForm.towerName}
                    onChange={(e) => setUnitForm({ ...unitForm, towerName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Floor Number *
                  </label>
                  <input
                    type="number"
                    required
                    value={unitForm.floorNumber}
                    onChange={(e) => setUnitForm({ ...unitForm, floorNumber: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit / Flat Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A-402"
                    value={unitForm.unitNumber}
                    onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Type *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2BHK, 3BHK"
                    value={unitForm.unitType}
                    onChange={(e) => setUnitForm({ ...unitForm, unitType: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Carpet Area (Sq. Ft.)
                  </label>
                  <input
                    type="number"
                    value={unitForm.carpetArea}
                    onChange={(e) => setUnitForm({ ...unitForm, carpetArea: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={unitForm.price}
                    onChange={(e) => setUnitForm({ ...unitForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUnitModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Plus className="size-4 text-blue-600" />
                Create New Real Estate Project
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-5 overflow-y-auto space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prestige Eden"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Developer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prestige Group"
                    value={formData.developerName}
                    onChange={(e) => setFormData({ ...formData, developerName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Type (Category) *
                  </label>
                  <SearchSelect
                    value={formData.projectType}
                    onChange={(val) => setFormData({ ...formData, projectType: val })}
                    placeholder="Search / Select Project Type..."
                    options={projectTypeSelectOptions}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Construction Status *
                  </label>
                  <SearchSelect
                    value={formData.constructionStatus}
                    onChange={(val) => setFormData({ ...formData, constructionStatus: val })}
                    placeholder="Search / Select Status..."
                    options={projectStatusSelectOptions}
                  />
                </div>
              </div>

              {/* Furnishing & Amenities from Master Settings */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Furnishing Option (Master Settings)
                  </label>
                  <SearchSelect
                    value={formData.furnishing}
                    onChange={(val) => setFormData({ ...formData, furnishing: val })}
                    placeholder="Search / Select Furnishing..."
                    options={furnishingSelectOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Project Amenities (Master Settings)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {amenitiesOptions.length > 0 ? (
                      amenitiesOptions.map((opt) => {
                        const isChecked = formData.amenities.includes(opt.label);
                        return (
                          <button
                            key={opt._id}
                            type="button"
                            onClick={() => {
                              const updated = isChecked
                                ? formData.amenities.filter((a) => a !== opt.label)
                                : [...formData.amenities, opt.label];
                              setFormData({ ...formData, amenities: updated });
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
                    ) : (
                      ["Gym", "Swimming Pool", "Clubhouse", "24/7 Security", "Power Backup", "Covered Parking"].map(
                        (am) => {
                          const isChecked = formData.amenities.includes(am);
                          return (
                            <button
                              key={am}
                              type="button"
                              onClick={() => {
                                const updated = isChecked
                                  ? formData.amenities.filter((a) => a !== am)
                                  : [...formData.amenities, am];
                                setFormData({ ...formData, amenities: updated });
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
                        }
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RERA Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRM/KA/RERA/..."
                    value={formData.reraNumber}
                    onChange={(e) => setFormData({ ...formData, reraNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Off Sarjapur Road, Near Wipro Campus"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Project Images Uploader */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Project Photos & Cover Image
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 text-center transition bg-slate-50/50">
                  <input
                    type="file"
                    id="project-images-upload"
                    multiple
                    accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.gif,.avif,.bmp,.tiff,.heic"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                  <label
                    htmlFor="project-images-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    <Upload className="size-5 text-slate-400" />
                    <span className="text-xs font-medium text-blue-600 hover:underline">
                      {isUploadingImage ? "Uploading images..." : "Click to upload project images"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      All image formats supported (JPG, PNG, WEBP, SVG, GIF, AVIF, HEIC) up to 25MB
                    </span>
                  </label>
                </div>

                {uploadedProjectImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uploadedProjectImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative size-14 rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={imgUrl} alt={`Upload ${idx + 1}`} className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedProjectImages((prev) => prev.filter((_, i) => i !== idx));
                            if (uploadedCoverImage === imgUrl) {
                              setUploadedCoverImage(uploadedProjectImages.filter((_, i) => i !== idx)[0] || "");
                            }
                          }}
                          className="absolute inset-0 bg-red-600/75 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Edit className="size-4 text-indigo-600" />
                Edit Real Estate Project
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingProjectId(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="p-5 overflow-y-auto space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Developer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.developerName}
                    onChange={(e) => setEditFormData({ ...editFormData, developerName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Type (Category) *
                  </label>
                  <SearchSelect
                    value={editFormData.projectType}
                    onChange={(val) => setEditFormData({ ...editFormData, projectType: val })}
                    placeholder="Search / Select Project Type..."
                    options={projectTypeSelectOptions}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Construction Status *
                  </label>
                  <SearchSelect
                    value={editFormData.constructionStatus}
                    onChange={(val) => setEditFormData({ ...editFormData, constructionStatus: val })}
                    placeholder="Search / Select Status..."
                    options={projectStatusSelectOptions}
                  />
                </div>
              </div>

              {/* Furnishing & Amenities (Edit Modal) from Master Settings */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Furnishing Option (Master Settings)
                  </label>
                  <SearchSelect
                    value={editFormData.furnishing}
                    onChange={(val) => setEditFormData({ ...editFormData, furnishing: val })}
                    placeholder="Search / Select Furnishing..."
                    options={furnishingSelectOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Project Amenities (Master Settings)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {amenitiesOptions.length > 0 ? (
                      amenitiesOptions.map((opt) => {
                        const isChecked = editFormData.amenities.includes(opt.label);
                        return (
                          <button
                            key={opt._id}
                            type="button"
                            onClick={() => {
                              const updated = isChecked
                                ? editFormData.amenities.filter((a) => a !== opt.label)
                                : [...editFormData.amenities, opt.label];
                              setEditFormData({ ...editFormData, amenities: updated });
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
                    ) : (
                      ["Gym", "Swimming Pool", "Clubhouse", "24/7 Security", "Power Backup", "Covered Parking"].map(
                        (am) => {
                          const isChecked = editFormData.amenities.includes(am);
                          return (
                            <button
                              key={am}
                              type="button"
                              onClick={() => {
                                const updated = isChecked
                                  ? editFormData.amenities.filter((a) => a !== am)
                                  : [...editFormData.amenities, am];
                                setEditFormData({ ...editFormData, amenities: updated });
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
                        }
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RERA Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.reraNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, reraNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Address
                </label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Edit Project Images Uploader */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Update Photos & Cover Image
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-3 text-center transition bg-slate-50/50">
                  <input
                    type="file"
                    id="edit-project-images-upload"
                    multiple
                    accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.gif,.avif,.bmp,.tiff,.heic"
                    onChange={(e) => handleEditFileUpload(e.target.files)}
                    className="hidden"
                    disabled={isUploadingEditImage}
                  />
                  <label
                    htmlFor="edit-project-images-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    <Upload className="size-5 text-slate-400" />
                    <span className="text-xs font-medium text-indigo-600 hover:underline">
                      {isUploadingEditImage ? "Uploading photos..." : "Click to upload/add project photos"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      All formats supported (JPG, PNG, WEBP, SVG, GIF, AVIF, HEIC)
                    </span>
                  </label>
                </div>

                {editProjectImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editProjectImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative size-14 rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={imgUrl} alt={`Project ${idx + 1}`} className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setEditProjectImages((prev) => prev.filter((_, i) => i !== idx));
                            if (editCoverImage === imgUrl) {
                              setEditCoverImage(editProjectImages.filter((_, i) => i !== idx)[0] || "");
                            }
                          }}
                          className="absolute inset-0 bg-red-600/75 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsPublished"
                  checked={editFormData.isPublishedOnWebsite}
                  onChange={(e) => setEditFormData({ ...editFormData, isPublishedOnWebsite: e.target.checked })}
                  className="size-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="editIsPublished" className="text-xs font-medium text-slate-700">
                  Publish project on public customer website portal
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingProjectId(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Status & Transaction History Modal */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Tag className="size-4 text-blue-600" />
                  Unit {selectedUnitForDetail?.unitNumber} Transaction & Status Management
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tower: {selectedUnitForDetail?.towerName} • Floor {selectedUnitForDetail?.floorNumber} • {selectedUnitForDetail?.unitType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUnitModalOpen(false);
                  setSelectedUnitForDetail(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {loadingUnitDetail ? (
                <div className="text-center py-10 text-xs text-slate-400">Loading unit transaction profile...</div>
              ) : (
                <>
                  {/* Current Unit Specs */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400">Price:</span>
                      <div className="font-bold text-slate-900">₹{Number(selectedUnitForDetail?.price || 0).toLocaleString("en-IN")}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Carpet Area:</span>
                      <div className="font-bold text-slate-800">{selectedUnitForDetail?.carpetArea || 0} Sq. Ft.</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Current Status:</span>
                      <div>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            selectedUnitForDetail?.status === "Available"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : selectedUnitForDetail?.status === "Booked"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : selectedUnitForDetail?.status === "Sold"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {selectedUnitForDetail?.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buyer / Client Assignment if Booked or Sold */}
                  {selectedUnitForDetail?.bookedByClientId && (
                    <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs">
                      <div className="font-bold text-blue-900 flex items-center gap-1.5 mb-1.5">
                        <UserCheck className="size-4 text-blue-600" />
                        Assigned Client / Buyer Profile
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Client Name</span>
                          <span className="font-semibold">{selectedUnitForDetail.bookedByClientId.clientName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Contact Number</span>
                          <span className="font-mono">{selectedUnitForDetail.bookedByClientId.phone}</span>
                        </div>
                        {selectedUnitForDetail.bookingDate && (
                          <div className="col-span-2">
                            <span className="text-slate-400 text-[10px] block">Transaction Timestamp</span>
                            <span className="text-slate-600" suppressHydrationWarning>
                              {new Date(selectedUnitForDetail.bookingDate).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Transition Form */}
                  <form onSubmit={handleUpdateUnitStatus} className="p-4 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Update Unit Transaction Status
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          New Status *
                        </label>
                        <select
                          value={unitStatusUpdate.status}
                          onChange={(e) => setUnitStatusUpdate({ ...unitStatusUpdate, status: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="Available">Available</option>
                          <option value="Hold">Hold</option>
                          <option value="Booked">Booked</option>
                          <option value="Sold">Sold</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                      </div>

                      {(unitStatusUpdate.status === "Booked" || unitStatusUpdate.status === "Sold") && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Link Buyer / Client
                          </label>
                          <select
                            value={unitStatusUpdate.clientId}
                            onChange={(e) => setUnitStatusUpdate({ ...unitStatusUpdate, clientId: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select Existing Client...</option>
                            {clientsList.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.clientName} ({c.phone})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Transaction Notes / Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Agreement signed, Token received, etc."
                        value={unitStatusUpdate.notes}
                        onChange={(e) => setUnitStatusUpdate({ ...unitStatusUpdate, notes: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? "Updating..." : "Save Status & Track"}
                      </button>
                    </div>
                  </form>

                  {/* Audit Logs & Transaction History */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <History className="size-3.5 text-slate-400" />
                      Unit Status Audit Trail & History
                    </h4>
                    {unitAuditHistory.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        No prior status modifications recorded for this unit.
                      </div>
                    ) : (
                      <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-48 overflow-y-auto">
                        {unitAuditHistory.map((log: any) => (
                          <div key={log._id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-800">
                                Changed from <span className="font-bold text-slate-600">{log.oldValues?.status || "Initial"}</span> to{" "}
                                <span className="font-bold text-blue-600">{log.newValues?.status}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                By {log.actor?.name} ({log.actor?.roleSlug})
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-400" suppressHydrationWarning>
                              {new Date(log.createdAt).toLocaleString("en-IN")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Image Lightbox / Modal */}
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
                  <span className="font-mono text-blue-400">[{previewMedia.projectId}]</span>
                  <span>{previewMedia.title}</span>
                </div>
                {previewMedia.images.length > 1 && (
                  <div className="text-xs text-slate-300">
                    Photo {previewMedia.currentIndex + 1} of {previewMedia.images.length}
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
                          : null
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
                          : null
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
                        prev ? { ...prev, currentIndex: idx } : null
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
    </div>
  );
}

