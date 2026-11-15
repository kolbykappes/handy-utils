import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import type { BmwTransaction, BmwSavePayload } from "../../tools/bmw-tracker/types";

const FILE_PATH = path.join(process.cwd(), "app", "source-docs", "bmw-card-2026.xlsx");
const ARCHIVES_DIR = path.join(process.cwd(), "app", "source-docs", "archives-bmw");

const COL = {
  DATE: 0,
  DESCRIPTION: 1,
  AMOUNT: 2,
  MEMO: 3,
  CATEGORY: 4,
  FILED: 5,
  NOTES: 6,
};

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

function parseDate(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === "number") {
    // Excel serial → ISO
    const ms = Math.round((val - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().split("T")[0];
  }
  const s = String(val).split("T")[0].trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export async function GET() {
  try {
    const buf = fs.readFileSync(FILE_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });

    const transactions: BmwTransaction[] = [];

    for (let i = 1; i < raw.length; i++) {
      const row = raw[i] as (string | number | null)[];
      if (!row || row[COL.DATE] == null) continue;

      const date = parseDate(row[COL.DATE]);
      if (!date) continue;

      const amount = Number(row[COL.AMOUNT]);
      if (isNaN(amount) || amount <= 0) continue;

      const catRaw = row[COL.CATEGORY] != null ? String(row[COL.CATEGORY]).trim() : "";
      const category =
        catRaw === "EG" || catRaw === "MTM" || catRaw === "Personal" ? catRaw : null;

      transactions.push({
        rowIndex: i,
        date,
        description: String(row[COL.DESCRIPTION] ?? "").trim(),
        amount,
        memo: String(row[COL.MEMO] ?? "").trim(),
        category,
        filed: !!row[COL.FILED],
        notes: row[COL.NOTES] != null ? String(row[COL.NOTES]).trim() || null : null,
      });
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { updates }: { updates: BmwSavePayload[] } = await request.json();

    const buf = fs.readFileSync(FILE_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];

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
        ws[filedRef] = { t: "n", v: 1 };
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

    // Ensure range covers all columns
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    if (range.e.c < COL.NOTES) {
      range.e.c = COL.NOTES;
      ws["!ref"] = XLSX.utils.encode_range(range);
    }

    maybeArchive();
    const outBuf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    fs.writeFileSync(FILE_PATH, outBuf);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
