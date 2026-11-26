import zlib from "zlib";

export interface DynamicLeadColumn {
  key: string;
  label: string;
  header: string;
  required: boolean;
  optionalBadge?: boolean;
  mapping?: string;
}

/**
 * Normalizes a header string so matching works regardless of trailing `*` or `(Optional)`.
 */
export function normalizeImportHeader(header: string): string {
  return String(header || "")
    .replace(/\*/g, "")
    .replace(/\(optional\)/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isLeadTitleField(field: { id?: string; label?: string }): boolean {
  const label = (field.label || "").trim().toLowerCase();
  const id = (field.id || "").trim().toLowerCase();
  return (
    label === "lead title" ||
    label === "title" ||
    label === "lead title / inquiry topic" ||
    label === "inquiry topic" ||
    id === "leadtitle" ||
    id === "lead_title"
  );
}

/**
 * Derives the ordered list of active columns from an Admin's assigned dynamic form
 * (or falls back to canonical lead columns if no form is assigned).
 */
export function buildLeadImportColumns(
  fields?: Array<{
    id: string;
    label: string;
    required?: boolean;
    order?: number;
    mapping?: string;
  }> | null,
): DynamicLeadColumn[] {
  if (!fields || fields.length === 0) {
    return [
      {
        key: "leadTitle",
        label: "Lead Title / Inquiry Topic",
        header: "Lead Title / Inquiry Topic *",
        required: true,
        mapping: "lead_title",
      },
      {
        key: "client_name",
        label: "Client / Business Name",
        header: "Client / Business Name *",
        required: true,
        mapping: "client_name",
      },
      {
        key: "client_phone",
        label: "Primary Phone Number",
        header: "Primary Phone Number *",
        required: true,
        mapping: "client_phone",
      },
      {
        key: "client_email",
        label: "Client Email",
        header: "Client Email",
        required: false,
        mapping: "client_email",
      },
      {
        key: "client_address",
        label: "Address / Location",
        header: "Address / Location",
        required: false,
        mapping: "client_address",
      },
      {
        key: "notes",
        label: "Notes (Optional)",
        header: "Notes (Optional)",
        required: false,
        optionalBadge: true,
        mapping: "notes",
      },
    ];
  }

  const sorted = [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasLeadTitle = sorted.some((f) => isLeadTitleField(f));
  const hasNotes = sorted.some(
    (f) => (f.label || "").trim().toLowerCase() === "notes",
  );

  const columns: DynamicLeadColumn[] = [];

  if (!hasLeadTitle) {
    columns.push({
      key: "leadTitle",
      label: "Lead Title / Inquiry Topic",
      header: "Lead Title / Inquiry Topic *",
      required: true,
      mapping: "lead_title",
    });
  }

  for (const field of sorted) {
    const isRequired =
      Boolean(field.required) ||
      field.mapping === "client_name" ||
      field.mapping === "client_phone";

    columns.push({
      key: field.id,
      label: field.label,
      header: isRequired ? `${field.label} *` : field.label,
      required: isRequired,
      mapping: field.mapping || "none",
    });
  }

  if (!hasNotes) {
    columns.push({
      key: "notes",
      label: "Notes (Optional)",
      header: "Notes (Optional)",
      required: false,
      optionalBadge: true,
      mapping: "notes",
    });
  }

  return columns;
}

// ============================================================================
// Pure Node.js .xlsx (ZIP + XML) & .csv Parser
// ============================================================================

function xmlUnescape(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function columnRefToIndex(ref: string): number {
  const lettersMatch = /^([A-Za-z]+)/.exec(ref);
  if (!lettersMatch) return -1;
  const letters = lettersMatch[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col - 1;
}

function readZipEntries(buffer: Buffer): Map<string, string> {
  const entries = new Map<string, string>();

  // Locate End of Central Directory (0x06054b50) scanning backwards
  let eocdOffset = -1;
  const minOffset = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= minOffset; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid Excel (.xlsx) file: missing ZIP directory");
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);

  let ptr = centralDirOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (ptr + 46 > buffer.length || buffer.readUInt32LE(ptr) !== 0x02014b50) {
      break;
    }

    const method = buffer.readUInt16LE(ptr + 10);
    const compressedSize = buffer.readUInt32LE(ptr + 20);
    const nameLen = buffer.readUInt16LE(ptr + 28);
    const extraLen = buffer.readUInt16LE(ptr + 30);
    const commentLen = buffer.readUInt16LE(ptr + 32);
    const localHeaderOffset = buffer.readUInt32LE(ptr + 42);

    const fileName = buffer.toString("utf8", ptr + 46, ptr + 46 + nameLen);
    ptr += 46 + nameLen + extraLen + commentLen;

    if (
      localHeaderOffset + 30 > buffer.length ||
      buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50
    ) {
      continue;
    }

    const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

    let fileData: Buffer;
    if (method === 0) {
      fileData = compressedData;
    } else if (method === 8) {
      fileData = zlib.inflateRawSync(compressedData);
    } else {
      continue;
    }

    entries.set(fileName, fileData.toString("utf8"));
  }

  return entries;
}

function parseSharedStrings(xml?: string): string[] {
  if (!xml) return [];
  const strings: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let siMatch: RegExpExecArray | null;
  while ((siMatch = siRegex.exec(xml)) !== null) {
    const inner = siMatch[1];
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let combined = "";
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRegex.exec(inner)) !== null) {
      combined += xmlUnescape(tMatch[1]);
    }
    strings.push(combined);
  }
  return strings;
}

function resolveFirstSheetPath(entries: Map<string, string>): string {
  const relsXml = entries.get("xl/_rels/workbook.xml.rels");
  if (relsXml) {
    const relRegex = /<Relationship\b([^>]+)\/?>/g;
    let match: RegExpExecArray | null;
    while ((match = relRegex.exec(relsXml)) !== null) {
      const attrs = match[1];
      if (/Type="[^"]*\/worksheet"/i.test(attrs)) {
        const targetMatch = /Target="([^"]+)"/i.exec(attrs);
        if (targetMatch) {
          const rawTarget = targetMatch[1].replace(/^\/+/, "");
          const fullPath = rawTarget.startsWith("xl/")
            ? rawTarget
            : `xl/${rawTarget}`;
          if (entries.has(fullPath)) return fullPath;
        }
      }
    }
  }

  for (const key of entries.keys()) {
    if (key.startsWith("xl/worksheets/sheet") && key.endsWith(".xml")) {
      return key;
    }
  }
  throw new Error("Invalid Excel (.xlsx) file: no worksheet found");
}

function parseXlsxBuffer(buffer: Buffer): string[][] {
  const entries = readZipEntries(buffer);
  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml"));
  const sheetPath = resolveFirstSheetPath(entries);
  const sheetXml = entries.get(sheetPath);
  if (!sheetXml) {
    throw new Error("Worksheet XML could not be read");
  }

  const rows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowContent = rowMatch[1];
    const rowValues: string[] = [];
    let fallbackCol = 0;

    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const cellBody = cellMatch[2] || "";

      const refMatch = /\br="([^"]+)"/i.exec(attrs);
      const colIdx = refMatch ? columnRefToIndex(refMatch[1]) : fallbackCol;
      const targetIdx = colIdx >= 0 ? colIdx : fallbackCol;
      fallbackCol = targetIdx + 1;

      const typeMatch = /\bt="([^"]+)"/i.exec(attrs);
      const cellType = typeMatch ? typeMatch[1] : "";

      let value = "";
      if (cellType === "inlineStr") {
        const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let tMatch: RegExpExecArray | null;
        while ((tMatch = tRegex.exec(cellBody)) !== null) {
          value += xmlUnescape(tMatch[1]);
        }
      } else {
        const vMatch = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cellBody);
        const rawVal = vMatch ? xmlUnescape(vMatch[1]) : "";
        if (cellType === "s") {
          const idx = parseInt(rawVal, 10);
          value = Number.isNaN(idx) ? "" : (sharedStrings[idx] ?? "");
        } else {
          value = rawVal;
        }
      }

      while (rowValues.length <= targetIdx) {
        rowValues.push("");
      }
      rowValues[targetIdx] = value.trim();
    }

    if (rowValues.some((v) => v !== "")) {
      rows.push(rowValues);
    }
  }

  return rows;
}

function parseCsvText(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if (ch === "\r") {
      if (clean[i + 1] === "\n") i++;
      currentRow.push(currentField.trim());
      if (currentRow.some((v) => v !== "")) rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else if (ch === "\n") {
      currentRow.push(currentField.trim());
      if (currentRow.some((v) => v !== "")) rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((v) => v !== "")) rows.push(currentRow);
  }

  return rows;
}

/**
 * Parses an uploaded .xlsx or .csv file buffer into a 2D array of trimmed strings.
 */
export function parseSpreadsheetBuffer(
  input: Buffer | Uint8Array,
  fileName: string,
): string[][] {
  const lower = fileName.toLowerCase();
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  if (lower.endsWith(".csv")) {
    return parseCsvText(buffer.toString("utf8"));
  }
  if (lower.endsWith(".xlsx")) {
    return parseXlsxBuffer(buffer);
  }
  throw new Error(
    "Unsupported file format. Please upload an .xlsx Excel file or .csv file.",
  );
}
