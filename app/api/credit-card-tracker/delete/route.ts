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
    const { rowIndex }: { rowIndex: number } = await request.json();

    if (typeof rowIndex !== "number" || rowIndex < 1) {
      return NextResponse.json({ error: "Invalid rowIndex" }, { status: 400 });
    }

    const buf = fs.readFileSync(FILE_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    const maxRow = range.e.r;
    const maxCol = range.e.c;

    if (rowIndex > maxRow) {
      return NextResponse.json({ error: "rowIndex out of range" }, { status: 400 });
    }

    // Shift every cell from rowIndex+1..maxRow up by one row
    for (let r = rowIndex; r < maxRow; r++) {
      for (let c = 0; c <= maxCol; c++) {
        const srcRef = XLSX.utils.encode_cell({ r: r + 1, c });
        const dstRef = XLSX.utils.encode_cell({ r, c });
        if (ws[srcRef] !== undefined) {
          ws[dstRef] = ws[srcRef];
        } else {
          delete ws[dstRef];
        }
      }
    }

    // Erase the now-vacated last row
    for (let c = 0; c <= maxCol; c++) {
      delete ws[XLSX.utils.encode_cell({ r: maxRow, c })];
    }

    range.e.r = maxRow - 1;
    ws["!ref"] = XLSX.utils.encode_range(range);

    maybeArchive();

    const outBuf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    fs.writeFileSync(FILE_PATH, outBuf);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[delete] Unhandled error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
