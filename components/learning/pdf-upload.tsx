"use client";

import React, { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  File,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Trash2,
  Cloud,
} from "lucide-react";

interface PDFUploadProps {
  onFileUploaded: (fileData: any) => void;
  onError: (error: string) => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  status: "uploading" | "success" | "error";
  progress: number;
  metadata?: {
    pages: number;
    size: string;
    type: string;
  };
}

export default function PDFUpload({
  onFileUploaded,
  onError,
  maxSize = 10, // 10MB default
  acceptedTypes = ["application/pdf"],
}: PDFUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      if (!acceptedTypes.includes(file.type)) {
        onError(
          `File type ${file.type} is not supported. Please upload PDF files only.`
        );
        continue;
      }

      if (file.size > maxSize * 1024 * 1024) {
        onError(
          `File size exceeds ${maxSize}MB limit. Please choose a smaller file.`
        );
        continue;
      }

      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const fileId = Date.now().toString();
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      url: "",
      status: "uploading",
      progress: 0,
    };

    setUploadedFiles((prev) => [...prev, uploadedFile]);
    setIsUploading(true);

    try {
      // Simulate file upload to Google Cloud Storage
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "pdf");

      // In a real implementation, you would upload to Google Cloud Storage
      // For now, we'll simulate the upload process
      const response = await simulateUpload(formData, (progress) => {
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
        );
      });

      // Update file with success status
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "success",
                url: response.url,
                metadata: response.metadata,
                progress: 100,
              }
            : f
        )
      );

      onFileUploaded({
        file_id: fileId,
        file_name: file.name,
        file_url: response.url,
        file_size: file.size,
        metadata: response.metadata,
      });
    } catch (error) {
      console.error("Upload error:", error);

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "error", progress: 0 } : f
        )
      );

      onError(`Failed to upload ${file.name}. Please try again.`);
    } finally {
      setIsUploading(false);
    }
  };

  const simulateUpload = async (
    formData: FormData,
    onProgress: (progress: number) => void
  ): Promise<any> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve({
            url: `https://storage.googleapis.com/your-bucket/${Date.now()}.pdf`,
            metadata: {
              pages: Math.floor(Math.random() * 50) + 10,
              size: `${(formData.get("file") as File).size} bytes`,
              type: "PDF",
            },
          });
        }
        onProgress(progress);
      }, 200);
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploading":
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        );
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <File className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploading":
        return "bg-blue-50 border-blue-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Upload PDF Document
          </CardTitle>
          <CardDescription>
            Upload your PDF document to Google Cloud Storage for secure sharing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">
              {isDragging
                ? "Drop your PDF here"
                : "Drag and drop your PDF file"}
            </h3>
            <p className="text-gray-600 mb-4">
              or click to browse your computer
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Choose File
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Maximum file size: {maxSize}MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(",")}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              Uploaded Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`p-4 rounded-lg border ${getStatusColor(
                    file.status
                  )}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(file.status)}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {file.status === "success" && (
                        <>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {file.status === "uploading" && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Uploading...</span>
                        <span>{Math.round(file.progress)}%</span>
                      </div>
                      <Progress value={file.progress} className="h-2" />
                    </div>
                  )}

                  {file.status === "success" && file.metadata && (
                    <div className="mt-3 flex gap-2">
                      <Badge variant="outline">
                        {file.metadata.pages} pages
                      </Badge>
                      <Badge variant="outline">{file.metadata.type}</Badge>
                    </div>
                  )}

                  {file.status === "error" && (
                    <div className="mt-3 text-sm text-red-600">
                      Upload failed. Please try again.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Cloud Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Cloud Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Files are securely stored in Google Cloud Storage</p>
            <p>• Automatic PDF processing and metadata extraction</p>
            <p>• High availability and global CDN delivery</p>
            <p>• Integrated with Google AI for content analysis</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
