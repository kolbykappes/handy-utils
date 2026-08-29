export interface BmwTransaction {
  rowIndex: number;
  date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number; // positive charge amount
  memo: string; // raw transaction ID for dedup
  category: "EG" | "MTM" | "Personal" | null;
  filed: boolean;
  notes: string | null;
}

export type BmwCategory = "EG" | "MTM" | "Personal";

export interface BmwSavePayload {
  rowIndex: number;
  category: BmwCategory | null;
  filed: boolean;
  notes: string | null;
}
