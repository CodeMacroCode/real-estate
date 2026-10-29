import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { hasPermission } from "@/policies/permissionPolicy";
import { getUserById, updateUser, deleteUser } from "@/services/userService";
import { updateStaffSchema, formatZodError } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { User } from "@/models/User";
import { Role } from "@/models/Role";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    if (!hasPermission(authContext.role, "staff_users", "view")) {
      return errorResponse(
        "Forbidden: You lack permission to view staff user details",
        403,
      );
    }

    const staffMember = await getUserById(params.id);
    if (!staffMember) {
      return errorResponse("Staff member not found", 404);
    }

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    // Must not be admin or super_admin
    if (
      (staffMember.role as any)?.slug === "super_admin" ||
      (staffMember.role as any)?.slug === "admin"
    ) {
      return errorResponse("Staff member not found", 404);
    }

    // If Admin, ensure target staff belongs to their sub-roles
    if (isAdmin) {
      if (
        (staffMember as any).parentAdminId?.toString() !==
        authContext.user._id.toString()
      ) {
        return errorResponse(
          "Forbidden: You can only view staff within your delegated sub-roles",
          403,
        );
      }
    }

    return jsonResponse(staffMember);
  } catch (error: any) {
    console.error(`GET /api/staff/${params.id} error:`, error);
    return errorResponse(
      error.message || "Failed to retrieve staff member",
      500,
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    if (!hasPermission(authContext.role, "staff_users", "edit")) {
      return errorResponse(
        "Forbidden: You lack permission to update staff members",
        403,
      );
    }

    const body = await req.json();
    const parseResult = updateStaffSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    const existingStaff = await User.findById(params.id).populate("roleId");
    if (!existingStaff) {
      return errorResponse("Staff member not found", 404);
    }

    // Must be staff sub-role (not admin or super_admin)
    if (
      (existingStaff.roleId as any)?.slug === "super_admin" ||
      (existingStaff.roleId as any)?.slug === "admin"
    ) {
      return errorResponse("Forbidden: Target is not a staff member", 403);
    }

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    // If Admin, verify ownership
    if (isAdmin) {
      if (
        existingStaff.parentAdminId?.toString() !==
        authContext.user._id.toString()
      ) {
        return errorResponse(
          "Forbidden: You can only edit staff within your delegated sub-roles",
          403,
        );
      }
    }

    // Role change validation
    if (
      parseResult.data.roleId &&
      parseResult.data.roleId !== (existingStaff.roleId as any)._id.toString()
    ) {
      const newRole = await Role.findById(parseResult.data.roleId);
      if (!newRole) {
        return errorResponse("Assigned role does not exist", 400);
      }

      if (newRole.slug === "super_admin" || newRole.slug === "admin") {
        return errorResponse(
          "Forbidden: Cannot escalate staff to Admin or Super Admin via staff route",
          403,
        );
      }

      if (isAdmin) {
        const allowedRoles = authContext.user.allowedSubRoles || [];
        if (!allowedRoles.includes(newRole.slug)) {
          return errorResponse(
            `Forbidden: You are not authorized to assign sub-role '${newRole.name}'`,
            403,
          );
        }
      }

      if (
        isSuperAdmin &&
        (parseResult.data.parentAdminId || existingStaff.parentAdminId)
      ) {
        const parentId =
          parseResult.data.parentAdminId || existingStaff.parentAdminId;
        const parentAdmin = await User.findById(parentId);
        if (
          parentAdmin &&
          !(parentAdmin.allowedSubRoles || []).includes(newRole.slug)
        ) {
          return errorResponse(
            `Forbidden: Assigned admin is not authorized for sub-role '${newRole.name}'`,
            403,
          );
        }
      }
    }

    const updatePayload: any = { ...parseResult.data };
    if (isAdmin) {
      delete updatePayload.parentAdminId; // Admins cannot reassign staff to other admins
    }

    const updated = await updateUser(params.id, updatePayload, {
      userId: authContext.user._id,
      employeeId: authContext.user.employeeId,
      name: authContext.user.name,
      email: authContext.user.email,
      roleSlug: authContext.role.slug,
    });

    return jsonResponse(updated);
  } catch (error: any) {
    console.error(`PUT /api/staff/${params.id} error:`, error);
    const msg = error.message || "Failed to update staff member";
    if (msg.includes("forbidden") || msg.includes("Forbidden")) {
      return errorResponse(msg, 403);
    }
    if (msg.includes("not found") || msg.includes("Not found")) {
      return errorResponse(msg, 404);
    }
    return errorResponse(msg, 400);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    if (!hasPermission(authContext.role, "staff_users", "delete")) {
      return errorResponse(
        "Forbidden: You lack permission to delete staff members",
        403,
      );
    }

    const existingStaff = await User.findById(params.id).populate("roleId");
    if (!existingStaff) {
      return errorResponse("Staff member not found", 404);
    }

    if (
      (existingStaff.roleId as any)?.slug === "super_admin" ||
      (existingStaff.roleId as any)?.slug === "admin"
    ) {
      return errorResponse("Forbidden: Target is not a staff member", 403);
    }

    const isAdmin = authContext.role.slug === "admin";
    if (
      isAdmin &&
      existingStaff.parentAdminId?.toString() !==
        authContext.user._id.toString()
    ) {
      return errorResponse(
        "Forbidden: You can only delete staff within your delegated sub-roles",
        403,
      );
    }

    await deleteUser(params.id, {
      userId: authContext.user._id,
      employeeId: authContext.user.employeeId,
      name: authContext.user.name,
      email: authContext.user.email,
      roleSlug: authContext.role.slug,
    });

    return jsonResponse({ message: "Staff member deleted successfully" });
  } catch (error: any) {
    console.error(`DELETE /api/staff/${params.id} error:`, error);
    return errorResponse(error.message || "Failed to delete staff member", 500);
  }
}
