import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const FILE_PATH = path.join(
  process.cwd(),
  "app",
  "source-docs",
  "amex-activity-2026.xlsx"
);

const ARCHIVES_DIR = path.join(
  process.cwd(),
  "app",
  "source-docs",
  "archives-amex"
);

// Existing XLSX columns (0-indexed)
const COL = {
  DATE: 0,
  DESCRIPTION: 2,
  AMOUNT: 3,
};

// The AmEx export has a 7-row preamble before data starts
// Row 6 = column headers, row 7+ = data
const DATA_START_ROW = 7;

// ── Date helpers ──────────────────────────────────────────────────────────────

/** "MM/DD/YYYY" or "M/D/YYYY" → "YYYY-MM-DD", or null */
function mmddyyyyToISO(s: unknown): string | null {
  if (!s || typeof s !== "string") return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

// ── Key builder ───────────────────────────────────────────────────────────────

function makeKey(date: string, description: string, amount: number): string {
  return `${date}|${description.trim()}|${amount.toFixed(2)}`;
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
    // The client sends the file as a base64-encoded string
    const { fileBase64 }: { fileBase64: string } = await request.json();
    const importBuf = Buffer.from(fileBase64, "base64");

    // 1. Load existing XLSX and build combo-key set
    const existingBuf = fs.readFileSync(FILE_PATH);
    const existingWb = XLSX.read(existingBuf, { type: "buffer" });
    const existingWs = existingWb.Sheets[existingWb.SheetNames[0]];
    const existingRaw = XLSX.utils.sheet_to_json<unknown[]>(existingWs, {
      header: 1,
      defval: null,
      raw: true,
    });

    const existingKeys = new Set<string>();
    for (let i = DATA_START_ROW; i < existingRaw.length; i++) {
      const row = existingRaw[i] as (string | number | null)[];
      if (!row || row[COL.DATE] == null) continue;
      const dateStr = mmddyyyyToISO(row[COL.DATE]);
      if (!dateStr) continue;
      const amount = Number(row[COL.AMOUNT]);
      if (isNaN(amount) || amount <= 0) continue;
      const desc = String(row[COL.DESCRIPTION] ?? "").trim();
      existingKeys.add(makeKey(dateStr, desc, amount));
    }

    // 2. Read the import XLSX — same format as the existing file
    const importWb = XLSX.read(importBuf, { type: "buffer" });
    const importWs = importWb.Sheets[importWb.SheetNames[0]];
    const importRaw = XLSX.utils.sheet_to_json<unknown[]>(importWs, {
      header: 1,
      defval: null,
      raw: true,
    });

    const newRows: (string | number | null)[][] = [];
    let skipped = 0;

    for (let i = DATA_START_ROW; i < importRaw.length; i++) {
      const row = importRaw[i] as (string | number | null)[];
      if (!row || row[COL.DATE] == null) continue;

      const dateStr = mmddyyyyToISO(row[COL.DATE]);
      if (!dateStr) continue;

      const amount = Number(row[COL.AMOUNT]);
      if (isNaN(amount) || amount <= 0) continue; // skip credits/refunds

      const desc = String(row[COL.DESCRIPTION] ?? "").trim();
      const key = makeKey(dateStr, desc, amount);

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      // Carry the full row from the import file (cols 0–11); tracking cols stay blank
      newRows.push(row);
    }

    if (newRows.length === 0) {
      return NextResponse.json({ inserted: 0, skipped, rows: [] });
    }

    // 3. Append new rows to the existing XLSX
    const range = XLSX.utils.decode_range(existingWs["!ref"] ?? "A1");
    let nextRow = range.e.r + 1;

    for (const row of newRows) {
      // Copy cols 0–11 from the import row (standard AmEx export columns)
      for (let c = 0; c <= 11; c++) {
        const val = row[c];
        if (val == null || val === "") continue;
        const ref = XLSX.utils.encode_cell({ r: nextRow, c });
        if (typeof val === "number") {
          existingWs[ref] = { t: "n", v: val };
        } else {
          existingWs[ref] = { t: "s", v: String(val) };
        }
      }
      nextRow++;
    }

    range.e.r = nextRow - 1;
    if (range.e.c < 14) range.e.c = 14; // ensure tracking cols stay in range
    existingWs["!ref"] = XLSX.utils.encode_range(range);

    maybeArchive();

    const outBuf: Buffer = XLSX.write(existingWb, { type: "buffer", bookType: "xlsx" });
    fs.writeFileSync(FILE_PATH, outBuf);

    return NextResponse.json({
      inserted: newRows.length,
      skipped,
      rows: newRows.map((r) => ({
        date: r[COL.DATE],
        description: r[COL.DESCRIPTION],
        amount: r[COL.AMOUNT],
      })),
    });
  } catch (error) {
    console.error("[amex-import] Unhandled error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
