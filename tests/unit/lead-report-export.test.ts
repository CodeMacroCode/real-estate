import { describe, it, expect } from "vitest";
import {
  buildLeadsCsvBytes,
  buildLeadsExcelBytes,
  buildLeadsPdfBytes,
  ExportableLead,
} from "@/lib/export/leadReportExport";

function makeSampleLeads(count: number): ExportableLead[] {
  return Array.from({ length: count }, (_, idx) => ({
    _id: `lead_${idx + 1}`,
    leadTitle: `Luxury 3BHK Inquiry #${idx + 1}`,
    clientName: `Client Name ${idx + 1}`,
    clientPhone: `+91 98765432${String(idx).padStart(2, "0")}`,
    clientEmail: `client${idx + 1}@example.com`,
    clientAddress: "Bengaluru, KA",
    source: idx % 2 === 0 ? "Meta" : "GoogleAds",
    campaignName: "Skyline Launch 2026",
    status: idx % 3 === 0 ? "Completed" : "Pending",
    budget: 8500000,
    assignedSubRoleId: { name: "Rohan Verma" },
    adminId: { name: "Apex Realty" },
    notes: "Interested in east-facing corner unit",
    createdAt: "2026-11-26T08:30:00.000Z",
  }));
}

describe("leadReportExport", () => {
  it("builds a UTF-8 BOM CSV buffer containing headers and lead rows", () => {
    const leads = makeSampleLeads(2);
    const bytes = buildLeadsCsvBytes(leads);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('"Lead Title"');
    expect(text).toContain('"Luxury 3BHK Inquiry #1"');
    expect(text).toContain('"Client Name 2"');
  });

  it("builds a valid OOXML .xlsx zip archive containing worksheet XML and lead rows", () => {
    const leads = makeSampleLeads(3);
    const bytes = buildLeadsExcelBytes(leads, {
      generatedBy: "Admin User",
      filterSummary: "Status=Completed",
    });

    // ZIP local file header signature 'PK\x03\x04'
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);

    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toContain("[Content_Types].xml");
    expect(decoded).toContain("xl/worksheets/sheet1.xml");
    expect(decoded).toContain("Luxury 3BHK Inquiry #1");
    expect(decoded).toContain("Client Name 3");
    expect(decoded).toContain("Status=Completed");
  });

  it("builds a valid multi-page PDF 1.4 buffer with xref and EOF markers", () => {
    const leads = makeSampleLeads(35);
    const bytes = buildLeadsPdfBytes(leads, {
      generatedBy: "Admin User",
      filterSummary: "All Leads",
    });

    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("xref");
    expect(text).toContain("Page 1 of 2");
    expect(text).toContain("Page 2 of 2");
    expect(text).toContain("Luxury 3BHK Inquiry #1");
    expect(text).toContain("Luxury 3BHK Inquiry #35");
  });
});
