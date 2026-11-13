"use client";

import { useState } from "react";
import Link from "next/link";

function randomId(prefix: string) {
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase();
  const num = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${hex}-${num}`;
}

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMoney(val: string) {
  const n = parseFloat(val);
  if (isNaN(n)) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

interface ReceiptData {
  merchant: string;
  merchantAddress: string;
  merchantEmail: string;
  billToName: string;
  billToEmail: string;
  date: string;
  description: string;
  amount: string;
  taxRate: string;
  cardLast4: string;
  invoiceNumber: string;
  receiptNumber: string;
}

function Receipt({ data }: { data: ReceiptData }) {
  const amount = parseFloat(data.amount) || 0;
  const taxRate = parseFloat(data.taxRate) || 0;
  const tax = amount * (taxRate / 100);
  const total = amount + tax;
  const dateStr = formatDate(data.date);

  return (
    <div
      id="receipt-printable"
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "14px",
        color: "#1a1a1a",
        maxWidth: "760px",
        margin: "0 auto",
        padding: "48px 48px 64px",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "bold" }}>Receipt</h1>
        <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1a1a1a", textAlign: "right" }}>
          {data.merchant}
        </div>
      </div>

      {/* Meta */}
      <div style={{ marginBottom: "32px", lineHeight: "1.8" }}>
        <div><strong>Invoice number</strong>&nbsp;&nbsp;{data.invoiceNumber}</div>
        <div><strong>Receipt number</strong>&nbsp;&nbsp;{data.receiptNumber}</div>
        <div><strong>Date paid</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{dateStr}</div>
      </div>

      {/* Vendor / Bill to */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "40px" }}>
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>{data.merchant}</div>
          {data.merchantAddress.split("\n").map((line, i) => (
            <div key={i} style={{ color: "#555" }}>{line}</div>
          ))}
          {data.merchantEmail && <div style={{ color: "#555" }}>{data.merchantEmail}</div>}
        </div>
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>Bill to</div>
          {data.billToName && <div style={{ color: "#555" }}>{data.billToName}</div>}
          {data.billToEmail && <div style={{ color: "#555" }}>{data.billToEmail}</div>}
        </div>
      </div>

      {/* Amount hero */}
      <div style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "32px", borderTop: "1px solid #e0e0e0", paddingTop: "24px" }}>
        {formatMoney(data.amount)} paid on {dateStr}
      </div>

      {/* Line item table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
            <th style={{ textAlign: "left", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Description</th>
            <th style={{ textAlign: "right", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Unit price</th>
            {taxRate > 0 && <th style={{ textAlign: "right", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Tax</th>}
            <th style={{ textAlign: "right", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
            <td style={{ padding: "12px 0" }}>{data.description}</td>
            <td style={{ textAlign: "right", padding: "12px 0" }}>1</td>
            <td style={{ textAlign: "right", padding: "12px 0" }}>{formatMoney(data.amount)}</td>
            {taxRate > 0 && <td style={{ textAlign: "right", padding: "12px 0" }}>{taxRate}%</td>}
            <td style={{ textAlign: "right", padding: "12px 0" }}>{formatMoney(data.amount)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "40px" }}>
        <table style={{ borderCollapse: "collapse", minWidth: "280px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 0", color: "#555" }}>Subtotal</td>
              <td style={{ textAlign: "right", padding: "4px 0 4px 48px" }}>{formatMoney(data.amount)}</td>
            </tr>
            {taxRate > 0 && (
              <>
                <tr>
                  <td style={{ padding: "4px 0", color: "#555" }}>Total excluding tax</td>
                  <td style={{ textAlign: "right", padding: "4px 0 4px 48px" }}>{formatMoney(data.amount)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", color: "#555" }}>Tax ({taxRate}% on {formatMoney(data.amount)})</td>
                  <td style={{ textAlign: "right", padding: "4px 0 4px 48px" }}>{formatMoney(String(tax))}</td>
                </tr>
              </>
            )}
            <tr style={{ borderTop: "1px solid #e0e0e0" }}>
              <td style={{ padding: "8px 0 4px", color: "#555" }}>Total</td>
              <td style={{ textAlign: "right", padding: "8px 0 4px 48px" }}>{formatMoney(String(total))}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", fontWeight: "bold" }}>Amount paid</td>
              <td style={{ textAlign: "right", padding: "4px 0 4px 48px", fontWeight: "bold" }}>{formatMoney(String(total))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment history */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>Payment history</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Payment method</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Date</th>
              <th style={{ textAlign: "right", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Amount paid</th>
              <th style={{ textAlign: "right", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Receipt number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "12px 0" }}>
                {data.cardLast4 ? `Mastercard - ${data.cardLast4}` : "Card on file"}
              </td>
              <td style={{ padding: "12px 0" }}>{dateStr}</td>
              <td style={{ textAlign: "right", padding: "12px 0" }}>{formatMoney(String(total))}</td>
              <td style={{ textAlign: "right", padding: "12px 0" }}>{data.receiptNumber}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "16px", color: "#aaa", fontSize: "12px", textAlign: "right" }}>
        Page 1 of 1
      </div>
    </div>
  );
}

const today = new Date().toISOString().split("T")[0];

const defaults: ReceiptData = {
  merchant: "",
  merchantAddress: "",
  merchantEmail: "",
  billToName: "",
  billToEmail: "",
  date: today,
  description: "",
  amount: "",
  taxRate: "0",
  cardLast4: "",
  invoiceNumber: randomId("INV"),
  receiptNumber: randomId("RCP"),
};

export default function ReceiptGenerator() {
  const [data, setData] = useState<ReceiptData>(defaults);
  const [showPreview, setShowPreview] = useState(false);

  const set = (field: keyof ReceiptData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData((prev) => ({ ...prev, [field]: e.target.value }));

  const handlePrint = () => {
    const printContent = document.getElementById("receipt-printable");
    if (!printContent) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${data.merchant}</title>
        <style>
          body { margin: 0; padding: 0; }
          @page { size: letter; margin: 0; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>${printContent.outerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const handleNewNumbers = () => {
    setData((prev) => ({
      ...prev,
      invoiceNumber: randomId("INV"),
      receiptNumber: randomId("RCP"),
    }));
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-sm";
  const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Nav */}
      <div className="max-w-7xl mx-auto px-8 pt-6 pb-2 flex justify-between">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">← Home</Link>
      </div>

      <div className="max-w-7xl mx-auto px-8 pb-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Receipt Generator
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Generate a test receipt PDF for expense testing
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            {/* Core */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold mb-4">Transaction</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" className={inputClass} value={data.date} onChange={set("date")} />
                </div>
                <div>
                  <label className={labelClass}>Amount ($)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" className={inputClass} value={data.amount} onChange={set("amount")} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Description / Line item</label>
                  <input type="text" placeholder="e.g. Pro subscription – Oct 2026" className={inputClass} value={data.description} onChange={set("description")} />
                </div>
                <div>
                  <label className={labelClass}>Tax rate (% — leave 0 for no tax)</label>
                  <input type="number" step="0.1" min="0" max="100" className={inputClass} value={data.taxRate} onChange={set("taxRate")} />
                </div>
                <div>
                  <label className={labelClass}>Card last 4 digits</label>
                  <input type="text" maxLength={4} placeholder="4298" className={inputClass} value={data.cardLast4} onChange={set("cardLast4")} />
                </div>
              </div>
            </div>

            {/* Merchant */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold mb-4">Merchant</h2>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Merchant name</label>
                  <input type="text" placeholder="Acme Corp" className={inputClass} value={data.merchant} onChange={set("merchant")} />
                </div>
                <div>
                  <label className={labelClass}>Address (one line per row)</label>
                  <textarea rows={3} placeholder={"123 Main St\nSan Francisco, CA 94105\nUnited States"} className={inputClass + " resize-none"} value={data.merchantAddress} onChange={set("merchantAddress")} />
                </div>
                <div>
                  <label className={labelClass}>Merchant email</label>
                  <input type="email" placeholder="support@example.com" className={inputClass} value={data.merchantEmail} onChange={set("merchantEmail")} />
                </div>
              </div>
            </div>

            {/* Bill to */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold mb-4">Bill to</h2>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Name / Organization</label>
                  <input type="text" placeholder="Acme Organization" className={inputClass} value={data.billToName} onChange={set("billToName")} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" placeholder="user@example.com" className={inputClass} value={data.billToEmail} onChange={set("billToEmail")} />
                </div>
              </div>
            </div>

            {/* Receipt numbers */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Receipt Numbers</h2>
                <button onClick={handleNewNumbers} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  🔀 Regenerate
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Invoice number</label>
                  <input type="text" className={inputClass} value={data.invoiceNumber} onChange={set("invoiceNumber")} />
                </div>
                <div>
                  <label className={labelClass}>Receipt number</label>
                  <input type="text" className={inputClass} value={data.receiptNumber} onChange={set("receiptNumber")} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                {showPreview ? "Hide Preview" : "Preview Receipt"}
              </button>
              <button
                onClick={handlePrint}
                disabled={!data.merchant || !data.amount}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                🖨️ Print / Save PDF
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            {showPreview && (
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-auto sticky top-6">
                <div className="bg-slate-100 px-4 py-2 text-xs text-slate-500 border-b border-slate-200 flex justify-between items-center">
                  <span>Preview</span>
                  <button onClick={handlePrint} className="text-blue-600 hover:underline font-medium">Print / Save PDF →</button>
                </div>
                <div className="scale-[0.75] origin-top-left w-[133%]">
                  <Receipt data={data} />
                </div>
              </div>
            )}
            {!showPreview && (
              <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-400">
                Fill in the form and click Preview Receipt
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden full-size receipt for printing */}
      <div className="hidden">
        <Receipt data={data} />
      </div>
    </main>
  );
}
