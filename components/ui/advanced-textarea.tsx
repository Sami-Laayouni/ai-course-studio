"use client";

import React, { useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Eye,
  Keyboard,
  FlaskConical,
  Sigma,
  Superscript,
  Subscript,
} from "lucide-react";

interface AdvancedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (value: string) => void;
  previewLabel?: string;
}

const INSERT_SNIPPETS = {
  math: "$$\\frac{a}{b} = c$$",
  chemistry: "$$\\mathrm{H_2O + CO_2 \\rightarrow H_2CO_3}$$",
  superscript: "^{2}",
  subscript: "_{2}",
};

export function AdvancedTextarea({
  value,
  onChange,
  className,
  rows = 4,
  previewLabel = "Rendered Preview",
  ...props
}: AdvancedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const insertSnippet = (snippet: string) => {
    if (!onChange) return;
    const textarea = textareaRef.current;

    if (!textarea) {
      onChange(`${value || ""}${snippet}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue =
      (value || "").slice(0, start) + snippet + (value || "").slice(end);

    onChange(nextValue);

    requestAnimationFrame(() => {
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
      textarea.focus();
    });
  };

  const previewHtml = useMemo(() => {
    if (!value) return "";
    const pattern = /\$\$([\s\S]+?)\$\$|\$([\s\S]+?)\$/g;
    let lastIndex = 0;
    let rendered = "";
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const appendText = (text: string) => {
      if (!text) return;
      rendered += escapeHtml(text);
    };

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value || "")) !== null) {
      appendText((value || "").slice(lastIndex, match.index));

      const isBlock = Boolean(match[1]);
      const expression = match[1] || match[2] || "";

      try {
        rendered += katex.renderToString(expression, {
          displayMode: isBlock,
          throwOnError: false,
        });
      } catch (error) {
        rendered += `<span class="text-red-600">${escapeHtml(
          match[0]
        )}</span>`;
      }

      lastIndex = pattern.lastIndex;
    }

    appendText((value || "").slice(lastIndex));

    // Preserve newlines
    rendered = rendered.replace(/\n/g, "<br />");
    return rendered;
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => insertSnippet(INSERT_SNIPPETS.math)}
          >
            <Sigma className="h-3 w-3 mr-1" />
            Math
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => insertSnippet(INSERT_SNIPPETS.chemistry)}
          >
            <FlaskConical className="h-3 w-3 mr-1" />
            Chemistry
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => insertSnippet(INSERT_SNIPPETS.superscript)}
          >
            <Superscript className="h-3 w-3 mr-1" />
            Super
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => insertSnippet(INSERT_SNIPPETS.subscript)}
          >
            <Subscript className="h-3 w-3 mr-1" />
            Sub
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant={showPreview ? "ghost" : "default"}
            size="sm"
            className="text-xs"
            onClick={() => setShowPreview(false)}
          >
            <Keyboard className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            variant={showPreview ? "default" : "ghost"}
            size="sm"
            className="text-xs"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      />

      {showPreview && (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {previewLabel}
          </p>
          {value ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Your formatted content will appear here. Wrap math in{" "}
              <code>$...$</code> or <code>$$...$$</code>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}


