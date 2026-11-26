import {
  TabularExportFormat,
  TabularReportColumn,
  TabularReportMetaInput,
  createTabularReportExporters,
} from "./tabularReportExport";

export interface ExportableClient {
  _id: string;
  clientName?: string;
  phone?: string;
  email?: string;
  companyName?: string;
  address?: string;
  totalDealsWon?: number;
  totalRevenue?: number;
  lastAgreedDeliveryDate?: string;
  status?: string;
  createdAt?: string;
}

const CLIENT_REPORT_COLUMNS: TabularReportColumn[] = [
  { label: "#", excelWidth: 6, pdfWidth: 26, pdfMaxChars: 4, includeInPdf: true },
  { label: "Client Name", excelWidth: 24, pdfWidth: 112, pdfMaxChars: 22, includeInPdf: true },
  { label: "Phone", excelWidth: 16, pdfWidth: 84, pdfMaxChars: 16, includeInPdf: true },
  { label: "Email", excelWidth: 26, pdfWidth: 120, pdfMaxChars: 24, includeInPdf: true },
  { label: "Company Name", excelWidth: 22, pdfWidth: 100, pdfMaxChars: 19, includeInPdf: true },
  { label: "Address", excelWidth: 28, includeInPdf: false },
  { label: "Deals Won", excelWidth: 12, pdfWidth: 56, pdfMaxChars: 10, includeInPdf: true },
  { label: "Revenue (INR)", excelWidth: 18, pdfWidth: 82, pdfMaxChars: 15, includeInPdf: true },
  { label: "Handover Date", excelWidth: 16, pdfWidth: 74, pdfMaxChars: 14, includeInPdf: true },
  { label: "Status", excelWidth: 12, pdfWidth: 58, pdfMaxChars: 11, includeInPdf: true },
  { label: "Registered Date", excelWidth: 18, pdfWidth: 82, pdfMaxChars: 16, includeInPdf: true },
];

function formatDateCell(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

const clientExporters = createTabularReportExporters<ExportableClient>({
  columns: CLIENT_REPORT_COLUMNS,
  mapRows: (clients) =>
    clients.map((c, idx) => [
      idx + 1,
      String(c.clientName || "-"),
      String(c.phone || "-"),
      String(c.email || "-"),
      String(c.companyName || "-"),
      String(c.address || "-").replace(/\s+/g, " ").trim() || "-",
      c.totalDealsWon || 1,
      typeof c.totalRevenue === "number" && c.totalRevenue > 0
        ? c.totalRevenue.toLocaleString("en-IN")
        : "-",
      formatDateCell(c.lastAgreedDeliveryDate),
      String(c.status || "-"),
      formatDateCell(c.createdAt),
    ]),
  getMeta: (meta: TabularReportMetaInput = {}) => ({
    title: "Client Information (CRM Directory) Report",
    sheetName: "Client Directory",
    filePrefix: "crm-client-directory",
    totalLabel: "Total Clients",
    generatedBy: meta.generatedBy,
    filterSummary: meta.filterSummary,
  }),
});

export const buildClientsCsvBytes = clientExporters.buildCsvBytes;
export const buildClientsExcelBytes = clientExporters.buildExcelBytes;
export const buildClientsPdfBytes = clientExporters.buildPdfBytes;

export function exportClientsReport(
  format: TabularExportFormat,
  clients: ExportableClient[],
  meta: TabularReportMetaInput = {},
) {
  clientExporters.exportByFormat(format, clients, meta);
}
