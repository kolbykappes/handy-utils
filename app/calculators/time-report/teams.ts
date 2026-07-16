import { Team } from "./types";
import { EMPLOYEES } from "./employees";

const STORAGE_KEY = "simulatedTeams";
const LEGACY_KEY = "customEmployees";

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function loadTeams(): Team[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Team[];
    } catch {
      // fall through to migration
    }
  }

  // Migrate from legacy single-list storage
  const legacy = localStorage.getItem(LEGACY_KEY);
  const employees = legacy ? (() => { try { return JSON.parse(legacy); } catch { return EMPLOYEES; } })() : EMPLOYEES;
  const team: Team = { id: generateId(), name: "Ragged Mountain", employees };
  saveTeams([team]);
  localStorage.removeItem(LEGACY_KEY);
  return [team];
}

export function saveTeams(teams: Team[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

export function cloneTeam(team: Team): Team {
  return {
    id: generateId(),
    name: `Copy of ${team.name}`,
    employees: team.employees.map((e) => ({ ...e })),
  };
}
