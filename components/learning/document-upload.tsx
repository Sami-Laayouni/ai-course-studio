"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";

interface DocumentUploadProps {
  nodeConfig: {
    allowed_types: string;
    max_size_mb: number;
    extract_text: boolean;
    instructions: string;
  };
  onUploadComplete: (document: any) => void;
  onRemoveDocument: (documentId: string) => void;
  uploadedDocuments: any[];
  activityId: string;
  nodeId: string;
}

export default function DocumentUpload({
  nodeConfig,
  onUploadComplete,
  onRemoveDocument,
  uploadedDocuments,
  activityId,
  nodeId,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    validateAndUploadFile(file);
  };

  const validateAndUploadFile = (file: File) => {
    setError(null);

    // Validate file type
    const allowedTypes = nodeConfig.allowed_types.split(",");
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (
      nodeConfig.allowed_types !== "all" &&
      !allowedTypes.includes(fileExtension || "")
    ) {
      setError(
        `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`
      );
      return;
    }

    // Validate file size
    const maxSizeBytes = nodeConfig.max_size_mb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size: ${nodeConfig.max_size_mb}MB`);
      return;
    }

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("activityId", activityId);
      formData.append("nodeId", nodeId);
      formData.append("extractText", nodeConfig.extract_text.toString());

      const response = await fetch("/api/upload/google-cloud", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      onUploadComplete(data.document);
      setUploadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    if (mimeType.includes("text")) return "📃";
    return "📎";
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Document Upload</h3>
        <p className="text-blue-800 text-sm">{nodeConfig.instructions}</p>
        <div className="mt-2 text-xs text-blue-700">
          <p>Allowed types: {nodeConfig.allowed_types}</p>
          <p>Max size: {nodeConfig.max_size_mb}MB</p>
          {nodeConfig.extract_text && (
            <p>Text will be extracted for AI context</p>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={
            nodeConfig.allowed_types === "all"
              ? "*"
              : `.${nodeConfig.allowed_types}`
          }
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {isUploading ? (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Uploading document...</p>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-gray-500">
                {uploadProgress}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your document here
              </p>
              <p className="text-sm text-gray-600">or click to browse</p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Upload Error</span>
          </div>
          <p className="text-red-700 mt-1 text-sm">{error}</p>
        </div>
      )}

      {/* Uploaded Documents */}
      {uploadedDocuments.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
          {uploadedDocuments.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(doc.mimeType)}</span>
                  <div>
                    <p className="font-medium text-sm">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.fileSize)} • {doc.mimeType}
                    </p>
                    {doc.extractedText && (
                      <Badge variant="outline" className="text-xs mt-1">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Text Extracted
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(doc.url, "_blank")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRemoveDocument(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Key Points */}
              {doc.keyPoints && doc.keyPoints.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Key Points:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {doc.keyPoints
                      .slice(0, 5)
                      .map((point: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {point}
                        </Badge>
                      ))}
                    {doc.keyPoints.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{doc.keyPoints.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
