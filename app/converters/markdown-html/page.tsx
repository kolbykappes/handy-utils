"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import TurndownService from "turndown";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export default function MarkdownHtmlConverter() {
  const [markdown, setMarkdown] = useState<string>("");
  const [html, setHtml] = useState<string>("");
  const [htmlViewMode, setHtmlViewMode] = useState<"preview" | "code">("preview");
  const [lastEdited, setLastEdited] = useState<"markdown" | "html">("markdown");
  const markdownRef = useRef<HTMLTextAreaElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  // Convert markdown to HTML when markdown changes
  useEffect(() => {
    if (lastEdited === "markdown") {
      // We'll use the ReactMarkdown component to render, so we don't need to convert here
      // Just trigger a re-render
    }
  }, [markdown, lastEdited]);

  const handleMarkdownChange = (value: string) => {
    setMarkdown(value);
    setLastEdited("markdown");
  };

  const handleHtmlChange = (value: string) => {
    setHtml(value);
    setLastEdited("html");

    // Convert HTML to markdown
    try {
      const md = turndownService.turndown(value);
      setMarkdown(md);
    } catch (e) {
      console.error("Failed to convert HTML to markdown:", e);
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    alert("Markdown copied to clipboard!");
  };

  const handleCopyHtml = () => {
    // Get the rendered HTML from the preview
    const previewElement = document.getElementById("html-preview");
    if (previewElement) {
      navigator.clipboard.writeText(previewElement.innerHTML);
      alert("HTML copied to clipboard!");
    }
  };

  const handleCopyHtmlCode = () => {
    navigator.clipboard.writeText(html);
    alert("HTML code copied to clipboard!");
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Markdown ↔ HTML Converter
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Bidirectional converter with live sync. Edit either pane and see the other update instantly.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Markdown Pane */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold">Markdown</h2>
              <button
                onClick={handleCopyMarkdown}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                📋 Copy
              </button>
            </div>
            <div className="flex-1 p-4">
              <textarea
                ref={markdownRef}
                value={markdown}
                onChange={(e) => handleMarkdownChange(e.target.value)}
                placeholder="Paste or type your Markdown here...

# Example
- Lists
- **Bold** and *italic*
- [Links](https://example.com)

| Tables | Are | Supported |
|--------|-----|-----------|
| Col 1  | Col 2 | Col 3   |

```javascript
// Code blocks too!
console.log('Hello');
```

- [ ] Task lists
- [x] Also supported"
                className="w-full h-[600px] p-4 font-mono text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 resize-none"
              />
            </div>
          </div>

          {/* HTML Pane */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">HTML</h2>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setHtmlViewMode("preview")}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      htmlViewMode === "preview"
                        ? "bg-white dark:bg-slate-600 shadow"
                        : "hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setHtmlViewMode("code")}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      htmlViewMode === "code"
                        ? "bg-white dark:bg-slate-600 shadow"
                        : "hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    Code
                  </button>
                </div>
              </div>
              <button
                onClick={htmlViewMode === "preview" ? handleCopyHtml : handleCopyHtmlCode}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                📋 Copy {htmlViewMode === "preview" ? "HTML" : "Code"}
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {htmlViewMode === "preview" ? (
                <div
                  id="html-preview"
                  className="prose prose-slate dark:prose-invert max-w-none"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  ref={htmlRef}
                  value={html || document.getElementById("html-preview")?.innerHTML || ""}
                  onChange={(e) => handleHtmlChange(e.target.value)}
                  placeholder="Paste HTML here to convert to Markdown...

<h1>Example</h1>
<p>Paste any HTML and it will be converted to Markdown.</p>
<ul>
  <li>Lists</li>
  <li><strong>Bold</strong> and <em>italic</em></li>
</ul>"
                  className="w-full h-[600px] p-4 font-mono text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 resize-none"
                />
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold mb-2">✨ Features:</h3>
          <ul className="text-sm space-y-1 text-slate-700 dark:text-slate-300">
            <li>• <strong>Bidirectional sync:</strong> Edit either pane and see the other update</li>
            <li>• <strong>GitHub-flavored markdown:</strong> Tables, task lists, strikethrough, and more</li>
            <li>• <strong>Preview mode:</strong> See rendered HTML output</li>
            <li>• <strong>Code mode:</strong> Edit raw HTML and convert to markdown</li>
            <li>• <strong>Copy buttons:</strong> Easy clipboard copying for both formats</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
