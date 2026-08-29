import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const FILE_PATH = path.join(
  process.cwd(),
  "app",
  "source-docs",
  "Expenses 5179 Card - Year to date - 2026.xlsx"
);

const ARCHIVES_DIR = path.join(process.cwd(), "app", "source-docs", "archives");

const COL = { DATE: 0, DESCRIPTION: 1, DEBIT: 2 };

// CSV column indices: Status, Date, Description, Debit, Credit, Member Name
const CSV = { DATE: 1, DESCRIPTION: 2, DEBIT: 3 };

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Excel date serial → "YYYY-MM-DD" */
function serialToISO(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().split("T")[0];
}

/** "MM/DD/YYYY" or "M/D/YYYY" → "YYYY-MM-DD", or null if unrecognised */
function mmddyyyyToISO(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/** Normalise whatever value the XLSX cell has → "YYYY-MM-DD", or null */
function normaliseXlsxDate(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return serialToISO(val);
  const s = String(val).trim();
  // ISO string (possibly with time component)
  const iso = s.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  // MM/DD/YYYY text stored directly in the cell
  return mmddyyyyToISO(s);
}

// ── Manual CSV parser (RFC 4180) ──────────────────────────────────────────────
// Avoids SheetJS date/number interpretation that silently reformats cell values.

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  // Normalise line endings
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let i = 0;

  while (i < src.length) {
    const row: string[] = [];

    while (i < src.length && src[i] !== "\n") {
      if (src[i] === '"') {
        // Quoted field — handles embedded commas and doubled-quote escapes
        i++; // skip opening quote
        let field = "";
        while (i < src.length) {
          if (src[i] === '"') {
            if (src[i + 1] === '"') { field += '"'; i += 2; }
            else { i++; break; } // closing quote
          } else {
            field += src[i++];
          }
        }
        row.push(field);
        if (src[i] === ",") i++; // skip separator after closing quote
      } else {
        // Unquoted field
        let field = "";
        while (i < src.length && src[i] !== "," && src[i] !== "\n") {
          field += src[i++];
        }
        row.push(field.trim());
        if (src[i] === ",") i++; // skip separator
      }
    }

    if (src[i] === "\n") i++; // skip line ending

    if (row.length > 0 && row.some((f) => f !== "")) rows.push(row);
  }

  return rows;
}

// ── Key builder ───────────────────────────────────────────────────────────────

function makeKey(date: string, description: string, debit: number): string {
  return `${date}|${description.trim()}|${debit.toFixed(2)}`;
}

// ── Archive helper ────────────────────────────────────────────────────────────

function maybeArchive(): void {
  if (!fs.existsSync(ARCHIVES_DIR)) fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const existing = fs.readdirSync(ARCHIVES_DIR).filter((f) => f.endsWith(".xlsx"));
  if (existing.length > 0) {
    const newestMs = existing
      .map((f) => fs.statSync(path.join(ARCHIVES_DIR, f)).mtimeMs)
      .reduce((a, b) => Math.max(a, b), 0);
    if (Date.now() - newestMs < ONE_HOUR_MS) return;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const base = path.basename(FILE_PATH, ".xlsx");
  fs.copyFileSync(FILE_PATH, path.join(ARCHIVES_DIR, `${base}_${stamp}.xlsx`));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { csvText }: { csvText: string } = await request.json();

    // 1. Load existing XLSX and build combo-key set
    const buf = fs.readFileSync(FILE_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: null,
      raw: true,
    });

    const existingKeys = new Set<string>();
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i] as (string | number | null)[];
      if (!row || row[COL.DATE] == null) continue;
      const dateStr = normaliseXlsxDate(row[COL.DATE]);
      if (!dateStr) continue;
      const debitVal = row[COL.DEBIT];
      if (debitVal == null) continue;
      const debit = Number(debitVal);
      if (isNaN(debit) || debit <= 0) continue;
      const desc = String(row[COL.DESCRIPTION] ?? "").trim();
      existingKeys.add(makeKey(dateStr, desc, debit));
      // Guard against previously-imported rows whose date serial was stored one day
      // ahead due to a noon-UTC rounding bug in the old isoToSerial function.
      // Also register the key with date shifted back by one day so those rows are
      // still recognised as duplicates even though their stored date is off by one.
      if (typeof row[COL.DATE] === "number") {
        const d = new Date(dateStr + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        existingKeys.add(makeKey(d.toISOString().split("T")[0], desc, debit));
      }
    }

    // 2. Parse the CSV with our own parser — values stay as raw text strings
    const csvRows = parseCSV(csvText);
    // csvRows[0] is the header row; data starts at index 1

    const newRows: { date: string; description: string; debit: number }[] = [];
    let skipped = 0;

    for (let i = 1; i < csvRows.length; i++) {
      const row = csvRows[i];
      if (!row || row.length < 4) continue;

      // Debit-only: skip rows with no debit value
      const debitStr = row[CSV.DEBIT];
      if (!debitStr || debitStr.trim() === "") continue;
      const debit = parseFloat(debitStr.replace(/,/g, ""));
      if (isNaN(debit) || debit <= 0) continue;

      // Date must be MM/DD/YYYY
      const dateISO = mmddyyyyToISO(row[CSV.DATE] ?? "");
      if (!dateISO) continue;

      const description = (row[CSV.DESCRIPTION] ?? "").trim();
      const key = makeKey(dateISO, description, debit);

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      newRows.push({ date: dateISO, description, debit });
    }

    if (newRows.length === 0) {
      return NextResponse.json({ inserted: 0, skipped, rows: [] });
    }

    // 3. Append new rows to the end of the worksheet
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    let nextRow = range.e.r + 1;

    for (const row of newRows) {
      // Store date as ISO text ("YYYY-MM-DD") — avoids serial round-trip bugs and
      // is handled correctly by both parseRawDate and normaliseXlsxDate on read.
      ws[XLSX.utils.encode_cell({ r: nextRow, c: COL.DATE })] = { t: "s", v: row.date };
      ws[XLSX.utils.encode_cell({ r: nextRow, c: COL.DESCRIPTION })] = { t: "s", v: row.description };
      ws[XLSX.utils.encode_cell({ r: nextRow, c: COL.DEBIT })] = { t: "n", v: row.debit };
      nextRow++;
    }

    range.e.r = nextRow - 1;
    ws["!ref"] = XLSX.utils.encode_range(range);

    maybeArchive();

    const outBuf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    fs.writeFileSync(FILE_PATH, outBuf);

    return NextResponse.json({ inserted: newRows.length, skipped, rows: newRows });
  } catch (error) {
    console.error("[import] Unhandled error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
