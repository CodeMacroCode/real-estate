"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Plus,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  X,
  Sparkles,
  Home,
  DollarSign,
  Maximize2,
  Share2,
  Edit2,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface ProjectUnitItem {
  _id: string;
  towerName: string;
  floorNumber: number;
  unitNumber: string;
  unitType: string;
  carpetArea: number;
  builtUpArea?: number;
  price: number;
  status: "Available" | "Hold" | "Booked" | "Sold" | "Cancelled" | "Blocked";
  facing?: string;
  parkingSlots?: number;
  bookedByClientId?: string | null;
  bookingDate?: string | null;
  notes?: string;
}

interface FloorGroup {
  floorNumber: number;
  units: ProjectUnitItem[];
}

interface TowerGroup {
  towerName: string;
  floors: FloorGroup[];
}

interface ProjectData {
  _id: string;
  projectId: string;
  name: string;
  developerName: string;
  constructionStatus: string;
  towers?: string[];
  totalUnits: number;
  availableUnits: number;
  bookedUnits: number;
  soldUnits: number;
}

export default function ProjectInventoryTreePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [project, setProject] = useState<ProjectData | null>(null);
  const [structure, setStructure] = useState<TowerGroup[]>([]);
  const [allUnits, setAllUnits] = useState<ProjectUnitItem[]>([]);

  // Selected Active Tower Tab
  const [activeTower, setActiveTower] = useState<string>("");

  // Selected Floor in Building Elevation (like "Floor 16" in reference images)
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(
    null,
  );

  // Tower Modals (Add / Edit Tower)
  const [isAddTowerModalOpen, setIsAddTowerModalOpen] = useState(false);
  const [newTowerName, setNewTowerName] = useState("");
  const [isSubmittingTower, setIsSubmittingTower] = useState(false);

  const [isEditTowerModalOpen, setIsEditTowerModalOpen] = useState(false);
  const [editTowerName, setEditTowerName] = useState("");
  const [isRenamingTower, setIsRenamingTower] = useState(false);

  // Unit Modals (Add / Edit Unit)
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);
  const [unitForm, setUnitForm] = useState({
    floorNumber: 1,
    unitNumber: "",
    unitType: "2BHK",
    carpetArea: 950,
    price: 6500000,
    status: "Available",
  });

  const [isEditUnitModalOpen, setIsEditUnitModalOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [isUpdatingUnit, setIsUpdatingUnit] = useState(false);
  const [editUnitForm, setEditUnitForm] = useState({
    floorNumber: 1,
    unitNumber: "",
    unitType: "2BHK",
    carpetArea: 950,
    price: 6500000,
  });

  // Selected Unit Inspection Drawer / Modal
  const [selectedUnit, setSelectedUnit] = useState<ProjectUnitItem | null>(
    null,
  );
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [unitStatusUpdate, setUnitStatusUpdate] = useState({
    status: "Available",
    clientId: "",
    notes: "",
  });
  const [clientsList, setClientsList] = useState<any[]>([]);

  // Client Mode in Status Modal: 'existing' vs 'new'
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

  // Filtering states on current Tower inventory
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>("ALL");
  const [unitSearch, setUnitSearch] = useState<string>("");

  // Pagination & limit for Units Directory Table
  const [tablePage, setTablePage] = useState<number>(1);
  const [tableLimit, setTableLimit] = useState<number>(10);

  // Fetch structure data
  const fetchStructure = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}?view=structure`);
      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.error || "Failed to load project structure");
      }

      setProject(json.data.project);
      if (typeof window !== "undefined" && json.data.project?.name) {
        window.dispatchEvent(
          new CustomEvent("updateBreadcrumbLabel", {
            detail: { segment: projectId, label: json.data.project.name },
          }),
        );
      }
      const struct: TowerGroup[] = json.data.structure || [];
      setStructure(struct);
      setAllUnits(json.data.allUnits || []);

      // If no active tower set, set to first tower
      if (struct.length > 0) {
        setActiveTower((prev) => {
          if (prev && struct.some((t) => t.towerName === prev)) return prev;
          return struct[0].towerName;
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load project structure");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

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

  // Current active tower group
  const currentTowerGroup = useMemo(() => {
    if (!activeTower) return null;
    return structure.find((t) => t.towerName === activeTower) || null;
  }, [structure, activeTower]);

  // Sorted unique floors in current tower (descending for architectural elevation: top floor first)
  const sortedFloorsDesc = useMemo(() => {
    if (!currentTowerGroup) return [];
    return [...currentTowerGroup.floors].sort(
      (a, b) => b.floorNumber - a.floorNumber,
    );
  }, [currentTowerGroup]);

  // Set default selected floor if not set
  useEffect(() => {
    if (sortedFloorsDesc.length > 0) {
      setSelectedFloorNumber((prev) => {
        if (
          prev !== null &&
          sortedFloorsDesc.some((f) => f.floorNumber === prev)
        ) {
          return prev;
        }
        return sortedFloorsDesc[0].floorNumber;
      });
    } else {
      setSelectedFloorNumber(null);
    }
  }, [sortedFloorsDesc]);

  // Units under current tower
  const towerUnits = useMemo(() => {
    if (!currentTowerGroup) return [];
    const list: ProjectUnitItem[] = [];
    for (const fl of currentTowerGroup.floors) {
      list.push(...fl.units);
    }
    return list;
  }, [currentTowerGroup]);

  // Units on currently selected floor
  const selectedFloorGroup = useMemo(() => {
    if (!currentTowerGroup || selectedFloorNumber === null) return null;
    return (
      currentTowerGroup.floors.find(
        (f) => f.floorNumber === selectedFloorNumber,
      ) || null
    );
  }, [currentTowerGroup, selectedFloorNumber]);

  // Filtered units matching toolbar
  const filteredUnits = useMemo(() => {
    return towerUnits.filter((u) => {
      const matchStatus = statusFilter === "ALL" || u.status === statusFilter;
      const matchType =
        unitTypeFilter === "ALL" ||
        u.unitType.toLowerCase() === unitTypeFilter.toLowerCase();
      const matchSearch =
        !unitSearch.trim() ||
        u.unitNumber.toLowerCase().includes(unitSearch.toLowerCase()) ||
        String(u.floorNumber).includes(unitSearch);
      return matchStatus && matchType && matchSearch;
    });
  }, [towerUnits, statusFilter, unitTypeFilter, unitSearch]);

  // Sorted list for directory table
  const sortedDirectoryUnits = useMemo(() => {
    return towerUnits.slice().sort((a, b) => {
      if (b.floorNumber !== a.floorNumber)
        return b.floorNumber - a.floorNumber;
      return a.unitNumber.localeCompare(b.unitNumber);
    });
  }, [towerUnits]);

  // Total pages and paginated slice for directory table
  const totalDirectoryPages = Math.max(1, Math.ceil(sortedDirectoryUnits.length / tableLimit));
  const paginatedDirectoryUnits = useMemo(() => {
    const startIndex = (tablePage - 1) * tableLimit;
    return sortedDirectoryUnits.slice(startIndex, startIndex + tableLimit);
  }, [sortedDirectoryUnits, tablePage, tableLimit]);

  // Reset page when active tower changes or if tablePage exceeds total pages
  useEffect(() => {
    setTablePage(1);
  }, [activeTower]);

  useEffect(() => {
    if (tablePage > totalDirectoryPages) {
      setTablePage(totalDirectoryPages);
    }
  }, [totalDirectoryPages, tablePage]);

  // Key KPI stats for active tower
  const towerStats = useMemo(() => {
    const total = towerUnits.length;
    const available = towerUnits.filter((u) => u.status === "Available").length;
    const booked = towerUnits.filter((u) => u.status === "Booked").length;
    const sold = towerUnits.filter((u) => u.status === "Sold").length;
    const hold = towerUnits.filter(
      (u) => u.status === "Hold" || u.status === "Blocked",
    ).length;

    const sellThroughPercent = total > 0 ? ((sold + booked) / total) * 100 : 0;
    const totalRevenue =
      sold + booked > 0
        ? towerUnits
            .filter((u) => u.status === "Sold" || u.status === "Booked")
            .reduce((acc, curr) => acc + (curr.price || 0), 0)
        : 0;

    const unsoldRevenue =
      available + hold > 0
        ? towerUnits
            .filter(
              (u) =>
                u.status === "Available" ||
                u.status === "Hold" ||
                u.status === "Blocked",
            )
            .reduce((acc, curr) => acc + (curr.price || 0), 0)
        : 0;

    return {
      total,
      available,
      booked,
      sold,
      hold,
      sellThroughPercent: sellThroughPercent.toFixed(1),
      totalRevenue,
      unsoldRevenue,
    };
  }, [towerUnits]);

  // Stats for the currently selected floor
  const floorStats = useMemo(() => {
    if (!selectedFloorGroup) return null;
    const units = selectedFloorGroup.units;
    const total = units.length;
    const sold = units.filter((u) => u.status === "Sold").length;
    const booked = units.filter((u) => u.status === "Booked").length;
    const available = units.filter((u) => u.status === "Available").length;
    const hold = units.filter(
      (u) => u.status === "Hold" || u.status === "Blocked",
    ).length;
    const sellThrough =
      total > 0 ? Math.round(((sold + booked) / total) * 100) : 0;
    const avgPrice =
      total > 0
        ? Math.round(units.reduce((acc, u) => acc + u.price, 0) / total)
        : 0;

    return {
      total,
      sold,
      booked,
      available,
      hold,
      sellThrough,
      avgPrice,
    };
  }, [selectedFloorGroup]);

  // Handle Add Tower (Only Tower / Block Name *)
  const handleCreateTower = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTowerName.trim()) {
      toast.error("Tower / Block Name is required");
      return;
    }

    try {
      setIsSubmittingTower(true);
      const res = await fetch(`/api/projects/${projectId}/towers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ towerName: newTowerName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create tower");

      toast.success(json.data?.message || "Tower created successfully!");
      const createdName = newTowerName.trim();
      setNewTowerName("");
      setIsAddTowerModalOpen(false);
      await fetchStructure();
      setActiveTower(createdName);
    } catch (err: any) {
      toast.error(err.message || "Failed to add tower");
    } finally {
      setIsSubmittingTower(false);
    }
  };

  // Handle Edit / Rename Tower
  const handleRenameTower = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTowerName.trim()) {
      toast.error("Tower name cannot be empty");
      return;
    }

    try {
      setIsRenamingTower(true);
      const res = await fetch(`/api/projects/${projectId}/towers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldTowerName: activeTower,
          newTowerName: editTowerName.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to rename tower");

      toast.success(json.data?.message || "Tower renamed successfully!");
      const renamed = editTowerName.trim();
      setIsEditTowerModalOpen(false);
      await fetchStructure();
      setActiveTower(renamed);
    } catch (err: any) {
      toast.error(err.message || "Failed to rename tower");
    } finally {
      setIsRenamingTower(false);
    }
  };

  // Handle Add Unit
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTower) {
      toast.error("Please create or select a Tower first");
      return;
    }
    if (!unitForm.unitNumber.trim()) {
      toast.error("Flat / Unit Number is required");
      return;
    }

    try {
      setIsSubmittingUnit(true);
      const res = await fetch(`/api/projects/${projectId}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...unitForm,
          towerName: activeTower,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add unit");

      toast.success(`Unit ${json.data.unitNumber} added to ${activeTower}`);
      setIsAddUnitModalOpen(false);
      const targetFloor = unitForm.floorNumber;
      setUnitForm({
        floorNumber: targetFloor,
        unitNumber: "",
        unitType: "2BHK",
        carpetArea: 950,
        price: 6500000,
        status: "Available",
      });
      await fetchStructure();
      setSelectedFloorNumber(targetFloor);
    } catch (err: any) {
      toast.error(err.message || "Failed to add unit");
    } finally {
      setIsSubmittingUnit(false);
    }
  };

  // Open Edit Unit Modal
  const handleOpenEditUnit = (unit: ProjectUnitItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingUnitId(unit._id);
    const parsedFloor =
      typeof unit.floorNumber === "number"
        ? unit.floorNumber
        : parseInt(String(unit.floorNumber), 10);
    setEditUnitForm({
      floorNumber: Number.isNaN(parsedFloor) ? 0 : parsedFloor,
      unitNumber: unit.unitNumber || "",
      unitType: unit.unitType || "2BHK",
      carpetArea: unit.carpetArea || 0,
      price: unit.price || 0,
    });
    setIsEditUnitModalOpen(true);
  };

  // Handle Update Unit Details
  const handleUpdateUnitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnitId) return;

    try {
      setIsUpdatingUnit(true);
      const res = await fetch(`/api/projects/units/${editingUnitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUnitForm),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to update unit details");

      toast.success("Flat details updated successfully!");
      setIsEditUnitModalOpen(false);
      setEditingUnitId(null);
      await fetchStructure();
      setSelectedFloorNumber(editUnitForm.floorNumber);
    } catch (err: any) {
      toast.error(err.message || "Failed to update unit");
    } finally {
      setIsUpdatingUnit(false);
    }
  };

  // Unit detail view & status update
  const handleOpenUnitDetail = (unit: ProjectUnitItem) => {
    setSelectedUnit(unit);
    setUnitStatusUpdate({
      status: unit.status,
      clientId: unit.bookedByClientId || "",
      notes: unit.notes || "",
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
    setIsUnitModalOpen(true);
  };

  const handleUpdateUnitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    try {
      setIsUpdatingStatus(true);
      let targetClientId = unitStatusUpdate.clientId;

      // If user chose "new client", register the client in CRM first
      if (
        (unitStatusUpdate.status === "Booked" ||
          unitStatusUpdate.status === "Sold" ||
          unitStatusUpdate.status === "Hold") &&
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

      const res = await fetch(
        `/api/projects/units/${selectedUnit._id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...unitStatusUpdate,
            clientId: targetClientId,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to update unit status");

      toast.success(
        `Unit ${selectedUnit.unitNumber} status updated to ${unitStatusUpdate.status}`,
      );
      setIsUnitModalOpen(false);
      setSelectedUnit(null);
      await fetchStructure();
    } catch (err: any) {
      toast.error(err.message || "Failed to update unit status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner className="w-8 h-8 text-blue-600" />
        <span className="text-xs text-slate-500 font-medium">
          Loading project structural tree & architectural elevation...
        </span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white shadow-2xs transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error || "Project record not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 bg-slate-50/30 min-h-screen">
      {/* Top Header Section (Matching Clean Architectural Style) */}
      <div className="bg-white border-b border-slate-200/90 -mt-6 -mx-4 sm:-mx-6 px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-blue-600 transition"
              >
                <ArrowLeft className="size-3.5" />
                <span>Projects</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {project.projectId}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900">
                <span className="font-extrabold">{project.name}</span>{" "}
                <span className="font-light text-slate-500">{activeTower}</span>
              </h1>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2.5">
              <span>{sortedFloorsDesc.length} residential floors</span>
              <span>•</span>
              <span>{towerStats.total} units</span>
              <span>•</span>
              <span>
                By{" "}
                <strong className="text-slate-800 font-semibold">
                  {project.developerName}
                </strong>
              </span>
              <span>•</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {project.constructionStatus}
              </span>
            </p>
          </div>

          {/* Action Buttons: Add Tower / Block */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddTowerModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm transition cursor-pointer"
            >
              <Plus className="size-4 text-emerald-400" />
              <span>Add Tower / Block</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Tower Navigation & Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 mr-1 shrink-0">
              Towers:
            </span>

            {structure.length === 0 ? (
              <span className="text-xs text-slate-400 italic">
                No towers added yet. Click &quot;Add Tower / Block&quot; to
                begin.
              </span>
            ) : (
              structure.map((t) => {
                const isActive = t.towerName === activeTower;
                const count = t.floors.reduce(
                  (acc, fl) => acc + fl.units.length,
                  0,
                );
                return (
                  <div
                    key={t.towerName}
                    className="flex items-center gap-0.5 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTower(t.towerName);
                        const fls = t.floors.map((f) => f.floorNumber);
                        if (fls.length > 0)
                          setSelectedFloorNumber(Math.max(...fls));
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Building
                        className={`size-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`}
                      />
                      <span>{t.towerName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? "bg-slate-800 text-slate-300"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {count}
                      </span>
                    </button>

                    {isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditTowerName(t.towerName);
                          setIsEditTowerModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition"
                        title="Edit / Rename Tower"
                      >
                        <Pencil className="size-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Action when active tower is selected */}
          {activeTower && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditTowerName(activeTower);
                  setIsEditTowerModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
              >
                <Pencil className="size-3 text-slate-500" />
                <span>Rename {activeTower}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedFloorNumber !== null) {
                    setUnitForm((prev) => ({
                      ...prev,
                      floorNumber: selectedFloorNumber,
                    }));
                  }
                  setIsAddUnitModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg shadow-2xs transition cursor-pointer"
              >
                <Plus className="size-3.5 text-emerald-700" />
                <span>Add Unit to {activeTower}</span>
              </button>
            </div>
          )}
        </div>

        {/* Empty State when no towers exist */}
        {structure.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <Building className="size-14 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              No Towers Configured
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Start structuring this project by creating its first tower or
              block name.
            </p>
            <button
              type="button"
              onClick={() => setIsAddTowerModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-xs transition cursor-pointer"
            >
              <Plus className="size-4 text-emerald-400" />
              <span>Add Tower / Block</span>
            </button>
          </div>
        ) : (
          /* ========================================================================= */
          /* THREE-COLUMN ARCHITECTURAL ELEVATION DASHBOARD (Matching User's Reference) */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUMN 1: LEFT SIDEBAR METRICS (3 Columns in Grid) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Sell-Through & Revenue Card (Black Block like reference image) */}
              <div className="bg-[#111827] text-white rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    SELL-THROUGH • TO DATE
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight mt-1 text-white">
                    {towerStats.sellThroughPercent}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {towerStats.sold + towerStats.booked} of {towerStats.total}{" "}
                    units contracted
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Number(towerStats.sellThroughPercent))}%`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-2">
                    ₹{towerStats.totalRevenue.toLocaleString("en-IN")}{" "}
                    contracted
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    UNSOLD INVENTORY • VALUE
                  </div>
                  <div className="text-lg font-bold text-slate-200 mt-0.5">
                    ₹{towerStats.unsoldRevenue.toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Status Legend Count */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
                      <span className="size-2 rounded-full bg-emerald-400" />
                      <span>Avail</span>
                    </div>
                    <div className="text-lg font-bold text-white mt-0.5">
                      {towerStats.available}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
                      <span className="size-2 rounded-full bg-[#dcf836]" />
                      <span>Rsrv</span>
                    </div>
                    <div className="text-lg font-bold text-[#dcf836] mt-0.5">
                      {towerStats.booked}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
                      <span className="size-2 rounded-full bg-slate-500" />
                      <span>Hold</span>
                    </div>
                    <div className="text-lg font-bold text-slate-300 mt-0.5">
                      {towerStats.hold}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Legend Reference Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5 text-xs text-slate-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Status Legend
                </span>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-sm bg-slate-900 border border-slate-950" />
                  <span className="font-medium text-slate-800">
                    Sold (Contracted)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-sm bg-[#dcf836] border border-[#bed826]" />
                  <span className="font-medium text-slate-800">
                    Reserved / Booked
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-sm bg-emerald-500 border border-emerald-600" />
                  <span className="font-medium text-slate-800">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-sm bg-slate-200 border border-slate-300" />
                  <span className="font-medium text-slate-800">
                    On Hold / Blocked
                  </span>
                </div>
              </div>
            </div>

            {/* COLUMN 2: CENTER ARCHITECTURAL ELEVATION TOWER STACK (6 Columns in Grid) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Building className="size-4 text-slate-800" />
                    <span>Inventory by floor</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {towerStats.total} units • Architectural Elevation Stacking
                  </p>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Floor demand / sell-through %
                </div>
              </div>

              {sortedFloorsDesc.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs">
                  No floors added yet. Click &quot;Add Unit to {activeTower}
                  &quot; to create your first flat.
                </div>
              ) : (
                /* Stacking Building Envelope Container */
                <div className="space-y-1.5 max-h-[660px] overflow-y-auto custom-scrollbar pr-1">
                  {/* Roof Top Cap of Building */}
                  <div className="flex items-center justify-center">
                    <div className="w-24 h-3 bg-slate-200 rounded-t-md border-t-2 border-x-2 border-slate-400" />
                  </div>
                  <div className="w-full h-1 bg-slate-400 rounded-xs mb-1" />

                  {/* Floor rows */}
                  {sortedFloorsDesc.map((floor) => {
                    const isSelected =
                      selectedFloorNumber === floor.floorNumber;
                    const floorUnitsCount = floor.units.length;
                    const soldOrBooked = floor.units.filter(
                      (u) => u.status === "Sold" || u.status === "Booked",
                    ).length;
                    const floorDemandPercent =
                      floorUnitsCount > 0
                        ? Math.round((soldOrBooked / floorUnitsCount) * 100)
                        : 0;

                    return (
                      <div
                        key={floor.floorNumber}
                        onClick={() =>
                          setSelectedFloorNumber(floor.floorNumber)
                        }
                        className={`group flex items-center gap-3 p-1.5 rounded-lg border transition cursor-pointer ${
                          isSelected
                            ? "bg-slate-100/90 border-slate-900 ring-2 ring-slate-900/10 shadow-2xs"
                            : "bg-white border-slate-200/90 hover:border-slate-400 hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Floor Number Box (like black badge in reference: "16") */}
                        <div
                          className={`w-9 h-7 shrink-0 rounded flex items-center justify-center font-bold text-xs transition ${
                            isSelected
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                          }`}
                        >
                          {String(floor.floorNumber).padStart(2, "0")}
                        </div>

                        {/* Flat Units Matrix in Building Elevation Block */}
                        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                          {floor.units.map((u) => {
                            // Color code exactly matching reference elevation
                            let unitBg = "bg-emerald-500 border-emerald-600"; // Available
                            if (u.status === "Sold") {
                              unitBg =
                                "bg-slate-900 border-slate-950 text-white"; // Black
                            } else if (u.status === "Booked") {
                              unitBg =
                                "bg-[#dcf836] border-[#bed826] text-slate-950"; // Bright Yellow-Green
                            } else if (
                              u.status === "Hold" ||
                              u.status === "Blocked"
                            ) {
                              unitBg =
                                "bg-slate-200 border-slate-300 text-slate-600"; // Gray hatched
                            }

                            return (
                              <button
                                key={u._id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFloorNumber(floor.floorNumber);
                                  handleOpenUnitDetail(u);
                                }}
                                className={`px-2 py-1 rounded text-[11px] font-bold border transition hover:scale-105 hover:ring-2 hover:ring-blue-500 cursor-pointer shrink-0 ${unitBg}`}
                                title={`${u.unitNumber} • ${u.unitType} • ₹${Number(u.price).toLocaleString("en-IN")} • ${u.status}`}
                              >
                                {u.unitNumber}
                              </button>
                            );
                          })}
                        </div>

                        {/* Right Demand Bar Line (like the bar charts in reference: "— 90") */}
                        <div className="w-24 shrink-0 flex items-center gap-2 pl-2 border-l border-slate-200">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-slate-800 h-full rounded-full"
                              style={{ width: `${floorDemandPercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-600 font-semibold w-7 text-right">
                            {floorDemandPercent}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Building Base / Ground Entrance */}
                  <div className="w-full h-1 bg-slate-400 rounded-xs mt-1" />
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-4 bg-slate-200 rounded-b-md border-b-2 border-x-2 border-slate-400 flex items-center justify-center text-[9px] font-bold text-slate-500">
                      G
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 3: RIGHT PANEL - SELECTED FLOOR INSPECTOR (3 Columns in Grid) */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              {selectedFloorGroup && floorStats ? (
                <>
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
                      <span>Selected Floor</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = sortedFloorsDesc.findIndex(
                              (f) => f.floorNumber === selectedFloorNumber,
                            );
                            if (curIdx > 0)
                              setSelectedFloorNumber(
                                sortedFloorsDesc[curIdx - 1].floorNumber,
                              );
                          }}
                          className="hover:text-slate-700 p-0.5"
                          title="Previous Floor Up"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = sortedFloorsDesc.findIndex(
                              (f) => f.floorNumber === selectedFloorNumber,
                            );
                            if (curIdx < sortedFloorsDesc.length - 1) {
                              setSelectedFloorNumber(
                                sortedFloorsDesc[curIdx + 1].floorNumber,
                              );
                            }
                          }}
                          className="hover:text-slate-700 p-0.5"
                          title="Next Floor Down"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-3xl font-extrabold text-slate-900 mt-1">
                      Floor {selectedFloorNumber}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {floorStats.total} units • {floorStats.sold} sold •{" "}
                      {floorStats.booked} reserved • {floorStats.available}{" "}
                      available
                    </p>
                  </div>

                  {/* Floor Stats Comparison */}
                  <div className="space-y-3 py-1 text-xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Floor Sell-Through
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                        {floorStats.sellThrough}%{" "}
                        <span className="text-[11px] font-normal text-slate-500">
                          vs tower {towerStats.sellThroughPercent}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Average Price
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                        ₹{floorStats.avgPrice.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Units On This Floor List (Matching reference layout) */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                        Units on this floor
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUnitForm((prev) => ({
                            ...prev,
                            floorNumber: selectedFloorNumber!,
                          }));
                          setIsAddUnitModalOpen(true);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        + Add Flat
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-0.5">
                      {selectedFloorGroup.units.map((u) => (
                        <div
                          key={u._id}
                          onClick={() => handleOpenUnitDetail(u)}
                          className="group p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <span>{u.unitNumber}</span>
                              <span className="text-[10px] font-normal text-slate-500">
                                {u.unitType} • {u.carpetArea} sq ft
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                              ₹{Number(u.price).toLocaleString("en-IN")}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                u.status === "Available"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : u.status === "Booked"
                                    ? "bg-[#dcf836] text-slate-900"
                                    : u.status === "Sold"
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {u.status}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => handleOpenEditUnit(u, e)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Edit Flat Details"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs">
                  Click on any floor in the elevation stack to inspect units and
                  pricing.
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM SECTION: UNITS DIRECTORY TABLE (Matching Reference Image 2: "Matching units / Units Directory") */}
        {activeTower && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Building className="size-4 text-slate-800" />
                  <span>Units Directory • {activeTower}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Comprehensive inventory breakdown across all floors and flats
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
                  Total {towerUnits.length} Flats
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedFloorNumber !== null) {
                      setUnitForm((prev) => ({
                        ...prev,
                        floorNumber: selectedFloorNumber,
                      }));
                    }
                    setIsAddUnitModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Add Unit</span>
                </button>
              </div>
            </div>

            {towerUnits.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No units created in {activeTower} yet. Click &quot;Add
                Unit&quot; to add flats.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table maxHeight="460px" containerClassName="overflow-y-auto overflow-x-auto">
                  <TableHeader className="bg-slate-900 text-white hover:bg-slate-900 sticky top-0 z-20 shadow-xs">
                    <TableRow className="border-slate-800 hover:bg-slate-900">
                      <TableHead className="py-2.5 text-white font-bold text-xs bg-slate-900 sticky top-0 z-20">
                        Unit
                      </TableHead>
                      <TableHead className="py-2.5 text-white font-bold text-xs bg-slate-900 sticky top-0 z-20">
                        Floor
                      </TableHead>
                      <TableHead className="py-2.5 text-white font-bold text-xs bg-slate-900 sticky top-0 z-20">
                        Type
                      </TableHead>
                      <TableHead className="py-2.5 text-white font-bold text-xs bg-slate-900 sticky top-0 z-20">
                        Area (sq ft)
                      </TableHead>
                      <TableHead className="py-2.5 text-white font-bold text-xs bg-slate-900 sticky top-0 z-20">
                        Price
                      </TableHead>
                      <TableHead className="py-2.5 text-white font-bold text-xs bg-slate-900 sticky top-0 z-20">
                        Status
                      </TableHead>
                      <TableHead className="py-2.5 text-white font-bold text-xs text-right bg-slate-900 sticky top-0 z-20">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDirectoryUnits.map((u) => {
                      let badgeColor =
                        "bg-emerald-100 text-emerald-800 border-emerald-200";
                      if (u.status === "Sold") {
                        badgeColor =
                          "bg-slate-900 text-white border-slate-950";
                      } else if (u.status === "Booked") {
                        badgeColor =
                          "bg-[#dcf836] text-slate-950 border-[#bed826]";
                      } else if (
                        u.status === "Hold" ||
                        u.status === "Blocked"
                      ) {
                        badgeColor =
                          "bg-slate-100 text-slate-600 border-slate-200";
                      }

                      return (
                        <TableRow
                          key={u._id}
                          onClick={() => {
                            setSelectedFloorNumber(u.floorNumber);
                            handleOpenUnitDetail(u);
                          }}
                          className="hover:bg-slate-50 cursor-pointer transition text-xs"
                        >
                          <TableCell className="font-bold text-slate-900 py-2.5">
                            {u.unitNumber}
                          </TableCell>
                          <TableCell className="text-slate-700 py-2.5 font-semibold">
                            Floor {u.floorNumber}
                          </TableCell>
                          <TableCell className="text-slate-600 py-2.5 font-medium">
                            {u.unitType || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600 py-2.5 font-mono">
                            {u.carpetArea ? `${u.carpetArea} sq ft` : "—"}
                          </TableCell>
                          <TableCell className="text-slate-900 py-2.5 font-mono font-semibold">
                            ₹{Number(u.price).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
                            >
                              {u.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <div
                              className="flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenEditUnit(u)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition"
                                title="Edit Flat"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination & Limits Footer matching default inquiries/projects standard */}
            {sortedDirectoryUnits.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-3.5 bg-slate-50/50 px-3 rounded-b-xl">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div>
                    Showing{" "}
                    <span className="font-semibold text-slate-800">
                      {Math.min(
                        (tablePage - 1) * tableLimit + 1,
                        sortedDirectoryUnits.length
                      )}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-800">
                      {Math.min(
                        tablePage * tableLimit,
                        sortedDirectoryUnits.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-800">
                      {sortedDirectoryUnits.length}
                    </span>{" "}
                    total flats
                  </div>

                  {/* Rows Per Page Limit Selector */}
                  <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                    <span className="text-slate-600">Rows per page:</span>
                    <select
                      value={tableLimit}
                      onChange={(e) => {
                        setTableLimit(Number(e.target.value));
                        setTablePage(1);
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
                    onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
                    disabled={tablePage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <span className="text-xs font-semibold text-slate-700 px-2">
                    Page {tablePage} of {totalDirectoryPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setTablePage((prev) =>
                        Math.min(totalDirectoryPages, prev + 1)
                      )
                    }
                    disabled={tablePage >= totalDirectoryPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS: ADD TOWER, EDIT TOWER, ADD UNIT, EDIT UNIT, UNIT DETAIL / STATUS  */}
      {/* ========================================================================= */}

      {/* MODAL 1: Add Tower / Block Name * (ONLY input field: Tower / Block Name *) */}
      {isAddTowerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building className="size-4 text-blue-600" />
                <span>Add Tower / Block</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTowerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTower} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tower / Block Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Tower A, Block B, Wing 1"
                  value={newTowerName}
                  onChange={(e) => setNewTowerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Once created, this tower will appear as a tab to add flats and
                  floors.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTowerModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTower || !newTowerName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingTower ? "Creating..." : "Create Tower"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1B: Edit / Rename Tower */}
      {isEditTowerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Pencil className="size-4 text-blue-600" />
                <span>Edit Tower Name</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditTowerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRenameTower} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tower / Block Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editTowerName}
                  onChange={(e) => setEditTowerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Renaming will automatically update all existing flats and
                  floors in this tower.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditTowerModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenamingTower || !editTowerName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isRenamingTower ? "Saving..." : "Save Tower"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Unit / Flat (Input fields: floor of number, flat number, unit type / bhk, capacity area sq feet, price) */}
      {isAddUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Plus className="size-4 text-emerald-600" />
                  <span>Add Unit to {activeTower}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure flat number, floor level, type, area, and pricing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* 1. Floor Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Floor Number *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={unitForm.floorNumber}
                    onChange={(e) =>
                      setUnitForm({
                        ...unitForm,
                        floorNumber: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* 2. Flat / Unit Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Flat / Unit Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A-1602"
                    value={unitForm.unitNumber}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, unitNumber: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 3. Unit Type / BHK */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Type / BHK *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2BHK, 3BHK, Penthouse"
                    value={unitForm.unitType}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, unitType: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* 4. Capacity / Carpet Area Sq Feet */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Carpet Area (Sq. Ft.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1100"
                    value={unitForm.carpetArea}
                    onChange={(e) =>
                      setUnitForm({
                        ...unitForm,
                        carpetArea: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* 5. Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asking Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 7500000"
                  value={unitForm.price}
                  onChange={(e) =>
                    setUnitForm({ ...unitForm, price: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={unitForm.status}
                  onChange={(e) =>
                    setUnitForm({ ...unitForm, status: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Available">Available</option>
                  <option value="Hold">Hold</option>
                  <option value="Booked">Booked</option>
                  <option value="Sold">Sold</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUnitModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUnit}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingUnit ? "Adding Flat..." : "Add Flat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2B: Edit Unit / Flat Details (Floor Number, Flat Number, Unit Type, Area, Price) */}
      {isEditUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Pencil className="size-4 text-blue-600" />
                  <span>Edit Flat / Floor Details</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Update unit number, floor level, type, carpet area, or
                  pricing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUpdateUnitDetails}
              className="p-5 space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                {/* 1. Floor Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Floor Number *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editUnitForm.floorNumber !== undefined && editUnitForm.floorNumber !== null ? editUnitForm.floorNumber : ""}
                    onChange={(e) =>
                      setEditUnitForm({
                        ...editUnitForm,
                        floorNumber: e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* 2. Flat / Unit Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Flat / Unit Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUnitForm.unitNumber}
                    onChange={(e) =>
                      setEditUnitForm({
                        ...editUnitForm,
                        unitNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 3. Unit Type / BHK */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Type / BHK *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUnitForm.unitType}
                    onChange={(e) =>
                      setEditUnitForm({
                        ...editUnitForm,
                        unitType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* 4. Carpet Area Sq Feet */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Carpet Area (Sq. Ft.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editUnitForm.carpetArea}
                    onChange={(e) =>
                      setEditUnitForm({
                        ...editUnitForm,
                        carpetArea: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* 5. Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asking Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editUnitForm.price}
                  onChange={(e) =>
                    setEditUnitForm({
                      ...editUnitForm,
                      price: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditUnitModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUnit}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingUnit ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Unit Detail & Status Changer */}
      {isUnitModalOpen && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Unit {selectedUnit.unitNumber} ({selectedUnit.unitType})
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedUnit.towerName} • Floor {selectedUnit.floorNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUnitStatus} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Carpet Area
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedUnit.carpetArea} sq ft
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Price
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    ₹{Number(selectedUnit.price).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Unit Status *
                </label>
                <select
                  value={unitStatusUpdate.status}
                  onChange={(e) =>
                    setUnitStatusUpdate({
                      ...unitStatusUpdate,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Available">Available</option>
                  <option value="Hold">Hold</option>
                  <option value="Booked">Booked (Reserved)</option>
                  <option value="Sold">Sold (Contracted)</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {(unitStatusUpdate.status === "Booked" ||
                unitStatusUpdate.status === "Sold" ||
                unitStatusUpdate.status === "Hold") && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">
                      Buyer Client Allocation
                    </label>
                    <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setClientSelectionMode("existing")}
                        className={`px-2 py-0.5 rounded-md transition ${
                          clientSelectionMode === "existing"
                            ? "bg-white text-blue-700 shadow-2xs font-bold"
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
                            ? "bg-white text-blue-700 shadow-2xs font-bold"
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
                        value={unitStatusUpdate.clientId}
                        onChange={(e) =>
                          setUnitStatusUpdate({
                            ...unitStatusUpdate,
                            clientId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                        Select an existing buyer client or switch to "+ New Client" above to create an account.
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
                  placeholder="e.g. Client deposited advance booking token..."
                  value={unitStatusUpdate.notes}
                  onChange={(e) =>
                    setUnitStatusUpdate({
                      ...unitStatusUpdate,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsUnitModalOpen(false);
                    handleOpenEditUnit(selectedUnit);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Pencil className="size-3.5" />
                  <span>Edit Floor / Specs</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUnitModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingStatus}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdatingStatus ? "Updating..." : "Save Status"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
