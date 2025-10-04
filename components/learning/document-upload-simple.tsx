"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Upload,
  FileText,
  Image,
  File,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DocumentUploadSimpleProps {
  onUploadComplete: (
    fileUrl: string,
    fileName: string,
    fileType: string
  ) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
}

export default function DocumentUploadSimple({
  onUploadComplete,
  acceptedTypes = [
    ".pdf",
    ".pptx",
    ".ppt",
    ".docx",
    ".doc",
    ".jpg",
    ".jpeg",
    ".png",
  ],
  maxSize = 10,
}: DocumentUploadSimpleProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      setErrorMessage(
        `File type ${fileExtension} is not supported. Allowed types: ${acceptedTypes.join(
          ", "
        )}`
      );
      setUploadStatus("error");
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setErrorMessage(`File size must be less than ${maxSize}MB`);
      setUploadStatus("error");
      return;
    }

    setIsUploading(true);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/google-cloud", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setUploadStatus("success");
      onUploadComplete(data.url, file.name, fileExtension);
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage("Failed to upload file. Please try again.");
      setUploadStatus("error");
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <FileText className="h-8 w-8 text-red-500" />;
      case "pptx":
      case "ppt":
        return <File className="h-8 w-8 text-orange-500" />;
      case "docx":
      case "doc":
        return <FileText className="h-8 w-8 text-blue-500" />;
      case "jpg":
      case "jpeg":
      case "png":
        return <Image className="h-8 w-8 text-green-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Document Upload
        </CardTitle>
        <CardDescription>
          Upload PDFs, presentations, documents, or images
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept={acceptedTypes.join(",")}
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  {acceptedTypes.join(", ")} (max {maxSize}MB)
                </p>
              </div>
            </label>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Status Messages */}
          {uploadStatus === "success" && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Upload successful!</span>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
