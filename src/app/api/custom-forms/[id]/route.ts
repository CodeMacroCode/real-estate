import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import {
  CustomForm,
  FormAdminAssignment,
  FormField,
} from "@/models/CustomForm";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();
    const { id } = await params;

    const form = await CustomForm.findById(id).lean();
    if (!form) {
      return errorResponse("Form not found", 404);
    }

    return jsonResponse(form);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch form", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    if (authContext.role?.slug !== "super_admin") {
      return errorResponse("Only Super Admin can edit form schemas", 403);
    }

    await connectToDatabase();
    const { id } = await params;

    const form = await CustomForm.findById(id);
    if (!form) {
      return errorResponse("Form not found", 404);
    }

    const body = await req.json();
    const { name, description, fields, isActive } = body;

    if (name) form.name = name.trim();
    if (description !== undefined) form.description = description.trim();
    if (isActive !== undefined) form.isActive = Boolean(isActive);

    if (fields && Array.isArray(fields)) {
      const hasNameMapping = fields.some(
        (f: FormField) => f.mapping === "client_name",
      );
      const hasPhoneMapping = fields.some(
        (f: FormField) => f.mapping === "client_phone",
      );

      if (!hasNameMapping) {
        return errorResponse(
          "Validation failed: At least one field must map to Client Name (client_name)",
          400,
        );
      }
      if (!hasPhoneMapping) {
        return errorResponse(
          "Validation failed: At least one field must map to Primary Phone (client_phone)",
          400,
        );
      }

      form.fields = fields.map((f: FormField, idx: number) => ({
        ...f,
        order: f.order !== undefined ? f.order : idx + 1,
      }));

      // Increment schema version
      form.version += 1;
    }

    await form.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "update",
      entity: "custom_forms",
      entityId: form._id.toString(),
      newValues: {
        name: form.name,
        version: form.version,
        fieldsCount: form.fields.length,
      },
    });

    return jsonResponse(form);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update form", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    if (authContext.role?.slug !== "super_admin") {
      return errorResponse("Only Super Admin can delete form schemas", 403);
    }

    await connectToDatabase();
    const { id } = await params;

    const form = await CustomForm.findById(id);
    if (!form) {
      return errorResponse("Form not found", 404);
    }

    // Check if form is assigned to any admin
    const assignmentCount = await FormAdminAssignment.countDocuments({
      formId: new mongoose.Types.ObjectId(id),
    });

    if (assignmentCount > 0) {
      return errorResponse(
        `Cannot delete form: It is currently assigned to ${assignmentCount} Admin organization(s). Unassign them first.`,
        400,
      );
    }

    await CustomForm.findByIdAndDelete(id);

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "delete",
      entity: "custom_forms",
      entityId: id,
      oldValues: { name: form.name },
    });

    return jsonResponse({ message: "Form deleted successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete form", 500);
  }
}
