import Link from "next/link";
import { changelogs } from "./release-notes";

export default function Changelog() {
  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm mb-4"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Changelog
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Release history for all Handy Utils tools
        </p>

        {/* Table of contents */}
        <nav className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200 dark:border-slate-700 mb-8">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {changelogs.map((tool) => (
              <a
                key={tool.id}
                href={`#${tool.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
              >
                <span className="text-lg">{tool.icon}</span>
                <span className="text-slate-700 dark:text-slate-300">{tool.name}</span>
                <span className="ml-auto text-xs text-slate-400 font-mono">
                  v{tool.releases[0].version}
                </span>
              </a>
            ))}
          </div>
        </nav>

        {/* Tool changelogs */}
        <div className="space-y-10">
          {changelogs.map((tool) => (
            <section key={tool.id} id={tool.id}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{tool.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                    <Link
                      href={tool.href}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {tool.name}
                    </Link>
                  </h2>
                </div>
              </div>

              <div className="space-y-4 ml-2 border-l-2 border-slate-200 dark:border-slate-700 pl-6">
                {tool.releases.map((release) => (
                  <div key={release.version} className="relative">
                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800" />
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                        v{release.version}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(release.date + "T12:00:00Z").toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {release.changes.map((change, i) => (
                        <li
                          key={i}
                          className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"
                        >
                          <span className="text-slate-400 mt-1 shrink-0">·</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
