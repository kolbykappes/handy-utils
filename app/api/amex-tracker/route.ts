import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import type { AmexTransaction, AmexSavePayload } from "../../tools/amex-tracker/types";

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

// AmEx export columns (0-indexed)
const COL = {
  DATE: 0,
  DESCRIPTION: 2,
  AMOUNT: 3,
  CATEGORY: 12, // appended tracking column — "MTM" | "Personal" | blank
  FILED: 13,    // appended tracking column — "Y" | blank
  NOTES: 14,    // appended tracking column — free text
};

// Row 6 is the column-header row; data starts at row 7
const HEADER_ROW = 6;
const DATA_START = 7;

/** Copy the current file to archives-amex/ at most once per hour. */
function maybeArchive(): void {
  if (!fs.existsSync(ARCHIVES_DIR)) {
    fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
  }
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

/** Parse an AmEx date string "MM/DD/YYYY" → "YYYY-MM-DD". */
function parseAmexDate(val: unknown): string | null {
  if (!val || typeof val !== "string") return null;
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

export async function GET() {
  try {
    const buf = fs.readFileSync(FILE_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: null,
      raw: true,
    });

    const transactions: AmexTransaction[] = [];

    for (let i = DATA_START; i < raw.length; i++) {
      const row = raw[i] as (string | number | null)[];
      if (!row || row[COL.DATE] === null) continue;

      const dateStr = parseAmexDate(row[COL.DATE]);
      if (!dateStr) continue;

      const amount = row[COL.AMOUNT] != null ? Number(row[COL.AMOUNT]) : null;
      if (amount === null || amount <= 0) continue; // skip credits/refunds

      const catRaw = row[COL.CATEGORY];
      const category: AmexTransaction["category"] =
        catRaw === "MTM" ? "MTM" : catRaw === "Personal" ? "Personal" : null;

      const filedRaw = row[COL.FILED];
      const filed = filedRaw === "Y" || filedRaw === 1;

      const notesRaw = row[COL.NOTES];
      const notes = notesRaw != null ? String(notesRaw).trim() || null : null;

      transactions.push({
        rowIndex: i,
        date: dateStr,
        description: String(row[COL.DESCRIPTION] || "").trim(),
        amount,
        category,
        filed,
        notes,
      });
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { updates }: { updates: AmexSavePayload[] } = await request.json();

    const buf = fs.readFileSync(FILE_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Ensure tracking column headers exist in the AmEx header row
    const headerLabels: Record<number, string> = {
      [COL.CATEGORY]: "MTM Category",
      [COL.FILED]: "Filed",
      [COL.NOTES]: "Notes",
    };
    for (const [c, label] of Object.entries(headerLabels)) {
      const ref = XLSX.utils.encode_cell({ r: HEADER_ROW, c: Number(c) });
      if (!ws[ref]) ws[ref] = { t: "s", v: label };
    }

    for (const update of updates) {
      const r = update.rowIndex;

      // Category
      const catRef = XLSX.utils.encode_cell({ r, c: COL.CATEGORY });
      if (update.category) {
        ws[catRef] = { t: "s", v: update.category };
      } else if (ws[catRef]) {
        delete ws[catRef];
      }

      // Filed
      const filedRef = XLSX.utils.encode_cell({ r, c: COL.FILED });
      if (update.filed) {
        ws[filedRef] = { t: "s", v: "Y" };
      } else if (ws[filedRef]) {
        delete ws[filedRef];
      }

      // Notes
      const notesRef = XLSX.utils.encode_cell({ r, c: COL.NOTES });
      if (update.notes) {
        ws[notesRef] = { t: "s", v: update.notes };
      } else if (ws[notesRef]) {
        delete ws[notesRef];
      }
    }

    // Extend sheet range to cover the new columns
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    if (range.e.c < COL.NOTES) {
      range.e.c = COL.NOTES;
      ws["!ref"] = XLSX.utils.encode_range(range);
    }

    maybeArchive();

    try {
      const outBuf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      fs.writeFileSync(FILE_PATH, outBuf);
    } catch (writeError) {
      const msg = writeError instanceof Error ? writeError.message : String(writeError);
      const lockFile = FILE_PATH.replace(/([^\\/]+)$/, "~$$1");
      if (fs.existsSync(lockFile)) {
        return NextResponse.json(
          { error: "The Excel file is locked by Office. Close the file in Excel and try again." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: `Save failed: ${msg}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: `Unexpected error: ${String(error)}` }, { status: 500 });
  }
}
