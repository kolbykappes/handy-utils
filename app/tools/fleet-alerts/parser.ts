import * as XLSX from "xlsx";

export const ALERT_TYPES = {
  speeding: "Speeding Alert",
  highSpeed: "High Speed Alert",
  harshBraking: "Harsh Braking",
  rapidAccel: "Rapid Acceleration",
} as const;

export type AlertCategory = keyof typeof ALERT_TYPES;

export interface VehicleAlertSummary {
  vehicle: string;
  speeding: number;
  highSpeed: number;
  harshBraking: number;
  rapidAccel: number;
  total: number;
}

interface AlertRow {
  "Tracker Name": string;
  Type: string;
}

const TRACKED_TYPES = new Set(Object.values(ALERT_TYPES));

export function parseAlertsFile(file: File): Promise<VehicleAlertSummary[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: AlertRow[] = XLSX.utils.sheet_to_json(sheet);

        const counts: Record<string, Record<AlertCategory, number>> = {};

        for (const row of rows) {
          const vehicle = row["Tracker Name"]?.trim();
          const type = row["Type"]?.trim();
          if (!vehicle || !TRACKED_TYPES.has(type)) continue;

          if (!counts[vehicle]) {
            counts[vehicle] = { speeding: 0, highSpeed: 0, harshBraking: 0, rapidAccel: 0 };
          }

          if (type === ALERT_TYPES.speeding) counts[vehicle].speeding++;
          else if (type === ALERT_TYPES.highSpeed) counts[vehicle].highSpeed++;
          else if (type === ALERT_TYPES.harshBraking) counts[vehicle].harshBraking++;
          else if (type === ALERT_TYPES.rapidAccel) counts[vehicle].rapidAccel++;
        }

        const summaries: VehicleAlertSummary[] = Object.entries(counts).map(
          ([vehicle, c]) => ({
            vehicle,
            ...c,
            total: c.speeding + c.highSpeed + c.harshBraking + c.rapidAccel,
          })
        );

        summaries.sort((a, b) => b.total - a.total);
        resolve(summaries);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to parse file"));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}
