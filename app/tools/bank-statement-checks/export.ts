import * as XLSX from "xlsx";
import type { CheckRecord } from "./types";

export function downloadCheckExcel(
  records: CheckRecord[],
  filename: string
): void {
  const data = records.map((r) => ({
    "Check Number": parseInt(r.checkNumber) || r.checkNumber,
    Date: r.date,
    Amount: r.amount,
    Payee: r.payee,
    Memo: r.memo,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet["!cols"] = [
    { wch: 14 }, // Check Number
    { wch: 12 }, // Date
    { wch: 14 }, // Amount
    { wch: 35 }, // Payee
    { wch: 35 }, // Memo
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Checks");
  XLSX.writeFile(workbook, filename);
}
