export interface AmexTransaction {
  rowIndex: number;
  date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number; // positive = charge; refunds/credits are excluded
  category: "MTM" | "Personal" | null;
  filed: boolean;
  notes: string | null;
}

export type AmexCategory = "MTM" | "Personal";

export interface AmexSavePayload {
  rowIndex: number;
  category: AmexCategory | null;
  filed: boolean;
  notes: string | null;
}
