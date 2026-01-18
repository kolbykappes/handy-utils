"use client";

import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { EMPLOYEES, DEFAULT_WITHHOLDING_RATE } from "./employees";
import { generateTimeReport, generateCSV, downloadCSV, downloadExcel } from "./generator";
import { TimeEntry, Employee } from "./types";

function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function TimeReportGenerator() {
  const [startDate, setStartDate] = useState<string>("2025-11-10");
  const [endDate, setEndDate] = useState<string>("2026-01-15");
  const [withholdingRate, setWithholdingRate] = useState<string>("27.5");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [error, setError] = useState<string>("");
  const [generating, setGenerating] = useState<boolean>(false);
  const [employees, setEmployees] = useState<Employee[]>(EMPLOYEES);

  // Load custom employees from localStorage on mount
  useEffect(() => {
    const savedEmployees = localStorage.getItem("customEmployees");
    if (savedEmployees) {
      try {
        setEmployees(JSON.parse(savedEmployees));
      } catch (e) {
        console.error("Failed to load custom employees:", e);
        setEmployees(EMPLOYEES);
      }
    }
  }, []);

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setGenerating(true);

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        setError("Start date must be before end date");
        setGenerating(false);
        return;
      }

      const rate = parseFloat(withholdingRate) / 100;
      if (isNaN(rate) || rate < 0 || rate > 1) {
        setError("Withholding rate must be between 0 and 100");
        setGenerating(false);
        return;
      }

      const generated = generateTimeReport(employees, {
        startDate: start,
        endDate: end,
        witholdingRate: rate,
      });

      setEntries(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCSV = () => {
    if (entries.length === 0) return;

    const csv = generateCSV(entries);
    const filename = `time-report-${startDate}-to-${endDate}.csv`;
    downloadCSV(csv, filename);
  };

  const handleDownloadExcel = () => {
    if (entries.length === 0) return;

    const filename = `time-report-${startDate}-to-${endDate}.xlsx`;
    downloadExcel(entries, filename);
  };

  const calculateTotals = () => {
    if (entries.length === 0) return null;

    const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const totalGross = entries.reduce((sum, e) => sum + e.grossPay, 0);
    const totalWithholdings = entries.reduce((sum, e) => sum + e.withholdings, 0);
    const totalNet = entries.reduce((sum, e) => sum + e.netPay, 0);

    return { totalHours, totalGross, totalWithholdings, totalNet };
  };

  const getEmployeeStats = () => {
    if (entries.length === 0) return [];

    const stats = new Map<string, {
      daysWorked: number;
      totalHours: number;
      totalGross: number;
    }>();

    entries.forEach((entry) => {
      const existing = stats.get(entry.employeeName) || {
        daysWorked: 0,
        totalHours: 0,
        totalGross: 0,
      };

      stats.set(entry.employeeName, {
        daysWorked: existing.daysWorked + 1,
        totalHours: existing.totalHours + entry.hoursWorked,
        totalGross: existing.totalGross + entry.grossPay,
      });
    });

    return Array.from(stats.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalGross - a.totalGross);
  };

  const totals = calculateTotals();
  const employeeStats = getEmployeeStats();

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Time Report Generator
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Generate sample labor cost datasets for payroll testing
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label
                  htmlFor="withholdingRate"
                  className="block text-sm font-medium mb-2"
                >
                  Withholding Rate (%)
                </label>
                <input
                  type="number"
                  id="withholdingRate"
                  value={withholdingRate}
                  onChange={(e) => setWithholdingRate(e.target.value)}
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {generating ? "Generating..." : "Generate Report"}
                </button>

                {entries.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadExcel}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors"
                    >
                      📊 Download Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCSV}
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 rounded-lg transition-colors"
                    >
                      📄 Download CSV
                    </button>
                  </>
                )}
              </div>
            </form>

            {/* Employee List */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  Employees ({employees.length})
                </h3>
                <Link
                  href="/calculators/time-report/employees-editor"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ⚙️ Edit
                </Link>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {employees.map((emp) => (
                  <div
                    key={emp.name}
                    className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-700/50 rounded"
                  >
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      ${emp.hourlyRate.toFixed(2)}/hr
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          {totals && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold mb-4">Summary</h2>

              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Total Entries
                  </div>
                  <div className="text-3xl font-bold">
                    {formatNumber(entries.length, 0)}
                  </div>
                </div>

                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Total Hours
                  </div>
                  <div className="text-3xl font-bold">
                    {formatNumber(totals.totalHours)}
                  </div>
                </div>

                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Total Gross Pay
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ${formatNumber(totals.totalGross)}
                  </div>
                </div>

                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Total Withholdings
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ${formatNumber(totals.totalWithholdings)}
                  </div>
                </div>

                <div className="pt-3">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Total Net Pay
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    ${formatNumber(totals.totalNet)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employee Stats */}
          {employeeStats.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold mb-4">By Employee</h2>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {employeeStats.map((stat) => (
                  <div
                    key={stat.name}
                    className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div className="font-semibold mb-2">{stat.name}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Days:
                        </span>
                        <span className="font-medium">
                          {stat.daysWorked}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Hours:
                        </span>
                        <span className="font-medium">
                          {formatNumber(stat.totalHours)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Gross:
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ${formatNumber(stat.totalGross)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Avg/Day:
                        </span>
                        <span className="font-medium">
                          {formatNumber(stat.totalHours / stat.daysWorked)} hrs
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Data Grid */}
        {entries.length > 0 && (
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold mb-4">Time Entries ({entries.length})</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                    <th className="px-4 py-3 text-right font-semibold">Hours Worked</th>
                    <th className="px-4 py-3 text-right font-semibold">Hourly Rate</th>
                    <th className="px-4 py-3 text-right font-semibold">Gross Pay</th>
                    <th className="px-4 py-3 text-right font-semibold">Withholdings</th>
                    <th className="px-4 py-3 text-right font-semibold">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {entries.map((entry, index) => (
                    <tr
                      key={`${entry.date}-${entry.employeeName}-${index}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">{entry.date}</td>
                      <td className="px-4 py-2">{entry.employeeName}</td>
                      <td className="px-4 py-2 text-right">{entry.hoursWorked.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">${entry.hourlyRate.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                        ${formatNumber(entry.grossPay)}
                      </td>
                      <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                        ${formatNumber(entry.withholdings)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        ${formatNumber(entry.netPay)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
