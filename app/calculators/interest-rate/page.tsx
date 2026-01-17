"use client";

import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { calculateLoan, CalculationResult } from "./loanCalculations";

// Format number with commas for display
function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

interface HistoryItem extends CalculationResult {
  timestamp: number;
  id: string;
}

export default function InterestRateCalculator() {
  const [principal, setPrincipal] = useState<string>("");
  const [monthlyPayment, setMonthlyPayment] = useState<string>("");
  const [annualInterestRate, setAnnualInterestRate] = useState<string>("");
  const [termMonths, setTermMonths] = useState<string>("");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("calculatorHistory");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("calculatorHistory", JSON.stringify(history));
    }
  }, [history]);

  const handleCalculate = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    try {
      // Convert inputs to numbers or undefined
      const params = {
        principal: principal ? parseFloat(principal) : undefined,
        monthlyPayment: monthlyPayment ? parseFloat(monthlyPayment) : undefined,
        annualInterestRate: annualInterestRate
          ? parseFloat(annualInterestRate)
          : undefined,
        termMonths: termMonths ? parseFloat(termMonths) : undefined,
      };

      // Validate that exactly 3 fields are filled
      const filledCount = Object.values(params).filter(
        (val) => val !== undefined
      ).length;

      if (filledCount !== 3) {
        setError("Please fill exactly 3 of the 4 fields");
        return;
      }

      // Validate positive numbers
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && (isNaN(value) || value <= 0)) {
          setError(`${key} must be a positive number`);
          return;
        }
      }

      const calculationResult = calculateLoan(params);
      setResult(calculationResult);

      // Add to history
      const historyItem: HistoryItem = {
        ...calculationResult,
        timestamp: Date.now(),
        id: `${Date.now()}-${Math.random()}`,
      };
      setHistory((prev) => [historyItem, ...prev].slice(0, 20)); // Keep last 20
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation error");
    }
  };

  const handleClear = () => {
    setPrincipal("");
    setMonthlyPayment("");
    setAnnualInterestRate("");
    setTermMonths("");
    setResult(null);
    setError("");
  };

  const handleLoadFromHistory = (item: HistoryItem) => {
    setPrincipal(item.principal.toString());
    setMonthlyPayment(item.monthlyPayment.toString());
    setAnnualInterestRate(item.annualInterestRate.toString());
    setTermMonths(item.termMonths.toString());
    setResult(item);
    setError("");
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("calculatorHistory");
  };

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
            Interest Rate Calculator
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Fill in any 3 fields and we'll calculate the 4th one for you
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleCalculate} className="space-y-4">
              <div>
                <label
                  htmlFor="principal"
                  className="block text-sm font-medium mb-2"
                >
                  Initial Balance (Principal)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    id="principal"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="e.g., 20000"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="monthlyPayment"
                  className="block text-sm font-medium mb-2"
                >
                  Monthly Payment
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    id="monthlyPayment"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    placeholder="e.g., 500"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="annualInterestRate"
                  className="block text-sm font-medium mb-2"
                >
                  Annual Interest Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="annualInterestRate"
                    value={annualInterestRate}
                    onChange={(e) => setAnnualInterestRate(e.target.value)}
                    placeholder="e.g., 5.5"
                    step="0.01"
                    className="w-full pr-8 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="termMonths"
                  className="block text-sm font-medium mb-2"
                >
                  Term (Months)
                </label>
                <input
                  type="number"
                  id="termMonths"
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  placeholder="e.g., 60"
                  step="1"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Calculate
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-6 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 font-medium py-3 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          {result && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold mb-4">Results</h2>

              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Initial Balance (Principal)
                  </div>
                  <div className="text-2xl font-bold">
                    ${formatNumber(result.principal)}
                    {result.calculatedField === "principal" && (
                      <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                        ✓ Calculated
                      </span>
                    )}
                  </div>
                </div>

                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Monthly Payment
                  </div>
                  <div className="text-2xl font-bold">
                    ${formatNumber(result.monthlyPayment)}
                    {result.calculatedField === "monthlyPayment" && (
                      <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                        ✓ Calculated
                      </span>
                    )}
                  </div>
                </div>

                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Annual Interest Rate
                  </div>
                  <div className="text-2xl font-bold">
                    {formatNumber(result.annualInterestRate, 3)}%
                    {result.calculatedField === "annualInterestRate" && (
                      <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                        ✓ Calculated
                      </span>
                    )}
                  </div>
                </div>

                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Term
                  </div>
                  <div className="text-2xl font-bold">
                    {formatNumber(result.termMonths, 1)} months
                    {result.calculatedField === "termMonths" && (
                      <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                        ✓ Calculated
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    ({formatNumber(result.termMonths / 12, 1)} years)
                  </div>
                </div>

                <div className="pt-3">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Summary
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Total Amount Paid:
                      </span>
                      <span className="font-semibold">
                        ${formatNumber(result.totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Total Interest:
                      </span>
                      <span className="font-semibold">
                        ${formatNumber(result.totalInterest)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Column */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 xl:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Recent Calculations</h2>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  title="Clear all history"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">
                No calculations yet. Your recent calculations will appear here.
              </p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLoadFromHistory(item)}
                    className="w-full text-left p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(item.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                        {item.calculatedField === "principal"
                          ? "Principal"
                          : item.calculatedField === "monthlyPayment"
                          ? "Payment"
                          : item.calculatedField === "annualInterestRate"
                          ? "Rate"
                          : "Term"}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Principal:
                        </span>
                        <span className="font-medium">
                          ${formatNumber(item.principal, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Payment:
                        </span>
                        <span className="font-medium">
                          ${formatNumber(item.monthlyPayment, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Rate:
                        </span>
                        <span className="font-medium">
                          {formatNumber(item.annualInterestRate, 2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Term:
                        </span>
                        <span className="font-medium">
                          {formatNumber(item.termMonths, 0)} mo
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
