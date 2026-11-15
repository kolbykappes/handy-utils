"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

interface SpendingRow {
  name: string;
  email: string;
  credits: number;
}

function parsePayload(raw: string): { rows: SpendingRow[]; error: string } {
  try {
    const data = JSON.parse(raw.trim());
    const items: unknown[] = Array.isArray(data) ? data : (data?.items ?? []);
    if (!Array.isArray(items) || items.length === 0) {
      return { rows: [], error: "No items found in payload." };
    }
    const rows: SpendingRow[] = items.map((item) => {
      const i = item as Record<string, unknown>;
      return {
        name: (i.account_name as string) ?? "",
        email: (i.account_email as string) ?? "",
        credits: typeof i.used_credits === "number" ? i.used_credits : 0,
      };
    });
    return { rows, error: "" };
  } catch {
    return { rows: [], error: "Invalid JSON. Paste the full API response." };
  }
}

function dollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function ClaudeSpendingPage() {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<SpendingRow[]>([]);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy as text");

  useEffect(() => {
    document.title = "Handy Utils - Claude Spending";
  }, []);

  const handleProcess = () => {
    const { rows: r, error: e } = parsePayload(raw);
    if (e) {
      setError(e);
      setRows([]);
      setParsed(false);
    } else {
      setError("");
      setRows(r.sort((a, b) => b.credits - a.credits));
      setParsed(true);
    }
  };

  const total = rows.reduce((s, r) => s + r.credits, 0);

  const exportXLS = () => {
    const data = rows.map((r) => ({
      Name: r.name || "(no name)",
      Email: r.email,
      "Total Spending ($)": +(r.credits / 100).toFixed(2),
    }));
    data.push({ Name: "TOTAL", Email: "", "Total Spending ($)": +(total / 100).toFixed(2) });

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 28 }, { wch: 34 }, { wch: 18 }];

    const range = XLSX.utils.decode_range(ws["!ref"]!);
    for (let row = 1; row <= range.e.r; row++) {
      const cell = ws[XLSX.utils.encode_cell({ r: row, c: 2 })];
      if (cell) cell.z = '"$"#,##0.00';
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Claude Spending");
    XLSX.writeFile(wb, "claude-spending.xlsx");
  };

  const copyText = () => {
    const lines = [
      "Name\tEmail\tTotal Spending",
      ...rows.map((r) => `${r.name || "(no name)"}\t${r.email}\t${dollars(r.credits)}`),
      `TOTAL\t\t${dollars(total)}`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy as text"), 2000);
    });
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 w-fit">
            ← Home
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Claude Spending
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Paste the Claude usage API response to view spending by user and export to Excel.
          </p>
        </header>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Claude Spending
          </label>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'Paste JSON payload here ({"items": [...]})'}
            className="w-full h-40 font-mono text-sm p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            onClick={handleProcess}
            disabled={!raw.trim()}
            className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Process
          </button>
        </div>

        {parsed && rows.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {rows.length} users &middot; Total:{" "}
                <strong className="text-slate-900 dark:text-slate-100">{dollars(total)}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={copyText}
                  className="text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium px-4 py-1.5 rounded-lg transition-colors"
                >
                  {copyLabel}
                </button>
                <button
                  onClick={exportXLS}
                  className="text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
                >
                  Export XLS
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-8">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Email</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Total Spending</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.email + i}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-2.5 text-slate-400 dark:text-slate-500">{i + 1}</td>
                      <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">
                        {row.name || <span className="text-slate-400 dark:text-slate-500 italic">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-mono text-xs">
                        {row.email}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900 dark:text-slate-100">
                        {row.credits > 0 ? (
                          dollars(row.credits)
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 font-semibold border-t-2 border-slate-200 dark:border-slate-600">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300" colSpan={3}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-slate-100">
                      {dollars(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
