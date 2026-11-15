import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const FILE_PATH = path.join(process.cwd(), "app", "source-docs", "bmw-card-2026.xlsx");
const ARCHIVES_DIR = path.join(process.cwd(), "app", "source-docs", "archives-bmw");

// XLSX column layout
const COL = { DATE: 0, DESCRIPTION: 1, AMOUNT: 2, MEMO: 3, CATEGORY: 4, FILED: 5, NOTES: 6 };

// BMW CSV columns: Date(0), Transaction(1), Name(2), Memo(3), Amount(4)
const CSV = { DATE: 0, TRANSACTION: 1, NAME: 2, MEMO: 3, AMOUNT: 4 };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the unique transaction ID from a memo string ("ID; code; ; ; ;") */
function memoKey(memo: string): string {
  return memo.split(";")[0].trim();
}

/** Normalize merchant name: collapse internal whitespace, trim. */
function normalizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

// ── Manual RFC 4180 CSV parser ────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let i = 0;
  while (i < src.length) {
    const row: string[] = [];
    while (i < src.length && src[i] !== "\n") {
      if (src[i] === '"') {
        i++;
        let field = "";
        while (i < src.length) {
          if (src[i] === '"') {
            if (src[i + 1] === '"') { field += '"'; i += 2; }
            else { i++; break; }
          } else {
            field += src[i++];
          }
        }
        row.push(field);
        if (src[i] === ",") i++;
      } else {
        let field = "";
        while (i < src.length && src[i] !== "," && src[i] !== "\n") field += src[i++];
        row.push(field.trim());
        if (src[i] === ",") i++;
      }
    }
    if (src[i] === "\n") i++;
    if (row.length > 0 && row.some((f) => f !== "")) rows.push(row);
  }
  return rows;
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
  fs.copyFileSync(FILE_PATH, path.join(ARCHIVES_DIR, `bmw-card-2026_${stamp}.xlsx`));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { csvText }: { csvText: string } = await request.json();

    // 1. Load existing XLSX and build memo-key set for dedup
    const buf = fs.readFileSync(FILE_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });

    const existingKeys = new Set<string>();
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i] as (string | null)[];
      const memo = row[COL.MEMO];
      if (memo) existingKeys.add(memoKey(String(memo)));
    }

    // 2. Parse CSV and collect new rows (skip CREDIT/payment rows)
    const csvRows = parseCSV(csvText);

    const newRows: { date: string; description: string; amount: number; memo: string }[] = [];
    let skipped = 0;

    for (let i = 1; i < csvRows.length; i++) {
      const row = csvRows[i];
      if (!row || row.length < 5) continue;

      // Only import DEBIT rows
      if ((row[CSV.TRANSACTION] ?? "").toUpperCase() !== "DEBIT") continue;

      const amountStr = row[CSV.AMOUNT] ?? "";
      const amount = parseFloat(amountStr.replace(/,/g, ""));
      // Debits are negative in the BMW CSV; take absolute value
      const absAmount = Math.abs(amount);
      if (isNaN(absAmount) || absAmount <= 0) continue;

      const memo = row[CSV.MEMO] ?? "";
      const key = memoKey(memo);
      if (!key) continue;

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      const date = (row[CSV.DATE] ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

      newRows.push({
        date,
        description: normalizeName(row[CSV.NAME] ?? ""),
        amount: absAmount,
        memo: memo.trim(),
      });
    }

    if (newRows.length === 0) {
      return NextResponse.json({ inserted: 0, skipped, rows: [] });
    }

    // 3. Append new rows to XLSX
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    let nextRow = range.e.r + 1;

    for (const row of newRows) {
      ws[XLSX.utils.encode_cell({ r: nextRow, c: COL.DATE })] = { t: "s", v: row.date };
      ws[XLSX.utils.encode_cell({ r: nextRow, c: COL.DESCRIPTION })] = { t: "s", v: row.description };
      ws[XLSX.utils.encode_cell({ r: nextRow, c: COL.AMOUNT })] = { t: "n", v: row.amount };
      ws[XLSX.utils.encode_cell({ r: nextRow, c: COL.MEMO })] = { t: "s", v: row.memo };
      nextRow++;
    }

    range.e.r = nextRow - 1;
    if (range.e.c < COL.NOTES) range.e.c = COL.NOTES;
    ws["!ref"] = XLSX.utils.encode_range(range);

    maybeArchive();
    const outBuf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    fs.writeFileSync(FILE_PATH, outBuf);

    return NextResponse.json({ inserted: newRows.length, skipped, rows: newRows });
  } catch (error) {
    console.error("[bmw-import] Unhandled error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
