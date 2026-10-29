import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { hasPermission } from "@/policies/permissionPolicy";
import { listUsers, createUser } from "@/services/userService";
import { createStaffSchema, formatZodError } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { Role } from "@/models/Role";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    if (!hasPermission(authContext.role, "staff_users", "view")) {
      return errorResponse(
        "Forbidden: You lack permission to view staff members",
        403,
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";
    const roleId = searchParams.get("roleId") || "";
    const parentAdminIdParam = searchParams.get("parentAdminId") || "";

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    // Staff endpoint ONLY lists staff members (non-admin, non-superadmin sub-roles)
    // If admin is requesting, scope exclusively to their own sub-roles
    // If superadmin is requesting, can optionally filter by parentAdminId or view all staff
    const result = await listUsers({
      page,
      limit,
      search,
      department,
      roleId,
      status,
      userType: "staff",
      parentAdminId: isAdmin
        ? authContext.user._id
        : parentAdminIdParam || undefined,
    });

    return jsonResponse(result.users, 200, result.pagination);
  } catch (error: any) {
    console.error("GET /api/staff error:", error);
    return errorResponse(
      error.message || "Failed to retrieve staff members",
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    if (!hasPermission(authContext.role, "staff_users", "create")) {
      return errorResponse(
        "Forbidden: You lack permission to create staff members",
        403,
      );
    }

    const body = await req.json();
    const parseResult = createStaffSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    const targetRole = await Role.findById(parseResult.data.roleId);
    if (!targetRole) {
      return errorResponse("Assigned role does not exist", 400);
    }

    // Staff endpoint is exclusively for sub-roles (cannot create super_admin or admin)
    if (targetRole.slug === "super_admin" || targetRole.slug === "admin") {
      return errorResponse(
        "Forbidden: The staff endpoint cannot be used to create Admin or Super Admin accounts",
        403,
      );
    }

    let parentAdminIdToAssign = null;

    if (isSuperAdmin) {
      // Superadmin MUST designate which admin this staff belongs to
      if (!parseResult.data.parentAdminId) {
        return errorResponse(
          "Admin selection is required for staff member",
          400,
        );
      }
      const parentAdmin = await User.findById(
        parseResult.data.parentAdminId,
      ).populate("roleId");
      if (!parentAdmin || (parentAdmin.roleId as any)?.slug !== "admin") {
        return errorResponse(
          "Selected parent administrator is invalid or does not exist",
          400,
        );
      }

      // Check if selected admin has permission for this sub-role
      const allowedRoles = parentAdmin.allowedSubRoles || [];
      if (!allowedRoles.includes(targetRole.slug)) {
        return errorResponse(
          `Forbidden: Selected admin is not authorized for sub-role '${targetRole.name}'`,
          403,
        );
      }
      parentAdminIdToAssign = parentAdmin._id;
    } else if (isAdmin) {
      // Admin automatically assigns themselves as parentAdminId
      parentAdminIdToAssign = authContext.user._id;

      // Admin can ONLY assign roles from their allowedSubRoles
      const allowedRoles = authContext.user.allowedSubRoles || [];
      if (!allowedRoles.includes(targetRole.slug)) {
        return errorResponse(
          `Forbidden: You are not authorized to create staff with sub-role '${targetRole.name}'`,
          403,
        );
      }
    } else {
      return errorResponse(
        "Forbidden: Only Super Admin and Admins can create staff members",
        403,
      );
    }

    // Role privilege ceiling verification
    if (!isSuperAdmin) {
      for (const p of targetRole.permissions || []) {
        for (const action of p.actions || []) {
          if (!hasPermission(authContext.role, p.module, action)) {
            return errorResponse(
              "Forbidden: You cannot assign a role with privileges exceeding your own authority",
              403,
            );
          }
        }
      }
    }

    // Map default metadata from sub-role
    const roleSlugToMeta: Record<
      string,
      { department: string; designation: string }
    > = {
      property_manager: {
        department: "Property Management",
        designation: "Property Manager",
      },
      sales_executive: { department: "Sales", designation: "Sales Executive" },
      sales_manager: { department: "Sales", designation: "Sales Manager" },
      website_manager: {
        department: "Marketing & IT",
        designation: "Website Manager",
      },
    };
    const meta = roleSlugToMeta[targetRole.slug] || {
      department: "Operations",
      designation: targetRole.name,
    };

    const newStaff = await createUser(
      {
        ...parseResult.data,
        parentAdminId: parentAdminIdToAssign,
        department: parseResult.data.department || meta.department,
        designation: parseResult.data.designation || meta.designation,
        branch: parseResult.data.branch || "Main Branch",
      },
      {
        userId: authContext.user._id,
        employeeId: authContext.user.employeeId,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
      },
    );

    return jsonResponse(newStaff, 201);
  } catch (error: any) {
    console.error("POST /api/staff error:", error);
    const msg = error.message || "Failed to create staff member";
    if (msg.includes("Forbidden") || msg.includes("forbidden")) {
      return errorResponse(msg, 403);
    }
    return errorResponse(msg, 400);
  }
}
