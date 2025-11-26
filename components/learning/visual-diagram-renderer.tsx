"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface VisualDiagramRendererProps {
  diagram: {
    type: string;
    code: string;
    language?: string;
  };
}

export function VisualDiagramRenderer({ diagram }: VisualDiagramRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      if (diagram.type === "mermaid") {
        // Render Mermaid diagram
        renderMermaid(diagram.code, containerRef.current);
      } else if (diagram.type === "svg") {
        // Render SVG directly
        renderSVG(diagram.code, containerRef.current);
      } else if (diagram.type === "canvas") {
        // Render HTML Canvas
        renderCanvas(diagram.code, containerRef.current);
      } else {
        // Try to auto-detect
        if (diagram.code.includes("<svg")) {
          renderSVG(diagram.code, containerRef.current);
        } else if (diagram.code.includes("graph") || diagram.code.includes("flowchart")) {
          renderMermaid(diagram.code, containerRef.current);
        } else {
          renderSVG(diagram.code, containerRef.current);
        }
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error("Diagram rendering error:", err);
      setError(err.message || "Failed to render diagram");
      setIsLoading(false);
    }
  }, [diagram]);

  const renderSVG = (code: string, container: HTMLElement) => {
    // Clean up previous content
    container.innerHTML = "";

    // Create wrapper div
    const wrapper = document.createElement("div");
    wrapper.className = "w-full flex justify-center items-center p-4 bg-white rounded-lg border";
    wrapper.style.minHeight = "200px";

    // If code is already an SVG element, insert it directly
    if (code.trim().startsWith("<svg")) {
      wrapper.innerHTML = code;
    } else {
      // Try to wrap in SVG if it's just SVG content
      wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" class="w-full h-auto">${code}</svg>`;
    }

    container.appendChild(wrapper);
  };

  const renderMermaid = async (code: string, container: HTMLElement) => {
    // Clean up previous content
    container.innerHTML = "";

    // Create a div for Mermaid
    const mermaidDiv = document.createElement("div");
    mermaidDiv.className = "mermaid w-full p-4 bg-white rounded-lg border";
    mermaidDiv.textContent = code;

    container.appendChild(mermaidDiv);

    // Try to load and render Mermaid
    try {
      // Dynamic import of mermaid
      const mermaid = await import("mermaid");
      mermaid.default.initialize({
        startOnLoad: true,
        theme: "default",
        securityLevel: "loose",
      });
      await mermaid.default.run();
    } catch (err) {
      // If Mermaid isn't available, render as formatted text
      mermaidDiv.className = "w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border font-mono text-sm whitespace-pre-wrap";
      mermaidDiv.textContent = code;
      // Add a note that Mermaid isn't available
      const note = document.createElement("p");
      note.className = "text-xs text-muted-foreground mt-2";
      note.textContent = "Note: Install 'mermaid' package for diagram rendering";
      container.appendChild(note);
    }
  };

  const renderCanvas = (code: string, container: HTMLElement) => {
    // Clean up previous content
    container.innerHTML = "";

    // Create canvas element
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    canvas.className = "w-full h-auto border rounded-lg";

    container.appendChild(canvas);

    // Execute canvas code in a safe context
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Create a function that has access to ctx
      const drawFunction = new Function("ctx", "canvas", code);
      drawFunction(ctx, canvas);
    } catch (err: any) {
      console.error("Canvas rendering error:", err);
      setError(err.message || "Failed to render canvas diagram");
    }
  };

  if (isLoading) {
    return (
      <Card className="my-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Rendering diagram...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="my-4 border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <p className="text-sm text-yellow-800">
            Could not render diagram: {error}
          </p>
          <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
            {diagram.code.substring(0, 500)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-4 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardContent className="p-0">
        <div ref={containerRef} className="w-full" />
      </CardContent>
    </Card>
  );
}

