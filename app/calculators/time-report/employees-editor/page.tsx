"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EMPLOYEES } from "../employees";
import { Employee } from "../types";

export default function EmployeeEditor() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Load custom employees from localStorage or use defaults
  useEffect(() => {
    const savedEmployees = localStorage.getItem("customEmployees");
    if (savedEmployees) {
      try {
        setEmployees(JSON.parse(savedEmployees));
      } catch (e) {
        console.error("Failed to load custom employees:", e);
        setEmployees([...EMPLOYEES]);
      }
    } else {
      setEmployees([...EMPLOYEES]);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("customEmployees", JSON.stringify(employees));
    setHasChanges(false);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all employees to defaults?")) {
      setEmployees([...EMPLOYEES]);
      localStorage.removeItem("customEmployees");
      setHasChanges(false);
    }
  };

  const handleSortAlpha = () => {
    const sorted = [...employees].sort((a, b) => a.name.localeCompare(b.name));
    setEmployees(sorted);
    setHasChanges(true);
  };

  const updateEmployee = (index: number, field: keyof Employee, value: any) => {
    const updated = [...employees];
    updated[index] = { ...updated[index], [field]: value };
    setEmployees(updated);
    setHasChanges(true);
  };

  const addEmployee = () => {
    const newEmployee: Employee = {
      name: "New Employee",
      hourlyRate: 20.0,
      role: "General Labor",
      workProbability: 0.8,
      minHours: 8.0,
      maxHours: 10.0,
    };
    setEmployees([...employees, newEmployee]);
    setHasChanges(true);
  };

  const removeEmployee = (index: number) => {
    if (confirm(`Remove ${employees[index].name}?`)) {
      const updated = employees.filter((_, i) => i !== index);
      setEmployees(updated);
      setHasChanges(true);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/calculators/time-report"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
          >
            ← Back to Time Report
          </Link>
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Home
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Employee Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Customize employee rates, roles, and work patterns for time report generation
          </p>
        </header>

        <div className="mb-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            💾 Save Changes
          </button>
          <button
            onClick={handleReset}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            🔄 Reset to Defaults
          </button>
          <button
            onClick={addEmployee}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            ➕ Add Employee
          </button>
          <button
            onClick={handleSortAlpha}
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

        <div className="space-y-4">
          {employees.map((employee, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border transition-opacity ${
                employee.disabled
                  ? "border-slate-200 dark:border-slate-700 opacity-50"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className={`text-xl font-bold ${employee.disabled ? "line-through text-slate-400" : ""}`}>
                    {employee.name}
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
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    value={employee.name}
                    onChange={(e) =>
                      updateEmployee(index, "name", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={employee.role}
                    onChange={(e) =>
                      updateEmployee(index, "role", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                {/* Hourly Rate */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={employee.hourlyRate}
                    onChange={(e) =>
                      updateEmployee(
                        index,
                        "hourlyRate",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                {/* Work Probability */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Work Probability (%)
                    <span className="ml-2 text-xs text-slate-500">
                      Chance of working any given day
                    </span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={Math.round(employee.workProbability * 100)}
                    onChange={(e) =>
                      updateEmployee(
                        index,
                        "workProbability",
                        (parseFloat(e.target.value) || 0) / 100
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                {/* Min Hours */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Hours/Day
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={employee.minHours}
                    onChange={(e) =>
                      updateEmployee(
                        index,
                        "minHours",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                {/* Max Hours */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Hours/Day
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={employee.maxHours}
                    onChange={(e) =>
                      updateEmployee(
                        index,
                        "maxHours",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                  />
                </div>

                {/* Part-Time Toggle */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={employee.isPartTime || false}
                      onChange={(e) =>
                        updateEmployee(index, "isPartTime", e.target.checked)
                      }
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Part-Time</span>
                  </label>
                </div>

                {/* Part-Time Settings */}
                {employee.isPartTime && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Weekly Hour Limit
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={employee.weeklyHourLimit || 0}
                        onChange={(e) =>
                          updateEmployee(
                            index,
                            "weeklyHourLimit",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Weekly Day Limit
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="7"
                        value={employee.weeklyDayLimit || 0}
                        onChange={(e) =>
                          updateEmployee(
                            index,
                            "weeklyDayLimit",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            💾 Save Changes
          </button>
        </div>
      </div>
    </main>
  );
}
