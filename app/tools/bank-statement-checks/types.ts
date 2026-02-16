// Raw check data extracted from text pages
export interface CheckTransaction {
  checkNumber: string;
  date: string;
  amount: number;
}

// OCR result from a single check image
export interface CheckImageOCR {
  checkNumber: string;
  payee: string;
  memo: string;
  confidence: number;
  imageDataUrl?: string;
}

// Final correlated record for display and export
export interface CheckRecord {
  checkNumber: string;
  date: string;
  amount: number;
  payee: string;
  memo: string;
  ocrConfidence: number;
  hasOCR: boolean;
  needsReview: boolean;
}

// Processing progress
export interface ProcessingStatus {
  stage:
    | "idle"
    | "extracting-text"
    | "rendering-pages"
    | "ocr-processing"
    | "correlating"
    | "done"
    | "error";
  currentPage?: number;
  totalPages?: number;
  currentCheck?: number;
  totalChecks?: number;
  message: string;
}
