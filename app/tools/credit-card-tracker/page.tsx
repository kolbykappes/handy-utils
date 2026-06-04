"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { Transaction, EntityType, SavePayload } from "./types";

const ENTITY_STYLES: Record<EntityType, string> = {
  MTM: "bg-green-700 text-white",
  "MTM-Me": "bg-green-500 text-white",
  EG: "bg-purple-600 text-white",
  Kory: "bg-blue-600 text-white",
  Me: "bg-red-600 text-white",
};

const ENTITY_ROW_STYLES: Record<EntityType, string> = {
  MTM: "border-l-4 border-green-600 bg-green-50 dark:bg-green-950/30",
  "MTM-Me": "border-l-4 border-green-400 bg-green-50/70 dark:bg-green-950/20",
  EG: "border-l-4 border-purple-400 bg-purple-50 dark:bg-purple-950/30",
  Kory: "border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-950/30",
  Me: "border-l-4 border-red-400 bg-red-50 dark:bg-red-950/30",
};

const CARD_STYLES: Record<string, string> = {
  MTM: "border-green-500 dark:border-green-600",
  "MTM-Me": "border-green-300 dark:border-green-500",
  EG: "border-purple-300 dark:border-purple-700",
  Kory: "border-blue-300 dark:border-blue-700",
  Me: "border-red-300 dark:border-red-700",
  unassigned: "border-amber-300 dark:border-amber-700",
};

const ENTITY_HEX: Record<string, string> = {
  Me: "#dc2626",
  EG: "#9333ea",
  MTM: "#15803d",
  "MTM-Me": "#4ade80",
  Kory: "#2563eb",
  Unassigned: "#d97706",
};

const ENTITY_KEYS = ["Me", "EG", "MTM", "MTM-Me", "Kory", "unassigned"] as const;
const CHART_KEYS = ["Me", "EG", "MTM", "MTM-Me", "Kory", "Unassigned"] as const;
const ENTITY_BUTTONS = ["Me", "EG", "MTM", "MTM-Me", "Kory"] as EntityType[];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const fmtDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

type PendingChange = Partial<Pick<SavePayload, "entity" | "notes" | "dateExpensed" | "datePaid">>;
type EffectiveRow = Transaction & PendingChange;

export default function CreditCardTracker() {
  const [isLocal, setIsLocal] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pending, setPending] = useState<Map<number, PendingChange>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState<"all" | EntityType | "unassigned">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showPayments, setShowPayments] = useState(false);
  const [amountFilter, setAmountFilter] = useState<"all" | "under25" | "25to100" | "over100">("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [showChart, setShowChart] = useState(false);
  const [bulkExpensedDate, setBulkExpensedDate] = useState("");
  const [bulkPaidDate, setBulkPaidDate] = useState("");

  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const host = window.location.hostname;
    setIsLocal(host === "localhost" || host === "127.0.0.1");
  }, []);

  useEffect(() => {
    if (!isLocal) return;
    fetch("/api/credit-card-tracker")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTransactions(data.transactions);
        if (data.transactions.length > 0) {
          const months = Array.from(
            new Set<string>(data.transactions.map((t: Transaction) => t.date.substring(0, 7)))
          );
          months.sort().reverse();
          setMonthFilter(months[0]);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isLocal]);

  useEffect(() => {
    document.title = "Handy Utils - 5179";
  }, []);

  // Auto-save with 1.5s debounce
  useEffect(() => {
    if (pending.size === 0) return;
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const updates: SavePayload[] = [];
        for (const [rowIndex, changes] of pending.entries()) {
          const orig = transactions.find((t) => t.rowIndex === rowIndex)!;
          const eff = { ...orig, ...changes };
          updates.push({
            rowIndex,
            entity: eff.entity ?? null,
            debit: orig.debit,
            notes: eff.notes ?? "",
            dateExpensed: eff.dateExpensed ?? null,
            datePaid: eff.datePaid ?? null,
          });
        }
        const res = await fetch("/api/credit-card-tracker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setTransactions((prev) =>
          prev.map((t) => {
            const changes = pending.get(t.rowIndex);
            return changes ? { ...t, ...changes } : t;
          })
        );
        setPending(new Map());
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
        setSaveStatus("error");
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // Keep scrollMargin in sync after every render — prevents offset drift when filters change
  useLayoutEffect(() => {
    if (tbodyRef.current) {
      const m = tbodyRef.current.getBoundingClientRect().top + window.scrollY;
      setScrollMargin((prev) => (prev === m ? prev : m));
    }
  });

  // Single memoized effective state map — O(1) lookup per row instead of N calls
  const effectiveMap = useMemo(() => {
    const map = new Map<number, EffectiveRow>();
    for (const t of transactions) {
      const changes = pending.get(t.rowIndex);
      map.set(t.rowIndex, changes ? { ...t, ...changes } : t);
    }
    return map;
  }, [transactions, pending]);

  const availableMonths = useMemo(() =>
    Array.from(new Set<string>(transactions.map((t) => t.date.substring(0, 7)))).sort().reverse(),
  [transactions]);


  const chartData = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {};
    for (const t of transactions) {
      if (t.debit === null) continue;
      const month = t.date.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = { Me: 0, EG: 0, MTM: 0, "MTM-Me": 0, Kory: 0, Unassigned: 0 };
      const e = effectiveMap.get(t.rowIndex)!;
      const key = e.entity ?? "Unassigned";
      byMonth[month][key] = (byMonth[month][key] ?? 0) + (t.debit ?? 0);
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({ month: fmtMonth(month), ...vals }));
  }, [transactions, effectiveMap]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (monthFilter && !t.date.startsWith(monthFilter)) return false;
      const isPayment = t.debit === null && t.credit !== null;
      if (!showPayments && isPayment) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (amountFilter !== "all" && t.debit !== null) {
        if (amountFilter === "under25" && t.debit >= 25) return false;
        if (amountFilter === "25to100" && (t.debit < 25 || t.debit >= 100)) return false;
        if (amountFilter === "over100" && t.debit < 100) return false;
      }
      if (paidFilter !== "all" && !isPayment) {
        const e = effectiveMap.get(t.rowIndex)!;
        if (paidFilter === "paid" && !e.datePaid) return false;
        if (paidFilter === "unpaid" && e.datePaid) return false;
      }
      if (entityFilter !== "all") {
        const e = effectiveMap.get(t.rowIndex)!;
        if (entityFilter === "unassigned") return !isPayment && e.entity == null;
        return e.entity === entityFilter;
      }
      return true;
    });
  }, [transactions, effectiveMap, monthFilter, entityFilter, search, showPayments, amountFilter, paidFilter]);

  // Summary card totals — driven by the same filtered set the table shows
  const totals = useMemo(() => {
    const result = { MTM: 0, "MTM-Me": 0, EG: 0, Kory: 0, Me: 0, unassigned: 0, total: 0 };
    const counts = { MTM: 0, "MTM-Me": 0, EG: 0, Kory: 0, Me: 0, unassigned: 0 };
    for (const t of filtered) {
      if (t.debit === null) continue;
      const e = effectiveMap.get(t.rowIndex)!;
      const amt = t.debit;
      result.total += amt;
      const key = (e.entity ?? "unassigned") as keyof typeof counts;
      result[key] += amt;
      counts[key]++;
    }
    return { ...result, counts };
  }, [filtered, effectiveMap]);

  // Pre-compute footer totals from filtered (already memoized)
  const filteredTotals = useMemo(() => ({
    charges: filtered.filter((t) => t.debit !== null).length,
    payments: filtered.filter((t) => t.credit !== null).length,
    total: filtered.reduce((s, t) => s + (t.debit ?? 0), 0),
  }), [filtered]);

  const rowVirtualizer = useWindowVirtualizer({
    count: filtered.length,
    estimateSize: () => 41,
    overscan: 10,
    scrollMargin,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start - scrollMargin : 0;
  const paddingBottom = virtualItems.length > 0 ? totalVirtualSize - virtualItems[virtualItems.length - 1].end : 0;

  const update = (rowIndex: number, field: keyof PendingChange, value: unknown) => {
    setPending((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, { ...(next.get(rowIndex) ?? {}), [field]: value });
      return next;
    });
  };

  const exportXLSX = async () => {
    const rows = filtered.map((t) => {
      const e = effectiveMap.get(t.rowIndex)!;
      return {
        date: t.date,
        description: t.description,
        amount: t.debit ?? (t.credit ? -Math.abs(t.credit) : null),
        notes: e.notes ?? "",
      };
    });
    const res = await fetch("/api/credit-card-tracker/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows,
        entity: entityFilter === "all" ? null : entityFilter,
        monthLabel: monthFilter ? fmtMonth(monthFilter) : "Year to Date",
      }),
    });
    if (!res.ok) {
      setError("Excel export failed");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `expenses-5179-${entityFilter === "all" ? "all" : entityFilter}-${monthFilter || "ytd"}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const applyBulk = (field: "dateExpensed" | "datePaid", date: string) => {
    if (!date) return;
    setPending((prev) => {
      const next = new Map(prev);
      for (const t of filtered) {
        if (t.debit === null) continue; // skip payment rows
        next.set(t.rowIndex, { ...(next.get(t.rowIndex) ?? {}), [field]: date });
      }
      return next;
    });
  };

  if (isLocal === null) return null;

  if (!isLocal) {
    return (
      <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Local Only</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            This tool reads and writes a file on your local machine. Run the app
            locally at <span className="font-mono text-slate-700 dark:text-slate-300">localhost:3000</span> to use it.
          </p>
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Loading transactions…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm mb-4">
            ← Back to Home
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-1 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Credit Card Tracker
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                5179 Card · Categorize and track expenses by entity
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {saveStatus === "saving" && <span className="text-sm text-slate-400 dark:text-slate-500">Saving…</span>}
              {saveStatus === "saved" && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved</span>}
              {saveStatus === "error" && <span className="text-sm text-red-600 dark:text-red-400">Save failed</span>}

              {/* Bulk expensed */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">Bulk expensed:</span>
                <input
                  type="date"
                  value={bulkExpensedDate}
                  onChange={(e) => setBulkExpensedDate(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <button
                  onClick={() => applyBulk("dateExpensed", bulkExpensedDate)}
                  disabled={!bulkExpensedDate}
                  className="px-2.5 py-1.5 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  Apply
                </button>
              </div>

              {/* Bulk paid */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">Bulk paid:</span>
                <input
                  type="date"
                  value={bulkPaidDate}
                  onChange={(e) => setBulkPaidDate(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <button
                  onClick={() => applyBulk("datePaid", bulkPaidDate)}
                  disabled={!bulkPaidDate}
                  className="px-2.5 py-1.5 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  Apply
                </button>
              </div>

              <button
                onClick={() => setShowChart(true)}
                className="px-4 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors"
              >
                View Chart
              </button>
              <button
                onClick={exportXLSX}
                className="px-4 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Month selector */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium"
          >
            <option value="">Year to Date</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{fmtMonth(m)}</option>
            ))}
          </select>
          <span className="text-slate-400 dark:text-slate-500 text-sm">
            {monthFilter ? fmtMonth(monthFilter) : "All months"} · {filteredTotals.charges} charge{filteredTotals.charges !== 1 ? "s" : ""} · {fmt(totals.total)} total
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {ENTITY_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setEntityFilter(entityFilter === key ? "all" : key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${CARD_STYLES[key]} ${
                entityFilter === key
                  ? "bg-slate-100 dark:bg-slate-700 shadow-inner"
                  : "bg-white dark:bg-slate-800 hover:shadow-md"
              }`}
            >
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                {key === "unassigned" ? "Unassigned" : key}
              </div>
              <div className={`text-xl font-bold ${
                key === "unassigned" && totals.unassigned > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-900 dark:text-slate-100"
              }`}>
                {fmt(totals[key])}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {totals.counts[key]} transactions
              </div>
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 text-sm">
            {(["all", "Me", "EG", "MTM", "MTM-Me", "Kory", "unassigned"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setEntityFilter(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  entityFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {f === "all" ? "All" : f === "unassigned" ? "Unassigned" : f}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 text-sm">
            {([["all", "Any amount"], ["under25", "< $25"], ["25to100", "$25–$100"], ["over100", "$100+"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setAmountFilter(val)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  amountFilter === val
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 text-sm">
            {(["all", "unpaid", "paid"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setPaidFilter(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  paidFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {f === "all" ? "All" : f === "unpaid" ? "Unpaid" : "Paid"}
              </button>
            ))}
          </div>

          <div className="relative min-w-[120px] flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search description…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-3 py-1.5 pr-7 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPayments}
              onChange={(e) => setShowPayments(e.target.checked)}
              className="rounded"
            />
            Show payments
          </label>

          <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">
            {filtered.length} row{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table — overflow-clip preserves rounded corners without creating a scroll container */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-clip">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: 90 }} />
              <col />
              <col style={{ width: 90 }} />
              <col style={{ width: 260 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Date</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Description</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Amount</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Entity</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Notes</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Expensed</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Paid</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {paddingTop > 0 && <tr><td colSpan={7} style={{ height: paddingTop }} /></tr>}

                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                      No transactions match the current filters
                    </td>
                  </tr>
                ) : (
                  virtualItems.map((vRow) => {
                    const t = filtered[vRow.index];
                    const e = effectiveMap.get(t.rowIndex)!;
                    const isDirty = pending.has(t.rowIndex);
                    const isPayment = t.debit === null && t.credit !== null;

                    return (
                      <tr
                        key={t.rowIndex}
                        className={`${
                          isDirty
                            ? "bg-amber-50 dark:bg-amber-900/10"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        } transition-colors ${
                          e.entity && !isPayment ? ENTITY_ROW_STYLES[e.entity] : "border-l-4 border-transparent"
                        }`}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{fmtDate(t.date)}</span>
                          {isDirty && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />}
                        </td>
                        <td className={`px-3 py-2 leading-snug truncate ${e.entity && !isPayment ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-800 dark:text-slate-200"}`}>
                          {t.description}
                        </td>
                        <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                          {isPayment ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmt(Math.abs(t.credit!))}</span>
                          ) : t.debit !== null ? (
                            <span className="text-slate-900 dark:text-slate-100 font-medium">{fmt(t.debit)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isPayment ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              PAYMENT
                            </span>
                          ) : (
                            <div className="flex gap-1 flex-nowrap">
                              {ENTITY_BUTTONS.map((ent) => (
                                <button
                                  key={ent}
                                  onClick={() => update(t.rowIndex, "entity", e.entity === ent ? null : ent)}
                                  className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                                    e.entity === ent
                                      ? ENTITY_STYLES[ent]
                                      : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"
                                  }`}
                                >
                                  {ent}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={e.notes ?? ""}
                            onChange={(ev) => update(t.rowIndex, "notes", ev.target.value)}
                            placeholder="Add note…"
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 text-xs outline-none transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={e.dateExpensed ?? ""}
                            onClick={() => {
                              if (e.dateExpensed == null && bulkExpensedDate)
                                update(t.rowIndex, "dateExpensed", bulkExpensedDate);
                            }}
                            onChange={(ev) => update(t.rowIndex, "dateExpensed", ev.target.value || null)}
                            className="w-full px-1 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 bg-transparent focus:bg-white dark:focus:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs outline-none transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={e.datePaid ?? ""}
                            onClick={() => {
                              if (e.datePaid == null && bulkPaidDate)
                                update(t.rowIndex, "datePaid", bulkPaidDate);
                            }}
                            onChange={(ev) => update(t.rowIndex, "datePaid", ev.target.value || null)}
                            className="w-full px-1 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 bg-transparent focus:bg-white dark:focus:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs outline-none transition-colors"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}

              {paddingBottom > 0 && <tr><td colSpan={7} style={{ height: paddingBottom }} /></tr>}
            </tbody>
          </table>

          {/* Footer totals */}
          {filtered.length > 0 && (
            <div className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-3 flex items-center gap-4 text-sm">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {filteredTotals.charges} charge{filteredTotals.charges !== 1 ? "s" : ""}
                {filteredTotals.payments > 0 && ` · ${filteredTotals.payments} payment${filteredTotals.payments !== 1 ? "s" : ""}`}
              </span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100 ml-auto">
                {fmt(filteredTotals.total)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Modal */}
      {showChart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowChart(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Spending by Category — Month over Month
              </h2>
              <button
                onClick={() => setShowChart(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
            <div className="px-6 pt-6 pb-2">
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Legend />
                  {CHART_KEYS.map((key) => (
                    <Bar key={key} dataKey={key} fill={ENTITY_HEX[key]} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="px-6 pb-6">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 mt-4">
                Year to Date Totals
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {CHART_KEYS.map((key) => {
                  const total = chartData.reduce((sum, row) => sum + (((row as Record<string, unknown>)[key] as number) ?? 0), 0);
                  return (
                    <div
                      key={key}
                      className="rounded-xl p-3 text-center"
                      style={{ backgroundColor: ENTITY_HEX[key] + "18", borderLeft: `3px solid ${ENTITY_HEX[key]}` }}
                    >
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{key}</div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">{fmt(total)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
