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
      rawText: fullText,
      imageDataUrl,
    };
  } catch {
    return {
      checkNumber,
      payee: "",
      memo: "",
      confidence: 0,
      rawText: "",
      imageDataUrl,
    };
  }
}

/**
 * Extract payee from OCR lines.
 *
 * Check layout from actual First National Bank checks (top to bottom):
 *   - [M] logo, MTM ENTERPRISES LLC, address, phone
 *   - FIRST NATIONAL BANK, phone, website
 *   - Check number (top right), date (handwritten)
 *   - "PAY TO THE" (small stacked text on left margin)
 *   - "ORDER OF" (small stacked text, directly below PAY TO THE)
 *   - The payee name is handwritten on the LINE next to / after ORDER OF
 *   - Dollar amount "$ XXX.XX" on the right side of that same line
 *   - Written dollar amount line ("Three hundred fifty dollars")
 *   - Payee address block (sometimes, 1-3 lines)
 *   - MEMO line (bottom left)
 *   - Signature (bottom right)
 *   - MICR line (very bottom)
 *
 * OCR may produce "PAY TO THE" and "ORDER OF" as separate lines,
 * or combined on one line. The payee is the handwritten text that
 * appears on the same line as or right after "ORDER OF".
 */
function extractPayee(lines: string[]): string {
  // --- Strategy 1: Find "ORDER OF" line and extract payee after it ---
  // "PAY TO THE" and "ORDER OF" may be on separate lines
  // The payee is typically after "ORDER OF" on the same line, or on the next line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match "ORDER OF <payee>" on same line
    const orderOfMatch = line.match(/order\s*of\s*[:\-.]?\s*(.+)/i);
    if (orderOfMatch) {
      const candidate = cleanPayee(orderOfMatch[1]);
      if (candidate.length > 2) {
        return candidate;
      }
      // "ORDER OF" found but nothing useful after it - check next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!isDollarAmountLine(nextLine) && !isNoiseLine(nextLine)) {
          const candidate2 = cleanPayee(nextLine);
          if (candidate2.length > 2) {
            return candidate2;
          }
        }
      }
    }
  }

  // --- Strategy 2: Find "PAY TO" and look 1-2 lines after it ---
  // Sometimes OCR reads "PAY TO THE" on one line, "ORDER OF" on the next,
  // and the payee on the same line as ORDER OF or the line after
  for (let i = 0; i < lines.length; i++) {
    if (/pay\s*to/i.test(lines[i]) && !/order/i.test(lines[i])) {
      // "PAY TO THE" without "ORDER OF" - look at lines i+1 and i+2
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const line = lines[j];
        // Skip if this line is just "ORDER OF" by itself
        if (/^order\s*of\s*[:\-.]?\s*$/i.test(line)) continue;
        // Check if this line has "ORDER OF <payee>"
        const match = line.match(/order\s*of\s*[:\-.]?\s*(.+)/i);
        if (match) {
          const candidate = cleanPayee(match[1]);
          if (candidate.length > 2) return candidate;
          continue;
        }
        // Otherwise this might be the payee line itself
        if (!isDollarAmountLine(line) && !isNoiseLine(line) && !/^order/i.test(line)) {
          const candidate = cleanPayee(line);
          if (candidate.length > 2) return candidate;
        }
      }
    }

    // Also handle "PAY TO THE ORDER OF <payee>" all on one line
    const fullMatch = lines[i].match(
      /pay\s*to\s*(?:the\s*)?(?:order\s*of)\s*[:\-.]?\s*(.+)/i
    );
    if (fullMatch) {
      const candidate = cleanPayee(fullMatch[1]);
      if (candidate.length > 2) return candidate;
    }
  }

  // --- Strategy 3: Structural fallback ---
  // The payee is between the header block and the written dollar amount.
  // Find the dollar amount line and look at the 1-3 lines before it
  // for text that looks like a name/company.
  const dollarLineIdx = lines.findIndex((l) => isDollarAmountLine(l));
  if (dollarLineIdx > 2) {
    // Check the 1-3 lines immediately before the dollar amount line
    for (let i = dollarLineIdx - 1; i >= Math.max(0, dollarLineIdx - 3); i--) {
      const line = lines[i];
      if (isNoiseLine(line)) continue;
      if (/pay\s*to|order\s*of/i.test(line)) continue;

      const candidate = cleanPayee(line);
      const letterRatio =
        (candidate.match(/[a-zA-Z]/g) || []).length /
        Math.max(candidate.length, 1);
      if (letterRatio > 0.5 && candidate.length > 2 && candidate.length < 80) {
        return candidate;
      }
    }
  }

  // --- Strategy 4: Last resort ---
  // Look for any line with mostly letters that isn't header/noise
  const skipUntil = lines.findIndex(
    (l) => /pay|order|606|784|flemingsburg/i.test(l)
  );
  const startIdx = skipUntil >= 0 ? skipUntil + 1 : 3;
  const endIdx = dollarLineIdx > 0 ? dollarLineIdx : lines.length;

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;
    if (/pay\s*to|order\s*of/i.test(line)) continue;

    const candidate = cleanPayee(line);
    const letterRatio =
      (candidate.match(/[a-zA-Z]/g) || []).length /
      Math.max(candidate.length, 1);
    if (letterRatio > 0.5 && candidate.length > 2 && candidate.length < 80) {
      return candidate;
    }
  }

  return "";
}

/**
 * Clean up a raw payee string from OCR.
 */
function cleanPayee(raw: string): string {
  let payee = raw.trim();
  // Remove trailing dollar amounts like "$ 350 00" or "$3285.51" or "$ 3,285.51"
  payee = payee.replace(/\$\s*[\d,.\s]+\s*$/, "").trim();
  payee = payee.replace(/\$\s*[\d,]+\.\d{2}.*$/, "").trim();
  // Remove trailing dates (various formats: 9/22/25, 09/22/2025, 9-22-25)
  payee = payee.replace(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\s*$/, "").trim();
  // Remove trailing underscores, pipes, dashes (line artifacts)
  payee = payee.replace(/[|_]{2,}.*$/, "").trim();
  payee = payee.replace(/\-{3,}.*$/, "").trim();
  // Remove trailing asterisks (written amount markers)
  payee = payee.replace(/\*+.*$/, "").trim();
  // Remove leading special characters
  payee = payee.replace(/^[:\-.\s*]+/, "").trim();
  // Remove trailing "DOLLARS" if it leaked in
  payee = payee.replace(/\s*DOLLARS?\s*$/i, "").trim();
  return payee;
}

/**
 * Check if a line looks like a written dollar amount.
 */
function isDollarAmountLine(line: string): boolean {
  return (
    /dollars?\s*$/i.test(line) ||
    /dollars?\s*[=\-*]+/i.test(line) ||
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
    /fnbgrayson/i,
    /www\./i,
    /\(\d{3}\)/,           // phone numbers like (800)
    /\d{3}[\-\.]\d{3}/,   // phone numbers like 606-784
    /checking|savings|account/i,
    /deposit/i,
    /mtm\s*enterprises/i,
    /^\d{5,}/,             // long numbers (account, routing, MICR)
    /^[#*]\d{4,}/,         // MICR line fragments
    /^\$/,                 // dollar amounts
    /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/, // dates
    /^[\d\s.,]+$/,         // only numbers
    /check\s*date/i,
    /^\d{4,5}$/,           // check numbers
    /^[|_\-*=]{3,}$/,     // line artifacts
    /security\s*features/i,
    /73[\-\s]*347/,        // routing number fragments
    /bankdraft/i,
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

    // Match "MEMO <text>" or "MO <text>" (OCR sometimes reads MEMO as MO)
    const memoMatch = line.match(/^(?:memo|for)\s*[:\-.]?\s*(.+)/i);
    if (memoMatch) {
      let memo = memoMatch[1].trim();
      // Clean up trailing MICR numbers, account numbers
      memo = memo.replace(/\d{5,}.*$/, "").trim();
      memo = memo.replace(/[|_\-]{3,}.*$/, "").trim();
      // Remove signature artifacts
      memo = memo.replace(/[~}{]+.*$/, "").trim();
      if (memo.length > 1 && memo.length < 100) {
        return memo;
      }
    }

    // Also check for "MO" at start (common OCR misread of "MEMO")
    if (/^MO\s+/i.test(line) && !/^MORE|^MORS|^MON/i.test(line)) {
      const moMatch = line.match(/^MO\s+(.+)/i);
      if (moMatch) {
        let memo = moMatch[1].trim();
        memo = memo.replace(/\d{5,}.*$/, "").trim();
        if (memo.length > 1 && memo.length < 100) {
          return memo;
        }
      }
    }
  }

  return "";
}
