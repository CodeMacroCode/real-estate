"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  Shield,
  Briefcase,
  Building,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  ChevronDown,
} from "lucide-react";
import { SafeUser, IRole } from "@/types";
import {
  StatusBadge,
  LoginStatusBadge,
  RoleBadge,
} from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import {
  Spinner,
  LinearProgress,
  CenteredGlassOverlay,
  LoadingOverlay,
} from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatDate } from "@/lib/dateUtils";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface StaffClientProps {
  initialStaff: SafeUser[];
  initialRoles: IRole[];
  initialAdmins?: SafeUser[];
  initialTotalPages: number;
  initialTotalCount: number;
  currentUserRoleSlug: string;
  currentUserAllowedSubRoles: string[];
}

export function StaffClient({
  initialStaff = [],
  initialRoles = [],
  initialAdmins = [],
  initialTotalPages = 1,
  initialTotalCount = 0,
  currentUserRoleSlug: initialRoleSlug = "",
  currentUserAllowedSubRoles: initialAllowedSubRoles = [],
}: StaffClientProps) {
  const [users, setUsers] = useState<SafeUser[]>(initialStaff);
  const [roles, setRoles] = useState<IRole[]>(initialRoles);
  const [admins, setAdmins] = useState<SafeUser[]>(initialAdmins);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [currentUserRoleSlug, setCurrentUserRoleSlug] =
    useState<string>(initialRoleSlug);
  const [currentUserAllowedSubRoles, setCurrentUserAllowedSubRoles] = useState<
    string[]
  >(initialAllowedSubRoles);
  const [showPassword, setShowPassword] = useState(false);
  const [statusPassword, setStatusPassword] = useState("");
  const [showStatusPassword, setShowStatusPassword] = useState(false);

  // Form State
  // Strictly requested fields:
  // SuperAdmin: parentAdminId -> subrole category -> name, mobile, joiningDate, email, password
  // Admin: subrole category -> name, mobile, joiningDate, email, password
  const initialForm = {
    parentAdminId: "",
    roleId: "",
    name: "",
    username: "",
    mobile: "",
    joiningDate: new Date().toISOString().split("T")[0],
    email: "",
    password: "",
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (res.ok && data.success && data.data?.role) {
        const slug = data.data.role.slug || "";
        setCurrentUserRoleSlug(slug);
        setCurrentUserAllowedSubRoles(data.data.user?.allowedSubRoles || []);

        if (slug === "super_admin") {
          const adminsRes = await fetch("/api/users?userType=admin&limit=100");
          const adminsData = await adminsRes.json();
          if (adminsRes.ok && adminsData.success) {
            setAdmins(adminsData.data || []);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
    }
  }, []);

  const fetchStaffList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);
      if (selectedAdminId) params.append("parentAdminId", selectedAdminId);

      const res = await fetch(`/api/staff?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch staff members");
      }

      setUsers(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || "Error loading staff directory");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, selectedAdminId]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (res.ok && data.success) {
        // Exclude admin and super_admin from staff sub-roles
        const staffRoles = (data.data || []).filter(
          (r: IRole) => r.slug !== "super_admin" && r.slug !== "admin",
        );
        setRoles(staffRoles);
      }
    } catch (err) {
      console.error("Failed to load roles:", err);
    }
  }, []);

  const prevFilterRef = useRef({
    page: 1,
    searchTerm: "",
    statusFilter: "",
    selectedAdminId: "",
  });

  useEffect(() => {
    const prev = prevFilterRef.current;
    if (
      prev.page === page &&
      prev.searchTerm === searchTerm &&
      prev.statusFilter === statusFilter &&
      prev.selectedAdminId === selectedAdminId
    ) {
      return;
    }
    prevFilterRef.current = { page, searchTerm, statusFilter, selectedAdminId };
    fetchStaffList();
  }, [page, searchTerm, statusFilter, selectedAdminId, fetchStaffList]);

  // Compute available subroles dynamically based on selected admin (for SuperAdmin) or current admin (for Admin)
  const availableSubRoles = useMemo(() => {
    if (currentUserRoleSlug === "super_admin") {
      if (!formData.parentAdminId) return [];
      const selectedAdmin = admins.find(
        (a) => a._id === formData.parentAdminId,
      );
      const allowedSlugs = selectedAdmin?.allowedSubRoles || [];
      return roles.filter((r) => allowedSlugs.includes(r.slug));
    } else {
      // Admin: filtered by their own allowedSubRoles
      return roles.filter((r) => currentUserAllowedSubRoles.includes(r.slug));
    }
  }, [
    currentUserRoleSlug,
    formData.parentAdminId,
    admins,
    roles,
    currentUserAllowedSubRoles,
  ]);

  // When available subroles change, keep roleId valid
  useEffect(() => {
    if (availableSubRoles.length > 0) {
      setFormData((prev) => {
        const currentRoleValid = availableSubRoles.some(
          (r) => r._id === prev.roleId,
        );
        if (!currentRoleValid) {
          return { ...prev, roleId: availableSubRoles[0]._id };
        }
        return prev;
      });
    } else {
      setFormData((prev) => (prev.roleId ? { ...prev, roleId: "" } : prev));
    }
  }, [availableSubRoles]);

  const handleOpenAddModal = () => {
    const defaultAdminId = admins[0]?._id || selectedAdminId || "";
    setFormData({
      ...initialForm,
      parentAdminId:
        currentUserRoleSlug === "super_admin" ? defaultAdminId : "",
    });
    setError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: SafeUser) => {
    setSelectedUser(user);
    const parentId =
      (user as any).parentAdminId?._id || (user as any).parentAdminId || "";
    setFormData({
      parentAdminId: parentId,
      roleId: (user.role?._id || user.roleId) as string,
      name: user.name,
      username: (user as any).username || "",
      mobile: user.mobile,
      joiningDate: new Date(user.joiningDate).toISOString().split("T")[0],
      email: user.email,
      password: "",
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenStatusModal = (user: SafeUser) => {
    setSelectedUser(user);
    setStatusPassword("");
    setShowStatusPassword(false);
    setError(null);
    setIsStatusModalOpen(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError(null);

    try {
      if (!formData.roleId) {
        throw new Error("Please select an authorized Sub-Role Category");
      }
      if (currentUserRoleSlug === "super_admin" && !formData.parentAdminId) {
        throw new Error("Please select an Admin first");
      }

      const payload: any = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile,
        joiningDate: formData.joiningDate,
        roleId: formData.roleId,
      };

      if (currentUserRoleSlug === "super_admin") {
        payload.parentAdminId = formData.parentAdminId;
      }

      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create staff member");
      }

      setSuccessMsg(`Staff member ${data.data.name} created successfully!`);
      setIsAddModalOpen(false);
      fetchStaffList();
    } catch (err: any) {
      setError(err.message || "Error submitting staff member");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?._id) return;
    setFormSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        mobile: formData.mobile,
        joiningDate: formData.joiningDate,
        roleId: formData.roleId,
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      if (currentUserRoleSlug === "super_admin" && formData.parentAdminId) {
        payload.parentAdminId = formData.parentAdminId;
      }

      const res = await fetch(`/api/staff/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update staff member");
      }

      setSuccessMsg(`Staff member ${data.data.name} updated successfully!`);
      setIsEditModalOpen(false);
      fetchStaffList();
    } catch (err: any) {
      setError(err.message || "Error updating staff member");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser?._id) return;
    const nextStatus = selectedUser.status === "active" ? "inactive" : "active";

    if (nextStatus === "inactive" && !statusPassword.trim()) {
      setError("Please enter your password to authorize deactivation.");
      return;
    }

    setFormSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${selectedUser._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          reason: `Requested status toggle to ${nextStatus}`,
          superAdminPassword: nextStatus === "inactive" ? statusPassword : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update account status");
      }

      setSuccessMsg(`Staff account ${selectedUser.name} is now ${nextStatus}.`);
      setStatusPassword("");
      setIsStatusModalOpen(false);
      fetchStaffList();
    } catch (err: any) {
      setError(err.message || "Error toggling account status");
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Staff Directory & Sub-Roles
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage authorized staff sub-roles: Property Managers, Sales
            Executives, Sales Managers, and Website Managers.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <Alert
          type="success"
          title="Operation Successful"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}
      {error && !isAddModalOpen && !isEditModalOpen && !isStatusModalOpen && (
        <Alert
          type="error"
          title="Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or mobile..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-9 pr-9 text-sm rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              <Spinner size="sm" className="text-blue-600" />
            </div>
          )}
        </div>

        {/* SuperAdmin filter by Admin */}
        {currentUserRoleSlug === "super_admin" && (
          <div className="relative">
            <select
              value={selectedAdminId}
              onChange={(e) => {
                setSelectedAdminId(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 appearance-none rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
            >
              <option value="">All Admins&apos; Staff</option>
              {admins.map((admin) => (
                <option key={admin._id} value={admin._id}>
                  Managed by: {admin.name} ({admin.email})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        )}

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 appearance-none rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Staff Table */}
      <div className="relative rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading && (
          <LinearProgress className="absolute top-0 left-0 right-0 z-30" />
        )}
        {loading && (
          <CenteredGlassOverlay
            message="Loading Staff Directory…"
            subMessage="Querying latest sub-role records"
          />
        )}
        {users.length === 0 && !loading ? (
          <div className="p-12 min-h-[300px] flex items-center justify-center">
            <EmptyState
              title="No Staff Members Found"
              description="No sub-role staff records match your criteria."
              actionLabel="Add New Staff Member"
              onAction={handleOpenAddModal}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-700 bg-slate-900 hover:bg-slate-900">
                <TableHead scope="col" className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700">
                  Staff member
                </TableHead>
                <TableHead scope="col" className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700">
                  Sub-role
                </TableHead>
                <TableHead scope="col" className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700">
                  Mobile number
                </TableHead>
                <TableHead scope="col" className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700">
                  Joining date
                </TableHead>
                <TableHead scope="col" className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700">
                  Managing admin
                </TableHead>
                <TableHead scope="col" className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700">
                  Status
                </TableHead>
                <TableHead scope="col" className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700">
                  Login status
                </TableHead>
                <TableHead
                  scope="col"
                  className="px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 text-right"
                >
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user._id}
                    className="hover:bg-slate-50/75 transition"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {user.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {user.email}
                          </div>
                          {(user as any).username && (
                            <div className="text-xs text-blue-600 font-mono font-medium">
                              @{(user as any).username}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <RoleBadge
                        roleSlug={user.role?.slug}
                        roleName={user.role?.name}
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 font-medium text-slate-700">
                      {user.mobile}
                    </TableCell>
                    <TableCell
                      suppressHydrationWarning
                      className="px-6 py-4 text-slate-600"
                    >
                      {formatDate(user.joiningDate)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {(user as any).parentAdminId?.name ? (
                        <div className="text-xs">
                          <span className="font-semibold text-slate-800">
                            {(user as any).parentAdminId.name}
                          </span>
                          <span className="text-slate-400 block text-[11px]">
                            {(user as any).parentAdminId.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Self / Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <LoginStatusBadge status={user.loginStatus} />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit staff details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenStatusModal(user)}
                          className={`p-1.5 rounded-md transition-colors border shadow-2xs ${
                            user.status === "active"
                              ? "text-emerald-600 bg-emerald-50/80 border-emerald-200/80 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                              : "text-rose-600 bg-rose-50/80 border-rose-200/80 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                          }`}
                          title={
                            user.status === "active"
                              ? "Account is Active — Click to deactivate"
                              : "Account is Inactive — Click to activate"
                          }
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold">{users.length}</span> of{" "}
            <span className="font-semibold">{totalCount}</span> total staff
            members
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Staff Member"
        description="Register a new staff member under an authorized sub-role category."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {error && isAddModalOpen && (
            <Alert
              type="error"
              title="Validation Failed"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          {/* SuperAdmin sequence: 1. Select Admin Name */}
          {currentUserRoleSlug === "super_admin" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Select Admin Name *
              </label>
              <select
                required
                value={formData.parentAdminId}
                onChange={(e) =>
                  setFormData({ ...formData, parentAdminId: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Choose Admin --</option>
                {admins.map((admin) => (
                  <option key={admin._id} value={admin._id}>
                    {admin.name} ({admin.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sequence: Sub-role Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Select Sub-Role Category *
            </label>
            <select
              required
              value={formData.roleId}
              onChange={(e) =>
                setFormData({ ...formData, roleId: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {availableSubRoles.length === 0 ? (
                <option value="">
                  No permitted sub-roles found for selected admin
                </option>
              ) : (
                availableSubRoles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))
              )}
            </select>
            {currentUserRoleSlug === "super_admin" &&
              !formData.parentAdminId && (
                <p className="mt-1 text-xs text-amber-600">
                  Select an admin above to load their permitted sub-roles.
                </p>
              )}
          </div>

          {/* Name & Username Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Ramesh Sharma"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Login Username *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_.-]/g, ""),
                  })
                }
                placeholder="e.g. ramesh_pm"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Mobile Number & Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) =>
                  setFormData({ ...formData, mobile: e.target.value })
                }
                placeholder="+91 9876543210"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Joining Date *
              </label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) =>
                  setFormData({ ...formData, joiningDate: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email Address & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value.toLowerCase(),
                  })
                }
                placeholder="staff@company.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Password *
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Min 8 chars, 1 upper, 1 lower, 1 num"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting || availableSubRoles.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {formSubmitting && <Spinner size="sm" className="text-white" />}
              <span>
                {formSubmitting
                  ? "Creating Staff Member..."
                  : "Create Staff Member"}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Staff Member"
        description={`Modify details for ${selectedUser?.name}.`}
        maxWidth="xl"
      >
        <form onSubmit={handleUpdateStaff} className="space-y-4">
          {error && isEditModalOpen && (
            <Alert
              type="error"
              title="Update Failed"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          {/* SuperAdmin can reassign Admin */}
          {currentUserRoleSlug === "super_admin" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Assigned Admin *
              </label>
              <select
                required
                value={formData.parentAdminId}
                onChange={(e) =>
                  setFormData({ ...formData, parentAdminId: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Choose Admin --</option>
                {admins.map((admin) => (
                  <option key={admin._id} value={admin._id}>
                    {admin.name} ({admin.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-Role Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Sub-Role Category *
            </label>
            <select
              required
              value={formData.roleId}
              onChange={(e) =>
                setFormData({ ...formData, roleId: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {availableSubRoles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Login Username *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_.-]/g, ""),
                  })
                }
                placeholder="e.g. ramesh_pm"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Mobile Number & Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) =>
                  setFormData({ ...formData, mobile: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Joining Date *
              </label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) =>
                  setFormData({ ...formData, joiningDate: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email Address & Password (Optional reset) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value.toLowerCase(),
                  })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Reset Password (Optional)
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Leave blank to keep current"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {formSubmitting && <Spinner size="sm" className="text-white" />}
              <span>
                {formSubmitting ? "Saving Changes..." : "Save Changes"}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Account Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={
          selectedUser?.status === "active"
            ? "Deactivate Account"
            : "Activate Account"
        }
        description={`Are you sure you want to change status for ${selectedUser?.name}?`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {selectedUser?.status === "active"
              ? "Deactivating this staff member will revoke their session and deny future login attempts."
              : "Activating this staff member will allow them to log in and access CRM modules according to their role permissions."}
          </p>

          {selectedUser?.status === "active" && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-rose-900 uppercase tracking-wider">
                    Password Authorization Required
                  </h4>
                  <p className="text-xs text-rose-700/90 mt-0.5">
                    Enter your account password to authorize the deactivation of this staff member.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Account Password *
                </label>
                <div className="relative">
                  <input
                    type={showStatusPassword ? "text" : "password"}
                    required
                    value={statusPassword}
                    onChange={(e) => {
                      setStatusPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your password to authorize"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowStatusPassword(!showStatusPassword)
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={
                      showStatusPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showStatusPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setIsStatusModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={formSubmitting}
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                selectedUser?.status === "active"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {formSubmitting && <Spinner size="sm" className="text-white" />}
              <span>
                {formSubmitting
                  ? "Updating Status..."
                  : selectedUser?.status === "active"
                    ? "Deactivate Now"
                    : "Activate Now"}
              </span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
