export interface ExpenseRow {
  expenseSubmitted: string;
  date: string;
  receipt: string;
  description: string;
  cardMember: string;
  accountNumber: string;
  amount: number;
  extendedDetails: string;
  appearsOnStatement: string;
  address: string;
  cityState: string;
  zipCode: string;
  country: string;
  reference: string;
  category: string;
}

export interface EmployeeExpenses {
  name: string;
  missingExpenses: ExpenseRow[];
}
