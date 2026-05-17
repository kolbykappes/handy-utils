"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAlertsFile, VehicleAlertSummary } from "./parser";

export default function FleetAlerts() {
  const [summaries, setSummaries] = useState<VehicleAlertSummary[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSummaries([]);
    setFileName(file.name);

    try {
      const data = await parseAlertsFile(file);
      setSummaries(data);
      if (data.length === 0) {
        setError("No speeding, high speed, harsh braking, or rapid acceleration alerts found.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  };

  const totalRow = summaries.reduce(
    (acc, v) => ({
      vehicle: "TOTAL",
      speeding: acc.speeding + v.speeding,
      highSpeed: acc.highSpeed + v.highSpeed,
      harshBraking: acc.harshBraking + v.harshBraking,
      rapidAccel: acc.rapidAccel + v.rapidAccel,
      total: acc.total + v.total,
    }),
    { vehicle: "TOTAL", speeding: 0, highSpeed: 0, harshBraking: 0, rapidAccel: 0, total: 0 }
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

        {/* Results Table */}
        {summaries.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold">
                Driver Behavior Alerts — {summaries.length} vehicle{summaries.length !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-left">
                    <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Vehicle</th>
                    <th className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400 text-center">Speeding</th>
                    <th className="px-4 py-3 font-semibold text-orange-600 dark:text-orange-400 text-center">High Speed</th>
                    <th className="px-4 py-3 font-semibold text-red-600 dark:text-red-400 text-center">Harsh Braking</th>
                    <th className="px-4 py-3 font-semibold text-purple-600 dark:text-purple-400 text-center">Rapid Accel</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {summaries.map((row) => (
                    <tr
                      key={row.vehicle}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                        {row.vehicle}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <AlertBadge count={row.speeding} color="amber" />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <AlertBadge count={row.highSpeed} color="orange" />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <AlertBadge count={row.harshBraking} color="red" />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <AlertBadge count={row.rapidAccel} color="purple" />
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
                    <td className="px-4 py-3 text-center text-orange-600 dark:text-orange-400">{totalRow.highSpeed || "—"}</td>
                    <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">{totalRow.harshBraking || "—"}</td>
                    <td className="px-4 py-3 text-center text-purple-600 dark:text-purple-400">{totalRow.rapidAccel || "—"}</td>
                    <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">{totalRow.total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Legend */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span><span className="text-amber-600 font-semibold">Speeding</span> — over posted limit</span>
              <span><span className="text-orange-600 font-semibold">High Speed</span> — threshold speed exceeded</span>
              <span><span className="text-red-600 font-semibold">Harsh Braking</span> — hard stop detected</span>
              <span><span className="text-purple-600 font-semibold">Rapid Accel</span> — hard acceleration detected</span>
            </div>
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

function AlertBadge({ count, color }: { count: number; color: "amber" | "orange" | "red" | "purple" }) {
  if (count === 0) return <span className="text-slate-300 dark:text-slate-600">—</span>;

  const styles: Record<string, string> = {
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-semibold ${styles[color]}`}>
      {count}
    </span>
  );
}
