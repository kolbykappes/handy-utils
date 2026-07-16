"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Employee, Team } from "../../types";
import { loadTeams, saveTeams, generateId } from "../../teams";

const DEFAULT_EMPLOYEE: Omit<Employee, "name"> = {
  hourlyRate: 20.0,
  role: "General Labor",
  workProbability: 0.8,
  minHours: 8.0,
  maxHours: 10.0,
};

export default function TeamEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [rateInputs, setRateInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    const loaded = loadTeams();
    setTeams(loaded);
    const found = loaded.find((t) => t.id === id) ?? null;
    setTeam(found);
  }, [id]);

  const persist = (updated: Team) => {
    const next = teams.map((t) => (t.id === updated.id ? updated : t));
    setTeams(next);
    saveTeams(next);
    setTeam(updated);
    setHasChanges(false);
  };

  const mutate = (updated: Team) => {
    setTeam(updated);
    setHasChanges(true);
  };

  const updateName = (name: string) => {
    if (!team) return;
    mutate({ ...team, name });
  };

  const updateEmployee = (index: number, field: keyof Employee, value: unknown) => {
    if (!team) return;
    const employees = [...team.employees];
    employees[index] = { ...employees[index], [field]: value };
    mutate({ ...team, employees });
  };

  const addEmployee = () => {
    if (!team) return;
    const newEmp: Employee = { name: "", ...DEFAULT_EMPLOYEE };
    mutate({ ...team, employees: [newEmp, ...team.employees] });
  };

  const removeEmployee = (index: number) => {
    if (!team) return;
    const name = team.employees[index].name || "this employee";
    if (!confirm(`Remove ${name}?`)) return;
    const employees = team.employees.filter((_, i) => i !== index);
    mutate({ ...team, employees });
  };

  const sortAlpha = () => {
    if (!team) return;
    mutate({ ...team, employees: [...team.employees].sort((a, b) => a.name.localeCompare(b.name)) });
  };

  if (!team) {
    return (
      <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Team not found.</p>
          <Link href="/calculators/time-report/teams" className="text-blue-600 hover:underline">
            ← Back to Teams
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/calculators/time-report/teams"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
          >
            ← Back to Teams
          </Link>
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            Home
          </Link>
        </div>

        {/* Team name */}
        <header className="mb-8">
          <input
            type="text"
            value={team.name}
            onChange={(e) => updateName(e.target.value)}
            className="text-4xl font-bold bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            placeholder="Team name"
          />
          <p className="text-slate-600 dark:text-slate-400">
            {team.employees.length} employee{team.employees.length !== 1 ? "s" : ""} ·{" "}
            {team.employees.filter((e) => !e.disabled).length} active
          </p>
        </header>

        {/* Actions */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => persist(team)}
            disabled={!hasChanges}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            💾 Save Changes
          </button>
          <button
            onClick={addEmployee}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            ➕ Add Employee
          </button>
          <button
            onClick={sortAlpha}
            className="bg-slate-600 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            🔤 Sort A–Z
          </button>
        </div>

        {hasChanges && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200">
            You have unsaved changes. Click "Save Changes" to apply them.
          </div>
        )}

        {team.employees.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            No employees yet. Click "Add Employee" to get started.
          </div>
        )}

        <div className="space-y-4">
          {team.employees.map((employee, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 transition-opacity ${
                employee.disabled ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className={`text-xl font-bold ${employee.disabled ? "line-through text-slate-400" : ""}`}>
                    {employee.name || <span className="text-slate-400 italic">Unnamed</span>}
                  </h3>
                  {employee.disabled && (
                    <span className="text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                      Disabled
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={!employee.disabled}
                      onChange={(e) => updateEmployee(index, "disabled", !e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span>Active</span>
                  </label>
                  <button
                    onClick={() => removeEmployee(index)}
                    className="text-red-600 dark:text-red-400 hover:underline text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Employee Name</label>
                  <input
                    type="text"
                    value={employee.name}
                    onChange={(e) => updateEmployee(index, "name", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <input
                    type="text"
                    value={employee.role}
                    onChange={(e) => updateEmployee(index, "role", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Hourly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateInputs[index] ?? employee.hourlyRate}
                    onChange={(e) => setRateInputs((prev) => ({ ...prev, [index]: e.target.value }))}
                    onBlur={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed) && parsed >= 0) updateEmployee(index, "hourlyRate", parsed);
                      setRateInputs((prev) => { const next = { ...prev }; delete next[index]; return next; });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Work Probability (%)
                    <span className="ml-2 text-xs text-slate-500">Chance of working any given day</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={Math.round(employee.workProbability * 100)}
                    onChange={(e) => updateEmployee(index, "workProbability", (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Min Hours/Day</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={employee.minHours}
                    onChange={(e) => updateEmployee(index, "minHours", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Max Hours/Day</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={employee.maxHours}
                    onChange={(e) => updateEmployee(index, "maxHours", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={employee.isPartTime || false}
                      onChange={(e) => updateEmployee(index, "isPartTime", e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Part-Time</span>
                  </label>
                </div>

                {employee.isPartTime && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Weekly Hour Limit</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={employee.weeklyHourLimit || 0}
                        onChange={(e) => updateEmployee(index, "weeklyHourLimit", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Weekly Day Limit</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="7"
                        value={employee.weeklyDayLimit || 0}
                        onChange={(e) => updateEmployee(index, "weeklyDayLimit", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {team.employees.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => persist(team)}
              disabled={!hasChanges}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              💾 Save Changes
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
