import { describe, expect, it } from "vitest";
import {
  buildClientsCsvBytes,
  buildClientsExcelBytes,
  buildClientsPdfBytes,
  ExportableClient,
} from "@/lib/export/clientReportExport";
import {
  buildClientConfirmationsCsvBytes,
  buildClientConfirmationsExcelBytes,
  buildClientConfirmationsPdfBytes,
  ExportableClientConfirmation,
} from "@/lib/export/clientConfirmationReportExport";

const SAMPLE_CLIENTS: ExportableClient[] = [
  {
    _id: "client-1",
    clientName: "Kavita Sharma",
    phone: "9820012345",
    email: "kavita@example.com",
    companyName: "Sharma Ventures",
    address: "Lower Parel, Mumbai",
    totalDealsWon: 2,
    totalRevenue: 24500000,
    lastAgreedDeliveryDate: "2026-12-15T00:00:00.000Z",
    status: "VIP",
    createdAt: "2026-11-10T09:00:00.000Z",
  },
];

const SAMPLE_CONFIRMATIONS: ExportableClientConfirmation[] = [
  {
    _id: "conf-1",
    clientName: "Arjun Nair",
    clientPhone: "9811122334",
    clientEmail: "arjun@example.com",
    clientConfirmation: "YES",
    quotationAmount: 14500000,
    quotationNumber: "QT-2026-042",
    agreedDeliveryDate: "2027-01-20T00:00:00.000Z",
    clientFeedback: "Approved corner unit pricing",
    createdAt: "2026-11-22T11:15:00.000Z",
  },
];

describe("clientReportExport", () => {
  it("builds CSV, Excel, and PDF bytes for Client Information", () => {
    const csv = buildClientsCsvBytes(SAMPLE_CLIENTS);
    expect(csv.slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
    const csvText = new TextDecoder().decode(csv.slice(3));
    expect(csvText).toContain('"Client Name","Phone","Email","Company Name"');
    expect(csvText).toContain("Kavita Sharma");
    expect(csvText).toContain("Sharma Ventures");

    const xlsx = buildClientsExcelBytes(SAMPLE_CLIENTS, {
      generatedBy: "Admin",
      filterSummary: "All Clients",
    });
    expect(xlsx.slice(0, 4)).toEqual(new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
    expect(new TextDecoder().decode(xlsx)).toContain(
      "Client Information (CRM Directory) Report",
    );

    const pdf = buildClientsPdfBytes(SAMPLE_CLIENTS, {
      generatedBy: "Admin",
      filterSummary: "All Clients",
    });
    const pdfText = new TextDecoder("latin1").decode(pdf);
    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdfText).toContain("Client Information \\(CRM Directory\\) Report");
    expect(pdfText).toContain("Kavita Sharma");
  });
});

describe("clientConfirmationReportExport", () => {
  it("builds CSV, Excel, and PDF bytes for Client Confirmations", () => {
    const csv = buildClientConfirmationsCsvBytes(SAMPLE_CONFIRMATIONS);
    expect(csv.slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
    const csvText = new TextDecoder().decode(csv.slice(3));
    expect(csvText).toContain('"Client Name","Phone","Email","Outcome"');
    expect(csvText).toContain("Confirmed (YES)");
    expect(csvText).toContain("Arjun Nair");

    const xlsx = buildClientConfirmationsExcelBytes(SAMPLE_CONFIRMATIONS, {
      generatedBy: "Admin",
      filterSummary: "All Decisions",
    });
    expect(xlsx.slice(0, 4)).toEqual(new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
    expect(new TextDecoder().decode(xlsx)).toContain(
      "Client Confirmation Decisions Report",
    );

    const pdf = buildClientConfirmationsPdfBytes(SAMPLE_CONFIRMATIONS, {
      generatedBy: "Admin",
      filterSummary: "All Decisions",
    });
    const pdfText = new TextDecoder("latin1").decode(pdf);
    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdfText).toContain("Client Confirmation Decisions Report");
    expect(pdfText).toContain("Arjun Nair");
  });
});
