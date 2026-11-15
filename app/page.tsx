"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setIsLocal(host === "localhost" || host === "127.0.0.1");
  }, []);

  const calculators = [
    {
      name: "Interest Rate Calculator",
      description: "Calculate interest rate, monthly payment, principal, or loan term",
      href: "/calculators/interest-rate",
      icon: "💰",
      version: "1.2",
      updatedAt: "2026-01-17T21:06:00Z",
      changelogId: "interest-rate",
    },
    {
      name: "Time Report Generator",
      description: "Generate sample labor cost datasets for payroll testing",
      href: "/calculators/time-report",
      icon: "📊",
      version: "1.4",
      updatedAt: "2026-07-16T00:00:00Z",
      changelogId: "time-report",
    },
    {
      name: "Markdown ↔ HTML Converter",
      description: "Bidirectional converter with live sync and GitHub-flavored markdown",
      href: "/converters/markdown-html",
      icon: "🔄",
      version: "1.6",
      updatedAt: "2026-01-19T21:53:00Z",
      changelogId: "markdown-html",
    },
    {
      name: "Expense Reconciliation",
      description: "Upload AmEx reconciliation spreadsheet to generate missing expense emails",
      href: "/tools/expense-reconciliation",
      icon: "💳",
      version: "1.3",
      updatedAt: "2026-01-30T18:38:00Z",
      changelogId: "expense-reconciliation",
    },
    {
      name: "Weather Days for Job Sites",
      description: "Track historical weather data (temps and precipitation) for job sites",
      href: "/tools/weather-days",
      icon: "🌤️",
      version: "1.3",
      updatedAt: "2026-10-06T12:00:00Z",
      changelogId: "weather-days",
    },
    {
      name: "Bank Statement Check Parser",
      description: "Parse check data from bank statement PDFs with AI-powered payee recognition",
      href: "/tools/bank-statement-checks",
      icon: "🏦",
      version: "1.3",
      updatedAt: "2026-02-16T20:22:00Z",
      changelogId: "bank-statement-checks",
    },
    {
      name: "Fleet Alert Summary",
      description: "Upload a Linxup alert export to see speeding and braking events by vehicle",
      href: "/tools/fleet-alerts",
      icon: "🚛",
      version: "1.0",
      updatedAt: "2026-05-17T00:00:00Z",
      changelogId: "fleet-alerts",
    },
    {
      name: "Credit Card Tracker",
      description: "Categorize 5179 card charges by entity (MTM, EG, Kory, Me) and track expense/payment dates",
      href: "/tools/credit-card-tracker",
      icon: "💳",
      version: "1.6",
      updatedAt: "2026-11-08T00:00:00Z",
      changelogId: "credit-card-tracker",
      localOnly: true,
    },
    {
      name: "AmEx Tracker",
      description: "Categorize AmEx business card charges as MTM or Personal and track expense filing status",
      href: "/tools/amex-tracker",
      icon: "💳",
      version: "1.2",
      updatedAt: "2026-08-16T00:00:00Z",
      changelogId: "amex-tracker",
      localOnly: true,
    },
    {
      name: "BMW Tracker",
      description: "Categorize BMW credit card charges as EG, MTM, or Personal and track filing status",
      href: "/tools/bmw-tracker",
      icon: "🚗",
      version: "1.0",
      updatedAt: "2026-08-29T00:00:00Z",
      changelogId: "bmw-tracker",
      localOnly: true,
    },
    {
      name: "Claude Spending",
      description: "Paste Claude usage API response to view spending by user and export to Excel",
      href: "/tools/claude-spending",
      icon: "🤖",
      version: "1.0",
      updatedAt: "2026-07-27T00:00:00Z",
      changelogId: "claude-spending",
    },
    {
      name: "Receipt Generator",
      description: "Generate a test receipt PDF given a merchant, date, and amount",
      href: "/tools/receipt-generator",
      icon: "🧾",
      version: "1.0",
      updatedAt: "2026-02-12",
    },
  ];

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Handy Utils
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            A collection of useful calculators and utilities
          </p>
          <Link
            href="/changelog"
            className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View full changelog →
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {calculators.map((calculator) => {
            const disabled = calculator.localOnly && !isLocal;

            if (disabled) {
              return (
                <div
                  key={calculator.href}
                  className="flex flex-col p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 opacity-40 cursor-not-allowed select-none"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl grayscale">{calculator.icon}</span>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                      Local only
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1.5 leading-snug">
                    {calculator.name}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm flex-1 mb-3 leading-relaxed">
                    {calculator.description}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Run locally to use this tool
                  </p>
                </div>
              );
            }

            return (
              <Link
                key={calculator.href}
                href={calculator.href}
                className="group flex flex-col p-5 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{calculator.icon}</span>
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = `/changelog#${calculator.changelogId}`;
                    }}
                    className="text-xs text-slate-400 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 cursor-pointer transition-colors"
                    title="View changelog"
                  >
                    v{calculator.version}
                  </span>
                </div>
                <h2 className="text-base font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1.5 leading-snug">
                  {calculator.name}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm flex-1 mb-3 leading-relaxed">
                  {calculator.description}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(calculator.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
