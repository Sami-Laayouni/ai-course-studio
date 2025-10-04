"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Search,
  BookOpen,
  MessageSquare,
  CheckCircle,
  Clock,
  Star,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Share2,
  Bookmark,
  BookmarkCheck,
  Highlighter,
  StickyNote,
  Eye,
  EyeOff,
} from "lucide-react";

interface PDFActivityProps {
  activity: {
    id: string;
    title: string;
    description: string;
    content: {
      pdf_url: string;
      pdf_metadata?: {
        pages: number;
        file_size: string;
        upload_date: string;
      };
      reading_guide?: {
        pre_reading: string[];
        during_reading: string[];
        post_reading: string[];
      };
      interactive_features?: {
        highlighting: boolean;
        annotations: boolean;
        vocabulary_support: boolean;
        comprehension_checks: boolean;
      };
      collaboration?: {
        discussion_questions: string[];
        peer_annotations: boolean;
        group_summary: boolean;
      };
    };
    points: number;
    estimated_duration: number;
  };
  onComplete: (points: number) => void;
}

interface Annotation {
  id: string;
  page: number;
  x: number;
  y: number;
  content: string;
  type: "note" | "highlight" | "bookmark";
  color?: string;
}

interface Vocabulary {
  term: string;
  definition: string;
  context: string;
}

export default function PDFActivity({
  activity,
  onComplete,
}: PDFActivityProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    activity.content.pdf_metadata?.pages || 1
  );
  const [zoom, setZoom] = useState(100);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedText, setSelectedText] = useState("");
  const [newAnnotation, setNewAnnotation] = useState("");
  const [annotationType, setAnnotationType] = useState<"note" | "highlight">(
    "note"
  );
  const [highlightColor, setHighlightColor] = useState("#ffff00");

  const pdfRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate loading PDF metadata
    if (activity.content.pdf_metadata) {
      setTotalPages(activity.content.pdf_metadata.pages);
    }
  }, [activity.content.pdf_metadata]);

  useEffect(() => {
    // Calculate reading progress based on current page
    const progress = (currentPage / totalPages) * 100;
    setReadingProgress(progress);
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(50, Math.min(200, newZoom)));
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) return;

    // Simulate search results
    const results = [
      { page: 1, context: "Sample context with search term..." },
      { page: 3, context: "Another context with search term..." },
      { page: 5, context: "More context with search term..." },
    ];
    setSearchResults(results);
  };

  const addAnnotation = () => {
    if (!newAnnotation.trim()) return;

    const annotation: Annotation = {
      id: Date.now().toString(),
      page: currentPage,
      x: 100, // Simulated position
      y: 100,
      content: newAnnotation,
      type: annotationType,
      color: annotationType === "highlight" ? highlightColor : undefined,
    };

    setAnnotations((prev) => [...prev, annotation]);
    setNewAnnotation("");
  };

  const toggleBookmark = (page: number) => {
    setBookmarks((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const addVocabularyTerm = (term: string, definition: string) => {
    const vocab: Vocabulary = {
      term,
      definition,
      context: selectedText || "No context available",
    };
    setVocabulary((prev) => [...prev, vocab]);
  };

  const completeActivity = () => {
    setIsCompleted(true);
    onComplete(activity.points);
  };

  const getPageAnnotations = (page: number) => {
    return annotations.filter((ann) => ann.page === page);
  };

  const getPageBookmarks = (page: number) => {
    return bookmarks.includes(page);
  };

  return (
    <div className="space-y-6">
      {/* PDF Viewer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {activity.title}
              </CardTitle>
              <CardDescription>{activity.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnnotations(!showAnnotations)}
              >
                {showAnnotations ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showAnnotations ? "Hide" : "Show"} Annotations
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="relative">
            {/* PDF Controls */}
            <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  ← Previous
                </Button>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={currentPage}
                    onChange={(e) => handlePageChange(Number(e.target.value))}
                    className="w-16 text-center"
                    min={1}
                    max={totalPages}
                  />
                  <span className="text-sm text-muted-foreground">
                    of {totalPages}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next →
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleZoomChange(zoom - 10)}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm w-12 text-center">{zoom}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleZoomChange(zoom + 10)}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleBookmark(currentPage)}
                >
                  {getPageBookmarks(currentPage) ? (
                    <BookmarkCheck className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* PDF Container */}
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <iframe
                ref={pdfRef}
                src={`${activity.content.pdf_url}#page=${currentPage}&zoom=${zoom}`}
                className="w-full h-[600px]"
                title={activity.title}
              />
            </div>

            {/* Reading Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Reading Progress</span>
                <span>{Math.round(readingProgress)}%</span>
              </div>
              <Progress value={readingProgress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="annotations" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="annotations">Annotations</TabsTrigger>
              <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="annotations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StickyNote className="h-5 w-5" />
                    My Annotations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Add Annotation */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={annotationType}
                          onChange={(e) =>
                            setAnnotationType(e.target.value as any)
                          }
                          className="px-3 py-2 border rounded-md"
                        >
                          <option value="note">Note</option>
                          <option value="highlight">Highlight</option>
                        </select>
                        {annotationType === "highlight" && (
                          <input
                            type="color"
                            value={highlightColor}
                            onChange={(e) => setHighlightColor(e.target.value)}
                            className="w-10 h-8 border rounded"
                          />
                        )}
                        <Input
                          value={newAnnotation}
                          onChange={(e) => setNewAnnotation(e.target.value)}
                          placeholder="Add annotation..."
                          onKeyPress={(e) =>
                            e.key === "Enter" && addAnnotation()
                          }
                        />
                        <Button onClick={addAnnotation} size="sm">
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Annotations List */}
                    <div className="space-y-3">
                      {annotations.map((annotation) => (
                        <div
                          key={annotation.id}
                          className="flex gap-3 p-3 border rounded-lg"
                        >
                          <div
                            className={`w-4 h-4 rounded ${
                              annotation.type === "highlight"
                                ? "bg-yellow-200"
                                : "bg-blue-200"
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                Page {annotation.page}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {annotation.type}
                              </Badge>
                            </div>
                            <p className="text-sm">{annotation.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vocabulary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Vocabulary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Add Vocabulary */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Term"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              const term = e.currentTarget.value;
                              const definition =
                                (e.target as any).nextElementSibling?.value ||
                                "";
                              if (term) {
                                addVocabularyTerm(term, definition);
                                e.currentTarget.value = "";
                                (e.target as any).nextElementSibling.value = "";
                              }
                            }
                          }}
                        />
                        <Input
                          placeholder="Definition"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              const definition = e.currentTarget.value;
                              const term =
                                (e.target as any).previousElementSibling
                                  ?.value || "";
                              if (term) {
                                addVocabularyTerm(term, definition);
                                e.currentTarget.value = "";
                                (e.target as any).previousElementSibling.value =
                                  "";
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Vocabulary List */}
                    <div className="space-y-3">
                      {vocabulary.map((vocab, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="font-medium">{vocab.term}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {vocab.definition}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Context: {vocab.context}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search for text in the document..."
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <Button onClick={handleSearch}>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </Button>
                    </div>

                    {/* Search Results */}
                    <div className="space-y-2">
                      {searchResults.map((result, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">Page {result.page}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCurrentPage(result.page)}
                            >
                              Go to Page
                            </Button>
                          </div>
                          <p className="text-sm">{result.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discussion" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Discussion Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activity.content.collaboration?.discussion_questions?.map(
                      (question, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">{question}</h4>
                          <Textarea
                            placeholder="Share your thoughts..."
                            className="min-h-[80px]"
                          />
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reading Guide */}
          {activity.content.reading_guide && (
            <Card>
              <CardHeader>
                <CardTitle>Reading Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activity.content.reading_guide.pre_reading && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Before Reading</h4>
                    <ul className="text-xs space-y-1">
                      {activity.content.reading_guide.pre_reading.map(
                        (item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {activity.content.reading_guide.during_reading && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">While Reading</h4>
                    <ul className="text-xs space-y-1">
                      {activity.content.reading_guide.during_reading.map(
                        (item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {activity.content.reading_guide.post_reading && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">After Reading</h4>
                    <ul className="text-xs space-y-1">
                      {activity.content.reading_guide.post_reading.map(
                        (item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bookmarks */}
          <Card>
            <CardHeader>
              <CardTitle>Bookmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bookmarks.length > 0 ? (
                  bookmarks.map((page) => (
                    <div
                      key={page}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm">Page {page}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        Go to
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No bookmarks yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Info */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Duration: {activity.estimated_duration} min
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Points: {activity.points}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Pages: {totalPages}</span>
              </div>
            </CardContent>
          </Card>

          {/* Completion Status */}
          <Card>
            <CardContent className="pt-6">
              {isCompleted ? (
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-600">
                    Activity Completed!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You earned {activity.points} points
                  </p>
                </div>
              ) : (
                <Button
                  onClick={completeActivity}
                  className="w-full"
                  disabled={readingProgress < 90}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Activity
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
