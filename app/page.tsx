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
      version: "1.3",
      updatedAt: "2026-02-12T19:36:00Z",
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
      version: "1.2",
      updatedAt: "2026-02-08T19:58:00Z",
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
      version: "1.0",
      updatedAt: "2026-05-23T00:00:00Z",
      changelogId: "credit-card-tracker",
      localOnly: true,
    },
    {
      name: "AmEx Tracker",
      description: "Categorize AmEx business card charges as MTM or Personal and track expense filing status",
      href: "/tools/amex-tracker",
      icon: "💳",
      version: "1.0",
      updatedAt: "2026-05-24T00:00:00Z",
      changelogId: "amex-tracker",
      localOnly: true,
    },
  ];

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {calculators.map((calculator) => {
            const disabled = calculator.localOnly && !isLocal;

            if (disabled) {
              return (
                <div
                  key={calculator.href}
                  className="block p-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed select-none"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl grayscale">{calculator.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                          {calculator.name}
                        </h2>
                        <span className="shrink-0 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">
                          Local only
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                        {calculator.description}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Run locally at localhost:3000 to use this tool
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={calculator.href}
                href={calculator.href}
                className="group block p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{calculator.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="text-xl font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {calculator.name}
                      </h2>
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/changelog#${calculator.changelogId}`;
                        }}
                        className="shrink-0 text-xs text-slate-400 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 cursor-pointer transition-colors"
                        title="View changelog"
                      >
                        v{calculator.version}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                      {calculator.description}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Updated {new Date(calculator.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} at {new Date(calculator.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
