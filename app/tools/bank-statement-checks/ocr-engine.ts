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

    const payee = extractPayee(lines);
    const memo = extractMemo(lines);

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
 * Extract payee from OCR lines.
 *
 * Check layout (top to bottom):
 *   - Drawer name/address (MTM Enterprises LLC, etc.)
 *   - Check number, date
 *   - "Pay to the order of: <PAYEE>"   or payee on the next line
 *   - Written dollar amount ("Two Hundred...")
 *   - Payee address (sometimes)
 *   - Memo/For line
 *   - Signature, MICR line
 *
 * Strategy: find the "Pay to" line, then grab the payee text from
 * that line or the following line(s) before we hit the dollar amount line.
 */
function extractPayee(lines: string[]): string {
  // Find the line index containing "pay to" or "order of"
  let payToIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/pay\s*to|order\s*of/i.test(lines[i])) {
      payToIdx = i;
      break;
    }
  }

  if (payToIdx >= 0) {
    const payToLine = lines[payToIdx];

    // Case 1: Payee is on the SAME line after "pay to the order of:"
    const inlineMatch = payToLine.match(
      /(?:pay\s*to\s*(?:the\s*)?(?:order\s*of)?|order\s*of)\s*[:\-.]?\s*(.+)/i
    );
    if (inlineMatch) {
      const candidate = cleanPayee(inlineMatch[1]);
      if (candidate.length > 2) {
        return candidate;
      }
    }

    // Case 2: Payee is on the NEXT line after "Pay to the order of:"
    if (payToIdx + 1 < lines.length) {
      const nextLine = lines[payToIdx + 1];
      // Make sure the next line isn't the dollar amount or other noise
      if (!isDollarAmountLine(nextLine) && !isNoiseLine(nextLine)) {
        const candidate = cleanPayee(nextLine);
        if (candidate.length > 2) {
          return candidate;
        }
      }
    }
  }

  // Fallback: look for lines that appear to be names/companies
  // between the top header and the dollar amount line
  const dollarLineIdx = lines.findIndex((l) => isDollarAmountLine(l));
  const searchEnd = dollarLineIdx > 0 ? dollarLineIdx : lines.length;

  // Skip the first ~2 lines (drawer info) and look for payee-like text
  for (let i = 2; i < searchEnd; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;
    if (/pay\s*to|order\s*of/i.test(line)) continue;

    const letterRatio = (line.match(/[a-zA-Z]/g) || []).length / line.length;
    if (letterRatio > 0.6 && line.length > 3 && line.length < 80) {
      return cleanPayee(line);
    }
  }

  return "";
}

/**
 * Clean up a raw payee string from OCR.
 */
function cleanPayee(raw: string): string {
  let payee = raw.trim();
  // Remove trailing dollar amounts like "$ 229.85" or "$229.85"
  payee = payee.replace(/\$\s*[\d,]+\.\d{2}.*$/, "").trim();
  // Remove trailing dates
  payee = payee.replace(/\d{1,2}\/\d{1,2}\/?\d{0,4}\s*$/, "").trim();
  // Remove trailing underscores, pipes, dashes (line artifacts)
  payee = payee.replace(/[|_\-]{3,}.*$/, "").trim();
  // Remove trailing asterisks (written amount markers)
  payee = payee.replace(/\*+.*$/, "").trim();
  // Remove leading special characters
  payee = payee.replace(/^[:\-.\s]+/, "").trim();
  return payee;
}

/**
 * Check if a line looks like a written dollar amount.
 * e.g. "Two Hundred Twenty-Nine And 85/100 Dollars"
 * or "**Two Hundred..."
 */
function isDollarAmountLine(line: string): boolean {
  return (
    /dollars?\b/i.test(line) ||
    /\b(hundred|thousand|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/i.test(line) ||
    /^\*{2,}/.test(line) ||
    /\d+\/100/.test(line)
  );
}

/**
 * Check if a line is noise we should skip when looking for payee.
 */
function isNoiseLine(line: string): boolean {
  const noisePatterns = [
    /first\s*national/i,
    /grayson/i,
    /morehead/i,
    /flemingsburg/i,
    /checking|savings|account/i,
    /deposit/i,
    /mtm\s*enterprises/i,
    /^\d{5,}/, // long numbers (account, routing, MICR)
    /^\$/, // dollar amounts
    /^\d{2}\/\d{2}/, // dates
    /^[\d\s.,]+$/, // only numbers
    /check\s*date/i,
    /^\d{4,5}$/, // check numbers
    /^[|_\-*=]{3,}$/, // line artifacts
  ];
  return noisePatterns.some((p) => p.test(line));
}

/**
 * Extract memo from OCR lines.
 * The memo/for line is near the bottom of the check.
 */
function extractMemo(lines: string[]): string {
  // Search from bottom up for "memo" or "for" lines
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const memoMatch = line.match(/(?:memo|for)\s*[:\-.]?\s*(.+)/i);
    if (memoMatch) {
      let memo = memoMatch[1].trim();
      // Clean up trailing MICR numbers, account numbers
      memo = memo.replace(/\d{5,}.*$/, "").trim();
      memo = memo.replace(/[|_\-]{3,}.*$/, "").trim();
      if (memo.length > 1 && memo.length < 100) {
        return memo;
      }
    }
  }

  return "";
}
