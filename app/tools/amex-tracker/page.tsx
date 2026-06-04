"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { AmexTransaction, AmexCategory, AmexSavePayload } from "./types";

const CATEGORY_STYLES: Record<AmexCategory, string> = {
  MTM: "bg-green-700 text-white",
  Personal: "bg-blue-600 text-white",
};

const CATEGORY_ROW_STYLES: Record<AmexCategory, string> = {
  MTM: "border-l-4 border-green-600 bg-green-50 dark:bg-green-950/30",
  Personal: "border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-950/30",
};

const CARD_STYLES: Record<string, string> = {
  MTM: "border-green-500 dark:border-green-600",
  Personal: "border-blue-400 dark:border-blue-600",
  unassigned: "border-amber-300 dark:border-amber-700",
};

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
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

type PendingChange = Partial<{ category: AmexCategory | null; filed: boolean; notes: string | null }>;
type EffectiveRow = AmexTransaction & PendingChange;

/** Isolated notes input — local state prevents pending updates on every keystroke. */
function NotesCell({
  rowIndex,
  committedValue,
  onCommit,
}: {
  rowIndex: number;
  committedValue: string | null;
  onCommit: (rowIndex: number, value: string | null) => void;
}) {
  const [local, setLocal] = useState(committedValue ?? "");
  const prevRef = useRef(committedValue);
  useEffect(() => {
    if (committedValue !== prevRef.current) {
      prevRef.current = committedValue;
      setLocal(committedValue ?? "");
    }
  }, [committedValue]);
  return (
    <input
      type="text"
      value={local}
      onChange={(ev) => setLocal(ev.target.value)}
      onBlur={(ev) => onCommit(rowIndex, ev.target.value || null)}
      placeholder="Add note…"
      className="w-full px-2 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none bg-transparent focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 transition-colors"
    />
  );
}

export default function AmexTracker() {
  const [isLocal, setIsLocal] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<AmexTransaction[]>([]);
  const [pending, setPending] = useState<Map<number, PendingChange>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | AmexCategory | "unassigned">("all");
  const [filedFilter, setFiledFilter] = useState<"all" | "filed" | "unfiled">("all");
  const [amountFilter, setAmountFilter] = useState<"all" | "under25" | "25to100" | "over100">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Debounce search 300ms
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
    fetch("/api/amex-tracker")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTransactions(data.transactions);
        if (data.transactions.length > 0) {
          const months = Array.from(
            new Set<string>(
              data.transactions.map((t: AmexTransaction) => t.date.substring(0, 7))
            )
          );
          months.sort().reverse();
          setMonthFilter(months[0]);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isLocal]);

  useEffect(() => {
    document.title = "Handy Utils - Amex";
    const mq = window.matchMedia("(min-width: 1024px)");
    setShowNotes(mq.matches);
    const handler = (e: MediaQueryListEvent) => setShowNotes(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-save with 1.5s debounce
  useEffect(() => {
    if (pending.size === 0) return;
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const updates: AmexSavePayload[] = [];
        for (const [rowIndex, changes] of pending.entries()) {
          const orig = transactions.find((t) => t.rowIndex === rowIndex)!;
          const eff = { ...orig, ...changes };
          updates.push({
            rowIndex,
            category: eff.category ?? null,
            filed: eff.filed ?? false,
            notes: eff.notes ?? null,
          });
        }
        const res = await fetch("/api/amex-tracker", {
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

  // Keep scrollMargin current after every render
  useLayoutEffect(() => {
    if (tbodyRef.current) {
      const m = tbodyRef.current.getBoundingClientRect().top + window.scrollY;
      setScrollMargin((prev) => (prev === m ? prev : m));
    }
  });

  const effectiveMap = useMemo(() => {
    const map = new Map<number, EffectiveRow>();
    for (const t of transactions) {
      const changes = pending.get(t.rowIndex);
      map.set(t.rowIndex, changes ? { ...t, ...changes } : t);
    }
    return map;
  }, [transactions, pending]);

  const availableMonths = useMemo(
    () =>
      Array.from(
        new Set<string>(transactions.map((t) => t.date.substring(0, 7)))
      )
        .sort()
        .reverse(),
    [transactions]
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (monthFilter && !t.date.startsWith(monthFilter)) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (amountFilter !== "all") {
        if (amountFilter === "under25" && t.amount >= 25) return false;
        if (amountFilter === "25to100" && (t.amount < 25 || t.amount >= 100)) return false;
        if (amountFilter === "over100" && t.amount < 100) return false;
      }
      if (categoryFilter !== "all" || filedFilter !== "all") {
        const e = effectiveMap.get(t.rowIndex)!;
        if (categoryFilter !== "all") {
          if (categoryFilter === "unassigned" && e.category != null) return false;
          if (categoryFilter !== "unassigned" && e.category !== categoryFilter) return false;
        }
        if (filedFilter !== "all") {
          if (filedFilter === "filed" && !e.filed) return false;
          if (filedFilter === "unfiled" && e.filed) return false;
        }
      }
      return true;
    });
  }, [transactions, effectiveMap, monthFilter, categoryFilter, filedFilter, search, amountFilter]);

  const totals = useMemo(() => {
    const result = {
      MTM: { total: 0, filed: 0, unfiled: 0 },
      Personal: { total: 0, filed: 0, unfiled: 0 },
      unassigned: { total: 0, count: 0 },
      grandTotal: 0,
    };
    for (const t of filtered) {
      const e = effectiveMap.get(t.rowIndex)!;
      result.grandTotal += t.amount;
      if (e.category === "MTM") {
        result.MTM.total += t.amount;
        if (e.filed) result.MTM.filed++;
        else result.MTM.unfiled++;
      } else if (e.category === "Personal") {
        result.Personal.total += t.amount;
        if (e.filed) result.Personal.filed++;
        else result.Personal.unfiled++;
      } else {
        result.unassigned.total += t.amount;
        result.unassigned.count++;
      }
    }
    return result;
  }, [filtered, effectiveMap]);

  const rowVirtualizer = useWindowVirtualizer({
    count: filtered.length,
    estimateSize: () => 41,
    overscan: 10,
    scrollMargin,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start - scrollMargin : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalVirtualSize - virtualItems[virtualItems.length - 1].end
      : 0;

  const update = (rowIndex: number, field: keyof PendingChange, value: unknown) => {
    setPending((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, { ...(next.get(rowIndex) ?? {}), [field]: value });
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
            This tool reads and writes a file on your local machine. Run the app locally at{" "}
            <span className="font-mono text-slate-700 dark:text-slate-300">localhost:3000</span> to
            use it.
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
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm mb-4"
          >
            ← Back to Home
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-1 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AmEx Tracker
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                AmEx Business Card · Categorize charges and track expense filing status
              </p>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus === "saving" && (
                <span className="text-sm text-slate-400 dark:text-slate-500">Saving…</span>
              )}
              {saveStatus === "saved" && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved</span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-red-600 dark:text-red-400">Save failed</span>
              )}
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
              <option key={m} value={m}>
                {fmtMonth(m)}
              </option>
            ))}
          </select>
          <span className="text-slate-400 dark:text-slate-500 text-sm">
            {monthFilter ? fmtMonth(monthFilter) : "All months"} ·{" "}
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} ·{" "}
            {fmt(totals.grandTotal)} total
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {(["MTM", "Personal", "unassigned"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? "all" : key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${CARD_STYLES[key]} ${
                categoryFilter === key
                  ? "bg-slate-100 dark:bg-slate-700 shadow-inner"
                  : "bg-white dark:bg-slate-800 hover:shadow-md"
              }`}
            >
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                {key === "unassigned" ? "Unassigned" : key}
              </div>
              <div
                className={`text-xl font-bold mb-1 ${
                  key === "unassigned" && totals.unassigned.total > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {key === "unassigned"
                  ? fmt(totals.unassigned.total)
                  : fmt(totals[key].total)}
              </div>
              {key !== "unassigned" ? (
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {totals[key].filed} filed · {totals[key].unfiled} unfiled
                </div>
              ) : (
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {totals.unassigned.count} transaction{totals.unassigned.count !== 1 ? "s" : ""}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Category */}
          <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 text-sm">
            {(["all", "MTM", "Personal", "unassigned"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setCategoryFilter(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  categoryFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {f === "all" ? "All" : f === "unassigned" ? "Unassigned" : f}
              </button>
            ))}
          </div>

          {/* Filed */}
          <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 text-sm">
            {(["all", "unfiled", "filed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiledFilter(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  filedFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {f === "all" ? "All" : f === "unfiled" ? "Unfiled" : "Filed"}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 text-sm">
            {(
              [
                ["all", "Any $"],
                ["under25", "< $25"],
                ["25to100", "$25–$100"],
                ["over100", "$100+"],
              ] as const
            ).map(([val, label]) => (
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

          {/* Search */}
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
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">
            {filtered.length} row{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-clip">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: 85 }} />
              <col />
              <col style={{ width: 95 }} />
              <col style={{ width: 155 }} />
              <col style={{ width: 85 }} />
              {showNotes && <col style={{ width: 320 }} />}
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Date
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">
                  Description
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Amount
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">
                  Category
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">
                  Filed
                </th>
                {showNotes && (
                  <th className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">
                    Notes
                  </th>
                )}
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={showNotes ? 6 : 5} style={{ height: paddingTop }} />
                </tr>
              )}

              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={showNotes ? 6 : 5}
                    className="px-4 py-12 text-center text-slate-400 dark:text-slate-500"
                  >
                    No transactions match the current filters
                  </td>
                </tr>
              ) : (
                virtualItems.map((vRow) => {
                  const t = filtered[vRow.index];
                  const e = effectiveMap.get(t.rowIndex)!;
                  const isDirty = pending.has(t.rowIndex);

                  return (
                    <tr
                      key={t.rowIndex}
                      className={`${
                        isDirty
                          ? "bg-amber-50 dark:bg-amber-900/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      } transition-colors ${
                        e.category
                          ? CATEGORY_ROW_STYLES[e.category]
                          : "border-l-4 border-transparent"
                      }`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {fmtDate(t.date)}
                        </span>
                        {isDirty && (
                          <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 leading-snug truncate ${
                          e.category
                            ? "text-slate-900 dark:text-slate-100 font-medium"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {t.description}
                      </td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                        {fmt(t.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-nowrap">
                          {(["MTM", "Personal"] as AmexCategory[]).map((cat) => (
                            <button
                              key={cat}
                              onClick={() =>
                                update(t.rowIndex, "category", e.category === cat ? null : cat)
                              }
                              className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                                e.category === cat
                                  ? CATEGORY_STYLES[cat]
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => update(t.rowIndex, "filed", !e.filed)}
                          className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                            e.filed
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"
                          }`}
                        >
                          {e.filed ? "✓ Filed" : "File"}
                        </button>
                      </td>
                      {showNotes && (
                        <td className="px-3 py-2">
                          <NotesCell
                            rowIndex={t.rowIndex}
                            committedValue={e.notes}
                            onCommit={(rowIndex, value) => update(rowIndex, "notes", value)}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}

              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={showNotes ? 6 : 5} style={{ height: paddingBottom }} />
                </tr>
              )}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-3 flex items-center gap-4 text-sm">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
              </span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100 ml-auto">
                {fmt(totals.grandTotal)}
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
