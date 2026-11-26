import { describe, expect, it } from "vitest";
import {
  buildAppointmentsCsvBytes,
  buildAppointmentsExcelBytes,
  buildAppointmentsPdfBytes,
  ExportableAppointment,
} from "@/lib/export/appointmentReportExport";

const SAMPLE_APPOINTMENTS: ExportableAppointment[] = [
  {
    _id: "apt-1",
    meetingSequence: 1,
    clientName: "Rohan Mehta",
    clientPhone: "9876543210",
    clientEmail: "rohan@example.com",
    meetingDate: "2026-11-26T10:30:00.000Z",
    durationMinutes: 45,
    meetingType: "Physical",
    meetingLocation: "Bandra West Site Office",
    agenda: "Discuss 3BHK layout & payment schedule",
    status: "Scheduled",
    outcome: "Pending",
    quotationAmount: 18500000,
    assignedSubRoleId: { name: "Ananya Verma" },
  },
];

describe("appointmentReportExport", () => {
  it("builds UTF-8 BOM CSV bytes containing expected headers and row values", () => {
    const bytes = buildAppointmentsCsvBytes(SAMPLE_APPOINTMENTS);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const text = new TextDecoder().decode(bytes.slice(3));
    expect(text).toContain('"Client Name","Phone","Email","Meeting Date"');
    expect(text).toContain("Rohan Mehta");
    expect(text).toContain("Bandra West Site Office");
    expect(text).toContain("Ananya Verma");
  });

  it("builds a valid OOXML XLSX archive", () => {
    const bytes = buildAppointmentsExcelBytes(SAMPLE_APPOINTMENTS, {
      generatedBy: "Admin User",
      filterSummary: "All Appointments",
    });
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);

    const ascii = new TextDecoder().decode(bytes);
    expect(ascii).toContain("xl/worksheets/sheet1.xml");
    expect(ascii).toContain("Appointments &amp; Meetings Report");
    expect(ascii).toContain("Rohan Mehta");
  });

  it("builds a valid PDF 1.4 document with report title and appointment rows", () => {
    const bytes = buildAppointmentsPdfBytes(SAMPLE_APPOINTMENTS, {
      generatedBy: "Admin User",
      filterSummary: "All Appointments",
    });
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("Appointments & Meetings Report");
    expect(text).toContain("Rohan Mehta");
  });
});
