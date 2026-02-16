export interface ReleaseEntry {
  version: string;
  date: string; // YYYY-MM-DD
  changes: string[];
}

export interface ToolChangelog {
  id: string;
  name: string;
  icon: string;
  href: string;
  releases: ReleaseEntry[];
}

export const changelogs: ToolChangelog[] = [
  {
    id: "interest-rate",
    name: "Interest Rate Calculator",
    icon: "💰",
    href: "/calculators/interest-rate",
    releases: [
      {
        version: "1.2",
        date: "2026-01-17",
        changes: [
          "Added calculation history with persistent storage",
        ],
      },
      {
        version: "1.1",
        date: "2026-01-17",
        changes: [
          "Added number formatting for currency and percentages",
          "Improved error handling and input validation",
        ],
      },
      {
        version: "1.0",
        date: "2026-01-17",
        changes: [
          "Initial release",
          "Calculate interest rate, monthly payment, principal, or loan term",
          "Solve for any one variable given the other three",
        ],
      },
    ],
  },
  {
    id: "time-report",
    name: "Time Report Generator",
    icon: "📊",
    href: "/calculators/time-report",
    releases: [
      {
        version: "1.3",
        date: "2026-02-12",
        changes: [
          "Fixed employee editor: new employees added to top of list",
          "Fixed blank name handling in employee editor",
          "Fixed rate field no longer snapping to zero on edit",
        ],
      },
      {
        version: "1.2",
        date: "2026-02-12",
        changes: [
          "Added sorting and disabling for employees",
          "Added holiday handling in generated reports",
          "Improved default date range selection",
        ],
      },
      {
        version: "1.1",
        date: "2026-01-18",
        changes: [
          "Added employee editor for customizable report generation",
          "Added data grid display and Excel export",
        ],
      },
      {
        version: "1.0",
        date: "2026-01-17",
        changes: [
          "Initial release",
          "Generate sample labor cost datasets for payroll testing",
        ],
      },
    ],
  },
  {
    id: "markdown-html",
    name: "Markdown ↔ HTML Converter",
    icon: "🔄",
    href: "/converters/markdown-html",
    releases: [
      {
        version: "1.6",
        date: "2026-01-19",
        changes: [
          "Added Clear and Sample buttons for quick reset",
        ],
      },
      {
        version: "1.5",
        date: "2026-01-19",
        changes: [
          "Replaced placeholder with simple markdown example on load",
        ],
      },
      {
        version: "1.4",
        date: "2026-01-19",
        changes: [
          "Fixed HTML copy to work correctly with email clients and Word",
        ],
      },
      {
        version: "1.3",
        date: "2026-01-19",
        changes: [
          "Improved UI layout for wider screens",
          "Better UX for side-by-side editing",
        ],
      },
      {
        version: "1.2",
        date: "2026-01-19",
        changes: [
          "Fixed cursor jumping in HTML editor",
          "Prevented constant refreshing during edits",
          "Made HTML preview fully editable with bidirectional sync",
          "Tightened line spacing in preview pane",
        ],
      },
      {
        version: "1.1",
        date: "2026-01-19",
        changes: [
          "Fixed line break rendering",
          "Fixed HTML editing sync issues",
        ],
      },
      {
        version: "1.0",
        date: "2026-01-18",
        changes: [
          "Initial release",
          "Bidirectional Markdown ↔ HTML converter",
          "Live preview with GitHub-flavored markdown support",
        ],
      },
    ],
  },
  {
    id: "expense-reconciliation",
    name: "Expense Reconciliation",
    icon: "💳",
    href: "/tools/expense-reconciliation",
    releases: [
      {
        version: "1.3",
        date: "2026-01-30",
        changes: [
          "Added automatic date range detection for leadership summary",
        ],
      },
      {
        version: "1.2",
        date: "2026-01-30",
        changes: [
          "Added customizable header text",
          "Added leadership summary email generation",
        ],
      },
      {
        version: "1.0",
        date: "2026-01-30",
        changes: [
          "Initial release",
          "Upload AmEx reconciliation spreadsheet",
          "Generate missing expense receipt email templates",
        ],
      },
    ],
  },
  {
    id: "weather-days",
    name: "Weather Days for Job Sites",
    icon: "🌤️",
    href: "/tools/weather-days",
    releases: [
      {
        version: "1.2",
        date: "2026-02-08",
        changes: [
          "Fixed weather API location query and default date range",
        ],
      },
      {
        version: "1.1",
        date: "2026-02-08",
        changes: [
          "Improved weather API error messages for clearer troubleshooting",
        ],
      },
      {
        version: "1.0",
        date: "2026-02-07",
        changes: [
          "Initial release",
          "Track historical weather data (temperature and precipitation) for job sites",
        ],
      },
    ],
  },
  {
    id: "bank-statement-checks",
    name: "Bank Statement Check Parser",
    icon: "🏦",
    href: "/tools/bank-statement-checks",
    releases: [
      {
        version: "1.3",
        date: "2026-02-16",
        changes: [
          "Added \"Analyze All Remaining\" button alongside batch processing",
          "Added session persistence with IndexedDB — save progress and resume later",
          "Saved sessions list with load and delete functionality",
        ],
      },
      {
        version: "1.2",
        date: "2026-02-16",
        changes: [
          "Added batch processing — analyze 5 checks at a time to control API costs",
          "Review AI results between batches before continuing",
        ],
      },
      {
        version: "1.1",
        date: "2026-02-16",
        changes: [
          "Replaced Tesseract.js OCR with Claude Vision API for dramatically better handwriting recognition",
          "Added server-side API route for secure API key handling (Vercel-ready)",
          "Increased check image render scale from 2x to 4x for higher quality",
          "Removed tesseract.js dependency",
        ],
      },
      {
        version: "1.0",
        date: "2026-02-16",
        changes: [
          "Initial release",
          "Parse check transactions from bank statement PDFs",
          "Extract and segment individual check images from PDF pages",
          "OCR check images to identify payee and memo fields",
          "Correlate OCR results with transaction data by check number",
          "Editable payee and memo fields with review flagging",
          "Export to Excel with check number, date, amount, payee, and memo",
        ],
      },
    ],
  },
];
