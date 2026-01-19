"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import TurndownService from "turndown";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkHtml from "remark-html";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  br: "\n",
});

// Configure turndown to preserve line breaks
turndownService.addRule("lineBreak", {
  filter: "br",
  replacement: () => "  \n",
});

export default function MarkdownHtmlConverter() {
  const [markdown, setMarkdown] = useState<string>("");
  const [html, setHtml] = useState<string>("");
  const htmlEditableRef = useRef<HTMLDivElement>(null);
  const isEditingHtml = useRef(false);
  const conversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update HTML when markdown changes (only if not currently editing HTML)
  useEffect(() => {
    if (!isEditingHtml.current && markdown !== undefined) {
      remark()
        .use(remarkGfm)
        .use(remarkBreaks)
        .use(remarkHtml, { sanitize: false })
        .process(markdown)
        .then((file) => {
          const newHtml = String(file);
          setHtml(newHtml);
          // Only update the div if user is not actively editing
          if (htmlEditableRef.current && !isEditingHtml.current) {
            htmlEditableRef.current.innerHTML = newHtml;
          }
        })
        .catch((err) => {
          console.error("Failed to convert markdown to HTML:", err);
        });
    }
  }, [markdown]);

  const handleMarkdownChange = (value: string) => {
    setMarkdown(value);
  };

  const handleHtmlFocus = () => {
    isEditingHtml.current = true;
  };

  const handleHtmlBlur = () => {
    isEditingHtml.current = false;
    // Convert HTML to markdown on blur
    if (htmlEditableRef.current) {
      const htmlContent = htmlEditableRef.current.innerHTML;
      try {
        const md = turndownService.turndown(htmlContent);
        setMarkdown(md);
      } catch (err) {
        console.error("Failed to convert HTML to markdown:", err);
      }
    }
  };

  const handleHtmlPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedHtml = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain");

    try {
      const md = turndownService.turndown(pastedHtml);
      setMarkdown(md);
      isEditingHtml.current = false;
    } catch (err) {
      console.error("Failed to convert HTML to markdown:", err);
    }
  };

  const handleHtmlInput = () => {
    // Clear any existing timeout
    if (conversionTimeoutRef.current) {
      clearTimeout(conversionTimeoutRef.current);
    }

    // Debounce conversion to avoid constant updates while typing
    conversionTimeoutRef.current = setTimeout(() => {
      if (htmlEditableRef.current) {
        const htmlContent = htmlEditableRef.current.innerHTML;
        try {
          const md = turndownService.turndown(htmlContent);
          setMarkdown(md);
        } catch (err) {
          console.error("Failed to convert HTML to markdown:", err);
        }
      }
    }, 500); // Wait 500ms after last keystroke
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
  };

  const handleCopyHtml = async () => {
    if (htmlEditableRef.current) {
      const htmlContent = htmlEditableRef.current.innerHTML;

      try {
        // Copy as rich text (HTML) so it can be pasted into email/Word
        const blobHtml = new Blob([htmlContent], { type: "text/html" });
        const blobText = new Blob([htmlEditableRef.current.innerText], { type: "text/plain" });

        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
          }),
        ]);
      } catch (err) {
        // Fallback to plain text if clipboard API fails
        console.error("Failed to copy as HTML, falling back to text:", err);
        navigator.clipboard.writeText(htmlContent);
      }
    }
  };

  const handleClear = () => {
    setMarkdown("");
    if (htmlEditableRef.current) {
      htmlEditableRef.current.innerHTML = "";
    }
  };

  const handleLoadSample = () => {
    const sample = `# GitHub Flavored Markdown Demo

This document demonstrates all major GitHub Flavored Markdown (GFM) features.

## Text Formatting

You can make text **bold**, *italic*, or ***bold and italic***.
You can also use ~~strikethrough~~ text.

## Lists

### Unordered List
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item

### Task List
- [x] Completed task
- [ ] Incomplete task
- [ ] Another task

## Links and Images

[Visit GitHub](https://github.com)

Inline link: <https://example.com>

## Code

Inline code: \`const x = 42;\`

### Code Block with Syntax Highlighting

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
\`\`\`

\`\`\`python
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
\`\`\`

## Tables

| Feature | Supported | Notes |
|---------|-----------|-------|
| Tables | ✓ | With alignment |
| Task lists | ✓ | Interactive checkboxes |
| Emoji | ✓ | :rocket: :sparkles: |
| Syntax highlighting | ✓ | Multiple languages |

## Blockquotes

> This is a blockquote.
> It can span multiple lines.
>
> > Nested blockquotes are also possible.

## Horizontal Rules

---

## Emoji

You can use emoji! :smile: :rocket: :heart: :sparkles:

## HTML Support

You can also use <mark>HTML tags</mark> for additional <u>formatting</u>.

---

**Note:** This converter supports bidirectional editing!`;
    setMarkdown(sample);
  };

  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm"
          >
            ← Back to Home
          </Link>
          <div className="text-right">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Markdown ↔ HTML Converter
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Bidirectional converter with live sync
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Markdown Pane */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold">Markdown</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  🗑️ Clear
                </button>
                <button
                  onClick={handleLoadSample}
                  className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  📝 Sample
                </button>
                <button
                  onClick={handleCopyMarkdown}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  📋 Copy
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={markdown}
                onChange={(e) => handleMarkdownChange(e.target.value)}
                placeholder="Paste or type your Markdown here...

# Sample Document

This is a **simple example** of markdown content.

## Features

- Bullet points
- *Italic text*
- **Bold text**

## Code Example

```javascript
function hello() {
  console.log('Hello World');
}
```

> This is a blockquote"
                className="w-full h-[700px] p-4 font-mono text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 resize-none"
              />
            </div>
          </div>

          {/* HTML Pane - Editable Preview */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold">HTML Preview (Editable)</h2>
              <button
                onClick={handleCopyHtml}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                📋 Copy HTML
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div
                ref={htmlEditableRef}
                contentEditable
                onFocus={handleHtmlFocus}
                onBlur={handleHtmlBlur}
                onPaste={handleHtmlPaste}
                onInput={handleHtmlInput}
                suppressContentEditableWarning
                className="prose prose-slate dark:prose-invert max-w-none min-h-[700px] outline-none p-4 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700"
                style={{
                  lineHeight: '1.4',
                }}
              />
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300">
          <strong>Tips:</strong> Edit markdown (left) or HTML (right). Both panes are editable. HTML converts to markdown after 0.5s pause or on blur. GitHub-flavored markdown supported.
        </div>
      </div>
    </main>
  );
}
