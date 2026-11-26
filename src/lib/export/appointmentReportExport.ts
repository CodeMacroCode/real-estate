import {
  TabularReportColumn,
  buildTabularCsvBytes,
  buildTabularExcelBytes,
  buildTabularPdfBytes,
  exportTabularCsv,
  exportTabularExcel,
  exportTabularPdf,
} from "./tabularReportExport";

export interface ExportableAppointment {
  _id: string;
  meetingSequence?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  meetingDate?: string;
  durationMinutes?: number;
  meetingType?: string;
  meetingLocation?: string;
  googleCalendarLink?: string;
  agenda?: string;
  status?: string;
  outcome?: string;
  quotationAmount?: number;
  assignedSubRoleId?: { name?: string } | null;
  adminId?: { name?: string } | null;
}

export interface AppointmentExportMeta {
  generatedBy?: string;
  filterSummary?: string;
}

const APPOINTMENT_REPORT_COLUMNS: TabularReportColumn[] = [
  { label: "#", excelWidth: 6, pdfWidth: 26, pdfMaxChars: 4, includeInPdf: true },
  { label: "Seq", excelWidth: 8, includeInPdf: false },
  { label: "Client Name", excelWidth: 22, pdfWidth: 104, pdfMaxChars: 20, includeInPdf: true },
  { label: "Phone", excelWidth: 16, pdfWidth: 82, pdfMaxChars: 16, includeInPdf: true },
  { label: "Email", excelWidth: 24, includeInPdf: false },
  { label: "Meeting Date", excelWidth: 22, pdfWidth: 110, pdfMaxChars: 20, includeInPdf: true },
  { label: "Duration (Mins)", excelWidth: 14, includeInPdf: false },
  { label: "Mode", excelWidth: 14, pdfWidth: 60, pdfMaxChars: 12, includeInPdf: true },
  { label: "Location / Link", excelWidth: 28, includeInPdf: false },
  { label: "Agenda", excelWidth: 30, pdfWidth: 136, pdfMaxChars: 27, includeInPdf: true },
  { label: "Status", excelWidth: 14, pdfWidth: 66, pdfMaxChars: 13, includeInPdf: true },
  { label: "Outcome", excelWidth: 14, pdfWidth: 62, pdfMaxChars: 12, includeInPdf: true },
  { label: "Quotation (INR)", excelWidth: 16, pdfWidth: 68, pdfMaxChars: 13, includeInPdf: true },
  { label: "Host Executive", excelWidth: 22, pdfWidth: 80, pdfMaxChars: 15, includeInPdf: true },
];

function mapAppointmentRows(
  appointments: ExportableAppointment[],
): Array<Array<string | number>> {
  return appointments.map((apt, idx) => [
    idx + 1,
    apt.meetingSequence || 1,
    String(apt.clientName || "-"),
    String(apt.clientPhone || "-"),
    String(apt.clientEmail || "-"),
    apt.meetingDate
      ? new Date(apt.meetingDate).toLocaleString("en-IN", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-",
    apt.durationMinutes || 30,
    String(apt.meetingType || "Virtual"),
    String(apt.meetingLocation || apt.googleCalendarLink || "-"),
    String(apt.agenda || "-").replace(/\s+/g, " ").trim() || "-",
    String(apt.status || "-"),
    String(apt.outcome || "Pending"),
    typeof apt.quotationAmount === "number" && apt.quotationAmount > 0
      ? apt.quotationAmount.toLocaleString("en-IN")
      : "-",
    String(apt.assignedSubRoleId?.name || "Staff"),
  ]);
}

function getAppointmentMeta(meta: AppointmentExportMeta = {}) {
  return {
    title: "Appointments & Meetings Report",
    sheetName: "Appointments Report",
    filePrefix: "appointment-ledger",
    totalLabel: "Total Meetings",
    generatedBy: meta.generatedBy,
    filterSummary: meta.filterSummary,
  };
}

export function buildAppointmentsCsvBytes(
  appointments: ExportableAppointment[],
): Uint8Array {
  return buildTabularCsvBytes(
    APPOINTMENT_REPORT_COLUMNS.map((c) => c.label),
    mapAppointmentRows(appointments),
  );
}

export function exportAppointmentsToCsv(appointments: ExportableAppointment[]) {
  exportTabularCsv(
    APPOINTMENT_REPORT_COLUMNS.map((c) => c.label),
    mapAppointmentRows(appointments),
    "appointment-ledger",
  );
}

export function buildAppointmentsExcelBytes(
  appointments: ExportableAppointment[],
  meta: AppointmentExportMeta = {},
): Uint8Array {
  return buildTabularExcelBytes(
    APPOINTMENT_REPORT_COLUMNS,
    mapAppointmentRows(appointments),
    getAppointmentMeta(meta),
  );
}

export function exportAppointmentsToExcel(
  appointments: ExportableAppointment[],
  meta: AppointmentExportMeta = {},
) {
  exportTabularExcel(
    APPOINTMENT_REPORT_COLUMNS,
    mapAppointmentRows(appointments),
    getAppointmentMeta(meta),
  );
}

export function buildAppointmentsPdfBytes(
  appointments: ExportableAppointment[],
  meta: AppointmentExportMeta = {},
): Uint8Array {
  return buildTabularPdfBytes(
    APPOINTMENT_REPORT_COLUMNS,
    mapAppointmentRows(appointments),
    getAppointmentMeta(meta),
  );
}

export function exportAppointmentsToPdf(
  appointments: ExportableAppointment[],
  meta: AppointmentExportMeta = {},
) {
  exportTabularPdf(
    APPOINTMENT_REPORT_COLUMNS,
    mapAppointmentRows(appointments),
    getAppointmentMeta(meta),
  );
}
