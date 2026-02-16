import type { CheckImageOCR } from "./types";

/**
 * Analyze a check image using Claude Vision API via our API route.
 * No initialization or cleanup needed - each call is a standalone request.
 */
export async function ocrCheckImage(
  imageDataUrl: string,
  checkNumber: string
): Promise<CheckImageOCR> {
  try {
    const response = await fetch("/api/check-ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `API returned ${response.status}`);
    }

    const data = await response.json();

    return {
      checkNumber,
      payee: data.payee || "",
      memo: data.memo || "",
      confidence: data.payee ? 95 : 0,
      rawText: data.rawResponse || "",
      imageDataUrl,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      checkNumber,
      payee: "",
      memo: "",
      confidence: 0,
      rawText: `Error: ${msg}`,
      imageDataUrl,
    };
  }
}
