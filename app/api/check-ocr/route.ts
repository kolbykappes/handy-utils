import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY environment variable is not set" },
      { status: 500 }
    );
  }

  let body: { image: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.image) {
    return NextResponse.json(
      { error: "Missing image field" },
      { status: 400 }
    );
  }

  // Strip data URL prefix if present (e.g., "data:image/png;base64,...")
  const base64Data = body.image.replace(/^data:image\/\w+;base64,/, "");
  const mediaType = body.image.startsWith("data:image/jpeg")
    ? "image/jpeg"
    : "image/png";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: `You are analyzing a scanned bank check image. Extract:
1. The payee - who the check is written to (the name on the "Pay to the order of" line). This is handwritten.
2. The memo - any text on the memo/for line at the bottom-left of the check. This may be blank.

Return ONLY a JSON object with no other text: {"payee": "...", "memo": "..."}
If you cannot determine a field, use an empty string.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Claude API error: ${response.status} ${errorText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse the JSON response from Claude
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        payee: parsed.payee || "",
        memo: parsed.memo || "",
        rawResponse: text,
      });
    }

    return NextResponse.json({
      payee: "",
      memo: "",
      rawResponse: text,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to call Claude API: ${msg}` },
      { status: 500 }
    );
  }
}
