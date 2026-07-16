"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Team } from "../types";
import { loadTeams, saveTeams, generateId, cloneTeam } from "../teams";

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    setTeams(loadTeams());
  }, []);

  const persist = (updated: Team[]) => {
    setTeams(updated);
    saveTeams(updated);
  };

  const handleNew = () => {
    const team: Team = { id: generateId(), name: "New Team", employees: [] };
    const updated = [...teams, team];
    persist(updated);
    router.push(`/calculators/time-report/teams/${team.id}`);
  };

  const handleClone = (team: Team) => {
    const copy = cloneTeam(team);
    const updated = [...teams, copy];
    persist(updated);
    router.push(`/calculators/time-report/teams/${copy.id}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (teams.length === 1) {
      alert("You must have at least one team.");
      return;
    }
    if (!confirm(`Delete team "${name}"? This cannot be undone.`)) return;
    persist(teams.filter((t) => t.id !== id));
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/calculators/time-report"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
          >
            ← Back to Time Report
          </Link>
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            Home
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Simulated Teams
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create and manage named teams for payroll simulations
          </p>
        </header>

        <div className="mb-6">
          <button
            onClick={handleNew}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            ➕ New Team
          </button>
        </div>

        <div className="space-y-4">
          {teams.map((team) => {
            const active = team.employees.filter((e) => !e.disabled).length;
            const total = team.employees.length;
            return (
              <div
                key={team.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {team.name}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {total === 0
                      ? "No employees yet"
                      : `${active} active · ${total} total`}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link
                    href={`/calculators/time-report/teams/${team.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleClone(team)}
                    className="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Clone
                  </button>
                  <button
                    onClick={() => handleDelete(team.id, team.name)}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
