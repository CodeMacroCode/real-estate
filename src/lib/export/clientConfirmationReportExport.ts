import {
  TabularExportFormat,
  TabularReportColumn,
  TabularReportMetaInput,
  createTabularReportExporters,
} from "./tabularReportExport";

export interface ExportableClientConfirmation {
  _id: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientConfirmation?: "YES" | "NO" | string;
  quotationAmount?: number;
  quotationNumber?: string;
  agreedDeliveryDate?: string;
  clientFeedback?: string;
  rejectionReason?: string;
  createdAt?: string;
}

const CLIENT_CONFIRMATION_REPORT_COLUMNS: TabularReportColumn[] = [
  { label: "#", excelWidth: 6, pdfWidth: 26, pdfMaxChars: 4, includeInPdf: true },
  { label: "Client Name", excelWidth: 22, pdfWidth: 106, pdfMaxChars: 20, includeInPdf: true },
  { label: "Phone", excelWidth: 16, pdfWidth: 80, pdfMaxChars: 15, includeInPdf: true },
  { label: "Email", excelWidth: 24, pdfWidth: 114, pdfMaxChars: 22, includeInPdf: true },
  { label: "Outcome", excelWidth: 16, pdfWidth: 78, pdfMaxChars: 15, includeInPdf: true },
  { label: "Quotation (INR)", excelWidth: 16, pdfWidth: 78, pdfMaxChars: 14, includeInPdf: true },
  { label: "Quotation No.", excelWidth: 18, includeInPdf: false },
  { label: "Handover Date", excelWidth: 16, pdfWidth: 76, pdfMaxChars: 13, includeInPdf: true },
  { label: "Feedback / Reason", excelWidth: 32, pdfWidth: 150, pdfMaxChars: 28, includeInPdf: true },
  { label: "Date Logged", excelWidth: 16, pdfWidth: 86, pdfMaxChars: 15, includeInPdf: true },
];

function formatDateCell(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

const confirmationExporters =
  createTabularReportExporters<ExportableClientConfirmation>({
    columns: CLIENT_CONFIRMATION_REPORT_COLUMNS,
    mapRows: (confirmations) =>
      confirmations.map((c, idx) => [
        idx + 1,
        String(c.clientName || "-"),
        String(c.clientPhone || "-"),
        String(c.clientEmail || "-"),
        c.clientConfirmation === "YES" ? "Confirmed (YES)" : "Rejected (NO)",
        typeof c.quotationAmount === "number" && c.quotationAmount > 0
          ? c.quotationAmount.toLocaleString("en-IN")
          : "-",
        String(c.quotationNumber || "-"),
        formatDateCell(c.agreedDeliveryDate),
        String(c.clientFeedback || c.rejectionReason || "-")
          .replace(/\s+/g, " ")
          .trim() || "-",
        formatDateCell(c.createdAt),
      ]),
    getMeta: (meta: TabularReportMetaInput = {}) => ({
      title: "Client Confirmation Decisions Report",
      sheetName: "Client Confirmations",
      filePrefix: "client-confirmations",
      totalLabel: "Total Decisions",
      generatedBy: meta.generatedBy,
      filterSummary: meta.filterSummary,
    }),
  });

export const buildClientConfirmationsCsvBytes =
  confirmationExporters.buildCsvBytes;
export const buildClientConfirmationsExcelBytes =
  confirmationExporters.buildExcelBytes;
export const buildClientConfirmationsPdfBytes =
  confirmationExporters.buildPdfBytes;

export function exportClientConfirmationsReport(
  format: TabularExportFormat,
  confirmations: ExportableClientConfirmation[],
  meta: TabularReportMetaInput = {},
) {
  confirmationExporters.exportByFormat(format, confirmations, meta);
}
