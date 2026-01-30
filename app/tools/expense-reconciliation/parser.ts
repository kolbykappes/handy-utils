import * as XLSX from "xlsx";
import { ExpenseRow, EmployeeExpenses } from "./types";

// Employee sheets are between "Curt" and "Paul" (inclusive)
const EMPLOYEE_SHEET_START = "Curt";
const EMPLOYEE_SHEET_END = "Paul";

export function parseExpenseFile(file: File): Promise<EmployeeExpenses[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });

        const employeeExpenses: EmployeeExpenses[] = [];

        // Find the range of employee sheets
        const sheetNames = workbook.SheetNames;
        const startIndex = sheetNames.findIndex((name) =>
          name.trim().startsWith(EMPLOYEE_SHEET_START)
        );
        const endIndex = sheetNames.findIndex((name) =>
          name.trim().startsWith(EMPLOYEE_SHEET_END)
        );

        if (startIndex === -1 || endIndex === -1) {
          reject(
            new Error(
              `Could not find employee sheets. Expected sheets from "${EMPLOYEE_SHEET_START}" to "${EMPLOYEE_SHEET_END}"`
            )
          );
          return;
        }

        // Process each employee sheet
        for (let i = startIndex; i <= endIndex; i++) {
          const sheetName = sheetNames[i];
          const worksheet = workbook.Sheets[sheetName];
          const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
          });

          if (rawData.length < 2) continue; // Skip if no data rows

          const headers = rawData[0].map((h) =>
            String(h).toLowerCase().trim()
          );
          const expenseSubmittedIndex = headers.findIndex((h) =>
            h.includes("expense submitted")
          );

          if (expenseSubmittedIndex === -1) {
            console.warn(
              `Sheet "${sheetName}" missing "Expense submitted" column`
            );
            continue;
          }

          // Find column indices (handle variations in column order)
          const dateIndex = headers.findIndex((h) => h.includes("date"));
          const descriptionIndex = headers.findIndex((h) =>
            h.includes("description")
          );
          const amountIndex = headers.findIndex((h) => h.includes("amount"));
          const extendedDetailsIndex = headers.findIndex((h) =>
            h.includes("extended details")
          );
          const receiptIndex = headers.findIndex((h) =>
            h.includes("receipt")
          );
          const cardMemberIndex = headers.findIndex((h) =>
            h.includes("card member")
          );
          const accountIndex = headers.findIndex((h) =>
            h.includes("account")
          );
          const appearsOnStatementIndex = headers.findIndex((h) =>
            h.includes("appears on")
          );
          const addressIndex = headers.findIndex((h) =>
            h.includes("address")
          );
          const cityStateIndex = headers.findIndex(
            (h) => h.includes("city") || h.includes("state")
          );
          const zipIndex = headers.findIndex((h) => h.includes("zip"));
          const countryIndex = headers.findIndex((h) =>
            h.includes("country")
          );
          const referenceIndex = headers.findIndex((h) =>
            h.includes("reference")
          );
          const categoryIndex = headers.findIndex((h) =>
            h.includes("category")
          );

          const missingExpenses: ExpenseRow[] = [];

          // Process data rows (skip header)
          for (let rowIndex = 1; rowIndex < rawData.length; rowIndex++) {
            const row = rawData[rowIndex];
            const expenseSubmitted = String(
              row[expenseSubmittedIndex] || ""
            ).toLowerCase();

            // Check if expense was not submitted
            if (expenseSubmitted === "no") {
              missingExpenses.push({
                expenseSubmitted: row[expenseSubmittedIndex] || "",
                date: row[dateIndex] || "",
                receipt: row[receiptIndex] || "",
                description: row[descriptionIndex] || "",
                cardMember: row[cardMemberIndex] || "",
                accountNumber: row[accountIndex] || "",
                amount: parseFloat(row[amountIndex]) || 0,
                extendedDetails: row[extendedDetailsIndex] || "",
                appearsOnStatement: row[appearsOnStatementIndex] || "",
                address: row[addressIndex] || "",
                cityState: row[cityStateIndex] || "",
                zipCode: row[zipIndex] || "",
                country: row[countryIndex] || "",
                reference: row[referenceIndex] || "",
                category: row[categoryIndex] || "",
              });
            }
          }

          // Only add if there are missing expenses
          if (missingExpenses.length > 0) {
            employeeExpenses.push({
              name: sheetName.trim(),
              missingExpenses,
            });
          }
        }

        resolve(employeeExpenses);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsBinaryString(file);
  });
}

export function formatEmailBody(employeeName: string, expenses: ExpenseRow[]): string {
  if (expenses.length === 0) {
    return `${employeeName} has no missing expenses.`;
  }

  let emailBody = `${employeeName}'s missing expenses:\n\n`;

  expenses.forEach((expense, index) => {
    emailBody += `${index + 1}. ${expense.date} - ${expense.description} - $${expense.amount.toFixed(2)}\n`;
    if (expense.extendedDetails) {
      emailBody += `   Extended: ${expense.extendedDetails}\n`;
    }
    emailBody += `\n`;
  });

  return emailBody;
}
