import { inflateRawSync } from "node:zlib";

const xmlDecode = (value = "") => value
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'");

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows.shift().map((header) => String(header).trim().toLowerCase().replace(/[\s-]+/g, "_") );
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, String(cells[index] ?? "").trim()])));
}

function unzipEntries(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (bytes.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("The Excel file is not a valid .xlsx archive.");
  const count = bytes.readUInt16LE(eocd + 10);
  let offset = bytes.readUInt32LE(eocd + 16);
  const files = new Map();
  let totalExpanded = 0;
  for (let i = 0; i < count; i += 1) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid Excel archive directory.");
    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const expandedSize = bytes.readUInt32LE(offset + 24);
    totalExpanded += expandedSize;
    if (expandedSize > 20_000_000 || totalExpanded > 30_000_000) throw new Error("The Excel workbook expands beyond the safe import size.");
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.toString("utf8", offset + 46, offset + 46 + nameLength);
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    if (name && !name.endsWith("/")) {
      if (method === 0) files.set(name, compressed);
      else if (method === 8) files.set(name, inflateRawSync(compressed));
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function columnIndex(reference) {
  const letters = String(reference).match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

export function parseXlsx(buffer) {
  const files = unzipEntries(buffer);
  const sheetName = [...files.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort()[0];
  if (!sheetName) throw new Error("No worksheet was found in this Excel file.");
  const sharedXml = files.has("xl/sharedStrings.xml") ? files.get("xl/sharedStrings.xml").toString("utf8") : "";
  const sharedStrings = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => xmlDecode(part[1])).join(""));
  const xml = files.get(sheetName).toString("utf8");
  const matrix = [];
  for (const match of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cellMatch of match[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1], content = cellMatch[2];
      const ref = attrs.match(/\br="([A-Z]+\d+)"/i)?.[1] || "A1";
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] || "";
      const value = content.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? [...content.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join("");
      const decoded = type === "s" ? (sharedStrings[Number(value)] ?? "") : xmlDecode(value);
      cells[columnIndex(ref)] = decoded;
    }
    matrix.push(cells.map((value) => value ?? ""));
  }
  if (matrix.length < 2) return [];
  const headers = matrix.shift().map((header) => String(header).trim().toLowerCase().replace(/[\s-]+/g, "_"));
  return matrix.filter((row) => row.some((cell) => String(cell).trim() !== "")).map((cells) => Object.fromEntries(headers.map((header, index) => [header, String(cells[index] ?? "").trim()])));
}
