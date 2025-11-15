"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sigma,
  Superscript,
  Subscript,
  Divide,
  Plus,
  Minus,
  X,
  Equal,
  Pi,
  Infinity,
} from "lucide-react";

interface AdvancedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (value: string) => void;
  previewLabel?: string;
}

// Convert simple notation to LaTeX for rendering
function convertToLatex(text: string): string {
  if (!text) return "";

  let result = text;

  // Skip if already LaTeX
  if (result.includes("\\") || result.includes("$")) {
    return result;
  }

  // Chemical formulas: H2O -> H_{2}O
  result = result.replace(/([A-Z][a-z]*)(\d+)/g, (match, element, num) => {
    return `${element}_{${num}}`;
  });

  // sqrt(x) -> \sqrt{x}
  result = result.replace(/sqrt\(([^)]+)\)/g, (match, content) => {
    return `\\sqrt{${content}}`;
  });

  // Powers: x^2 -> x^{2}, (x+1)^2 -> (x+1)^{2}
  result = result.replace(/([a-zA-Z0-9\)]+)\^(\d+)/g, (match, base, exp) => {
    return `${base}^{${exp}}`;
  });

  result = result.replace(
    /([a-zA-Z0-9\)]+)\^([a-zA-Z]+)/g,
    (match, base, exp) => {
      return `${base}^{${exp}}`;
    }
  );

  // Subscripts: x_2 -> x_{2}
  result = result.replace(/([a-zA-Z]+)_(\d+)/g, (match, base, sub) => {
    return `${base}_{${sub}}`;
  });

  result = result.replace(/([a-zA-Z]+)_([a-zA-Z]+)/g, (match, base, sub) => {
    return `${base}_{${sub}}`;
  });

  // Fractions: a/b -> \frac{a}{b} (only standalone)
  result = result.replace(
    /\b([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)\b/g,
    (match, num, den) => {
      const before = result.substring(0, result.indexOf(match));
      const after = result.substring(result.indexOf(match) + match.length);
      const beforeChar = before[before.length - 1] || " ";
      const afterChar = after[0] || " ";

      if (
        (beforeChar === " " || beforeChar === "" || beforeChar === "\n") &&
        (afterChar === " " ||
          afterChar === "" ||
          afterChar === "\n" ||
          afterChar === "," ||
          afterChar === ".")
      ) {
        return `\\frac{${num}}{${den}}`;
      }
      return match;
    }
  );

  // Constants
  result = result.replace(/\bpi\b/g, "\\pi");
  result = result.replace(/\binf\b/g, "\\infty");
  result = result.replace(/\bsum\b/g, "\\sum");
  result = result.replace(/\bint\b/g, "\\int");
  result = result.replace(/\balpha\b/g, "\\alpha");
  result = result.replace(/\bbeta\b/g, "\\beta");
  result = result.replace(/\bgamma\b/g, "\\gamma");
  result = result.replace(/\btheta\b/g, "\\theta");
  result = result.replace(/\blambda\b/g, "\\lambda");
  result = result.replace(/\bsigma\b/g, "\\sigma");
  result = result.replace(/\bDelta\b/g, "\\Delta");
  result = result.replace(/\brho\b/g, "\\rho");

  return result;
}

// Render text with math formatting
function renderWithMath(text: string): string {
  if (!text) return "";

  const lines = text.split("\n");
  let html = "";

  for (const line of lines) {
    if (!line.trim()) {
      html += "<br />";
      continue;
    }

    // Check if line has math
    const hasMath =
      /[\^_+\-*/=<>≤≥≠≈∑∫√π∞αβγθλσΔρ]/.test(line) ||
      /\b(sqrt|frac|sum|int|pi|inf|alpha|beta|gamma|theta|lambda|sigma|Delta|rho)\b/i.test(
        line
      ) ||
      /[A-Z][a-z]*\d+/.test(line) ||
      /\d+\/\d+/.test(line);

    if (hasMath) {
      const latex = convertToLatex(line);

      try {
        const rendered = katex.renderToString(latex, {
          displayMode: false,
          throwOnError: false,
        });
        html += `<span class="math-rendered">${rendered}</span>`;
      } catch (error) {
        html += escapeHtml(line);
      }
    } else {
      html += escapeHtml(line);
    }

    html += "<br />";
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function AdvancedTextarea({
  value,
  onChange,
  className,
  rows = 8,
  previewLabel,
  ...props
}: AdvancedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Insert text at cursor position
  const insertAtCursor = (text: string, moveCursor = 0) => {
    if (!textareaRef.current) {
      onChange((value || "") + text);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newValue =
      (value || "").slice(0, start) + text + (value || "").slice(end);

    onChange(newValue);

    // Restore cursor position
    requestAnimationFrame(() => {
      const newCursor = start + text.length + moveCursor;
      textarea.setSelectionRange(newCursor, newCursor);
      textarea.focus();
    });
  };

  // Render preview
  const previewHtml = useMemo(() => {
    return renderWithMath(value || "");
  }, [value]);

  // Sync scroll between textarea and preview
  useEffect(() => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;

    if (!textarea || !preview || !showPreview) return;

    const handleScroll = () => {
      if (textarea && preview) {
        const scrollRatio =
          textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
        preview.scrollTop =
          scrollRatio * (preview.scrollHeight - preview.clientHeight);
      }
    };

    textarea.addEventListener("scroll", handleScroll);
    return () => textarea.removeEventListener("scroll", handleScroll);
  }, [showPreview, value]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border border-border/50 shadow-sm">
        {/* Math Operations */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground/70 mr-1">
            Math:
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium hover:bg-primary/10 hover:border-primary/30"
            onClick={() => insertAtCursor("^", -1)}
            title="Superscript (x^2)"
          >
            <Superscript className="h-3.5 w-3.5 mr-1" />
            x²
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium hover:bg-primary/10 hover:border-primary/30"
            onClick={() => insertAtCursor("_", -1)}
            title="Subscript (H_2)"
          >
            <Subscript className="h-3.5 w-3.5 mr-1" />
            x₂
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium hover:bg-primary/10 hover:border-primary/30"
            onClick={() => insertAtCursor("sqrt()", -1)}
            title="Square root"
          >
            <span className="mr-1 text-base leading-none">√</span>
            √x
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium hover:bg-primary/10 hover:border-primary/30"
            onClick={() => insertAtCursor("()/()", -4)}
            title="Fraction (a/b)"
          >
            <Divide className="h-3.5 w-3.5 mr-1" />
            a/b
          </Button>
        </div>

        <div className="h-5 w-px bg-border/60" />

        {/* Operators */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-muted-foreground/70 mr-1">
            Ops:
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10"
            onClick={() => insertAtCursor("+")}
            title="Plus"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10"
            onClick={() => insertAtCursor("-")}
            title="Minus"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10"
            onClick={() => insertAtCursor("*")}
            title="Multiply"
          >
            <X className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10"
            onClick={() => insertAtCursor("/")}
            title="Divide"
          >
            <Divide className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10"
            onClick={() => insertAtCursor("=")}
            title="Equals"
          >
            <Equal className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-5 w-px bg-border/60" />

        {/* Symbols */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-muted-foreground/70 mr-1">
            Symbols:
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium hover:bg-primary/10"
            onClick={() => insertAtCursor("pi")}
            title="Pi (π)"
          >
            <Pi className="h-3.5 w-3.5 mr-1" />π
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium hover:bg-primary/10"
            onClick={() => insertAtCursor("inf")}
            title="Infinity (∞)"
          >
            <Infinity className="h-3.5 w-3.5 mr-1" />∞
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium hover:bg-primary/10"
            onClick={() => insertAtCursor("alpha")}
            title="Alpha (α)"
          >
            <Sigma className="h-3.5 w-3.5 mr-1" />α
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium hover:bg-primary/10"
            onClick={() => insertAtCursor("theta")}
            title="Theta (θ)"
          >
            θ
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium hover:bg-primary/10"
            onClick={() => insertAtCursor("Delta")}
            title="Delta (Δ)"
          >
            Δ
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium hover:bg-primary/10"
            onClick={() => insertAtCursor("sum")}
            title="Sum (Σ)"
          >
            Σ
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium hover:bg-primary/10"
            onClick={() => insertAtCursor("int")}
            title="Integral (∫)"
          >
            ∫
          </Button>
        </div>

        <div className="ml-auto">
          <Button
            type="button"
            variant={showPreview ? "default" : "outline"}
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
        </div>
      </div>

      {/* Editor and Preview - Side by Side */}
      <div
        className={cn(
          "grid gap-4",
          showPreview ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {/* Textarea Editor */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground/80">
            Type your content
          </label>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className={cn(
              "w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-mono",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "resize-y min-h-[200px] text-foreground placeholder:text-muted-foreground/50",
              className
            )}
            placeholder="Type naturally: x^2 for x², H2O for H₂O, sqrt(x) for √x..."
            {...props}
          />
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80">
              {previewLabel || "Live Preview"}
            </label>
            <div
              ref={previewRef}
              className={cn(
                "w-full rounded-lg border border-dashed border-slate-200 dark:border-slate-800",
                "bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900/50",
                "px-4 py-3 min-h-[200px] max-h-[600px] overflow-y-auto",
                "prose prose-sm dark:prose-invert max-w-none",
                "[&_*]:my-0 [&_.math-rendered]:inline-block [&_.math-rendered]:mx-0.5 [&_.math-rendered]:align-middle"
              )}
            >
              {value ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">
                  Preview will appear here as you type...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
