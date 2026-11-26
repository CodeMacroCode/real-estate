export interface TabularReportColumn {
  label: string;
  excelWidth?: number;
  pdfWidth?: number;
  pdfMaxChars?: number;
  includeInPdf?: boolean;
}

export interface TabularReportMeta {
  title: string;
  sheetName: string;
  filePrefix: string;
  generatedBy?: string;
  filterSummary?: string;
  totalLabel?: string;
}

export interface TabularReportMetaInput {
  generatedBy?: string;
  filterSummary?: string;
}

export type TabularExportFormat = "csv" | "excel" | "pdf";

export function triggerBlobDownload(
  bytes: Uint8Array,
  mimeType: string,
  filename: string,
) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================================================================
// CSV Generator (UTF-8 BOM)
// ============================================================================

function csvEscape(value: string | number): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildTabularCsvBytes(
  headers: string[],
  rows: Array<Array<string | number>>,
): Uint8Array {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  return new TextEncoder().encode(`\uFEFF${lines.join("\r\n")}`);
}

export function exportTabularCsv(
  headers: string[],
  rows: Array<Array<string | number>>,
  filePrefix: string,
) {
  const bytes = buildTabularCsvBytes(headers, rows);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(
    bytes,
    "text/csv;charset=utf-8",
    `${filePrefix}-${dateStamp}.csv`,
  );
}

// ============================================================================
// OOXML (.xlsx) Generator (Uncompressed STORE ZIP)
// ============================================================================

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function colIndexToLetters(colIndex: number): string {
  let n = colIndex + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function buildZipArchive(
  entries: Array<{ name: string; content: string }>,
): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLength = offset + centralSize + eocd.length;
  const output = new Uint8Array(totalLength);
  let cursor = 0;
  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(eocd, cursor);
  return output;
}

export function buildTabularExcelBytes(
  columns: TabularReportColumn[],
  rows: Array<Array<string | number>>,
  meta: TabularReportMeta,
): Uint8Array {
  const colsXml = columns
    .map(
      (c, idx) =>
        `<col min="${idx + 1}" max="${idx + 1}" width="${
          c.excelWidth || Math.max(16, c.label.length + 4)
        }" customWidth="1"/>`,
    )
    .join("");

  const makeCell = (
    rowNum: number,
    colIdx: number,
    value: string | number,
    styleId: number,
  ) => {
    const ref = `${colIndexToLetters(colIdx)}${rowNum}`;
    if (typeof value === "number") {
      return `<c r="${ref}" s="${styleId}"><v>${value}</v></c>`;
    }
    return `<c r="${ref}" t="inlineStr" s="${styleId}"><is><t>${xmlEscape(value)}</t></is></c>`;
  };

  const sheetRowsXml: string[] = [];
  sheetRowsXml.push(
    `<row r="1" ht="24" customHeight="1">${makeCell(1, 0, meta.title, 1)}</row>`,
  );

  const generatedAt = new Date().toLocaleString("en-IN");
  const subtitle = [
    `Generated: ${generatedAt}`,
    `${meta.totalLabel || "Total Records"}: ${rows.length}`,
    meta.filterSummary ? `Filters: ${meta.filterSummary}` : "",
    meta.generatedBy ? `Exported By: ${meta.generatedBy}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");
  sheetRowsXml.push(
    `<row r="2" ht="18" customHeight="1">${makeCell(2, 0, subtitle, 2)}</row>`,
  );

  const headerCells = columns
    .map((c, idx) => makeCell(4, idx, c.label, 3))
    .join("");
  sheetRowsXml.push(
    `<row r="4" ht="22" customHeight="1">${headerCells}</row>`,
  );

  rows.forEach((rowVals, rIdx) => {
    const excelRow = rIdx + 5;
    const cellsXml = rowVals
      .map((val, cIdx) => makeCell(excelRow, cIdx, val, 0))
      .join("");
    sheetRowsXml.push(`<row r="${excelRow}">${cellsXml}</row>`);
  });

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>${sheetRowsXml.join("")}</sheetData>
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>
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
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
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
    <sheet name="${xmlEscape(meta.sheetName)}" sheetId="1" r:id="rId1"/>
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

export function exportTabularExcel(
  columns: TabularReportColumn[],
  rows: Array<Array<string | number>>,
  meta: TabularReportMeta,
) {
  const bytes = buildTabularExcelBytes(columns, rows, meta);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(
    bytes,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `${meta.filePrefix}-${dateStamp}.xlsx`,
  );
}

// ============================================================================
// PDF 1.4 Generator (Landscape A4 Multi-Page Table)
// ============================================================================

function toWinAnsiAscii(text: string): string {
  const normalized = text
    .replace(/₹/g, "INR ")
    .replace(/[•·]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  let out = "";
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
      out += normalized[i];
    } else {
      out += " ";
    }
  }
  return out;
}

function pdfEscape(text: string): string {
  return toWinAnsiAscii(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function fitText(text: string, maxChars: number): string {
  const clean = toWinAnsiAscii(text).replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  if (maxChars <= 3) return clean.slice(0, maxChars);
  return `${clean.slice(0, maxChars - 3)}...`;
}

export function buildTabularPdfBytes(
  columns: TabularReportColumn[],
  rows: Array<Array<string | number>>,
  meta: TabularReportMeta,
): Uint8Array {
  const pageWidth = 842; // A4 Landscape
  const pageHeight = 595;
  const marginX = 24;
  const contentWidth = pageWidth - marginX * 2; // 794pt

  const pdfColIndices = columns
    .map((col, idx) => ({ col, idx }))
    .filter(({ col }) => col.includeInPdf !== false);

  const rawWidthSum = pdfColIndices.reduce(
    (sum, { col }) => sum + (col.pdfWidth || 90),
    0,
  );
  const scale = rawWidthSum > 0 ? contentWidth / rawWidthSum : 1;
  const scaledCols = pdfColIndices.map(({ col, idx }) => {
    const w = (col.pdfWidth || 90) * scale;
    return {
      idx,
      label: col.label,
      width: w,
      maxChars: col.pdfMaxChars || Math.max(4, Math.floor(w / 4.8)),
    };
  });

  const rowsPerFirstPage = 19;
  const rowsPerFollowPage = 22;

  const pages: Array<Array<Array<string | number>>> = [];
  if (rows.length === 0) {
    pages.push([]);
  } else {
    pages.push(rows.slice(0, rowsPerFirstPage));
    let idx = rowsPerFirstPage;
    while (idx < rows.length) {
      pages.push(rows.slice(idx, idx + rowsPerFollowPage));
      idx += rowsPerFollowPage;
    }
  }

  const generatedAt = new Date().toLocaleString("en-IN");
  const totalPages = pages.length;

  const pageStreams: string[] = pages.map((pageRows, pageIdx) => {
    const cmds: string[] = [];
    const isFirstPage = pageIdx === 0;

    let cursorY = pageHeight - 28;
    if (isFirstPage) {
      cmds.push(
        `0.118 0.251 0.686 rg ${marginX} ${cursorY - 36} ${contentWidth} 40 re f`,
      );
      cmds.push(
        `BT /F2 14 Tf 1 1 1 rg ${marginX + 12} ${cursorY - 18} Td (${pdfEscape(
          `Real Estate CRM - ${meta.title}`,
        )}) Tj ET`,
      );
      const subText = [
        `Generated: ${generatedAt}`,
        `${meta.totalLabel || "Total Records"}: ${rows.length}`,
        meta.filterSummary ? `Filters: ${meta.filterSummary}` : "",
        meta.generatedBy ? `By: ${meta.generatedBy}` : "",
      ]
        .filter(Boolean)
        .join("  |  ");
      cmds.push(
        `BT /F1 8 Tf 0.85 0.91 1 rg ${marginX + 12} ${cursorY - 31} Td (${pdfEscape(
          fitText(subText, 155),
        )}) Tj ET`,
      );
      cursorY -= 50;
    } else {
      cmds.push(
        `BT /F2 11 Tf 0.118 0.251 0.686 rg ${marginX} ${cursorY - 8} Td (${pdfEscape(
          `${meta.title} (Continued)`,
        )}) Tj ET`,
      );
      cursorY -= 22;
    }

    const headerHeight = 22;
    const headerBottom = cursorY - headerHeight;
    cmds.push(
      `0.118 0.227 0.541 rg ${marginX} ${headerBottom} ${contentWidth} ${headerHeight} re f`,
    );

    let colX = marginX;
    for (const col of scaledCols) {
      cmds.push(
        `BT /F2 8.5 Tf 1 1 1 rg ${colX + 4} ${headerBottom + 7} Td (${pdfEscape(
          fitText(col.label, col.maxChars),
        )}) Tj ET`,
      );
      colX += col.width;
    }

    cursorY = headerBottom;

    const rowHeight = 21;
    pageRows.forEach((rowVals, rIdx) => {
      const rowBottom = cursorY - rowHeight;
      if (rIdx % 2 === 1) {
        cmds.push(
          `0.969 0.98 0.992 rg ${marginX} ${rowBottom} ${contentWidth} ${rowHeight} re f`,
        );
      }
      cmds.push(
        `0.88 0.91 0.94 RG 0.5 w ${marginX} ${rowBottom} m ${
          marginX + contentWidth
        } ${rowBottom} l S`,
      );

      let cellX = marginX;
      scaledCols.forEach((col) => {
        const textVal = fitText(String(rowVals[col.idx] ?? "-"), col.maxChars);
        cmds.push(
          `BT /F1 8 Tf 0.12 0.16 0.23 rg ${cellX + 4} ${rowBottom + 7} Td (${pdfEscape(
            textVal,
          )}) Tj ET`,
        );
        cellX += col.width;
      });

      cursorY = rowBottom;
    });

    cmds.push(
      `BT /F1 8 Tf 0.45 0.5 0.58 rg ${marginX} 18 Td (${pdfEscape(
        `Real Estate CRM | ${meta.title} (${generatedAt})`,
      )}) Tj ET`,
    );
    cmds.push(
      `BT /F1 8 Tf 0.45 0.5 0.58 rg ${pageWidth - marginX - 65} 18 Td (${pdfEscape(
        `Page ${pageIdx + 1} of ${totalPages}`,
      )}) Tj ET`,
    );

    return cmds.join("\n");
  });

  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push("");
  objects.push(
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
  );
  objects.push(
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`,
  );

  let nextObjId = 5;
  for (const streamContent of pageStreams) {
    const pageObjId = nextObjId++;
    const contentObjId = nextObjId++;
    pageObjectIds.push(pageObjId);

    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    );
  }

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] /Count ${pageObjectIds.length} >>\nendobj\n`;

  const encoder = new TextEncoder();
  const headerBytes = encoder.encode("%PDF-1.4\n");
  const bodyChunks: Uint8Array[] = [headerBytes];
  const offsets: number[] = [0];
  let currentOffset = headerBytes.length;

  for (const objStr of objects) {
    offsets.push(currentOffset);
    const chunk = encoder.encode(objStr);
    bodyChunks.push(chunk);
    currentOffset += chunk.length;
  }

  const xrefOffset = currentOffset;
  const xrefLines = [
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`,
    ...offsets
      .slice(1)
      .map((off) => `${String(off).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  ];
  bodyChunks.push(encoder.encode(xrefLines.join("")));

  const totalLen = bodyChunks.reduce((sum, c) => sum + c.length, 0);
  const pdfBytes = new Uint8Array(totalLen);
  let pos = 0;
  for (const chunk of bodyChunks) {
    pdfBytes.set(chunk, pos);
    pos += chunk.length;
  }
  return pdfBytes;
}

export function exportTabularPdf(
  columns: TabularReportColumn[],
  rows: Array<Array<string | number>>,
  meta: TabularReportMeta,
) {
  const bytes = buildTabularPdfBytes(columns, rows, meta);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(
    bytes,
    "application/pdf",
    `${meta.filePrefix}-${dateStamp}.pdf`,
  );
}

/** Create CSV, Excel, and PDF exporters for a domain report configuration. */
export function createTabularReportExporters<Row>(config: {
  columns: TabularReportColumn[];
  mapRows: (items: Row[]) => Array<Array<string | number>>;
  getMeta: (meta?: TabularReportMetaInput) => TabularReportMeta;
}) {
  const headers = config.columns.map((c) => c.label);

  return {
    buildCsvBytes: (items: Row[]): Uint8Array =>
      buildTabularCsvBytes(headers, config.mapRows(items)),
    exportCsv: (items: Row[]) =>
      exportTabularCsv(
        headers,
        config.mapRows(items),
        config.getMeta().filePrefix,
      ),
    buildExcelBytes: (
      items: Row[],
      meta: TabularReportMetaInput = {},
    ): Uint8Array =>
      buildTabularExcelBytes(
        config.columns,
        config.mapRows(items),
        config.getMeta(meta),
      ),
    exportExcel: (items: Row[], meta: TabularReportMetaInput = {}) =>
      exportTabularExcel(
        config.columns,
        config.mapRows(items),
        config.getMeta(meta),
      ),
    buildPdfBytes: (
      items: Row[],
      meta: TabularReportMetaInput = {},
    ): Uint8Array =>
      buildTabularPdfBytes(
        config.columns,
        config.mapRows(items),
        config.getMeta(meta),
      ),
    exportPdf: (items: Row[], meta: TabularReportMetaInput = {}) =>
      exportTabularPdf(
        config.columns,
        config.mapRows(items),
        config.getMeta(meta),
      ),
    exportByFormat: (
      format: TabularExportFormat,
      items: Row[],
      meta: TabularReportMetaInput = {},
    ) => {
      const rows = config.mapRows(items);
      const fullMeta = config.getMeta(meta);
      if (format === "csv") {
        exportTabularCsv(headers, rows, fullMeta.filePrefix);
      } else if (format === "excel") {
        exportTabularExcel(config.columns, rows, fullMeta);
      } else {
        exportTabularPdf(config.columns, rows, fullMeta);
      }
    },
  };
}

/** Collect all matching rows across paginated export endpoints. */
export async function fetchAllPaginatedExportItems<T>(
  fetchPage: (
    page: number,
    limit: number,
  ) => Promise<{ items: T[]; totalPages: number }>,
  batchLimit = 100,
): Promise<T[]> {
  const allItems: T[] = [];
  let currentPage = 1;
  let maxPages = 1;

  do {
    const result = await fetchPage(currentPage, batchLimit);
    if (Array.isArray(result.items)) {
      allItems.push(...result.items);
    }
    maxPages = Math.max(1, result.totalPages || 1);
    currentPage += 1;
  } while (currentPage <= maxPages);

  return allItems;
}
