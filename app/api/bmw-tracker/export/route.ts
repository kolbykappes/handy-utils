import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

const CATEGORY_COLORS: Record<string, string> = {
  EG: "9333ea",
  MTM: "15803d",
  Personal: "2563eb",
};

const NEUTRAL_COLOR = "334155";

interface ExportRow {
  date: string;
  description: string;
  amount: number;
  category: string | null;
  filed: boolean;
  notes: string | null;
}

interface ExportPayload {
  rows: ExportRow[];
  category: string | null;
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
    const { rows, category, monthLabel }: ExportPayload = await request.json();

    const wb = new ExcelJS.Workbook();
    wb.creator = "BMW Tracker";
    wb.created = new Date();

    const ws = wb.addWorksheet("BMW Charges");

    ws.columns = [
      { key: "date",        width: 14 },
      { key: "description", width: 45 },
      { key: "amount",      width: 12 },
      { key: "category",    width: 12 },
      { key: "filed",       width: 10 },
      { key: "notes",       width: 40 },
    ];

    const mainColor =
      category && CATEGORY_COLORS[category] ? CATEGORY_COLORS[category] : NEUTRAL_COLOR;

    const title =
      category === "unassigned"
        ? `Unassigned BMW Charges — ${monthLabel}`
        : category
        ? `${category} BMW Charges — ${monthLabel}`
        : `All BMW Charges — ${monthLabel}`;

    // ── Row 1: Merged title
    ws.mergeCells("A1:F1");
    const titleCell = ws.getCell("A1");
    titleCell.value = title;
    titleCell.font = { name: "Calibri", bold: true, size: 15, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + mainColor } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // ── Row 2: Column headers
    ws.addRow(["Date", "Description", "Amount", "Category", "Filed", "Notes"]);
    const hdr = ws.getRow(2);
    hdr.height = 20;
    hdr.eachCell((cell) => {
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "BB" + mainColor } };
      cell.alignment = { vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFFFFFFF" } } };
    });

    // ── Rows 3+: Data
    rows.forEach((row, idx) => {
      const catLabel = row.category ?? "";
      const dataRow = ws.addRow([
        fmtDate(row.date),
        row.description,
        row.amount,
        catLabel,
        row.filed ? "✓" : "",
        row.notes ?? "",
      ]);

      const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      dataRow.height = 18;

      dataRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.font = { name: "Calibri", size: 11 };
        cell.alignment = { vertical: "middle" };
        if (col === 3) cell.numFmt = "$#,##0.00";
        if (col === 4 && catLabel && CATEGORY_COLORS[catLabel]) {
          cell.font = {
            name: "Calibri",
            size: 11,
            bold: true,
            color: { argb: "FF" + CATEGORY_COLORS[catLabel] },
          };
        }
        if (col === 5 && row.filed) {
          cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF16a34a" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });
    });

    // ── Totals row
    const total = rows.reduce((s, r) => s + r.amount, 0);
    ws.addRow(["", `${rows.length} transaction${rows.length !== 1 ? "s" : ""}`, total, "", "", ""]);
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
    const safeName = `${category ?? "all"}-${monthLabel.replace(/\s/g, "-").toLowerCase()}`;

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bmw-${safeName}.xlsx"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
