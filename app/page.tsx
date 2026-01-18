import Link from "next/link";

export default function Home() {
  const calculators = [
    {
      name: "Interest Rate Calculator",
      description: "Calculate interest rate, monthly payment, principal, or loan term",
      href: "/calculators/interest-rate",
      icon: "💰",
    },
    {
      name: "Time Report Generator",
      description: "Generate sample labor cost datasets for payroll testing",
      href: "/calculators/time-report",
      icon: "📊",
    },
    {
      name: "Markdown ↔ HTML Converter",
      description: "Bidirectional converter with live sync and GitHub-flavored markdown",
      href: "/converters/markdown-html",
      icon: "🔄",
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
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {calculator.name}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {calculator.description}
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
