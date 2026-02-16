import type { CheckImageOCR } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let worker: any = null;

export async function initOCR(): Promise<void> {
  const { createWorker } = await import("tesseract.js");
  worker = await createWorker("eng");
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/**
 * OCR a single check image and extract payee and memo.
 */
export async function ocrCheckImage(
  imageDataUrl: string,
  checkNumber: string
): Promise<CheckImageOCR> {
  if (!worker) {
    throw new Error("OCR not initialized. Call initOCR() first.");
  }

  try {
    const result = await worker.recognize(imageDataUrl);
    const fullText = result.data.text;
    const confidence = result.data.confidence;
    const lines = fullText
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const payee = extractPayee(lines, fullText);
    const memo = extractMemo(lines, fullText);

    return {
      checkNumber,
      payee,
      memo,
      confidence,
      imageDataUrl,
    };
  } catch {
    return {
      checkNumber,
      payee: "",
      memo: "",
      confidence: 0,
      imageDataUrl,
    };
  }
}

/**
 * Try to find the payee name from OCR text.
 */
function extractPayee(lines: string[], fullText: string): string {
  // Strategy 1: Look for "PAY TO" or "ORDER OF" pattern
  const payToPatterns = [
    /pay\s*to\s*(?:the\s*)?(?:order\s*of)?\s*[:\-]?\s*(.+)/i,
    /order\s*of\s*[:\-]?\s*(.+)/i,
  ];

  for (const pattern of payToPatterns) {
    const match = fullText.replace(/\n/g, " ").match(pattern);
    if (match) {
      let payee = match[1].trim();
      // Clean up trailing dollar amounts or check artifacts
      payee = payee.replace(/\$[\d,]+\.\d{2}.*$/, "").trim();
      payee = payee.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}.*$/, "").trim();
      payee = payee.replace(/[|_]{2,}.*$/, "").trim();
      if (payee.length > 2 && payee.length < 100) {
        return payee;
      }
    }
  }

  // Strategy 2: Look for a line that seems like a payee name
  const skipPatterns = [
    /first\s*national/i,
    /grayson/i,
    /checking/i,
    /deposit/i,
    /\d{5,}/,
    /^\$/,
    /^\d{2}\/\d{2}/,
    /^[\d\s.,]+$/,
    /memo|for:|date|dollars|pay to/i,
    /mtm\s*enterprises/i,
    /^\d{4,5}$/,
  ];

  for (const line of lines) {
    const isSkip = skipPatterns.some((p) => p.test(line));
    if (isSkip) continue;

    const letterRatio = (line.match(/[a-zA-Z]/g) || []).length / line.length;
    if (letterRatio > 0.5 && line.length > 3 && line.length < 80) {
      return line;
    }
  }

  return "";
}

/**
 * Try to find the memo line from OCR text.
 */
function extractMemo(_lines: string[], fullText: string): string {
  const memoPatterns = [/(?:memo|for)\s*[:\-]?\s*(.+)/i];

  for (const pattern of memoPatterns) {
    const match = fullText.replace(/\n/g, " ").match(pattern);
    if (match) {
      let memo = match[1].trim();
      memo = memo.replace(/\d{5,}.*$/, "").trim();
      memo = memo.replace(/[|_]{2,}.*$/, "").trim();
      if (memo.length > 1 && memo.length < 100) {
        return memo;
      }
    }
  }

  return "";
}
