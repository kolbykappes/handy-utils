import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

const ENTITY_COLORS: Record<string, string> = {
  MTM: "15803d",
  "MTM-Me": "22c55e",
  EG: "9333ea",
  Kory: "2563eb",
  Me: "dc2626",
  unassigned: "d97706",
};

const NEUTRAL_COLOR = "334155";

interface ExportRow {
  date: string;
  description: string;
  amount: number | null;
  entity: string | null;
  dateExpensed: string | null;
  datePaid: string | null;
  notes: string;
}

interface ExportPayload {
  rows: ExportRow[];
  entity: string | null;
  monthLabel: string;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function POST(request: NextRequest) {
  try {
    const { rows, entity, monthLabel }: ExportPayload = await request.json();

    const wb = new ExcelJS.Workbook();
    wb.creator = "Credit Card Tracker";
    wb.created = new Date();

    const ws = wb.addWorksheet("Expenses");

    ws.columns = [
      { key: "date",        width: 14 },
      { key: "description", width: 45 },
      { key: "amount",      width: 12 },
      { key: "entity",      width: 12 },
      { key: "expensed",    width: 14 },
      { key: "paid",        width: 14 },
      { key: "notes",       width: 40 },
    ];

    const mainColor =
      entity && ENTITY_COLORS[entity] ? ENTITY_COLORS[entity] : NEUTRAL_COLOR;

    const title =
      entity === "unassigned"
        ? `Unassigned Expenses — ${monthLabel}`
        : entity
        ? `${entity} Expenses — ${monthLabel}`
        : `All Expenses — ${monthLabel}`;

    // ── Row 1: Merged title ────────────────────────────────
    ws.mergeCells("A1:G1");
    const titleCell = ws.getCell("A1");
    titleCell.value = title;
    titleCell.font = { name: "Calibri", bold: true, size: 15, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + mainColor } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // ── Row 2: Column headers ──────────────────────────────
    ws.addRow(["Date", "Description", "Debit", "Entity", "Expensed", "Paid", "Notes"]);
    const hdr = ws.getRow(2);
    hdr.height = 20;
    hdr.eachCell((cell) => {
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "BB" + mainColor } };
      cell.alignment = { vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFFFFFFF" } } };
    });

    // ── Rows 3+: Data ──────────────────────────────────────
    rows.forEach((row, idx) => {
      const entityLabel = row.entity ?? "";
      const dataRow = ws.addRow([
        row.date ? fmtDate(row.date) : "",
        row.description,
        row.amount,
        entityLabel,
        row.dateExpensed ? fmtDate(row.dateExpensed) : "",
        row.datePaid ? fmtDate(row.datePaid) : "",
        row.notes || "",
      ]);

      const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      dataRow.height = 18;

      dataRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.font = { name: "Calibri", size: 11 };
        cell.alignment = { vertical: "middle" };
        // Debit — currency format
        if (col === 3 && row.amount != null) {
          cell.numFmt = "$#,##0.00";
        }
        // Entity — colored text using entity brand color
        if (col === 4 && entityLabel && ENTITY_COLORS[entityLabel]) {
          cell.font = {
            name: "Calibri",
            size: 11,
            bold: true,
            color: { argb: "FF" + ENTITY_COLORS[entityLabel] },
          };
        }
      });
    });

    // ── Totals row ─────────────────────────────────────────
    const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
    ws.addRow([
      "",
      `${rows.length} transaction${rows.length !== 1 ? "s" : ""}`,
      total,
      "", "", "", "",
    ]);
    const totRow = ws.getRow(ws.rowCount);
    totRow.height = 20;
    totRow.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      cell.font = { name: "Calibri", bold: col === 3, size: 11 };
      cell.border = { top: { style: "thin", color: { argb: "FFE2E8F0" } } };
      if (col === 3) cell.numFmt = "$#,##0.00";
    });

    const raw = await wb.xlsx.writeBuffer();
    const buf = raw instanceof Uint8Array ? raw : new Uint8Array(raw as unknown as ArrayBuffer);

    const safeName = `${entity ?? "all"}-${monthLabel.replace(/\s/g, "-").toLowerCase()}`;

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="expenses-5179-${safeName}.xlsx"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
