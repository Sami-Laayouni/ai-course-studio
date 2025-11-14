"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Upload,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  Bell,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface CurriculumPageProps {
  params: Promise<{ id: string }>;
}

interface CurriculumDocument {
  id: string;
  title: string;
  file_url: string;
  file_path?: string;
  file_name: string;
  file_type: string;
  sections: any[];
  extracted_text?: string;
  processing_status?: string;
  processing_progress?: number;
  processing_error?: string;
}

interface SectionAnalytics {
  section_id: string;
  section_title: string;
  total_students: number;
  students_attempted: number;
  students_completed: number;
  average_score: number;
  common_misconceptions: any[];
  performance_insights: any;
  concept_mastery: any;
}

export default function CurriculumPage({ params }: CurriculumPageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [curriculum, setCurriculum] = useState<CurriculumDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [sectionAnalytics, setSectionAnalytics] = useState<SectionAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [sectionHighlights, setSectionHighlights] = useState<Map<string, string>>(new Map());
  const [insufficientData, setInsufficientData] = useState<any>(null);
  const [pdfViewUrl, setPdfViewUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
      loadCurriculum(resolvedParams.id);
    };
    loadParams();
  }, [params]);

  // Check status when page loads or curriculum changes (no aggressive polling)
  useEffect(() => {
    if (!curriculum?.id) return;

    // Only check status once when curriculum loads, not continuously
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/curriculum/process-jobs?curriculum_id=${curriculum.id}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.curriculum) {
            setProcessingStatus(data.curriculum.processing_status || "");
            setProcessingProgress(data.curriculum.processing_progress || 0);
            
            // Reload curriculum if processing completed
            if (data.curriculum.processing_status === "completed") {
              loadCurriculum(courseId);
            }
          }
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    };

    // Check immediately and then every 30 seconds (much less aggressive)
    checkStatus();
    const interval = setInterval(() => {
      if (curriculum && curriculum.processing_status && 
          curriculum.processing_status !== "completed" && 
          curriculum.processing_status !== "failed") {
        checkStatus();
      }
    }, 30000); // Check every 30 seconds instead of 2

    return () => clearInterval(interval);
  }, [curriculum?.id, courseId]);

  const loadCurriculum = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("curriculum_documents")
        .select("id, title, file_url, file_path, file_name, file_type, file_size, uploaded_by, extracted_text, sections, processing_status, processing_progress, processing_error, uploaded_at, created_at, updated_at")
        .eq("course_id", id)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

      if (error && error.code !== "PGRST116") {
        console.error("Error loading curriculum:", error);
      } else if (data) {
        setCurriculum(data);
        setProcessingStatus(data.processing_status || "");
        setProcessingProgress(data.processing_progress || 0);
        
        // Generate fresh signed URL for PDF viewing if needed
        if (data.file_type === "pdf" && data.file_path) {
          generatePdfViewUrl(data.file_path);
        } else if (data.file_type === "pdf" && data.file_url) {
          // Use existing URL if no file_path
          setPdfViewUrl(data.file_url);
        }
        
        if (data.sections && data.sections.length > 0) {
          const firstSectionId = data.sections[0].id || data.sections[0].title;
          setSelectedSection(firstSectionId);
          // Load analytics for first section if processing is complete
          if (data.processing_status === "completed") {
            // Load analytics for the first section
            setTimeout(() => {
              loadSectionAnalytics(firstSectionId, data.id);
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error("Error loading curriculum:", error);
    }
  };

  const loadSectionAnalytics = async (sectionId: string, curriculumDocId: string) => {
    setIsLoadingAnalytics(true);
    setInsufficientData(null);
    try {
      // First try to load existing analytics from database
      const { data, error } = await supabase
        .from("curriculum_analytics")
        .select("*")
        .eq("curriculum_document_id", curriculumDocId)
        .eq("section_id", sectionId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading analytics:", error);
      } else if (data) {
        const analytics = {
          section_id: data.section_id,
          section_title: data.section_id,
          total_students: data.total_students || 0,
          students_attempted: data.students_attempted || 0,
          students_completed: data.students_completed || 0,
          average_score: data.average_score || 0,
          common_misconceptions: data.common_misconceptions || [],
          performance_insights: data.performance_insights || {},
          concept_mastery: data.concept_mastery || {},
        };
        setSectionAnalytics(analytics);
        updateSectionHighlights(analytics);
        return;
      }
      
      // If no analytics exist, try to calculate them
      if (curriculum) {
        await calculateAnalytics(curriculum.id);
      } else {
        setSectionAnalytics(null);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("❌ [FRONTEND] No file selected");
      return;
    }

    console.log("📤 [FRONTEND] Starting file upload:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      courseId: courseId,
    });

    setIsUploading(true);
    setProcessingStatus("uploading");
    setProcessingProgress(5);
    
    try {
      // Step 1: Get signed URL for upload
      console.log("📤 [FRONTEND] Step 1: Getting upload URL...");
      const uploadUrlResponse = await fetch("/api/curriculum/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          courseId,
          contentType: file.type || "application/octet-stream", // Send the actual file type
        }),
      });

      console.log("📤 [FRONTEND] Upload URL response status:", uploadUrlResponse.status);

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json().catch(() => ({}));
        console.error("❌ [FRONTEND] Failed to get upload URL:", errorData);
        throw new Error(`Failed to get upload URL: ${errorData.error || uploadUrlResponse.statusText} (Status: ${uploadUrlResponse.status})`);
      }

      const { url, filePath } = await uploadUrlResponse.json();
      console.log("✅ [FRONTEND] Upload URL received. File path:", filePath);
      setProcessingProgress(20);

      // Step 2: Upload file directly to GCS using signed URL
      console.log("📤 [FRONTEND] Step 2: Uploading file to GCS...");
      console.log("📤 [FRONTEND] Upload URL length:", url.length);
      console.log("📤 [FRONTEND] File size:", file.size, "bytes");
      
      // IMPORTANT: The Content-Type header MUST match exactly what was used to sign the URL
      // The backend signed the URL with the contentType from the request, so we use the same
      const uploadContentType = file.type || "application/octet-stream";
      console.log("📤 [FRONTEND] Uploading with Content-Type:", uploadContentType);
      
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": uploadContentType, // Must match the signed URL's contentType
        },
      });

      console.log("📤 [FRONTEND] GCS upload response status:", uploadResponse.status);
      console.log("📤 [FRONTEND] GCS upload response statusText:", uploadResponse.statusText);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("❌ [FRONTEND] Failed to upload file to GCS:", errorText);
        console.error("❌ [FRONTEND] Response headers:", Object.fromEntries(uploadResponse.headers.entries()));
        throw new Error(`Failed to upload file to storage: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log("✅ [FRONTEND] File uploaded to GCS successfully");
      setProcessingProgress(40);

      // Step 3: Notify backend to process the uploaded file
      console.log("📤 [FRONTEND] Step 3: Notifying backend to process file...");
      const processPayload = {
        filePath,
        title: uploadTitle || file.name,
        fileSize: file.size,
        contentType: file.type,
      };
      console.log("📤 [FRONTEND] Process payload:", processPayload);
      
      const processResponse = await fetch(`/api/courses/${courseId}/curriculum/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processPayload),
      });

      console.log("📤 [FRONTEND] Process response status:", processResponse.status);

      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({}));
        console.error("❌ [FRONTEND] Failed to process uploaded file:", errorData);
        console.error("❌ [FRONTEND] Response status:", processResponse.status);
        throw new Error(`Failed to process uploaded file: ${errorData.error || processResponse.statusText} (Status: ${processResponse.status})`);
      }

      setProcessingProgress(100);

      const data = await processResponse.json();
      console.log("✅ [FRONTEND] File uploaded successfully. Curriculum ID:", data.curriculum?.id);
      console.log("📤 [FRONTEND] Curriculum data:", {
        id: data.curriculum?.id,
        title: data.curriculum?.title,
        processing_status: data.curriculum?.processing_status,
      });
      
      setCurriculum(data.curriculum);
      setProcessingStatus(data.curriculum.processing_status || "pending");
      setProcessingProgress(data.curriculum.processing_progress || 0);
      
      // Don't set selected section yet - wait for processing to complete
      // Background processing will happen automatically via job queue
      // User will be notified when it's ready
      console.log("✅ [FRONTEND] Upload completed! Processing will happen in the background.");
    } catch (error: any) {
      console.error("❌ [FRONTEND] Upload error:", error);
      console.error("❌ [FRONTEND] Error message:", error.message);
      console.error("❌ [FRONTEND] Error stack:", error.stack);
      setProcessingStatus("failed");
      alert(`Failed to upload curriculum: ${error.message || "Unknown error"}\n\nCheck the browser console and server logs for details.`);
    } finally {
      setIsUploading(false);
      setUploadTitle("");
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const calculateAnalytics = async (curriculumId: string) => {
    setIsLoadingAnalytics(true);
    setInsufficientData(null);
    try {
      const response = await fetch(`/api/courses/${courseId}/curriculum/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curriculum_id: curriculumId }),
      });

      const data = await response.json();
      
      if (data.insufficient_data) {
        setInsufficientData(data.requirements);
        setSectionAnalytics(null);
      } else if (response.ok && data.analytics) {
        if (selectedSection) {
          const sectionData = data.analytics.find(
            (a: any) => a.section_id === selectedSection
          );
          if (sectionData) {
            setSectionAnalytics(sectionData);
          }
        }
      }
    } catch (error) {
      console.error("Error calculating analytics:", error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleSectionSelect = async (sectionId: string) => {
    setSelectedSection(sectionId);
    if (curriculum?.id) {
      await loadSectionAnalytics(sectionId, curriculum.id);
    }
  };

  const generatePdfViewUrl = async (filePath: string) => {
    try {
      const response = await fetch("/api/curriculum/get-view-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
      
      if (response.ok) {
        const { url } = await response.json();
        setPdfViewUrl(url);
        setPdfError(null);
      } else {
        setPdfError("Failed to generate PDF view URL");
      }
    } catch (error) {
      console.error("Error generating PDF view URL:", error);
      setPdfError("Error loading PDF");
    }
  };

  const updateSectionHighlights = (analytics: SectionAnalytics) => {
    const highlights = new Map<string, string>();
    
    // Green for concepts students understand well (score > 70%)
    if (analytics.performance_insights?.strong_concepts) {
      analytics.performance_insights.strong_concepts.forEach((concept: string) => {
        highlights.set(concept.toLowerCase(), "green");
      });
    }
    
    // Red for concepts students struggle with (score < 50%)
    if (analytics.performance_insights?.weak_concepts) {
      analytics.performance_insights.weak_concepts.forEach((concept: string) => {
        highlights.set(concept.toLowerCase(), "red");
      });
    }
    
    // Also highlight based on concept mastery
    if (analytics.concept_mastery) {
      Object.entries(analytics.concept_mastery).forEach(([concept, mastery]: [string, any]) => {
        const masteryPercent = typeof mastery === "number" ? mastery : parseFloat(mastery) || 0;
        if (masteryPercent >= 70) {
          highlights.set(concept.toLowerCase(), "green");
        } else if (masteryPercent < 50) {
          highlights.set(concept.toLowerCase(), "red");
        }
      });
    }
    
    setSectionHighlights(highlights);
  };

  if (!courseId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={`/dashboard/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold mb-1">Improve Curriculum</h1>
          <p className="text-sm text-muted-foreground">
            Upload curriculum documents and analyze student performance
          </p>
        </div>

        {!curriculum ? (
          <Card className="p-8">
            <div className="max-w-xl mx-auto text-center">
              <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Upload Your Curriculum
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Upload a PDF, Word document, or PowerPoint presentation. We'll analyze it and map it to your activities.
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="curriculum-title">Document Title (Optional)</Label>
                  <Input
                    id="curriculum-title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g., Grade 10 Biology Curriculum"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="curriculum-file">Upload Curriculum</Label>
                  <Input
                    id="curriculum-file"
                    type="file"
                    accept=".pdf,.docx,.pptx"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="mt-1"
                  />
                </div>
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading curriculum...
                    </div>
                    <Progress value={10} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Curriculum Document Viewer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{curriculum.title}</span>
                  <div className="flex items-center gap-2">
                    {processingStatus === "pending" && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Queued for Processing
                      </Badge>
                    )}
                    {processingStatus && processingStatus !== "completed" && processingStatus !== "failed" && processingStatus !== "pending" && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing...
                      </Badge>
                    )}
                    {processingStatus === "completed" && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                    {processingStatus === "failed" && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                    <Badge variant="outline">{curriculum.file_type.toUpperCase()}</Badge>
                  </div>
                </CardTitle>
                {processingStatus && processingStatus !== "completed" && processingStatus !== "failed" && (
                  <div className="mt-2">
                    <Progress value={processingProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {processingProgress}% complete
                    </p>
                  </div>
                )}
                    {processingStatus === "failed" && curriculum.processing_error && (
                      <div className="mt-2 space-y-2">
                        <div className="p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-700">
                          {curriculum.processing_error}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            // Retry processing
                            await fetch("/api/curriculum/process-jobs", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ max_jobs: 1 }),
                            });
                            setProcessingStatus("pending");
                            setProcessingProgress(0);
                          }}
                        >
                          Retry Processing
                        </Button>
                      </div>
                    )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Document Preview with Highlighting */}
                  <div className="border rounded-lg p-3 bg-muted/30 min-h-[500px] max-h-[700px] overflow-auto relative">
                    {curriculum.file_type === "pdf" ? (
                      <div className="relative h-full w-full">
                        {pdfError ? (
                          <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center space-y-3">
                            <AlertCircle className="h-12 w-12 text-muted-foreground" />
                            <div>
                              <h3 className="text-sm font-medium mb-1">Error Loading PDF</h3>
                              <p className="text-xs text-muted-foreground mb-3">{pdfError}</p>
                              <div className="flex gap-2 justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (curriculum.file_path) {
                                      generatePdfViewUrl(curriculum.file_path);
                                    } else if (curriculum.file_url) {
                                      window.open(curriculum.file_url, "_blank");
                                    }
                                  }}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1.5" />
                                  Retry
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const url = pdfViewUrl || curriculum.file_url;
                                    if (url) window.open(url, "_blank");
                                  }}
                                >
                                  Open in New Tab
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : pdfViewUrl ? (
                          <>
                            {/* Try Google Docs Viewer first, then fallback to direct PDF */}
                            <iframe
                              src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfViewUrl)}&embedded=true`}
                              className="w-full h-full min-h-[500px] border-0"
                              title="Curriculum Document"
                              onError={() => {
                                // If Google Docs Viewer fails, try direct PDF
                                const iframe = document.querySelector('iframe[title="Curriculum Document"]') as HTMLIFrameElement;
                                if (iframe) {
                                  iframe.src = pdfViewUrl;
                                  iframe.onerror = () => {
                                    setPdfError("PDF cannot be displayed inline. Please use 'Open in New Tab'.");
                                  };
                                }
                              }}
                            />
                            {/* Fallback button */}
                            <div className="absolute top-3 right-3 z-10 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs bg-background/90 backdrop-blur-sm"
                                onClick={() => window.open(pdfViewUrl, "_blank")}
                              >
                                <ExternalLink className="h-3 w-3 mr-1.5" />
                                Open in New Tab
                              </Button>
                            </div>
                            {/* Performance Indicators Overlay */}
                            {sectionHighlights.size > 0 && (
                              <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm p-2 rounded border text-xs z-10 shadow-sm">
                                <div className="font-medium mb-1.5">Performance</div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Well understood (≥70%)</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span>Struggling (&lt;50%)</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[500px]">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Preview not available for {curriculum.file_type.toUpperCase()} files.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => window.open(curriculum.file_url, "_blank")}
                        >
                          Open Document
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Sections List with Performance Indicators */}
                  {curriculum.sections && curriculum.sections.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sections</Label>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {curriculum.sections.map((section: any, index: number) => {
                          const sectionId = section.id || section.title || `section_${index}`;
                          const isSelected = selectedSection === sectionId;
                          
                          // Get section performance indicator
                          let sectionColor = "";
                          if (sectionAnalytics && sectionAnalytics.section_id === sectionId) {
                            if (sectionAnalytics.average_score >= 70) {
                              sectionColor = "border-l-4 border-l-green-500";
                            } else if (sectionAnalytics.average_score < 50) {
                              sectionColor = "border-l-4 border-l-red-500";
                            }
                          }
                          
                          return (
                            <button
                              key={sectionId}
                              onClick={() => handleSectionSelect(sectionId)}
                              className={`w-full text-left p-2.5 rounded-md border transition-colors ${sectionColor} ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{section.title || `Section ${index + 1}`}</span>
                                <div className="flex items-center gap-2">
                                  {section.pageNumber && (
                                    <Badge variant="outline" className="ml-2">
                                      Page {section.pageNumber}
                                    </Badge>
                                  )}
                                  {sectionAnalytics && sectionAnalytics.section_id === sectionId && (
                                    <>
                                      {sectionAnalytics.average_score >= 70 && (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      )}
                                      {sectionAnalytics.average_score < 50 && (
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Analytics Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Performance Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {processingStatus && processingStatus !== "completed" && processingStatus !== "failed" ? (
                  <div className="text-center py-20 space-y-6">
                    <div className="space-y-4">
                      <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Analysis in Progress</h3>
                        <p className="text-muted-foreground mb-4">
                          Your curriculum is being analyzed in the background. This process includes:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto mb-6">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Extracting text and structure from your document
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Identifying curriculum sections and concepts
                          </li>
                          <li className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Mapping activities to curriculum sections
                          </li>
                          <li className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Calculating performance analytics
                          </li>
                        </ul>
                      </div>
                      <Progress value={processingProgress} className="w-full max-w-md mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        {processingProgress}% complete
                      </p>
                    </div>
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 max-w-md mx-auto">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                              We'll notify you when it's ready!
                            </h4>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              You can safely close this page. We'll send you a notification when your curriculum analysis is complete and ready to view.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" asChild>
                        <Link href={`/dashboard/courses/${courseId}`}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back to Course
                        </Link>
                      </Button>
                      <Button variant="outline" onClick={() => loadCurriculum(courseId)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Status
                      </Button>
                    </div>
                  </div>
                ) : !selectedSection ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p>Select a section to view analytics</p>
                  </div>
                ) : insufficientData ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center mx-auto">
                      <AlertCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold mb-1">Not Enough Data Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        We need more student activity data to generate meaningful analytics.
                      </p>
                      <Card className="max-w-sm mx-auto">
                        <CardContent className="pt-4">
                          <div className="space-y-3 text-left">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">Activities</span>
                                <span className={`text-xs font-medium ${insufficientData.current_activities >= insufficientData.min_activities ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {insufficientData.current_activities} / {insufficientData.min_activities}
                                </span>
                              </div>
                              <Progress 
                                value={(insufficientData.current_activities / insufficientData.min_activities) * 100} 
                                className="h-1.5"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">Student Plays</span>
                                <span className={`text-xs font-medium ${insufficientData.current_student_plays >= insufficientData.min_student_plays ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {insufficientData.current_student_plays} / {insufficientData.min_student_plays}
                                </span>
                              </div>
                              <Progress 
                                value={(insufficientData.current_student_plays / insufficientData.min_student_plays) * 100} 
                                className="h-1.5"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <p className="text-xs text-muted-foreground mt-3">
                        Need {insufficientData.min_activities} activities and {insufficientData.min_student_plays} student plays
                      </p>
                    </div>
                  </div>
                ) : isLoadingAnalytics ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Loading analytics...</p>
                  </div>
                ) : sectionAnalytics ? (
                  <div className="space-y-4">
                    {/* Overview Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 border rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Total Students</div>
                        <div className="text-2xl font-semibold">{sectionAnalytics.total_students}</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Completion Rate</div>
                        <div className="text-2xl font-semibold">
                          {sectionAnalytics.total_students > 0
                            ? Math.round(
                                (sectionAnalytics.students_completed / sectionAnalytics.total_students) * 100
                              )
                            : 0}
                          %
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Average Score</div>
                        <div className="text-2xl font-semibold">
                          {Math.round(sectionAnalytics.average_score)}%
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Attempt Rate</div>
                        <div className="text-2xl font-semibold">
                          {sectionAnalytics.total_students > 0
                            ? Math.round(
                                (sectionAnalytics.students_attempted / sectionAnalytics.total_students) * 100
                              )
                            : 0}
                          %
                        </div>
                      </div>
                    </div>

                    {/* Performance Insights */}
                    {sectionAnalytics.performance_insights && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Performance Insights</Label>
                        {sectionAnalytics.performance_insights.strong_concepts && (
                          <div className="p-3 border rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Students Understand Well</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-sm text-muted-foreground">
                              {sectionAnalytics.performance_insights.strong_concepts.map(
                                (concept: string, i: number) => (
                                  <li key={i}>{concept}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                        {sectionAnalytics.performance_insights.weak_concepts && (
                          <div className="p-3 border rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium">Students Struggle With</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-sm text-muted-foreground">
                              {sectionAnalytics.performance_insights.weak_concepts.map(
                                (concept: string, i: number) => (
                                  <li key={i}>{concept}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Common Misconceptions */}
                    {sectionAnalytics.common_misconceptions &&
                      sectionAnalytics.common_misconceptions.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Common Misconceptions</Label>
                          <div className="space-y-2">
                            {sectionAnalytics.common_misconceptions.map(
                              (misconception: any, i: number) => (
                                <div
                                  key={i}
                                  className="p-3 border rounded-lg bg-muted/30"
                                >
                                  <div className="text-sm font-medium mb-1">
                                    {misconception.concept || "Unknown Concept"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {misconception.description || misconception.misconception}
                                  </div>
                                  {misconception.frequency && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Affects {misconception.frequency}% of students
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Suggestions */}
                    {sectionAnalytics.performance_insights?.suggestions && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Suggestions</Label>
                        <div className="p-3 border rounded-lg bg-muted/30">
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {sectionAnalytics.performance_insights.suggestions.map(
                              (suggestion: string, i: number) => (
                                <li key={i}>{suggestion}</li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p>No analytics available for this section yet.</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => curriculum && calculateAnalytics(curriculum.id)}
                    >
                      Calculate Analytics
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

