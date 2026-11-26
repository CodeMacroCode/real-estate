import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { buildLeadsImportTemplateBytes } from "@/lib/export/leadReportExport";
import {
  buildLeadImportColumns,
  parseSpreadsheetBuffer,
} from "@/lib/import/excelParser";

const {
  mockGetAuthenticatedContext,
  mockConnectToDatabase,
  mockAssignmentFindOne,
  mockLeadCreate,
  mockClientFindOne,
  mockClientCreate,
  mockUserFindById,
  mockRecordAuditEvent,
} = vi.hoisted(() => ({
  mockGetAuthenticatedContext: vi.fn(),
  mockConnectToDatabase: vi.fn().mockResolvedValue(undefined),
  mockAssignmentFindOne: vi.fn(),
  mockLeadCreate: vi.fn(),
  mockClientFindOne: vi.fn(),
  mockClientCreate: vi.fn(),
  mockUserFindById: vi.fn(),
  mockRecordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedContext: mockGetAuthenticatedContext,
}));

vi.mock("@/lib/mongodb/db", () => ({
  connectToDatabase: mockConnectToDatabase,
}));

vi.mock("@/models/CustomForm", () => ({
  FormAdminAssignment: {
    findOne: mockAssignmentFindOne,
  },
}));

vi.mock("@/models/Lead", () => ({
  Lead: {
    create: mockLeadCreate,
  },
}));

vi.mock("@/models/Client", () => ({
  Client: {
    findOne: mockClientFindOne,
    create: mockClientCreate,
  },
}));

vi.mock("@/models/User", () => ({
  User: {
    findById: mockUserFindById,
  },
}));

vi.mock("@/services/auditService", () => ({
  recordAuditEvent: mockRecordAuditEvent,
}));

import { POST as bulkImportPost } from "@/app/api/leads/bulk-import/route";

describe("Lead Bulk Import Excel Template, Parser & API", () => {
  const adminId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates an XLSX template from dynamic form fields and parses it back cleanly", () => {
    const columns = buildLeadImportColumns([
      { id: "fld_name", label: "Client / Business Name", required: true, order: 1, mapping: "client_name" },
      { id: "fld_phone", label: "Primary Phone Number", required: true, order: 2, mapping: "client_phone" },
      { id: "fld_email", label: "Client Email", required: false, order: 3, mapping: "client_email" },
      { id: "fld_firm", label: "Shop / Firm Name", required: false, order: 4, mapping: "none" },
    ]);

    expect(columns.map((c) => c.header)).toEqual([
      "Lead Title / Inquiry Topic *",
      "Client / Business Name *",
      "Primary Phone Number *",
      "Client Email",
      "Shop / Firm Name",
      "Notes (Optional)",
    ]);

    const templateBytes = buildLeadsImportTemplateBytes(columns);
    const parsedRows = parseSpreadsheetBuffer(templateBytes, "template.xlsx");
    expect(parsedRows).toHaveLength(1);
    expect(parsedRows[0]).toEqual(columns.map((c) => c.header));
  });

  it("parses CSV rows with quoted values and imports valid rows mapped to dynamic form fields", async () => {
    mockGetAuthenticatedContext.mockResolvedValue({
      user: { _id: adminId, name: "Branch Admin", email: "admin@branch.com" },
      role: { slug: "admin" },
    });

    mockAssignmentFindOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          formId: {
            name: "Commercial Branch Form",
            fields: [
              { id: "fld_name", label: "Client / Business Name", required: true, order: 1, mapping: "client_name" },
              { id: "fld_phone", label: "Primary Phone Number", required: true, order: 2, mapping: "client_phone" },
              { id: "fld_email", label: "Client Email", required: false, order: 3, mapping: "client_email" },
              { id: "fld_firm", label: "Shop / Firm Name", required: false, order: 4, mapping: "none" },
            ],
          },
        }),
      }),
    });

    mockClientFindOne.mockResolvedValue(null);
    mockClientCreate.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
    mockLeadCreate.mockImplementation(async (doc: any) => ({
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      save: vi.fn().mockResolvedValue(undefined),
    }));

    const csvContent = [
      '"Lead Title / Inquiry Topic *","Client / Business Name *","Primary Phone Number *","Client Email","Shop / Firm Name","Notes (Optional)"',
      '"Office Space Inquiry","Apex Traders","9876543210","apex@traders.com","Apex Plaza","Looking for 2000 sqft"',
      '"Incomplete Row","No Phone Corp","","bad@corp.com","Some Shop",""',
    ].join("\n");

    const file = new File([csvContent], "leads.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", file);

    const req = new NextRequest("http://localhost:3000/api/leads/bulk-import", {
      method: "POST",
      body: formData,
    });

    const res = await bulkImportPost(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.importedCount).toBe(1);
    expect(json.data.failedCount).toBe(1);
    expect(json.data.totalRows).toBe(2);
    expect(json.data.errors[0].row).toBe(3);

    expect(mockLeadCreate).toHaveBeenCalledTimes(1);
    const createdLead = mockLeadCreate.mock.calls[0][0];
    expect(createdLead.leadTitle).toBe("Office Space Inquiry");
    expect(createdLead.clientName).toBe("Apex Traders");
    expect(createdLead.clientPhone).toBe("9876543210");
    expect(createdLead.rawSubmissionData["Shop / Firm Name"]).toBe("Apex Plaza");
    expect(createdLead.notes).toBe("Looking for 2000 sqft");
  });
});
