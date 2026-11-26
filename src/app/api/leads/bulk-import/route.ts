import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Lead } from "@/models/Lead";
import { User } from "@/models/User";
import { Client } from "@/models/Client";
import { FormAdminAssignment } from "@/models/CustomForm";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import {
  buildLeadImportColumns,
  isLeadTitleField,
  normalizeImportHeader,
  parseSpreadsheetBuffer,
} from "@/lib/import/excelParser";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMPORT_ROWS = 2000;

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return errorResponse("Multipart form data with an Excel file is required", 400);
    }

    const fileEntry = formData.get("file");
    const requestedAdminId = String(formData.get("adminId") || "").trim();

    if (!(fileEntry instanceof File)) {
      return errorResponse("Please upload a valid .xlsx or .csv file", 400);
    }

    if (fileEntry.size === 0) {
      return errorResponse("Uploaded file is empty", 400);
    }

    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse("File size exceeds the 10MB limit", 400);
    }

    const roleSlug = authContext.role?.slug || "";
    const isSuperAdmin = roleSlug === "super_admin";
    const isAdmin = roleSlug === "admin";

    let resolvedAdminId: mongoose.Types.ObjectId;
    if (isSuperAdmin) {
      if (!requestedAdminId || !mongoose.Types.ObjectId.isValid(requestedAdminId)) {
        return errorResponse(
          "Super Admin must select an Admin organization before importing leads",
          400,
        );
      }
      resolvedAdminId = new mongoose.Types.ObjectId(requestedAdminId);
    } else if (isAdmin) {
      resolvedAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      const currentUser = await User.findById(authContext.user._id)
        .select("parentAdminId")
        .lean();
      if (!currentUser?.parentAdminId) {
        return errorResponse(
          "User does not belong to an active Admin organization",
          403,
        );
      }
      resolvedAdminId = new mongoose.Types.ObjectId(
        currentUser.parentAdminId.toString(),
      );
    }

    const arrayBuffer = await fileEntry.arrayBuffer();
    const rows = parseSpreadsheetBuffer(
      Buffer.from(arrayBuffer),
      fileEntry.name || "import.xlsx",
    );

    if (rows.length < 2) {
      return errorResponse(
        "The uploaded spreadsheet must include a header row and at least one data row.",
        400,
      );
    }

    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    if (dataRows.length > MAX_IMPORT_ROWS) {
      return errorResponse(
        `Maximum ${MAX_IMPORT_ROWS} rows can be imported at once.`,
        400,
      );
    }

    // Load active dynamic form assigned to this Admin
    const assignment: any = await FormAdminAssignment.findOne({
      adminId: resolvedAdminId,
      isActive: true,
    })
      .populate("formId")
      .lean();

    const activeForm = assignment?.formId || null;
    const activeColumns = buildLeadImportColumns(activeForm?.fields || null);

    // Map normalized header name -> spreadsheet column index
    const headerIndexMap = new Map<string, number>();
    headerRow.forEach((cell, idx) => {
      const norm = normalizeImportHeader(cell);
      if (norm && !headerIndexMap.has(norm)) {
        headerIndexMap.set(norm, idx);
      }
    });

    const getCellByColumn = (
      row: string[],
      col: { key: string; label: string; header: string; mapping?: string },
      aliases: string[] = [],
    ): string => {
      const candidates = [
        normalizeImportHeader(col.label),
        normalizeImportHeader(col.header),
        normalizeImportHeader(col.key),
        ...aliases.map(normalizeImportHeader),
      ];
      for (const candidate of candidates) {
        if (!candidate) continue;
        const idx = headerIndexMap.get(candidate);
        if (idx !== undefined) {
          return (row[idx] || "").trim();
        }
      }
      return "";
    };

    const getByAliases = (row: string[], aliases: string[]): string => {
      for (const alias of aliases) {
        const idx = headerIndexMap.get(normalizeImportHeader(alias));
        if (idx !== undefined) {
          return (row[idx] || "").trim();
        }
      }
      return "";
    };

    let importedCount = 0;
    const errors: Array<{ row: number; error: string }> = [];
    const createdById = new mongoose.Types.ObjectId(authContext.user._id);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // 1-indexed spreadsheet row

      try {
        let clientName = "";
        let clientPhone = "";
        let clientEmail = "";
        let clientAddress = "";
        let customLeadTitle = "";
        let notes = "";
        const rawSubmissionData: Record<string, any> = {};

        for (const col of activeColumns) {
          let aliases: string[] = [];
          if (col.mapping === "client_name") {
            aliases = ["client name", "client / business name", "full name", "name"];
          } else if (col.mapping === "client_phone") {
            aliases = ["phone", "client phone", "primary phone number", "mobile", "phone number"];
          } else if (col.mapping === "client_email") {
            aliases = ["email", "client email", "email address"];
          } else if (col.mapping === "client_address") {
            aliases = ["address", "location", "address / location", "city"];
          } else if (col.mapping === "lead_title" || isLeadTitleField(col)) {
            aliases = ["lead title", "lead title / inquiry topic", "inquiry topic", "title"];
          } else if (col.mapping === "notes") {
            aliases = ["notes", "notes (optional)", "comments", "remarks"];
          }

          const val = getCellByColumn(row, col, aliases);

          if (
            col.required &&
            col.mapping !== "lead_title" &&
            !val
          ) {
            throw new Error(`Missing required column "${col.label}"`);
          }

          if (col.mapping === "lead_title" || isLeadTitleField(col)) {
            if (val && !customLeadTitle) customLeadTitle = val;
          }

          if (col.mapping === "client_name") {
            if (!clientName) clientName = val;
          } else if (col.mapping === "client_phone") {
            if (!clientPhone) clientPhone = val;
          } else if (col.mapping === "client_email") {
            if (!clientEmail && val) clientEmail = val.toLowerCase();
          } else if (col.mapping === "client_address") {
            if (!clientAddress) clientAddress = val;
          } else if (col.mapping === "notes") {
            if (!notes) notes = val;
          } else if (col.mapping !== "lead_title") {
            if (val !== "") {
              rawSubmissionData[col.label || col.key] = val;
            }
          }
        }

        // Canonical fallbacks in case headers used standard names
        if (!clientName) {
          clientName = getByAliases(row, [
            "client name",
            "client / business name",
            "full name",
            "name",
          ]);
        }
        if (!clientPhone) {
          clientPhone = getByAliases(row, [
            "primary phone number",
            "client phone",
            "phone",
            "mobile",
          ]);
        }
        if (!clientEmail) {
          clientEmail = getByAliases(row, ["client email", "email"]).toLowerCase();
        }
        if (!clientAddress) {
          clientAddress = getByAliases(row, [
            "address / location",
            "client address",
            "address",
            "location",
          ]);
        }
        if (!customLeadTitle) {
          customLeadTitle = getByAliases(row, [
            "lead title / inquiry topic",
            "lead title",
            "inquiry topic",
            "title",
          ]);
        }
        if (!notes) {
          notes = getByAliases(row, ["notes", "notes (optional)"]);
        }

        if (!clientName || !clientPhone) {
          throw new Error("Client Name and Primary Phone Number are required");
        }

        const finalizedLeadTitle =
          customLeadTitle ||
          `${clientName} - ${activeForm?.name || "Bulk Import"}`;

        const newLead = await Lead.create({
          leadTitle: finalizedLeadTitle,
          clientName,
          clientPhone,
          clientEmail: clientEmail || undefined,
          clientAddress: clientAddress || undefined,
          source: "Manual",
          notes,
          rawSubmissionData,
          status: "Pending",
          adminId: resolvedAdminId,
          createdById,
        });

        let client = await Client.findOne({
          phone: clientPhone.trim(),
          adminId: resolvedAdminId,
        });
        if (!client) {
          client = await Client.create({
            adminId: resolvedAdminId,
            leadId: newLead._id,
            clientName: clientName.trim(),
            phone: clientPhone.trim(),
            email: clientEmail ? clientEmail.trim().toLowerCase() : undefined,
            address: clientAddress ? clientAddress.trim() : undefined,
            companyName:
              rawSubmissionData?.company_name ||
              rawSubmissionData?.organization_name ||
              rawSubmissionData?.["Company Name"] ||
              rawSubmissionData?.["Shop / Firm Name"] ||
              "",
            totalDealsWon: 0,
            status: "Active",
            notes: notes
              ? `From lead: ${finalizedLeadTitle} - ${notes}`
              : `Created from bulk import: ${finalizedLeadTitle}`,
            createdById,
          });
        } else {
          if (!client.email && clientEmail) {
            client.email = clientEmail.trim().toLowerCase();
          }
          if (!client.address && clientAddress) {
            client.address = clientAddress.trim();
          }
          await client.save();
        }

        newLead.clientId = client._id;
        await newLead.save();
        importedCount++;
      } catch (rowErr: any) {
        errors.push({
          row: rowNumber,
          error: rowErr?.message || "Invalid row data",
        });
      }
    }

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "import",
      entity: "leads",
      entityId: resolvedAdminId.toString(),
      newValues: {
        fileName: fileEntry.name,
        totalRows: dataRows.length,
        importedCount,
        failedCount: errors.length,
        formName: activeForm?.name || "Default",
      },
    });

    return jsonResponse({
      importedCount,
      failedCount: errors.length,
      totalRows: dataRows.length,
      errors: errors.slice(0, 25),
    });
  } catch (error: any) {
    console.error("[BulkImportLeads Error]:", error);
    return errorResponse(
      error.message || "Failed to import leads from spreadsheet",
      500,
    );
  }
}
