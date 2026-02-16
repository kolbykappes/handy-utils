import type { CheckTransaction } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDocumentProxy = any;

export interface CheckImageData {
  checkNumber: string;
  amount: string;
  date: string;
  imageDataUrl: string;
}

interface PositionedText {
  str: string;
  x: number;
  y: number;
}

// Lazy-load pdfjs-dist to avoid SSR issues (DOMMatrix not available in Node.js)
async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  return pdfjsLib;
}

function isTextItem(item: unknown): item is { str: string; transform: number[] } {
  return typeof item === "object" && item !== null && "str" in item && "transform" in item;
}

function getTextFromItems(items: unknown[]): string {
  return items
    .filter((item): item is { str: string } => typeof item === "object" && item !== null && "str" in item)
    .map((item) => item.str)
    .join(" ");
}

/**
 * Extract check transactions from text pages of the bank statement.
 * Parses the "Checks listed in numerical order" table.
 */
export async function extractCheckTransactions(
  file: File
): Promise<{ transactions: CheckTransaction[]; pdfDoc: PDFDocumentProxy }> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const transactions: CheckTransaction[] = [];

  // Scan text pages (typically pages 1-6, stop when we hit image pages)
  const totalPages = pdfDoc.numPages;
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const fullText = getTextFromItems(content.items);

    // Image pages have "Image Page" in header - stop processing text
    if (fullText.includes("Image Page")) break;

    // Look for check listing pattern: checkNumber date amount
    // Format: "5947 01/09 9,429.53" or "1487 01/03 182.84"
    // The (*) gap indicator and date may be MM/DD or MM/DD/YYYY
    const checkPattern = /\b(\d{4,5})\*?\s+(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+([\d,]+\.\d{2})\b/g;
    let match;
    while ((match = checkPattern.exec(fullText)) !== null) {
      const checkNum = match[1];
      let dateStr = match[2];

      // If date is MM/DD, we need to infer the year from the statement
      if (dateStr.length === 5) {
        const yearMatch = fullText.match(
          /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+(\d{4})/
        );
        const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
        // Handle December dates that might be from previous year
        const month = parseInt(dateStr.substring(0, 2));
        const statementMonth = getMonthFromText(fullText);
        if (month === 12 && statementMonth !== null && statementMonth < 12) {
          dateStr = dateStr + "/" + (parseInt(year) - 1).toString();
        } else {
          dateStr = dateStr + "/" + year;
        }
      }

      const amount = parseFloat(match[3].replace(/,/g, ""));

      transactions.push({
        checkNumber: checkNum,
        date: dateStr,
        amount,
      });
    }
  }

  // Deduplicate by check number (same check might appear in column formatting)
  const seen = new Set<string>();
  const unique = transactions.filter((t) => {
    if (seen.has(t.checkNumber)) return false;
    seen.add(t.checkNumber);
    return true;
  });

  return { transactions: unique, pdfDoc };
}

function getMonthFromText(text: string): number | null {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const match = text.match(new RegExp(`(${months.join("|")})\\s+\\d{1,2},\\s+\\d{4}`));
  if (match) {
    return months.indexOf(match[1]) + 1;
  }
  return null;
}

/**
 * Extract check images from the image pages of the PDF.
 * Uses text labels on image pages to identify check positions,
 * then renders and crops individual check images.
 */
export async function extractCheckImages(
  pdfDoc: PDFDocumentProxy,
  onProgress: (current: number, total: number) => void
): Promise<CheckImageData[]> {
  const totalPages = pdfDoc.numPages;
  const checkImages: CheckImageData[] = [];

  // Find image pages (they have "Image Page" in header text)
  const imagePageNums: number[] = [];
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const text = getTextFromItems(content.items);
    if (text.includes("Image Page")) {
      imagePageNums.push(pageNum);
    }
  }

  let processedChecks = 0;
  let totalChecks = 0;
  const pageCheckInfos: Array<{
    pageNum: number;
    checks: Array<{
      checkNumber: string;
      amount: string;
      date: string;
      col: number;
      row: number;
    }>;
  }> = [];

  for (const pageNum of imagePageNums) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: PositionedText[] = content.items
      .filter(isTextItem)
      .filter((item: { str: string }) => item.str.trim())
      .map((item: { str: string; transform: number[] }) => ({
        str: item.str,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
      }));

    // Check images are in a 3-column grid
    // Column 1: check# at x~30, amount at x~95, date at x~167
    // Column 2: check# at x~214, amount at x~279, date at x~351
    // Column 3: check# at x~398, amount at x~463, date at x~535
    // Rows at y: 682, 580, 478, 376, 274, 172, 70

    const colCheckX = [30, 214, 398];
    const colAmountX = [95, 279, 463];
    const colDateX = [167, 351, 535];
    const rowYs = [682, 580, 478, 376, 274, 172, 70];

    const pageChecks: Array<{
      checkNumber: string;
      amount: string;
      date: string;
      col: number;
      row: number;
    }> = [];

    for (let rowIdx = 0; rowIdx < rowYs.length; rowIdx++) {
      const targetY = rowYs[rowIdx];
      for (let colIdx = 0; colIdx < 3; colIdx++) {
        // Find check number at this grid position
        const checkItem = items.find(
          (item) =>
            Math.abs(item.y - targetY) < 15 &&
            Math.abs(item.x - colCheckX[colIdx]) < 20 &&
            /^\d{4,5}$/.test(item.str)
        );
        if (!checkItem) continue;

        // Find amount
        const amountItem = items.find(
          (item) =>
            Math.abs(item.y - targetY) < 15 &&
            Math.abs(item.x - colAmountX[colIdx]) < 20 &&
            item.str.startsWith("$")
        );

        // Find date
        const dateItem = items.find(
          (item) =>
            Math.abs(item.y - targetY) < 15 &&
            Math.abs(item.x - colDateX[colIdx]) < 20 &&
            /\d{2}\/\d{2}\/\d{4}/.test(item.str)
        );

        pageChecks.push({
          checkNumber: checkItem.str,
          amount: amountItem?.str || "",
          date: dateItem?.str || "",
          col: colIdx,
          row: rowIdx,
        });
      }
    }

    totalChecks += pageChecks.length;
    pageCheckInfos.push({ pageNum, checks: pageChecks });
  }

  onProgress(0, totalChecks);

  // Now render each page and crop check images
  for (const { pageNum, checks } of pageCheckInfos) {
    if (checks.length === 0) continue;

    const page = await pdfDoc.getPage(pageNum);
    const renderScale = 4.0;
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    const pageHeight = viewport.height;
    const colWidth = viewport.width / 3;

    for (const check of checks) {
      const labelPdfY = rowYPositions[check.row];
      // Convert PDF y to canvas y (flip vertical)
      // The label is at the bottom of the check image
      // Each cell is about 102 PDF units tall
      const cellHeight = 102 * renderScale;
      const labelCanvasY = pageHeight - labelPdfY * renderScale;
      const cropY = Math.max(0, labelCanvasY - cellHeight + 10 * renderScale);
      const cropX = check.col * colWidth;
      const cropW = colWidth;
      const cropH = cellHeight;

      // Crop the check image
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext("2d")!;
      cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      checkImages.push({
        checkNumber: check.checkNumber,
        amount: check.amount,
        date: check.date,
        imageDataUrl: cropCanvas.toDataURL("image/png"),
      });

      processedChecks++;
      onProgress(processedChecks, totalChecks);

      // Clean up crop canvas
      cropCanvas.width = 0;
    }

    // Free memory
    canvas.width = 0;
  }

  return checkImages;
}

const rowYPositions = [682, 580, 478, 376, 274, 172, 70];
