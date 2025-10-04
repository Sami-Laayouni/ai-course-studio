"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Layers,
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
} from "lucide-react";

interface SlideshowUploadProps {
  nodeConfig: {
    allowed_formats: string;
    max_slides: number;
    auto_advance: boolean;
    slide_duration: number;
    instructions: string;
  };
  onUploadComplete: (slideshow: any) => void;
  onRemoveSlideshow: (slideshowId: string) => void;
  uploadedSlideshows: any[];
  activityId: string;
  nodeId: string;
}

export default function SlideshowUpload({
  nodeConfig,
  onUploadComplete,
  onRemoveSlideshow,
  uploadedSlideshows,
  activityId,
  nodeId,
}: SlideshowUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    validateAndUploadFile(file);
  };

  const validateAndUploadFile = (file: File) => {
    setError(null);

    // Validate file type
    const allowedFormats = nodeConfig.allowed_formats.split(",");
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (!allowedFormats.includes(fileExtension || "")) {
      setError(
        `File format not allowed. Allowed formats: ${allowedFormats.join(", ")}`
      );
      return;
    }

    // Validate file size (max 50MB for presentations)
    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size: 50MB`);
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
      formData.append("maxSlides", nodeConfig.max_slides.toString());
      formData.append("autoAdvance", nodeConfig.auto_advance.toString());
      formData.append("slideDuration", nodeConfig.slide_duration.toString());

      const response = await fetch("/api/upload/slideshow", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      onUploadComplete(data.slideshow);
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

  const nextSlide = () => {
    if (uploadedSlideshows.length > 0) {
      const slideshow = uploadedSlideshows[0];
      setCurrentSlide((prev) => (prev + 1) % slideshow.slides.length);
    }
  };

  const prevSlide = () => {
    if (uploadedSlideshows.length > 0) {
      const slideshow = uploadedSlideshows[0];
      setCurrentSlide(
        (prev) => (prev - 1 + slideshow.slides.length) % slideshow.slides.length
      );
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      playIntervalRef.current = setInterval(
        nextSlide,
        nodeConfig.slide_duration * 1000
      );
      setIsPlaying(true);
    }
  };

  React.useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-2">Slideshow Upload</h3>
        <p className="text-purple-800 text-sm">{nodeConfig.instructions}</p>
        <div className="mt-2 text-xs text-purple-700">
          <p>Allowed formats: {nodeConfig.allowed_formats}</p>
          <p>Max slides: {nodeConfig.max_slides}</p>
          {nodeConfig.auto_advance && (
            <p>Auto-advance: {nodeConfig.slide_duration}s per slide</p>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-purple-500 bg-purple-50"
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
            nodeConfig.allowed_formats === "both"
              ? ".pptx,.pdf"
              : `.${nodeConfig.allowed_formats}`
          }
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {isUploading ? (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-purple-500 animate-spin" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Processing slideshow...</p>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-gray-500">
                {uploadProgress}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Layers className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your slideshow here
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

      {/* Slideshow Player */}
      {uploadedSlideshows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                {uploadedSlideshows[0].title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {uploadedSlideshows[0].slides.length} slides
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveSlideshow(uploadedSlideshows[0].id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Slide Display */}
            <div className="bg-gray-900 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
              <div className="text-center text-white">
                <p className="text-lg font-medium mb-2">
                  Slide {currentSlide + 1} of{" "}
                  {uploadedSlideshows[0].slides.length}
                </p>
                <p className="text-sm opacity-75">
                  {uploadedSlideshows[0].slides[currentSlide]}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={prevSlide}
                  disabled={uploadedSlideshows[0].slides.length <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={togglePlay}
                  disabled={uploadedSlideshows[0].slides.length <= 1}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={nextSlide}
                  disabled={uploadedSlideshows[0].slides.length <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {currentSlide + 1} / {uploadedSlideshows[0].slides.length}
                </span>
                {nodeConfig.auto_advance && (
                  <Badge variant="secondary" className="text-xs">
                    Auto: {nodeConfig.slide_duration}s
                  </Badge>
                )}
              </div>
            </div>

            {/* Slide Navigation Dots */}
            {uploadedSlideshows[0].slides.length > 1 && (
              <div className="flex justify-center gap-1">
                {uploadedSlideshows[0].slides.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentSlide ? "bg-blue-500" : "bg-gray-300"
                    }`}
                    onClick={() => setCurrentSlide(index)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
