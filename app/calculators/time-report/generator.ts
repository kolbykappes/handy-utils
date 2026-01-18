import { Employee, TimeEntry, GenerationOptions } from "./types";
import { HOLIDAYS_2025_2026 } from "./employees";
import * as XLSX from "xlsx";

// Helper function to format date as MM/DD/YYYY
function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// Helper function to check if a date is a Sunday
function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

// Helper function to check if a date is a holiday
function isHoliday(date: Date): boolean {
  return HOLIDAYS_2025_2026.some(
    (holiday) =>
      holiday.getFullYear() === date.getFullYear() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getDate() === date.getDate()
  );
}

// Helper function to check if a date is a work day
function isWorkDay(date: Date): boolean {
  return !isSunday(date) && !isHoliday(date);
}

// Helper function to round hours to nearest 0.25
function roundToQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

// Helper function to generate random hours for an employee
function generateHours(employee: Employee): number {
  const range = employee.maxHours - employee.minHours;
  const randomHours = employee.minHours + Math.random() * range;
  return roundToQuarter(randomHours);
}

// Helper function to get the start of a week (Monday)
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, otherwise go to Monday
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

// Calculate payroll details
function calculatePayroll(
  hours: number,
  hourlyRate: number,
  withholdingRate: number
): { grossPay: number; withholdings: number; netPay: number } {
  const grossPay = parseFloat((hours * hourlyRate).toFixed(2));
  const withholdings = parseFloat((grossPay * withholdingRate).toFixed(2));
  const netPay = parseFloat((grossPay - withholdings).toFixed(2));

  return { grossPay, withholdings, netPay };
}

export function generateTimeReport(
  employees: Employee[],
  options: GenerationOptions
): TimeEntry[] {
  const entries: TimeEntry[] = [];
  const weeklyHours = new Map<string, Map<string, number>>(); // week -> employee -> hours
  const weeklyDays = new Map<string, Map<string, number>>(); // week -> employee -> days worked

  // Iterate through each day in the range
  const currentDate = new Date(options.startDate);
  const endDate = new Date(options.endDate);

  while (currentDate <= endDate) {
    // Skip non-work days
    if (!isWorkDay(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const dateStr = formatDate(currentDate);
    const weekStart = getWeekStart(currentDate);

    // Process each employee
    for (const employee of employees) {
      // Initialize weekly tracking for this week if needed
      if (!weeklyHours.has(weekStart)) {
        weeklyHours.set(weekStart, new Map());
        weeklyDays.set(weekStart, new Map());
      }

      const employeeWeekHours = weeklyHours.get(weekStart)!;
      const employeeWeekDays = weeklyDays.get(weekStart)!;

      // Get current week's hours and days for this employee
      const currentWeekHours = employeeWeekHours.get(employee.name) || 0;
      const currentWeekDays = employeeWeekDays.get(employee.name) || 0;

      // Check part-time limits
      if (employee.isPartTime) {
        if (
          employee.weeklyHourLimit &&
          currentWeekHours >= employee.weeklyHourLimit
        ) {
          continue; // Skip this employee, they've hit their hour limit
        }
        if (
          employee.weeklyDayLimit &&
          currentWeekDays >= employee.weeklyDayLimit
        ) {
          continue; // Skip this employee, they've hit their day limit
        }
      }

      // Determine if employee works this day
      if (Math.random() < employee.workProbability) {
        let hours = generateHours(employee);

        // For part-time employees, make sure we don't exceed weekly limit
        if (employee.isPartTime && employee.weeklyHourLimit) {
          const remainingHours = employee.weeklyHourLimit - currentWeekHours;
          if (hours > remainingHours) {
            hours = roundToQuarter(remainingHours);
          }
        }

        // Only create entry if hours > 0
        if (hours > 0) {
          const { grossPay, withholdings, netPay } = calculatePayroll(
            hours,
            employee.hourlyRate,
            options.witholdingRate
          );

          entries.push({
            date: dateStr,
            employeeName: employee.name,
            hoursWorked: hours,
            hourlyRate: employee.hourlyRate,
            grossPay,
            withholdings,
            netPay,
          });

          // Update weekly tracking
          employeeWeekHours.set(employee.name, currentWeekHours + hours);
          employeeWeekDays.set(employee.name, currentWeekDays + 1);
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort entries by date, then by employee name
  entries.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.employeeName.localeCompare(b.employeeName);
  });

  return entries;
}

export function generateCSV(entries: TimeEntry[]): string {
  const headers = [
    "Date",
    "Employee Name",
    "Hours Worked",
    "Hourly Rate",
    "Gross Pay",
    "Withholdings",
    "Net Pay",
  ];

  const rows = entries.map((entry) => [
    entry.date,
    entry.employeeName,
    entry.hoursWorked.toFixed(2),
    entry.hourlyRate.toFixed(2),
    entry.grossPay.toFixed(2),
    entry.withholdings.toFixed(2),
    entry.netPay.toFixed(2),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadExcel(entries: TimeEntry[], filename: string): void {
  // Prepare data for Excel
  const data = entries.map((entry) => ({
    Date: entry.date,
    "Employee Name": entry.employeeName,
    "Hours Worked": entry.hoursWorked,
    "Hourly Rate": entry.hourlyRate,
    "Gross Pay": entry.grossPay,
    Withholdings: entry.withholdings,
    "Net Pay": entry.netPay,
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 12 }, // Date
    { wch: 20 }, // Employee Name
    { wch: 13 }, // Hours Worked
    { wch: 12 }, // Hourly Rate
    { wch: 12 }, // Gross Pay
    { wch: 13 }, // Withholdings
    { wch: 12 }, // Net Pay
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Time Report");

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, filename);
}
