import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import type { Transaction, SavePayload } from "../../tools/credit-card-tracker/types";

const FILE_PATH = path.join(
  process.cwd(),
  "app",
  "source-docs",
  "Expenses 5179 Card - Year to date - 2026.xlsx"
);

const COL = {
  DATE: 0,
  DESCRIPTION: 1,
  DEBIT: 2,
  MTM: 3,
  EG: 4,
  KORY: 5,
  ME: 6,
  CREDIT: 7,
  NOTES: 8,
  DATE_EXPENSED: 9,
  DATE_PAID: 10,
  SUB_ENTITY: 11,
};

function serialToISO(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().split("T")[0];
}

function parseRawDate(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return serialToISO(val);
  const s = String(val).split("T")[0];
  return s.match(/^\d{4}-\d{2}-\d{2}$/) ? s : null;
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

    const transactions: Transaction[] = [];

    for (let i = 1; i < raw.length; i++) {
      const row = raw[i] as (string | number | null)[];
      if (!row || row[COL.DATE] === null) continue;

      const dateStr = parseRawDate(row[COL.DATE]);
      if (!dateStr) continue;

      const debit = row[COL.DEBIT] != null ? Number(row[COL.DEBIT]) : null;
      const credit = row[COL.CREDIT] != null ? Number(row[COL.CREDIT]) : null;

      if (debit === null && credit === null) continue;

      const mtm = row[COL.MTM] != null ? Number(row[COL.MTM]) : null;
      const eg = row[COL.EG] != null ? Number(row[COL.EG]) : null;
      const kory = row[COL.KORY] != null ? Number(row[COL.KORY]) : null;
      const me = row[COL.ME] != null ? Number(row[COL.ME]) : null;
      const subEntity = row[COL.SUB_ENTITY] != null ? String(row[COL.SUB_ENTITY]).trim() : null;

      let entity: Transaction["entity"] = null;
      if (mtm) entity = subEntity === "MTM-Me" ? "MTM-Me" : "MTM";
      else if (eg) entity = "EG";
      else if (kory) entity = "Kory";
      else if (me) entity = "Me";

      transactions.push({
        rowIndex: i,
        date: dateStr,
        description: String(row[COL.DESCRIPTION] || "").trim(),
        debit,
        credit,
        entity,
        notes: String(row[COL.NOTES] || "").trim(),
        dateExpensed: parseRawDate(row[COL.DATE_EXPENSED]),
        datePaid: parseRawDate(row[COL.DATE_PAID]),
      });
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { updates }: { updates: SavePayload[] } = await request.json();

    const buf = fs.readFileSync(FILE_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Ensure new column headers exist
    const headers: Record<number, string> = {
      [COL.DATE_EXPENSED]: "Date Expensed",
      [COL.DATE_PAID]: "Date Paid",
      [COL.SUB_ENTITY]: "Sub-Entity",
    };
    for (const [c, label] of Object.entries(headers)) {
      const ref = XLSX.utils.encode_cell({ r: 0, c: Number(c) });
      if (!ws[ref]) ws[ref] = { t: "s", v: label };
    }

    for (const update of updates) {
      const r = update.rowIndex;

      // Clear all entity columns
      for (const c of [COL.MTM, COL.EG, COL.KORY, COL.ME]) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) delete ws[ref];
      }

      // Set entity column (MTM-Me writes to MTM column)
      if (update.entity !== null && update.debit !== null) {
        const entityColMap: Record<string, number> = {
          MTM: COL.MTM,
          "MTM-Me": COL.MTM,
          EG: COL.EG,
          Kory: COL.KORY,
          Me: COL.ME,
        };
        const ref = XLSX.utils.encode_cell({ r, c: entityColMap[update.entity] });
        ws[ref] = { t: "n", v: update.debit };
      }

      // Sub-entity column — only set for MTM-Me, clear otherwise
      const subRef = XLSX.utils.encode_cell({ r, c: COL.SUB_ENTITY });
      if (update.entity === "MTM-Me") {
        ws[subRef] = { t: "s", v: "MTM-Me" };
      } else if (ws[subRef]) {
        delete ws[subRef];
      }

      // Notes
      const notesRef = XLSX.utils.encode_cell({ r, c: COL.NOTES });
      if (update.notes) {
        ws[notesRef] = { t: "s", v: update.notes };
      } else if (ws[notesRef]) {
        delete ws[notesRef];
      }

      // Date expensed
      const expRef = XLSX.utils.encode_cell({ r, c: COL.DATE_EXPENSED });
      if (update.dateExpensed) {
        const d = new Date(update.dateExpensed + "T12:00:00Z");
        const serial = Math.round(d.getTime() / 86400000) + 25569;
        ws[expRef] = { t: "n", v: serial, z: "mm/dd/yyyy" };
      } else if (ws[expRef]) {
        delete ws[expRef];
      }

      // Date paid
      const paidRef = XLSX.utils.encode_cell({ r, c: COL.DATE_PAID });
      if (update.datePaid) {
        const dp = new Date(update.datePaid + "T12:00:00Z");
        const serialP = Math.round(dp.getTime() / 86400000) + 25569;
        ws[paidRef] = { t: "n", v: serialP, z: "mm/dd/yyyy" };
      } else if (ws[paidRef]) {
        delete ws[paidRef];
      }
    }

    // Extend sheet range to cover all new columns
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    if (range.e.c < COL.SUB_ENTITY) {
      range.e.c = COL.SUB_ENTITY;
      ws["!ref"] = XLSX.utils.encode_range(range);
    }

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
