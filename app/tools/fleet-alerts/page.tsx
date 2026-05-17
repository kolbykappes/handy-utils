"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAlertsFile, VehicleAlertSummary, AlertCategory, AlertDetail } from "./parser";

interface DrillDown {
  vehicle: string;
  category: AlertCategory;
  details: AlertDetail[];
}

function formatEmailText(vehicle: string, category: AlertCategory, details: AlertDetail[]): string {
  const label = category === "speeding" ? "Speeding" : "Harsh Braking";
  const lines = [
    `${label} alerts — ${vehicle}`,
    `Period: ${details[0]?.date.split(" ")[0] ?? ""} through ${details[details.length - 1]?.date.split(" ")[0] ?? ""}`,
    "",
    ...details.map((d) => `• ${d.date}${d.description ? ` — ${d.description}` : ""}`),
    "",
    `Total: ${details.length} alert${details.length !== 1 ? "s" : ""}`,
  ];
  return lines.join("\n");
}

export default function FleetAlerts() {
  const [summaries, setSummaries] = useState<VehicleAlertSummary[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSummaries([]);
    setFileName(file.name);
    setDrillDown(null);

    try {
      const data = await parseAlertsFile(file);
      setSummaries(data);
      if (data.length === 0) {
        setError("No speeding or harsh braking alerts found.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (row: VehicleAlertSummary, category: AlertCategory) => {
    const details = row.details[category];
    if (details.length === 0) return;
    setDrillDown({ vehicle: row.vehicle, category, details });
    setCopied(false);
  };

  const handleCopy = () => {
    if (!drillDown) return;
    navigator.clipboard.writeText(
      formatEmailText(drillDown.vehicle, drillDown.category, drillDown.details)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalRow = summaries.reduce(
    (acc, v) => ({
      speeding: acc.speeding + v.speeding,
      harshBraking: acc.harshBraking + v.harshBraking,
      total: acc.total + v.total,
    }),
    { speeding: 0, harshBraking: 0, total: 0 }
  );

  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
            Fleet Alert Summary
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Upload a Linxup alert export to see speeding and braking events by vehicle
          </p>
        </div>

        {/* Upload */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold mb-4">Upload Alert Export</h2>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors inline-block">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              📁 Choose Excel File
            </label>
            {fileName && !loading && (
              <span className="text-sm text-slate-500 dark:text-slate-400">{fileName}</span>
            )}
            {loading && (
              <span className="text-slate-600 dark:text-slate-400 text-sm">Processing...</span>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {summaries.length > 0 && (
          <div className={`grid gap-6 ${drillDown ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {/* Summary Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold">
                  Driver Behavior Alerts — {summaries.length} vehicle{summaries.length !== 1 ? "s" : ""}
                </h2>
                <p className="text-xs text-slate-400 mt-1">Click a count to see details</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-left">
                      <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Vehicle</th>
                      <th className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400 text-center">Speeding</th>
                      <th className="px-4 py-3 font-semibold text-red-600 dark:text-red-400 text-center">Harsh Braking</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {summaries.map((row) => (
                      <tr
                        key={row.vehicle}
                        className={`transition-colors ${
                          drillDown?.vehicle === row.vehicle
                            ? "bg-orange-50 dark:bg-orange-900/10"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                          {row.vehicle}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <ClickableBadge
                            count={row.speeding}
                            color="amber"
                            active={drillDown?.vehicle === row.vehicle && drillDown?.category === "speeding"}
                            onClick={() => handleCellClick(row, "speeding")}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <ClickableBadge
                            count={row.harshBraking}
                            color="red"
                            active={drillDown?.vehicle === row.vehicle && drillDown?.category === "harshBraking"}
                            onClick={() => handleCellClick(row, "harshBraking")}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                            row.total === 0
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                          }`}>
                            {row.total === 0 ? "✓ Clean" : row.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-600 font-semibold">
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">Total</td>
                      <td className="px-4 py-3 text-center text-amber-600 dark:text-amber-400">{totalRow.speeding || "—"}</td>
                      <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">{totalRow.harshBraking || "—"}</td>
                      <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">{totalRow.total}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Drill-down panel */}
            {drillDown && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h2 className="text-lg font-bold">
                      {drillDown.category === "speeding" ? "🟡 Speeding" : "🔴 Harsh Braking"}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">{drillDown.vehicle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        copied
                          ? "bg-green-600 text-white"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {copied ? "✓ Copied" : "📋 Copy for email"}
                    </button>
                    <button
                      onClick={() => setDrillDown(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none px-1"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Email-ready preview */}
                <div className="flex-1 p-5 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    {formatEmailText(drillDown.vehicle, drillDown.category, drillDown.details)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && summaries.length === 0 && !error && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6 text-center">
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Upload a Linxup alert export (.xlsx) to get started. The file should contain columns for
              <strong> Tracker Name</strong> and <strong>Type</strong>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function ClickableBadge({
  count,
  color,
  active,
  onClick,
}: {
  count: number;
  color: "amber" | "red";
  active: boolean;
  onClick: () => void;
}) {
  if (count === 0) return <span className="text-slate-300 dark:text-slate-600">—</span>;

  const base =
    color === "amber"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60";

  const ring = active ? "ring-2 ring-offset-1 ring-current" : "";

  return (
    <button
      onClick={onClick}
      className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${base} ${ring}`}
    >
      {count}
    </button>
  );
}
