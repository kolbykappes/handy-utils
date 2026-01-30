"use client";

import { useState } from "react";
import Link from "next/link";
import { EmployeeExpenses } from "./types";
import { parseExpenseFile, formatEmailBody, formatLeadershipSummary } from "./parser";

export default function ExpenseReconciliation() {
  const [employeeData, setEmployeeData] = useState<EmployeeExpenses[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerText, setHeaderText] = useState<string>("Please submit these expenses by [DATE].");
  const [viewMode, setViewMode] = useState<"individual" | "leadership">("individual");

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setEmployeeData([]);
    setSelectedEmployee(null);

    try {
      const data = await parseExpenseFile(file);
      setEmployeeData(data);
      if (data.length > 0) {
        setSelectedEmployee(data[0].name);
      } else {
        setError("No missing expenses found in the file.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse Excel file"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (!selectedEmployee) return;

    const employee = employeeData.find((e) => e.name === selectedEmployee);
    if (!employee) return;

    const emailBody = formatEmailBody(employee.name, employee.missingExpenses, headerText);
    navigator.clipboard.writeText(emailBody);
  };

  const handleCopyLeadershipSummary = () => {
    const summary = formatLeadershipSummary(employeeData);
    navigator.clipboard.writeText(summary);
  };

  const selectedEmployeeData = employeeData.find(
    (e) => e.name === selectedEmployee
  );

  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Expense Reconciliation
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Upload AmEx reconciliation spreadsheet to generate missing expense emails
          </p>
        </div>

        {/* File Upload and Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4">Upload Spreadsheet</h2>
          <div className="flex items-center gap-4 mb-4">
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors inline-block">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              📁 Choose Excel File
            </label>
            {loading && (
              <span className="text-slate-600 dark:text-slate-400">
                Processing...
              </span>
            )}
          </div>

          {/* Header Text Input */}
          <div className="mt-4">
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Email Header Text (prepended to each employee email):
            </label>
            <textarea
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="e.g., Please submit these expenses by [DATE]."
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
            />
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {employeeData.length > 0 && (
          <>
            {/* View Mode Toggle */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setViewMode("individual")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "individual"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                👤 Individual Emails
              </button>
              <button
                onClick={() => setViewMode("leadership")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "leadership"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                📊 Leadership Summary
              </button>
            </div>

            {viewMode === "individual" ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee Selection */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold mb-4">Employees with Missing Expenses</h2>
                  <div className="space-y-2">
                    {employeeData.map((employee) => (
                      <button
                        key={employee.name}
                        onClick={() => setSelectedEmployee(employee.name)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedEmployee === employee.name
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        <div className="font-semibold">{employee.name}</div>
                        <div className="text-sm opacity-80">
                          {employee.missingExpenses.length} missing expense
                          {employee.missingExpenses.length !== 1 ? "s" : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

            {/* Email Body Preview */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold">
                  Email Body{selectedEmployee && ` - ${selectedEmployee}`}
                </h2>
                <button
                  onClick={handleCopyEmail}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  disabled={!selectedEmployeeData}
                >
                  📋 Copy to Clipboard
                </button>
              </div>
              <div className="flex-1 p-6">
                {selectedEmployeeData ? (
                  <div>
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <strong>Total missing expenses:</strong>{" "}
                        {selectedEmployeeData.missingExpenses.length}
                        <br />
                        <strong>Total amount:</strong> $
                        {selectedEmployeeData.missingExpenses
                          .reduce((sum, exp) => sum + exp.amount, 0)
                          .toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm whitespace-pre-wrap">
                      {formatEmailBody(
                        selectedEmployeeData.name,
                        selectedEmployeeData.missingExpenses,
                        headerText
                      )}
                    </div>

                    {/* Detailed Expense List */}
                    <div className="mt-6">
                      <h3 className="text-lg font-bold mb-3">Expense Details</h3>
                      <div className="space-y-3">
                        {selectedEmployeeData.missingExpenses.map((expense, index) => (
                          <div
                            key={index}
                            className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-lg">
                                {expense.date}
                              </span>
                              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                ${expense.amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 mb-2">
                              <strong>Description:</strong> {expense.description}
                            </div>
                            {expense.extendedDetails && (
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-2 p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                                <strong>Extended Details:</strong>
                                <br />
                                {expense.extendedDetails}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                              Category: {expense.category}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 dark:text-slate-600 py-12">
                    Select an employee to view their missing expenses
                  </div>
                )}
              </div>
            </div>
          </div>
            ) : (
              /* Leadership Summary View */
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold">Leadership Summary</h2>
                  <button
                    onClick={handleCopyLeadershipSummary}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    📋 Copy Summary
                  </button>
                </div>
                <div className="p-6">
                  <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm whitespace-pre-wrap">
                    {formatLeadershipSummary(employeeData)}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && employeeData.length === 0 && !error && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
            <p className="text-slate-700 dark:text-slate-300">
              Upload an Excel file to get started. The file should contain employee sheets
              (from "Curt" to "Paul") with expense data and an "Expense submitted" column.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
