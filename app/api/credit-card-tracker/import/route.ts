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

const COL = {
  DATE: 0,
  DESCRIPTION: 1,
  DEBIT: 2,
};

// CSV column indices: Status, Date, Description, Debit, Credit, Member Name
const CSV = { DATE: 1, DESCRIPTION: 2, DEBIT: 3 };

function serialToISO(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().split("T")[0];
}

function csvDateToISO(s: string): string | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

function isoToSerial(iso: string): number {
  const d = new Date(iso + "T12:00:00Z");
  return Math.round(d.getTime() / 86400000) + 25569;
}

function makeKey(date: string, description: string, debit: number): string {
  return `${date}|${description.trim()}|${debit.toFixed(2)}`;
}

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

export async function POST(request: NextRequest) {
  try {
    const { csvText }: { csvText: string } = await request.json();

    // Load existing XLSX and build combo-key set
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
      const dateVal = row[COL.DATE];
      let dateStr: string | null = null;
      if (typeof dateVal === "number") dateStr = serialToISO(dateVal);
      else if (typeof dateVal === "string") dateStr = dateVal.split("T")[0];
      if (!dateStr) continue;
      const debitVal = row[COL.DEBIT];
      if (debitVal == null) continue;
      const debit = Number(debitVal);
      if (debit <= 0) continue;
      const desc = String(row[COL.DESCRIPTION] ?? "").trim();
      existingKeys.add(makeKey(dateStr, desc, debit));
    }

    // Parse CSV using SheetJS (handles quoted fields with commas in description)
    const csvWb = XLSX.read(csvText, { type: "string" });
    const csvWs = csvWb.Sheets[csvWb.SheetNames[0]];
    const csvRows = XLSX.utils.sheet_to_json<(string | null)[]>(csvWs, {
      header: 1,
      defval: null,
      raw: false,
    });

    const newRows: { date: string; description: string; debit: number }[] = [];
    let skipped = 0;

    // Row 0 is the header — start at 1
    for (let i = 1; i < csvRows.length; i++) {
      const row = csvRows[i];
      if (!row || !row[CSV.DATE]) continue;

      // Debit-only: skip credit/refund rows
      const debitStr = row[CSV.DEBIT];
      if (!debitStr || debitStr.trim() === "") continue;
      const debit = parseFloat(debitStr.replace(/,/g, ""));
      if (isNaN(debit) || debit <= 0) continue;

      const dateISO = csvDateToISO(row[CSV.DATE]?.trim() ?? "");
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

    // Append new rows to the end of the worksheet
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    let nextRow = range.e.r + 1;

    for (const row of newRows) {
      ws[XLSX.utils.encode_cell({ r: nextRow, c: COL.DATE })] = {
        t: "n",
        v: isoToSerial(row.date),
        z: "mm/dd/yyyy",
      };
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
