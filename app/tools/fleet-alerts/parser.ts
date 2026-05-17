import * as XLSX from "xlsx";

export const ALERT_TYPES = {
  speeding: "Speeding Alert",
  harshBraking: "Harsh Braking",
} as const;

export type AlertCategory = keyof typeof ALERT_TYPES;

export interface AlertDetail {
  date: string;
  location: string;
  description: string;
}

export interface VehicleAlertSummary {
  vehicle: string;
  speeding: number;
  harshBraking: number;
  total: number;
  details: {
    speeding: AlertDetail[];
    harshBraking: AlertDetail[];
  };
}

interface AlertRow {
  "Tracker Name": string;
  Type: string;
  Date: string;
  Location: string;
  Description: string;
}

const TRACKED_TYPES = new Set<string>(Object.values(ALERT_TYPES));

export function parseAlertsFile(file: File): Promise<VehicleAlertSummary[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: AlertRow[] = XLSX.utils.sheet_to_json(sheet);

        const buckets: Record<string, { speeding: AlertDetail[]; harshBraking: AlertDetail[] }> = {};

        for (const row of rows) {
          const vehicle = row["Tracker Name"]?.trim();
          const type = row["Type"]?.trim();
          if (!vehicle || !TRACKED_TYPES.has(type)) continue;

          if (!buckets[vehicle]) {
            buckets[vehicle] = { speeding: [], harshBraking: [] };
          }

          const detail: AlertDetail = {
            date: String(row["Date"] ?? "").trim(),
            location: String(row["Location"] ?? "").trim(),
            description: String(row["Description"] ?? "").trim(),
          };

          if (type === ALERT_TYPES.speeding) buckets[vehicle].speeding.push(detail);
          else if (type === ALERT_TYPES.harshBraking) buckets[vehicle].harshBraking.push(detail);
        }

        const summaries: VehicleAlertSummary[] = Object.entries(buckets).map(
          ([vehicle, d]) => ({
            vehicle,
            speeding: d.speeding.length,
            harshBraking: d.harshBraking.length,
            total: d.speeding.length + d.harshBraking.length,
            details: d,
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
