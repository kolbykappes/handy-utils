export interface Employee {
  name: string;
  hourlyRate: number;
  role: string;
  workProbability: number; // Probability of working on any given day (0-1)
  minHours: number;
  maxHours: number;
  isPartTime?: boolean;
  weeklyHourLimit?: number;
  weeklyDayLimit?: number;
  disabled?: boolean;
}

export interface TimeEntry {
  date: string; // MM/DD/YYYY format
  employeeName: string;
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
  withholdings: number;
  netPay: number;
}

export interface Team {
  id: string;
  name: string;
  employees: Employee[];
}

export interface GenerationOptions {
  startDate: Date;
  endDate: Date;
  witholdingRate: number;
  customHolidays?: string[]; // Array of YYYY-MM-DD date strings
}
