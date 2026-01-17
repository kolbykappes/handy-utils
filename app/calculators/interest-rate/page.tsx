"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { calculateLoan, CalculationResult } from "./loanCalculations";

export default function InterestRateCalculator() {
  const [principal, setPrincipal] = useState<string>("");
  const [monthlyPayment, setMonthlyPayment] = useState<string>("");
  const [annualInterestRate, setAnnualInterestRate] = useState<string>("");
  const [termMonths, setTermMonths] = useState<string>("");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string>("");

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

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    ${result.principal.toFixed(2)}
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
                    ${result.monthlyPayment.toFixed(2)}
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
                    {result.annualInterestRate.toFixed(3)}%
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
                    {result.termMonths.toFixed(1)} months
                    {result.calculatedField === "termMonths" && (
                      <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                        ✓ Calculated
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    ({(result.termMonths / 12).toFixed(1)} years)
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
                        ${result.totalPaid.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Total Interest:
                      </span>
                      <span className="font-semibold">
                        ${result.totalInterest.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
