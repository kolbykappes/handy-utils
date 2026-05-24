export interface Transaction {
  rowIndex: number;
  date: string;
  description: string;
  debit: number | null;
  credit: number | null;
  entity: "MTM" | "MTM-Me" | "EG" | "Kory" | "Me" | null;
  notes: string;
  dateExpensed: string | null;
  datePaid: string | null;
}

export type EntityType = "MTM" | "MTM-Me" | "EG" | "Kory" | "Me";

export interface SavePayload {
  rowIndex: number;
  entity: EntityType | null;
  debit: number | null;
  notes: string;
  dateExpensed: string | null;
  datePaid: string | null;
}
