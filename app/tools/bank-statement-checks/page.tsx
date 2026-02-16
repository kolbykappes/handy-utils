"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import type { CheckRecord, ProcessingStatus } from "./types";
import { extractCheckTransactions, extractCheckImages } from "./pdf-parser";
import { ocrCheckImage } from "./ocr-engine";
import { downloadCheckExcel } from "./export";
import { saveSession, loadSession, listSessions, deleteSession } from "./storage";
import type { SavedSession } from "./storage";

const BATCH_SIZE = 5;

type PendingImage = { checkNumber: string; imageDataUrl: string };

export default function BankStatementChecks() {
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: "idle",
    message: "",
  });
  const [checkRecords, setCheckRecords] = useState<CheckRecord[]>([]);
  const [editingCell, setEditingCell] = useState<{
    row: number;
    field: "payee" | "memo";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterNeedsReview, setFilterNeedsReview] = useState(false);
  const [sortField, setSortField] = useState<"checkNumber" | "date" | "amount">("checkNumber");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedCheck, setSelectedCheck] = useState<{ image: string; rawText: string; checkNumber: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  // Batch processing state
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [totalImageCount, setTotalImageCount] = useState(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  // Session persistence
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionFileName, setSessionFileName] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [savedSessions, setSavedSessions] = useState<any[]>([]);

  // Load saved sessions list on mount
  useEffect(() => {
    listSessions().then(setSavedSessions).catch(() => {});
  }, []);

  // Step 1+2: Extract text and images from PDF, build initial records (no AI calls yet)
  const processStatement = useCallback(async (file: File) => {
    setError(null);
    setCheckRecords([]);
    setPendingImages([]);
    setAnalyzedCount(0);
    setTotalImageCount(0);
    abortRef.current = false;

    try {
      setStatus({
        stage: "extracting-text",
        message: "Loading PDF and extracting check data...",
      });
      const { transactions, pdfDoc } = await extractCheckTransactions(file);

      if (transactions.length === 0) {
        setError("No check transactions found in this PDF. Make sure it is a bank statement with check listings.");
        setStatus({ stage: "error", message: "No checks found" });
        return;
      }

      setStatus({
        stage: "rendering-pages",
        message: "Rendering check image pages...",
      });
      const checkImages = await extractCheckImages(pdfDoc, (current, total) => {
        setStatus({
          stage: "rendering-pages",
          currentCheck: current,
          totalChecks: total,
          message: `Extracting check images: ${current} of ${total}`,
        });
      });

      // Build initial records with no OCR data yet
      const imageMap = new Map<string, string>();
      for (const img of checkImages) {
        imageMap.set(img.checkNumber, img.imageDataUrl);
      }

      const records = transactions.map((t) => {
        const imgUrl = imageMap.get(t.checkNumber);
        return {
          checkNumber: t.checkNumber,
          date: t.date,
          amount: t.amount,
          payee: "",
          memo: "",
          ocrConfidence: 0,
          hasOCR: false,
          needsReview: true,
          imageDataUrl: imgUrl || "",
          rawOcrText: "",
        } as CheckRecord & { imageDataUrl?: string; rawOcrText?: string };
      });

      setCheckRecords(records);
      setPendingImages(checkImages.map((img) => ({ checkNumber: img.checkNumber, imageDataUrl: img.imageDataUrl })));
      setTotalImageCount(checkImages.length);
      setAnalyzedCount(0);
      setStatus({
        stage: "done",
        message: `Found ${records.length} checks with ${checkImages.length} images. Click "Analyze Next Batch" to start AI analysis (${BATCH_SIZE} at a time).`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Processing failed";
      setError(msg);
      setStatus({ stage: "error", message: msg });
    }
  }, []);

  // Process the next batch of check images through Claude Vision
  const processNextBatch = useCallback(async () => {
    if (pendingImages.length === 0 || isBatchProcessing) return;
    setIsBatchProcessing(true);
    abortRef.current = false;

    const batch = pendingImages.slice(0, BATCH_SIZE);
    const remaining = pendingImages.slice(BATCH_SIZE);

    try {
      for (let i = 0; i < batch.length; i++) {
        if (abortRef.current) break;

        const batchIdx = analyzedCount + i + 1;
        setStatus({
          stage: "ocr-processing",
          currentCheck: batchIdx,
          totalChecks: totalImageCount,
          message: `Analyzing check ${batchIdx} of ${totalImageCount} (Check #${batch[i].checkNumber})`,
        });

        const result = await ocrCheckImage(batch[i].imageDataUrl, batch[i].checkNumber);

        // Update the matching record in place
        setCheckRecords((prev) =>
          prev.map((r) => {
            if (r.checkNumber !== result.checkNumber) return r;
            return {
              ...r,
              payee: result.payee || r.payee,
              memo: result.memo || r.memo,
              ocrConfidence: result.confidence,
              hasOCR: true,
              needsReview: result.confidence < 70 || !result.payee,
              rawOcrText: result.rawText,
            } as CheckRecord & { imageDataUrl?: string; rawOcrText?: string };
          })
        );
      }

      const newAnalyzed = analyzedCount + batch.length;
      setAnalyzedCount(newAnalyzed);
      setPendingImages(remaining);

      if (remaining.length === 0) {
        setStatus({
          stage: "done",
          message: `All ${totalImageCount} check images analyzed.`,
        });
      } else {
        setStatus({
          stage: "done",
          message: `Analyzed ${newAnalyzed} of ${totalImageCount} images. ${remaining.length} remaining — review results then click "Analyze Next Batch".`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Batch processing failed";
      setError(msg);
      setStatus({ stage: "error", message: msg });
    } finally {
      setIsBatchProcessing(false);
    }
  }, [pendingImages, isBatchProcessing, analyzedCount, totalImageCount]);

  // Process ALL remaining check images
  const processAllRemaining = useCallback(async () => {
    if (pendingImages.length === 0 || isBatchProcessing) return;
    setIsBatchProcessing(true);
    abortRef.current = false;

    const allImages = [...pendingImages];

    try {
      for (let i = 0; i < allImages.length; i++) {
        if (abortRef.current) break;

        const batchIdx = analyzedCount + i + 1;
        setStatus({
          stage: "ocr-processing",
          currentCheck: batchIdx,
          totalChecks: totalImageCount,
          message: `Analyzing check ${batchIdx} of ${totalImageCount} (Check #${allImages[i].checkNumber})`,
        });

        const result = await ocrCheckImage(allImages[i].imageDataUrl, allImages[i].checkNumber);

        setCheckRecords((prev) =>
          prev.map((r) => {
            if (r.checkNumber !== result.checkNumber) return r;
            return {
              ...r,
              payee: result.payee || r.payee,
              memo: result.memo || r.memo,
              ocrConfidence: result.confidence,
              hasOCR: true,
              needsReview: result.confidence < 70 || !result.payee,
              rawOcrText: result.rawText,
            } as CheckRecord & { imageDataUrl?: string; rawOcrText?: string };
          })
        );
      }

      const finalCount = analyzedCount + allImages.length;
      setAnalyzedCount(finalCount);
      setPendingImages([]);
      setStatus({
        stage: "done",
        message: `All ${totalImageCount} check images analyzed.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Batch processing failed";
      setError(msg);
      setStatus({ stage: "error", message: msg });
    } finally {
      setIsBatchProcessing(false);
    }
  }, [pendingImages, isBatchProcessing, analyzedCount, totalImageCount]);

  // Save current work to IndexedDB
  const handleSave = useCallback(async () => {
    const id = sessionId || crypto.randomUUID();
    const session: SavedSession = {
      id,
      fileName: sessionFileName,
      savedAt: new Date().toISOString(),
      checkRecords: checkRecords as (CheckRecord & { imageDataUrl?: string; rawOcrText?: string })[],
      pendingImages,
      analyzedCount,
      totalImageCount,
    };
    await saveSession(session);
    setSessionId(id);
    const updated = await listSessions();
    setSavedSessions(updated);
    setStatus({ stage: "done", message: `Saved! ${pendingImages.length > 0 ? `${pendingImages.length} images still pending analysis.` : "All images analyzed."}` });
  }, [sessionId, sessionFileName, checkRecords, pendingImages, analyzedCount, totalImageCount]);

  // Restore a saved session
  const handleLoadSession = useCallback(async (id: string) => {
    const session = await loadSession(id);
    if (!session) return;
    setCheckRecords(session.checkRecords);
    setPendingImages(session.pendingImages);
    setAnalyzedCount(session.analyzedCount);
    setTotalImageCount(session.totalImageCount);
    setSessionId(session.id);
    setSessionFileName(session.fileName);
    setError(null);
    setStatus({
      stage: "done",
      message: `Loaded "${session.fileName}". ${session.pendingImages.length > 0 ? `${session.pendingImages.length} images still pending.` : "All images analyzed."}`,
    });
  }, []);

  // Delete a saved session
  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteSession(id);
    const updated = await listSessions();
    setSavedSessions(updated);
    if (sessionId === id) setSessionId(null);
  }, [sessionId]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setSessionId(crypto.randomUUID());
    setSessionFileName(file.name);
    processStatement(file);
  };

  const handleCellEdit = (index: number, field: "payee" | "memo", value: string) => {
    setCheckRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // If payee was filled in, may no longer need review
      if (field === "payee" && value.trim()) {
        updated[index].needsReview = false;
      }
      return updated;
    });
    setEditingCell(null);
  };

  const handleSort = (field: "checkNumber" | "date" | "amount") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedRecords = [...checkRecords]
    .filter((r) => !filterNeedsReview || r.needsReview)
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "checkNumber") {
        cmp = parseInt(a.checkNumber) - parseInt(b.checkNumber);
      } else if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        cmp = a.amount - b.amount;
      }
      return sortAsc ? cmp : -cmp;
    });

  const totalAmount = checkRecords.reduce((sum, r) => sum + r.amount, 0);
  const needsReviewCount = checkRecords.filter((r) => r.needsReview).length;

  const handleExport = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCheckExcel(checkRecords, `check-register-${dateStr}.xlsx`);
  };

  const progressPercent =
    status.totalChecks && status.currentCheck
      ? Math.round((status.currentCheck / status.totalChecks) * 100)
      : 0;

  const isProcessing = !["idle", "done", "error"].includes(status.stage);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>;
  };

  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-[1600px] mx-auto">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm mb-4"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Bank Statement Check Parser
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Upload a bank statement PDF to extract check data with OCR for payee and memo fields
        </p>

        {/* Upload Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="block text-sm text-slate-500 dark:text-slate-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                dark:file:bg-blue-900/30 dark:file:text-blue-400
                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50
                file:cursor-pointer disabled:opacity-50"
            />
            {isProcessing && (
              <button
                onClick={() => { abortRef.current = true; }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
                <span>{status.message}</span>
                {status.totalChecks ? <span>{progressPercent}%</span> : null}
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: status.stage === "extracting-text"
                      ? "10%"
                      : status.stage === "rendering-pages"
                      ? `${10 + progressPercent * 0.2}%`
                      : status.stage === "ocr-processing"
                      ? `${30 + progressPercent * 0.65}%`
                      : status.stage === "correlating"
                      ? "98%"
                      : "0%",
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Saved Sessions */}
        {savedSessions.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200 dark:border-slate-700 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Saved Sessions
            </h3>
            <div className="space-y-2">
              {savedSessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between gap-4 p-3 rounded-lg border transition-colors ${
                    sessionId === s.id
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600"
                      : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {s.fileName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(s.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                      at {new Date(s.savedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {" · "}
                      {s.analyzedCount}/{s.totalImageCount} analyzed
                      {s.totalChecks ? ` · ${s.totalChecks} checks` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadSession(s.id)}
                      disabled={isProcessing || isBatchProcessing}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      disabled={isProcessing || isBatchProcessing}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {checkRecords.length > 0 && (
          <>
            {/* Summary Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200 dark:border-slate-700 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Total Checks</span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {checkRecords.length}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Total Amount</span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Needs Review</span>
                    <p className={`text-xl font-bold ${needsReviewCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                      {needsReviewCount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pendingImages.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={processNextBatch}
                        disabled={isBatchProcessing}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {isBatchProcessing
                          ? "Analyzing..."
                          : `Analyze Next ${Math.min(BATCH_SIZE, pendingImages.length)}`}
                      </button>
                      <button
                        onClick={processAllRemaining}
                        disabled={isBatchProcessing}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {isBatchProcessing ? "..." : `Analyze All ${pendingImages.length}`}
                      </button>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {analyzedCount}/{totalImageCount} done
                      </span>
                    </div>
                  )}
                  {pendingImages.length === 0 && totalImageCount > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                      All images analyzed
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Save Progress
                  </button>
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterNeedsReview}
                      onChange={(e) => setFilterNeedsReview(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-600"
                    />
                    Show only needs review
                  </label>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Export to Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                      <th
                        className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                        onClick={() => handleSort("checkNumber")}
                      >
                        Check # <SortIcon field="checkNumber" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                        onClick={() => handleSort("date")}
                      >
                        Date <SortIcon field="date" />
                      </th>
                      <th
                        className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                        onClick={() => handleSort("amount")}
                      >
                        Amount <SortIcon field="amount" />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Payee <span className="text-xs font-normal text-slate-400">(click to edit)</span>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Memo <span className="text-xs font-normal text-slate-400">(click to edit)</span>
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        Confidence
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        Image
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((record, displayIdx) => {
                      // Find the actual index in the full array for editing
                      const actualIdx = checkRecords.findIndex(
                        (r) => r.checkNumber === record.checkNumber
                      );
                      return (
                        <tr
                          key={record.checkNumber}
                          className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                            record.needsReview ? "bg-amber-50/50 dark:bg-amber-900/10" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                            {record.checkNumber}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                            {record.date}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-800 dark:text-slate-200">
                            ${record.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Editable Payee Cell */}
                          <td
                            className="px-4 py-2.5 cursor-pointer"
                            onClick={() => {
                              if (editingCell?.row !== actualIdx || editingCell?.field !== "payee") {
                                setEditingCell({ row: actualIdx, field: "payee" });
                              }
                            }}
                          >
                            {editingCell?.row === actualIdx && editingCell?.field === "payee" ? (
                              <input
                                autoFocus
                                defaultValue={record.payee}
                                onBlur={(e) => handleCellEdit(actualIdx, "payee", e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                className="w-full px-2 py-1 border border-blue-400 rounded text-sm bg-white dark:bg-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <span className={record.payee ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500 italic"}>
                                {record.payee || "Click to edit"}
                              </span>
                            )}
                          </td>

                          {/* Editable Memo Cell */}
                          <td
                            className="px-4 py-2.5 cursor-pointer"
                            onClick={() => {
                              if (editingCell?.row !== actualIdx || editingCell?.field !== "memo") {
                                setEditingCell({ row: actualIdx, field: "memo" });
                              }
                            }}
                          >
                            {editingCell?.row === actualIdx && editingCell?.field === "memo" ? (
                              <input
                                autoFocus
                                defaultValue={record.memo}
                                onBlur={(e) => handleCellEdit(actualIdx, "memo", e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                className="w-full px-2 py-1 border border-blue-400 rounded text-sm bg-white dark:bg-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <span className={record.memo ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500 italic"}>
                                {record.memo || "Click to edit"}
                              </span>
                            )}
                          </td>

                          {/* Confidence Badge */}
                          <td className="px-4 py-2.5 text-center">
                            {record.hasOCR ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  record.ocrConfidence >= 80
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : record.ocrConfidence >= 50
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                {Math.round(record.ocrConfidence)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">No image</span>
                            )}
                          </td>

                          {/* View Image Button */}
                          <td className="px-4 py-2.5 text-center">
                            {(record as CheckRecord & { imageDataUrl?: string }).imageDataUrl ? (
                              <button
                                onClick={() => {
                                  const r = record as CheckRecord & { imageDataUrl?: string; rawOcrText?: string };
                                  setSelectedCheck({
                                    image: r.imageDataUrl || "",
                                    rawText: r.rawOcrText || "",
                                    checkNumber: r.checkNumber,
                                  });
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {sortedRecords.length === 0 && filterNeedsReview && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  All checks have been reviewed. Uncheck the filter to see all records.
                </div>
              )}
            </div>
          </>
        )}

        {/* Image + OCR Debug Modal */}
        {selectedCheck && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCheck(null)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 max-w-3xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Check #{selectedCheck.checkNumber}
                </h3>
                <button
                  onClick={() => setSelectedCheck(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl"
                >
                  &times;
                </button>
              </div>
              <img
                src={selectedCheck.image}
                alt={`Check #${selectedCheck.checkNumber}`}
                className="w-full rounded border border-slate-200 dark:border-slate-600 mb-4"
              />
              {selectedCheck.rawText && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    AI Response
                  </h4>
                  <pre className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-3 whitespace-pre-wrap font-mono text-slate-700 dark:text-slate-300 max-h-48 overflow-auto">
                    {selectedCheck.rawText}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status when done */}
        {status.stage === "done" && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            {status.message}
          </div>
        )}
      </div>
    </main>
  );
}
