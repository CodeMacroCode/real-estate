"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Phone,
  Mail,
  Building,
  Calendar,
  Briefcase,
  Eye,
  EyeOff,
  LogIn,
  Copy,
  Check,
  Lock,
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

interface UsersClientProps {
  initialUsers: SafeUser[];
  initialRoles: IRole[];
  initialTotalPages: number;
  initialTotalCount: number;
  currentUserRoleSlug: string;
}

export function UsersClient({
  initialUsers = [],
  initialRoles = [],
  initialTotalPages = 1,
  initialTotalCount = 0,
  currentUserRoleSlug: initialRoleSlug = "super_admin",
}: UsersClientProps) {
  const [users, setUsers] = useState<SafeUser[]>(initialUsers);
  const [roles, setRoles] = useState<IRole[]>(initialRoles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [currentUserRoleSlug, setCurrentUserRoleSlug] =
    useState<string>(initialRoleSlug);
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [superAdminPassword, setSuperAdminPassword] = useState("");
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = (userId: string, passwordText: string) => {
    if (!passwordText) return;
    navigator.clipboard.writeText(passwordText);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLoginAsAdmin = async (targetUser: SafeUser) => {
    if (
      !confirm(
        `Are you sure you want to log in as ${targetUser.name}? You will switch to their session and can return anytime.`,
      )
    ) {
      return;
    }
    setImpersonatingId(targetUser._id);
    setError(null);
    try {
      const res = await fetch("/api/auth/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUser._id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to switch session");
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Error logging in as admin");
      setImpersonatingId(null);
    }
  };

  // Form State
  const initialForm = {
    name: "",
    username: "",
    email: "",
    password: "",
    mobile: "",
    department: "Operations",
    designation: "Admin",
    branch: "Headquarters",
    roleId: "",
    joiningDate: new Date().toISOString().split("T")[0],
    team: "",
    profilePhoto: "",
    allowedSubRoles: [] as string[],
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (res.ok && data.success && data.data?.role) {
        setCurrentUserRoleSlug(data.data.role.slug || "");
      }
    } catch (err) {
      console.error("Failed to load current user profile:", err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        userType: "admin",
      });
      if (searchTerm) params.append("search", searchTerm);
      if (departmentFilter) params.append("department", departmentFilter);
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch users");
      }

      setUsers(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || "Error loading staff directory");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, departmentFilter, statusFilter]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (res.ok && data.success) {
        setRoles(data.data || []);
        setFormData((prev) =>
          !prev.roleId && data.data?.length > 0
            ? { ...prev, roleId: data.data[0]._id }
            : prev,
        );
      }
    } catch (err) {
      console.error("Failed to load roles:", err);
    }
  }, []);

  const prevFilterRef = useRef({
    page: 1,
    searchTerm: "",
    departmentFilter: "",
    statusFilter: "",
  });

  useEffect(() => {
    const prev = prevFilterRef.current;
    if (
      prev.page === page &&
      prev.searchTerm === searchTerm &&
      prev.departmentFilter === departmentFilter &&
      prev.statusFilter === statusFilter
    ) {
      return;
    }
    prevFilterRef.current = {
      page,
      searchTerm,
      departmentFilter,
      statusFilter,
    };
    fetchUsers();
  }, [page, searchTerm, departmentFilter, statusFilter, fetchUsers]);

  const handleOpenAddModal = () => {
    // When Super Admin creates, default to 'admin' role
    const defaultRole =
      currentUserRoleSlug === "super_admin"
        ? roles.find((r) => r.slug === "admin")?._id || roles[0]?._id || ""
        : roles.find((r) => r.slug === "sales_executive")?._id ||
          roles[0]?._id ||
          "";

    setFormData({
      ...initialForm,
      department:
        currentUserRoleSlug === "super_admin" ? "Administration" : "Sales",
      designation:
        currentUserRoleSlug === "super_admin"
          ? "System Administrator"
          : "Sales Executive",
      branch:
        currentUserRoleSlug === "super_admin" ? "Headquarters" : "Main Branch",
      roleId: defaultRole,
      allowedSubRoles:
        currentUserRoleSlug === "super_admin"
          ? [
              "property_manager",
              "sales_executive",
              "sales_manager",
              "website_manager",
            ]
          : [],
    });
    setError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: SafeUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      username: (user as any).username || "",
      email: user.email,
      password: user.plainPassword || "",
      mobile: user.mobile,
      department: user.department,
      designation: user.designation,
      branch: user.branch,
      roleId: (user.role?._id || user.roleId) as string,
      joiningDate: new Date(user.joiningDate).toISOString().split("T")[0],
      team: user.team || "",
      profilePhoto: user.profilePhoto || "",
      allowedSubRoles: (user as any).allowedSubRoles || [],
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenStatusModal = (user: SafeUser) => {
    setSelectedUser(user);
    setSuperAdminPassword("");
    setShowSuperAdminPassword(false);
    setError(null);
    setIsStatusModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create user");
      }

      setSuccessMsg(`Admin account ${data.data.name} created successfully!`);
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Error submitting user");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
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
        department: formData.department,
        designation: formData.designation,
        branch: formData.branch,
        roleId: formData.roleId,
        joiningDate: formData.joiningDate,
        team: formData.team,
        profilePhoto: formData.profilePhoto,
        allowedSubRoles: formData.allowedSubRoles || [],
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user");
      }

      setSuccessMsg(`Staff member ${data.data.name} updated successfully!`);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Error updating user");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser?._id) return;
    const nextStatus = selectedUser.status === "active" ? "inactive" : "active";

    if (nextStatus === "inactive" && !superAdminPassword.trim()) {
      setError("Please enter your Super Admin password to authorize deactivation.");
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
          reason: `Super Admin authorized account ${nextStatus}`,
          superAdminPassword: nextStatus === "inactive" ? superAdminPassword : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update account status");
      }

      setSuccessMsg(`Admin account ${selectedUser.name} is now ${nextStatus}.`);
      setSuperAdminPassword("");
      setIsStatusModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Error toggling account status");
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <Alert
          type="success"
          title="Operation Succeeded"
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

      {/* Filters & Actions Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 flex-1 min-w-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, email, phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                <Spinner size="sm" className="text-blue-600" />
              </div>
            )}
          </div>

          <div className="relative">
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 appearance-none rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
            >
              <option value="">All Departments</option>
              <option value="Management">Management</option>
              <option value="Sales">Sales</option>
              <option value="Property Management">Property Management</option>
              <option value="Marketing">Marketing / Web</option>
              <option value="Operations">Operations</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 appearance-none rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
            >
              <option value="">All Account Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition shrink-0 whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Admin</span>
        </button>
      </div>

      {/* Users Table Card */}
      <div className="relative rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading && (
          <LinearProgress className="absolute top-0 left-0 right-0 z-30" />
        )}
        {loading && (
          <CenteredGlassOverlay
            message="Loading Admin Directory…"
            subMessage="Querying latest user and role records"
          />
        )}
        {users.length === 0 && !loading ? (
          <div className="p-12 min-h-[300px] flex items-center justify-center">
            <EmptyState
              title="No Staff Members Found"
              description="No user records match your search or filter criteria."
              actionLabel="Add New Staff Member"
              onAction={handleOpenAddModal}
            />
          </div>
        ) : (
          <Table className="min-w-[1440px]">
            <TableHeader>
              <TableRow className="border-b border-slate-700 bg-slate-900 hover:bg-slate-900">
                <TableHead className="w-[180px] min-w-[180px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Admin name
                </TableHead>
                <TableHead className="w-[180px] min-w-[180px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Email address
                </TableHead>
                <TableHead className="w-[120px] min-w-[120px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Mobile
                </TableHead>
                <TableHead className="w-[120px] min-w-[120px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Username
                </TableHead>
                <TableHead className="w-[170px] min-w-[170px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Password
                </TableHead>
                <TableHead className="w-[100px] min-w-[100px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Role
                </TableHead>
                <TableHead className="w-[180px] min-w-[180px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Delegated sub-roles
                </TableHead>
                <TableHead className="w-[120px] min-w-[120px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Department
                </TableHead>
                <TableHead className="w-[130px] min-w-[130px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Designation
                </TableHead>
                <TableHead className="w-[110px] min-w-[110px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Branch
                </TableHead>
                <TableHead className="w-[100px] min-w-[100px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Team
                </TableHead>
                <TableHead className="w-[100px] min-w-[100px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Status
                </TableHead>
                <TableHead className="w-[110px] min-w-[110px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Login status
                </TableHead>
                <TableHead className="w-[110px] min-w-[110px] px-4 py-3 font-semibold text-xs text-white bg-slate-900 border border-slate-700 whitespace-nowrap">
                  Joined
                </TableHead>
                <TableHead className="sticky right-0 z-20 w-[170px] min-w-[170px] bg-slate-900 text-white px-4 py-3 text-right font-semibold text-xs border border-slate-700 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.3)] whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id} className="group transition-colors hover:bg-slate-50/60">
                  <TableCell className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-semibold text-xs shrink-0 border border-blue-100">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 text-sm">
                        {user.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                    {user.email}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap font-mono">
                    {user.mobile || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 whitespace-nowrap">
                    {(user as any).username ? (
                      <span className="inline-block font-mono text-xs text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded border border-slate-200/60">
                        {(user as any).username}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 whitespace-nowrap">
                    {user.plainPassword ? (
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-md px-2.5 py-1 shadow-2xs">
                        <span className="font-mono text-xs font-medium text-slate-700 tracking-wider select-all">
                          {visiblePasswords[user._id]
                            ? user.plainPassword
                            : "••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(user._id)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200/60 transition"
                          title={
                            visiblePasswords[user._id]
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {visiblePasswords[user._id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyPassword(user._id, user.plainPassword!)
                          }
                          className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 transition"
                          title="Copy password to clipboard"
                        >
                          {copiedId === user._id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 italic">
                          Not Set
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(user)}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Set
                        </button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 whitespace-nowrap">
                    <RoleBadge
                      roleSlug={user.role?.slug}
                      roleName={user.role?.name}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 whitespace-nowrap">
                    {(user as any).allowedSubRoles &&
                    (user as any).allowedSubRoles.length > 0 ? (
                      <div className="relative inline-flex items-center min-w-[160px]">
                        <select
                          aria-label="Delegated sub-roles"
                          className="w-full appearance-none cursor-pointer rounded-md border border-slate-200 bg-slate-50/80 hover:bg-slate-100 py-1 pl-2.5 pr-7 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                          defaultValue="all"
                        >
                          <option value="all">
                            {(user as any).allowedSubRoles.length > 1
                              ? `${(user as any).allowedSubRoles.length} Sub-roles`
                              : (user as any).allowedSubRoles[0]
                                  .split("_")
                                  .map(
                                    (w: string) =>
                                      w.charAt(0).toUpperCase() + w.slice(1)
                                  )
                                  .join(" ")}
                          </option>
                          {(user as any).allowedSubRoles.map(
                            (sub: string) => (
                              <option key={sub} value={sub}>
                                {sub
                                  .split("_")
                                  .map(
                                    (w: string) =>
                                      w.charAt(0).toUpperCase() +
                                      w.slice(1)
                                  )
                                  .join(" ")}
                              </option>
                            )
                          )}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        None
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                    {user.department || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                    {user.designation || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                    {user.branch || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {user.team || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 whitespace-nowrap">
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 whitespace-nowrap">
                    <LoginStatusBadge status={user.loginStatus} />
                  </TableCell>
                  <TableCell
                    suppressHydrationWarning
                    className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap font-mono"
                  >
                    {formatDate(user.joiningDate)}
                  </TableCell>
                  <TableCell className="sticky right-0 z-10 w-[170px] min-w-[170px] bg-white group-hover:bg-slate-50 px-4 py-3.5 text-right whitespace-nowrap border border-slate-200 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)] transition-colors">
                    <div className="flex items-center justify-end gap-1.5">
                      {currentUserRoleSlug === "super_admin" && (
                        <button
                          onClick={() => handleLoginAsAdmin(user)}
                          disabled={
                            impersonatingId === user._id ||
                            user.status !== "active"
                          }
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors shadow-2xs ${
                            user.status === "active"
                              ? "bg-amber-50 border border-amber-200/80 text-amber-800 hover:bg-amber-100 hover:border-amber-300"
                              : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                          }`}
                          title={
                            user.status === "active"
                              ? "Log in directly as this Admin"
                              : "Account is inactive — cannot log in"
                          }
                        >
                          {impersonatingId === user._id ? (
                            <Spinner size="sm" className="text-amber-800" />
                          ) : (
                            <LogIn
                              className={`w-3.5 h-3.5 ${
                                user.status === "active"
                                  ? "text-amber-700"
                                  : "text-slate-400"
                              }`}
                            />
                          )}
                          <span>
                            {impersonatingId === user._id
                              ? "Switching…"
                              : "Login As"}
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit admin details"
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
        <div className="flex items-center justify-between border-t border-slate-200/80 px-5 py-3 bg-slate-50/50 text-xs text-slate-500">
          <div>
            Showing <span className="font-medium text-slate-700">{users.length}</span> of{" "}
            <span className="font-medium text-slate-700">{totalCount}</span> total admin accounts
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-medium text-slate-600 px-2">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
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
        title="Add New Admin"
        description="Provision an administrator account and assign delegated sub-roles."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {error && isAddModalOpen && (
            <Alert
              type="error"
              title="Validation Failed"
              message={error}
              onClose={() => setError(null)}
            />
          )}

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
                placeholder="e.g. Rahul Verma"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
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
                placeholder="jane@company.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                placeholder="e.g. rahul_admin"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Initial Password *
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
                placeholder="+919876543210"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Assigned Role *
              </label>
              <select
                required
                value={formData.roleId}
                onChange={(e) =>
                  setFormData({ ...formData, roleId: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {(currentUserRoleSlug === "super_admin"
                  ? roles.filter((r) => r.slug === "admin")
                  : roles
                ).map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subroles checkboxes when SuperAdmin selects 'admin' role */}
          {currentUserRoleSlug === "super_admin" &&
            roles.find((r) => r._id === formData.roleId)?.slug === "admin" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-blue-900">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Delegated Sub-Roles For This Admin</span>
                </div>
                <p className="text-xs text-slate-600">
                  Select which sub-roles this Admin can create and manage in
                  their staff directory:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { slug: "property_manager", label: "Property Manager" },
                    { slug: "sales_executive", label: "Sales Executive" },
                    { slug: "sales_manager", label: "Sales Manager" },
                    { slug: "website_manager", label: "Website Manager" },
                  ].map((subrole) => {
                    const checked = formData.allowedSubRoles?.includes(
                      subrole.slug,
                    );
                    return (
                      <label
                        key={subrole.slug}
                        className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = formData.allowedSubRoles || [];
                            const updated = e.target.checked
                              ? [...current, subrole.slug]
                              : current.filter((s) => s !== subrole.slug);
                            setFormData({
                              ...formData,
                              allowedSubRoles: updated,
                            });
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{subrole.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Omit Department, Designation, Branch, Joining Date, and Team inputs when SuperAdmin is creating an Admin */}
          {currentUserRoleSlug !== "super_admin" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData({ ...formData, designation: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Branch *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Team / Unit (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.team}
                    onChange={(e) =>
                      setFormData({ ...formData, team: e.target.value })
                    }
                    placeholder="Alpha Sales Team"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

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
              disabled={formSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {formSubmitting && <Spinner size="sm" className="text-white" />}
              <span>
                {formSubmitting
                  ? "Creating Administrator..."
                  : "Create Admin Account"}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Admin Account"
        description={`Modify configuration and sub-roles for ${selectedUser?.name}.`}
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {error && isEditModalOpen && (
            <Alert
              type="error"
              title="Update Failed"
              message={error}
              onClose={() => setError(null)}
            />
          )}

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                placeholder="e.g. rahul_admin"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Admin Password {formData.password ? "" : "(Optional)"}
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter new password or keep existing"
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
                Assigned Role *
              </label>
              <select
                required
                value={formData.roleId}
                onChange={(e) =>
                  setFormData({ ...formData, roleId: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {(currentUserRoleSlug === "super_admin"
                  ? roles.filter((r) => r.slug === "admin")
                  : roles
                ).map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subroles checkboxes when SuperAdmin selects 'admin' role */}
          {currentUserRoleSlug === "super_admin" &&
            roles.find((r) => r._id === formData.roleId)?.slug === "admin" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-blue-900">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Delegated Sub-Roles For This Admin</span>
                </div>
                <p className="text-xs text-slate-600">
                  Select which sub-roles this Admin can create and manage in
                  their staff directory:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { slug: "property_manager", label: "Property Manager" },
                    { slug: "sales_executive", label: "Sales Executive" },
                    { slug: "sales_manager", label: "Sales Manager" },
                    { slug: "website_manager", label: "Website Manager" },
                  ].map((subrole) => {
                    const checked = formData.allowedSubRoles?.includes(
                      subrole.slug,
                    );
                    return (
                      <label
                        key={subrole.slug}
                        className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = formData.allowedSubRoles || [];
                            const updated = e.target.checked
                              ? [...current, subrole.slug]
                              : current.filter((s) => s !== subrole.slug);
                            setFormData({
                              ...formData,
                              allowedSubRoles: updated,
                            });
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{subrole.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Omit Department, Designation, Branch, Joining Date, and Team inputs when SuperAdmin is editing an Admin */}
          {currentUserRoleSlug !== "super_admin" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData({ ...formData, designation: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Branch *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Team / Unit
                  </label>
                  <input
                    type="text"
                    value={formData.team}
                    onChange={(e) =>
                      setFormData({ ...formData, team: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

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
            ? "Deactivate Staff Account"
            : "Activate Staff Account"
        }
        description={`Confirm status update for ${selectedUser?.name}.`}
        maxWidth="md"
      >
        <div className="space-y-4">
          {error && isStatusModalOpen && (
            <Alert
              type="error"
              title="Status Change Failed"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          <p className="text-sm text-slate-600">
            {selectedUser?.status === "active"
              ? `Are you sure you want to deactivate ${selectedUser.name}'s administrator account? When deactivated, the user will be immediately logged out and rejected from any authenticated request.`
              : `Are you sure you want to reactivate ${selectedUser?.name}'s administrator account? They will be able to log in with their existing credentials.`}
          </p>

          {selectedUser?.status === "active" && (
            <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-rose-950">
                    Super Admin Authorization Required
                  </h4>
                  <p className="text-xs text-rose-700/90 mt-0.5">
                    Enter your Super Admin account password to authorize the deactivation of this administrator.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Super Admin Password *
                </label>
                <div className="relative">
                  <input
                    type={showSuperAdminPassword ? "text" : "password"}
                    required
                    value={superAdminPassword}
                    onChange={(e) => {
                      setSuperAdminPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your password to authorize"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowSuperAdminPassword(!showSuperAdminPassword)
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={
                      showSuperAdminPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showSuperAdminPassword ? (
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
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
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
