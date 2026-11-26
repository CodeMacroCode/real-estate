import {
  TabularReportColumn,
  buildTabularCsvBytes,
  buildTabularExcelBytes,
  buildTabularPdfBytes,
  buildZipArchive,
  colIndexToLetters,
  exportTabularCsv,
  exportTabularExcel,
  exportTabularPdf,
  triggerBlobDownload,
  xmlEscape,
} from "./tabularReportExport";

export interface ExportableLead {
  _id: string;
  leadTitle?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  source?: string;
  campaignName?: string;
  status?: string;
  budget?: number;
  preferredProperty?: string;
  notes?: string;
  adminId?: { _id?: string; name?: string; email?: string } | null;
  assignedSubRoleId?: {
    _id?: string;
    name?: string;
    email?: string;
  } | null;
  assignedSubRoleName?: string;
  createdAt?: string;
}

export interface LeadExportMeta {
  generatedBy?: string;
  filterSummary?: string;
}

const LEAD_REPORT_COLUMNS: TabularReportColumn[] = [
  { label: "#", excelWidth: 6, pdfWidth: 28, pdfMaxChars: 4, includeInPdf: true },
  { label: "Lead Title", excelWidth: 26, pdfWidth: 120, pdfMaxChars: 24, includeInPdf: true },
  { label: "Client Name", excelWidth: 22, pdfWidth: 102, pdfMaxChars: 20, includeInPdf: true },
  { label: "Phone", excelWidth: 16, pdfWidth: 82, pdfMaxChars: 16, includeInPdf: true },
  { label: "Email", excelWidth: 26, pdfWidth: 122, pdfMaxChars: 25, includeInPdf: true },
  { label: "Location", excelWidth: 22, includeInPdf: false },
  { label: "Source", excelWidth: 14, pdfWidth: 64, pdfMaxChars: 12, includeInPdf: true },
  { label: "Campaign", excelWidth: 22, includeInPdf: false },
  { label: "Status", excelWidth: 14, pdfWidth: 66, pdfMaxChars: 13, includeInPdf: true },
  { label: "Budget (INR)", excelWidth: 15, includeInPdf: false },
  { label: "Assigned Executive", excelWidth: 22, pdfWidth: 96, pdfMaxChars: 18, includeInPdf: true },
  { label: "Organization", excelWidth: 22, includeInPdf: false },
  { label: "Created At", excelWidth: 22, pdfWidth: 114, pdfMaxChars: 21, includeInPdf: true },
  { label: "Notes", excelWidth: 36, includeInPdf: false },
];

function mapLeadRows(leads: ExportableLead[]): Array<Array<string | number>> {
  return leads.map((lead, idx) => [
    idx + 1,
    String(lead.leadTitle || "-"),
    String(lead.clientName || "-"),
    String(lead.clientPhone || "-"),
    String(lead.clientEmail || "-"),
    String(lead.clientAddress || "-"),
    String(lead.source || "-"),
    String(lead.campaignName || "-"),
    String(lead.status || "-"),
    typeof lead.budget === "number" && !Number.isNaN(lead.budget)
      ? lead.budget.toLocaleString("en-IN")
      : "-",
    String(
      lead.assignedSubRoleId?.name || lead.assignedSubRoleName || "Unassigned",
    ),
    String(lead.adminId?.name || "-"),
    lead.createdAt
      ? new Date(lead.createdAt).toLocaleString("en-IN", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-",
    String(lead.notes || "-").replace(/\s+/g, " ").trim() || "-",
  ]);
}

function getLeadReportMeta(meta: LeadExportMeta = {}) {
  return {
    title: "Leads & Inquiries Report",
    sheetName: "Leads Report",
    filePrefix: "leads-report",
    totalLabel: "Total Leads",
    generatedBy: meta.generatedBy,
    filterSummary: meta.filterSummary,
  };
}

export function buildLeadsCsvBytes(leads: ExportableLead[]): Uint8Array {
  return buildTabularCsvBytes(
    LEAD_REPORT_COLUMNS.map((c) => c.label),
    mapLeadRows(leads),
  );
}

export function exportLeadsToCsv(leads: ExportableLead[]) {
  exportTabularCsv(
    LEAD_REPORT_COLUMNS.map((c) => c.label),
    mapLeadRows(leads),
    "leads-report",
  );
}

export function buildLeadsExcelBytes(
  leads: ExportableLead[],
  meta: LeadExportMeta = {},
): Uint8Array {
  return buildTabularExcelBytes(
    LEAD_REPORT_COLUMNS,
    mapLeadRows(leads),
    getLeadReportMeta(meta),
  );
}

export function exportLeadsToExcel(
  leads: ExportableLead[],
  meta: LeadExportMeta = {},
) {
  exportTabularExcel(
    LEAD_REPORT_COLUMNS,
    mapLeadRows(leads),
    getLeadReportMeta(meta),
  );
}

export function buildLeadsPdfBytes(
  leads: ExportableLead[],
  meta: LeadExportMeta = {},
): Uint8Array {
  return buildTabularPdfBytes(
    LEAD_REPORT_COLUMNS,
    mapLeadRows(leads),
    getLeadReportMeta(meta),
  );
}

export function exportLeadsToPdf(
  leads: ExportableLead[],
  meta: LeadExportMeta = {},
) {
  exportTabularPdf(
    LEAD_REPORT_COLUMNS,
    mapLeadRows(leads),
    getLeadReportMeta(meta),
  );
}

export interface ImportTemplateColumn {
  key: string;
  header: string;
  required?: boolean;
  width?: number;
}

/**
 * Generates an Excel (.xlsx) import template strictly matching the active form columns.
 */
export function buildLeadsImportTemplateBytes(
  columns: ImportTemplateColumn[],
): Uint8Array {
  const colsXml = columns
    .map((col, idx) => {
      const width = col.width || Math.max(20, col.header.length + 6);
      return `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");

  const headerCells = columns
    .map((col, idx) => {
      const ref = `${colIndexToLetters(idx)}1`;
      return `<c r="${ref}" t="inlineStr" s="1"><is><t>${xmlEscape(col.header)}</t></is></c>`;
    })
    .join("");

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>
    <row r="1" ht="24" customHeight="1">${headerCells}</row>
  </sheetData>
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E40AF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Leads Import Template" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return buildZipArchive([
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: rootRelsXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml },
    { name: "xl/styles.xml", content: stylesXml },
    { name: "xl/worksheets/sheet1.xml", content: worksheetXml },
  ]);
}

export function exportLeadsImportTemplate(
  columns: ImportTemplateColumn[],
  filename?: string,
) {
  const bytes = buildLeadsImportTemplateBytes(columns);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(
    bytes,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename || `leads-import-template-${dateStamp}.xlsx`,
  );
}
