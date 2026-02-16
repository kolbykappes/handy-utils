import Link from "next/link";

export default function Home() {
  const calculators = [
    {
      name: "Interest Rate Calculator",
      description: "Calculate interest rate, monthly payment, principal, or loan term",
      href: "/calculators/interest-rate",
      icon: "💰",
      version: "1.2",
      updatedAt: "2026-01-17T21:06:00Z",
    },
    {
      name: "Time Report Generator",
      description: "Generate sample labor cost datasets for payroll testing",
      href: "/calculators/time-report",
      icon: "📊",
      version: "1.3",
      updatedAt: "2026-02-12T19:36:00Z",
    },
    {
      name: "Markdown ↔ HTML Converter",
      description: "Bidirectional converter with live sync and GitHub-flavored markdown",
      href: "/converters/markdown-html",
      icon: "🔄",
      version: "1.6",
      updatedAt: "2026-01-19T21:53:00Z",
    },
    {
      name: "Expense Reconciliation",
      description: "Upload AmEx reconciliation spreadsheet to generate missing expense emails",
      href: "/tools/expense-reconciliation",
      icon: "💳",
      version: "1.3",
      updatedAt: "2026-01-30T18:38:00Z",
    },
    {
      name: "Weather Days for Job Sites",
      description: "Track historical weather data (temps and precipitation) for job sites",
      href: "/tools/weather-days",
      icon: "🌤️",
      version: "1.2",
      updatedAt: "2026-02-08T19:58:00Z",
    },
    {
      name: "Bank Statement Check Parser",
      description: "Parse check data from bank statement PDFs with OCR for payee and memo",
      href: "/tools/bank-statement-checks",
      icon: "🏦",
      version: "1.0",
      updatedAt: "2026-02-16T19:43:00Z",
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
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {calculators.map((calculator) => (
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
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
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
          ))}
        </div>
      </div>
    </main>
  );
}
