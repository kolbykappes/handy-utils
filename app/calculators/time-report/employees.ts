import { Employee } from "./types";

export const EMPLOYEES: Employee[] = [
  // Tier 1: Senior Supervision/Skilled Operations ($40-$50/hr)
  {
    name: "Paul Meadows",
    hourlyRate: 40.10,
    role: "Supervisor/Skilled Operator",
    workProbability: 0.87,
    minHours: 8.0,
    maxHours: 10.5,
  },
  {
    name: "Kenton Wheeler",
    hourlyRate: 40.48,
    role: "Supervisor/Skilled Operator",
    workProbability: 0.73,
    minHours: 8.0,
    maxHours: 10.5,
  },
  {
    name: "Darren Gleitz",
    hourlyRate: 40.09,
    role: "Supervisor/Skilled Operator",
    workProbability: 0.77,
    minHours: 8.0,
    maxHours: 10.5,
  },
  {
    name: "Kody Kappes",
    hourlyRate: 50.00,
    role: "Operations Manager",
    workProbability: 0.71,
    minHours: 8.0,
    maxHours: 10.0,
  },
  // Tier 2: Management ($65-$70/hr) - Part-Time
  {
    name: "Kolby Kappes",
    hourlyRate: 65.00,
    role: "VP Operations",
    workProbability: 0.50,
    minHours: 6.0,
    maxHours: 10.0,
    isPartTime: true,
    weeklyHourLimit: 20,
    weeklyDayLimit: 3,
  },
  {
    name: "Kenley Kappes",
    hourlyRate: 70.00,
    role: "Owner",
    workProbability: 0.35,
    minHours: 4.0,
    maxHours: 8.0,
    isPartTime: true,
    weeklyHourLimit: 10,
    weeklyDayLimit: 2,
  },
  // Tier 3: Mid-Level Operations ($25-$27/hr)
  {
    name: "Eduard Brito",
    hourlyRate: 26.20,
    role: "Mid-level Operator",
    workProbability: 0.77,
    minHours: 8.0,
    maxHours: 10.5,
  },
  {
    name: "Noah Herald",
    hourlyRate: 25.03,
    role: "Mid-level Operator",
    workProbability: 0.83,
    minHours: 8.0,
    maxHours: 10.0,
  },
  {
    name: "Avery Johnson",
    hourlyRate: 25.02,
    role: "Mid-level Operator",
    workProbability: 0.75,
    minHours: 8.0,
    maxHours: 10.5,
  },
  // Tier 4: General Labor ($20-$24/hr)
  {
    name: "Darion Amaro",
    hourlyRate: 23.75,
    role: "General Labor",
    workProbability: 0.75,
    minHours: 8.0,
    maxHours: 10.5,
  },
  {
    name: "Carlos Lopes",
    hourlyRate: 23.00,
    role: "General Labor",
    workProbability: 0.67,
    minHours: 8.0,
    maxHours: 10.5,
  },
  {
    name: "Tilghman Carter",
    hourlyRate: 22.01,
    role: "General Labor",
    workProbability: 0.73,
    minHours: 8.0,
    maxHours: 10.5,
  },
  {
    name: "Luis Olarte",
    hourlyRate: 20.03,
    role: "General Labor",
    workProbability: 0.83,
    minHours: 8.0,
    maxHours: 10.5,
  },
  // Tier 5: Entry-Level Labor ($16-$17/hr)
  {
    name: "Cathy Rosenberry",
    hourlyRate: 16.28,
    role: "General Labor",
    workProbability: 0.90,
    minHours: 8.0,
    maxHours: 10.0,
  },
];

export const HOLIDAYS_2025_2026 = [
  new Date(2025, 10, 28), // Thanksgiving - Nov 28
  new Date(2025, 10, 29), // Day after Thanksgiving - Nov 29
  new Date(2025, 11, 24), // Christmas Eve - Dec 24
  new Date(2025, 11, 25), // Christmas - Dec 25
  new Date(2025, 11, 31), // New Year's Eve - Dec 31
  new Date(2026, 0, 1),   // New Year's Day - Jan 1
];

export const DEFAULT_WITHHOLDING_RATE = 0.275; // 27.5%
