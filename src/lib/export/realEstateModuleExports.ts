import {
  TabularExportFormat,
  TabularReportColumn,
  TabularReportMetaInput,
  createTabularReportExporters,
} from "./tabularReportExport";

function formatDateCell(value?: string | null, withTime = false): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  if (withTime) {
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatInrAmount(amount?: number | null): string {
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return "-";
  }
  return amount.toLocaleString("en-IN");
}

function cleanText(value?: string | null): string {
  const normalized = String(value || "-")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "-";
}

// ============================================================================
// 1. Properties Inventory Exporter
// ============================================================================

export interface ExportableProperty {
  _id: string;
  propertyId?: string;
  title?: string;
  propertyCategory?: string;
  propertyType?: string;
  transactionType?: string;
  status?: string;
  owner?: { name?: string; mobile?: string } | null;
  pricing?: {
    price?: number;
    monthlyRent?: number;
  };
  areaDetails?: {
    carpetArea?: number;
    builtUpArea?: number;
    plotArea?: number;
    areaUnit?: string;
  };
  location?: {
    city?: string;
    address?: string;
  };
  createdAt?: string;
}

const PROPERTY_REPORT_COLUMNS: TabularReportColumn[] = [
  { label: "#", excelWidth: 6, pdfWidth: 26, pdfMaxChars: 4, includeInPdf: true },
  { label: "Prop ID", excelWidth: 14, pdfWidth: 64, pdfMaxChars: 12, includeInPdf: true },
  { label: "Title", excelWidth: 28, pdfWidth: 126, pdfMaxChars: 24, includeInPdf: true },
  { label: "Owner", excelWidth: 22, pdfWidth: 96, pdfMaxChars: 18, includeInPdf: true },
  { label: "Owner Phone", excelWidth: 16, includeInPdf: false },
  { label: "Category", excelWidth: 16, pdfWidth: 74, pdfMaxChars: 14, includeInPdf: true },
  { label: "Type", excelWidth: 16, includeInPdf: false },
  { label: "Transaction", excelWidth: 14, pdfWidth: 66, pdfMaxChars: 12, includeInPdf: true },
  { label: "Price / Rent (INR)", excelWidth: 18, pdfWidth: 86, pdfMaxChars: 16, includeInPdf: true },
  { label: "City", excelWidth: 16, pdfWidth: 76, pdfMaxChars: 14, includeInPdf: true },
  { label: "Address", excelWidth: 28, includeInPdf: false },
  { label: "Area", excelWidth: 16, pdfWidth: 66, pdfMaxChars: 12, includeInPdf: true },
  { label: "Status", excelWidth: 14, pdfWidth: 54, pdfMaxChars: 10, includeInPdf: true },
  { label: "Created Date", excelWidth: 16, pdfWidth: 60, pdfMaxChars: 12, includeInPdf: true },
];

const propertyExporters = createTabularReportExporters<ExportableProperty>({
  columns: PROPERTY_REPORT_COLUMNS,
  mapRows: (properties) =>
    properties.map((p, idx) => {
      const areaVal =
        p.areaDetails?.carpetArea ||
        p.areaDetails?.builtUpArea ||
        p.areaDetails?.plotArea;
      const areaLabel = areaVal
        ? `${areaVal.toLocaleString("en-IN")} ${p.areaDetails?.areaUnit || "Sq.Ft"}`
        : "-";
      const priceLabel = p.pricing?.monthlyRent
        ? `${formatInrAmount(p.pricing.monthlyRent)} /mo`
        : formatInrAmount(p.pricing?.price);

      return [
        idx + 1,
        cleanText(p.propertyId),
        cleanText(p.title),
        cleanText(p.owner?.name),
        cleanText(p.owner?.mobile),
        cleanText(p.propertyCategory),
        cleanText(p.propertyType),
        cleanText(p.transactionType),
        priceLabel,
        cleanText(p.location?.city),
        cleanText(p.location?.address),
        areaLabel,
        cleanText(p.status),
        formatDateCell(p.createdAt),
      ];
    }),
  getMeta: (meta: TabularReportMetaInput = {}) => ({
    title: "Properties Inventory Report",
    sheetName: "Properties Inventory",
    filePrefix: "properties-inventory",
    totalLabel: "Total Properties",
    generatedBy: meta.generatedBy,
    filterSummary: meta.filterSummary,
  }),
});

export const buildPropertiesCsvBytes = propertyExporters.buildCsvBytes;
export const buildPropertiesExcelBytes = propertyExporters.buildExcelBytes;
export const buildPropertiesPdfBytes = propertyExporters.buildPdfBytes;

export function exportPropertiesReport(
  format: TabularExportFormat,
  properties: ExportableProperty[],
  meta: TabularReportMetaInput = {},
) {
  propertyExporters.exportByFormat(format, properties, meta);
}

// ============================================================================
// 2. Projects & Units Exporter
// ============================================================================

export interface ExportableProject {
  _id: string;
  projectId?: string;
  name?: string;
  developerName?: string;
  projectType?: string;
  constructionStatus?: string;
  carpetArea?: number;
  location?: {
    city?: string;
    address?: string;
  };
  availableUnits?: number;
  bookedUnits?: number;
  soldUnits?: number;
  totalUnits?: number;
  createdAt?: string;
}

const PROJECT_REPORT_COLUMNS: TabularReportColumn[] = [
  { label: "#", excelWidth: 6, pdfWidth: 26, pdfMaxChars: 4, includeInPdf: true },
  { label: "Project ID", excelWidth: 14, pdfWidth: 68, pdfMaxChars: 13, includeInPdf: true },
  { label: "Project Name", excelWidth: 26, pdfWidth: 120, pdfMaxChars: 23, includeInPdf: true },
  { label: "Developer", excelWidth: 22, pdfWidth: 96, pdfMaxChars: 18, includeInPdf: true },
  { label: "Type", excelWidth: 16, pdfWidth: 72, pdfMaxChars: 13, includeInPdf: true },
  { label: "Stage", excelWidth: 18, pdfWidth: 88, pdfMaxChars: 16, includeInPdf: true },
  { label: "Carpet Area", excelWidth: 16, includeInPdf: false },
  { label: "City", excelWidth: 16, pdfWidth: 72, pdfMaxChars: 14, includeInPdf: true },
  { label: "Address", excelWidth: 28, includeInPdf: false },
  { label: "Avail Units", excelWidth: 12, pdfWidth: 58, pdfMaxChars: 11, includeInPdf: true },
  { label: "Booked / Sold", excelWidth: 14, pdfWidth: 68, pdfMaxChars: 13, includeInPdf: true },
  { label: "Total Units", excelWidth: 12, pdfWidth: 62, pdfMaxChars: 11, includeInPdf: true },
  { label: "Created Date", excelWidth: 16, pdfWidth: 64, pdfMaxChars: 12, includeInPdf: true },
];

const projectExporters = createTabularReportExporters<ExportableProject>({
  columns: PROJECT_REPORT_COLUMNS,
  mapRows: (projects) =>
    projects.map((p, idx) => [
      idx + 1,
      cleanText(p.projectId),
      cleanText(p.name),
      cleanText(p.developerName),
      cleanText(p.projectType),
      cleanText(p.constructionStatus),
      p.carpetArea ? `${p.carpetArea.toLocaleString("en-IN")} Sq.Ft` : "-",
      cleanText(p.location?.city),
      cleanText(p.location?.address),
      p.availableUnits ?? 0,
      `${p.bookedUnits ?? 0} / ${p.soldUnits ?? 0}`,
      p.totalUnits ?? 0,
      formatDateCell(p.createdAt),
    ]),
  getMeta: (meta: TabularReportMetaInput = {}) => ({
    title: "Projects & Structural Units Report",
    sheetName: "Projects & Units",
    filePrefix: "projects-units",
    totalLabel: "Total Projects",
    generatedBy: meta.generatedBy,
    filterSummary: meta.filterSummary,
  }),
});

export const buildProjectsCsvBytes = projectExporters.buildCsvBytes;
export const buildProjectsExcelBytes = projectExporters.buildExcelBytes;
export const buildProjectsPdfBytes = projectExporters.buildPdfBytes;

export function exportProjectsReport(
  format: TabularExportFormat,
  projects: ExportableProject[],
  meta: TabularReportMetaInput = {},
) {
  projectExporters.exportByFormat(format, projects, meta);
}

// ============================================================================
// 3. Client Track Record (Bookings) Exporter
// ============================================================================

export interface ExportableBooking {
  _id: string;
  bookingNumber?: string;
  clientId?: {
    clientName?: string;
    phone?: string;
    email?: string;
  } | null;
  inventoryLabel?: string;
  agreementValue?: number;
  totalPaid?: number;
  balanceAmount?: number;
  bookingStatus?: string;
  documents?: Array<{ title?: string }>;
  createdAt?: string;
}

const BOOKING_REPORT_COLUMNS: TabularReportColumn[] = [
  { label: "#", excelWidth: 6, pdfWidth: 26, pdfMaxChars: 4, includeInPdf: true },
  { label: "Booking #", excelWidth: 16, pdfWidth: 78, pdfMaxChars: 15, includeInPdf: true },
  { label: "Buyer Client", excelWidth: 22, pdfWidth: 102, pdfMaxChars: 19, includeInPdf: true },
  { label: "Phone", excelWidth: 16, pdfWidth: 78, pdfMaxChars: 15, includeInPdf: true },
  { label: "Property / Unit", excelWidth: 28, pdfWidth: 132, pdfMaxChars: 25, includeInPdf: true },
  { label: "Agreement (INR)", excelWidth: 18, pdfWidth: 82, pdfMaxChars: 15, includeInPdf: true },
  { label: "Paid (INR)", excelWidth: 16, pdfWidth: 74, pdfMaxChars: 14, includeInPdf: true },
  { label: "Pending (INR)", excelWidth: 16, pdfWidth: 76, pdfMaxChars: 14, includeInPdf: true },
  { label: "Status", excelWidth: 14, pdfWidth: 56, pdfMaxChars: 10, includeInPdf: true },
  { label: "Files", excelWidth: 10, pdfWidth: 36, pdfMaxChars: 7, includeInPdf: true },
  { label: "Date", excelWidth: 16, pdfWidth: 54, pdfMaxChars: 11, includeInPdf: true },
];

const bookingExporters = createTabularReportExporters<ExportableBooking>({
  columns: BOOKING_REPORT_COLUMNS,
  mapRows: (bookings) =>
    bookings.map((b, idx) => [
      idx + 1,
      cleanText(b.bookingNumber),
      cleanText(b.clientId?.clientName),
      cleanText(b.clientId?.phone),
      cleanText(b.inventoryLabel),
      formatInrAmount(b.agreementValue),
      formatInrAmount(b.totalPaid),
      formatInrAmount(b.balanceAmount),
      cleanText(b.bookingStatus),
      b.documents?.length || 0,
      formatDateCell(b.createdAt),
    ]),
  getMeta: (meta: TabularReportMetaInput = {}) => ({
    title: "Client Track Record & Document Locker Report",
    sheetName: "Client Track Record",
    filePrefix: "client-track-record",
    totalLabel: "Total Records",
    generatedBy: meta.generatedBy,
    filterSummary: meta.filterSummary,
  }),
});

export const buildBookingsCsvBytes = bookingExporters.buildCsvBytes;
export const buildBookingsExcelBytes = bookingExporters.buildExcelBytes;
export const buildBookingsPdfBytes = bookingExporters.buildPdfBytes;

export function exportBookingsReport(
  format: TabularExportFormat,
  bookings: ExportableBooking[],
  meta: TabularReportMetaInput = {},
) {
  bookingExporters.exportByFormat(format, bookings, meta);
}

// ============================================================================
// 4. Property Owners Exporter
// ============================================================================

export interface ExportableOwner {
  _id: string;
  ownerId?: string;
  name?: string;
  mobile?: string;
  email?: string;
  ownershipType?: string;
  panGstNumber?: string;
  company?: string;
  address?: string;
  totalPropertiesOwned?: number;
  documentsCount?: number;
}

const OWNER_REPORT_COLUMNS: TabularReportColumn[] = [
  { label: "#", excelWidth: 6, pdfWidth: 26, pdfMaxChars: 4, includeInPdf: true },
  { label: "Owner ID", excelWidth: 14, pdfWidth: 68, pdfMaxChars: 13, includeInPdf: true },
  { label: "Owner Name", excelWidth: 24, pdfWidth: 114, pdfMaxChars: 22, includeInPdf: true },
  { label: "Mobile", excelWidth: 16, pdfWidth: 82, pdfMaxChars: 15, includeInPdf: true },
  { label: "Email", excelWidth: 24, pdfWidth: 118, pdfMaxChars: 23, includeInPdf: true },
  { label: "Ownership", excelWidth: 16, pdfWidth: 72, pdfMaxChars: 13, includeInPdf: true },
  { label: "PAN / GST", excelWidth: 18, pdfWidth: 86, pdfMaxChars: 16, includeInPdf: true },
  { label: "Company", excelWidth: 22, pdfWidth: 96, pdfMaxChars: 18, includeInPdf: true },
  { label: "Properties", excelWidth: 12, pdfWidth: 64, pdfMaxChars: 11, includeInPdf: true },
  { label: "KYC Docs", excelWidth: 12, pdfWidth: 68, pdfMaxChars: 11, includeInPdf: true },
  { label: "Address", excelWidth: 28, includeInPdf: false },
];

const ownerExporters = createTabularReportExporters<ExportableOwner>({
  columns: OWNER_REPORT_COLUMNS,
  mapRows: (owners) =>
    owners.map((o, idx) => [
      idx + 1,
      cleanText(o.ownerId),
      cleanText(o.name),
      cleanText(o.mobile),
      cleanText(o.email),
      cleanText(o.ownershipType),
      cleanText(o.panGstNumber),
      cleanText(o.company),
      o.totalPropertiesOwned ?? 0,
      o.documentsCount ?? 0,
      cleanText(o.address),
    ]),
  getMeta: (meta: TabularReportMetaInput = {}) => ({
    title: "Property Owners Registry Report",
    sheetName: "Property Owners",
    filePrefix: "property-owners",
    totalLabel: "Total Owners",
    generatedBy: meta.generatedBy,
    filterSummary: meta.filterSummary,
  }),
});

export const buildOwnersCsvBytes = ownerExporters.buildCsvBytes;
export const buildOwnersExcelBytes = ownerExporters.buildExcelBytes;
export const buildOwnersPdfBytes = ownerExporters.buildPdfBytes;

export function exportOwnersReport(
  format: TabularExportFormat,
  owners: ExportableOwner[],
  meta: TabularReportMetaInput = {},
) {
  ownerExporters.exportByFormat(format, owners, meta);
}

// ============================================================================
// 5. Website Inquiries Exporter
// ============================================================================

export interface ExportableInquiry {
  id: string;
  inquiryType?: string;
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  status?: string;
  crmLead?: { title?: string } | null;
  property?: { title?: string; propertyId?: string } | null;
  project?: { name?: string; projectId?: string } | null;
  createdAt?: string;
}

const INQUIRY_REPORT_COLUMNS: TabularReportColumn[] = [
  { label: "#", excelWidth: 6, pdfWidth: 26, pdfMaxChars: 4, includeInPdf: true },
  { label: "Visitor Name", excelWidth: 22, pdfWidth: 102, pdfMaxChars: 20, includeInPdf: true },
  { label: "Phone", excelWidth: 16, pdfWidth: 80, pdfMaxChars: 15, includeInPdf: true },
  { label: "Email", excelWidth: 24, pdfWidth: 112, pdfMaxChars: 21, includeInPdf: true },
  { label: "Type", excelWidth: 16, pdfWidth: 72, pdfMaxChars: 13, includeInPdf: true },
  { label: "Context", excelWidth: 26, pdfWidth: 116, pdfMaxChars: 22, includeInPdf: true },
  { label: "Message", excelWidth: 32, pdfWidth: 124, pdfMaxChars: 24, includeInPdf: true },
  { label: "Status", excelWidth: 22, pdfWidth: 86, pdfMaxChars: 16, includeInPdf: true },
  { label: "CRM Lead", excelWidth: 22, includeInPdf: false },
  { label: "Received At", excelWidth: 18, pdfWidth: 76, pdfMaxChars: 15, includeInPdf: true },
];

function formatInquiryStatus(status?: string): string {
  if (status === "Converted_To_Lead") return "Lead Converted";
  if (status === "Appended_To_Existing_Lead") return "Appended";
  return status || "Pending";
}

const inquiryExporters = createTabularReportExporters<ExportableInquiry>({
  columns: INQUIRY_REPORT_COLUMNS,
  mapRows: (inquiries) =>
    inquiries.map((inq, idx) => {
      const context = inq.property
        ? `Prop: ${inq.property.title || inq.property.propertyId}`
        : inq.project
          ? `Project: ${inq.project.name || inq.project.projectId}`
          : "-";

      return [
        idx + 1,
        cleanText(inq.name),
        cleanText(inq.phone),
        cleanText(inq.email),
        cleanText(inq.inquiryType),
        cleanText(context),
        cleanText(inq.message),
        formatInquiryStatus(inq.status),
        cleanText(inq.crmLead?.title),
        formatDateCell(inq.createdAt, true),
      ];
    }),
  getMeta: (meta: TabularReportMetaInput = {}) => ({
    title: "Inbound Website Inquiries Report",
    sheetName: "Website Inquiries",
    filePrefix: "website-inquiries",
    totalLabel: "Total Inquiries",
    generatedBy: meta.generatedBy,
    filterSummary: meta.filterSummary,
  }),
});

export const buildInquiriesCsvBytes = inquiryExporters.buildCsvBytes;
export const buildInquiriesExcelBytes = inquiryExporters.buildExcelBytes;
export const buildInquiriesPdfBytes = inquiryExporters.buildPdfBytes;

export function exportInquiriesReport(
  format: TabularExportFormat,
  inquiries: ExportableInquiry[],
  meta: TabularReportMetaInput = {},
) {
  inquiryExporters.exportByFormat(format, inquiries, meta);
}
