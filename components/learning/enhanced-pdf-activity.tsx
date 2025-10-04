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
  File,
  Download,
  Eye,
  Bookmark,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Share2,
  CheckCircle,
  Clock,
  Star,
  MessageSquare,
  Highlighter,
  BookOpen,
  Target,
  Brain,
  AlertCircle,
} from "lucide-react";

interface EnhancedPDFActivityProps {
  activity: {
    id: string;
    title: string;
    description: string;
    content: {
      document_url: string;
      document_metadata?: {
        pages: number;
        size: string;
        type: string;
      };
      interactive_elements?: {
        annotations: Array<{
          id: string;
          page: number;
          type: "highlight" | "note" | "bookmark";
          content: string;
          position: { x: number; y: number };
          timestamp: string;
        }>;
        bookmarks: Array<{
          id: string;
          page: number;
          title: string;
          description: string;
        }>;
        highlights: Array<{
          id: string;
          page: number;
          text: string;
          color: string;
          note?: string;
        }>;
      };
      assessment?: {
        comprehension_questions: Array<{
          id: string;
          question: string;
          page_reference: number;
          answer: string;
        }>;
        reflection_prompts: string[];
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
  type: "highlight" | "note" | "bookmark";
  content: string;
  position: { x: number; y: number };
  timestamp: string;
}

interface Bookmark {
  id: string;
  page: number;
  title: string;
  description: string;
}

export default function EnhancedPDFActivity({
  activity,
  onComplete,
}: EnhancedPDFActivityProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    activity.content.document_metadata?.pages || 1
  );
  const [zoom, setZoom] = useState(100);
  const [annotations, setAnnotations] = useState<Annotation[]>(
    activity.content.interactive_elements?.annotations || []
  );
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(
    activity.content.interactive_elements?.bookmarks || []
  );
  const [highlights, setHighlights] = useState(
    activity.content.interactive_elements?.highlights || []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [completionTime, setCompletionTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null);
  const [newBookmark, setNewBookmark] = useState({
    title: "",
    description: "",
  });
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);

  const pdfRef = useRef<HTMLIFrameElement>(null);
  const startTimeRef = useRef<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - startTimeRef.current.getTime()) / 1000
      );
      setCompletionTime(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Calculate reading progress based on page and time
    const progress = Math.min(100, (currentPage / totalPages) * 100);
    setReadingProgress(progress);

    // Auto-complete if user has read most of the document
    if (progress >= 90 && !isCompleted) {
      completeActivity();
    }
  }, [currentPage, totalPages, isCompleted]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(50, Math.min(200, newZoom)));
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      // Simulate search results
      const results = Array.from(
        { length: Math.floor(Math.random() * 5) + 1 },
        (_, i) => Math.floor(Math.random() * totalPages) + 1
      );
      setSearchResults(results);
      setCurrentSearchIndex(0);
    } else {
      setSearchResults([]);
    }
  };

  const goToSearchResult = (index: number) => {
    if (searchResults[index]) {
      setCurrentPage(searchResults[index]);
      setCurrentSearchIndex(index);
    }
  };

  const addAnnotation = (
    type: "highlight" | "note" | "bookmark",
    content: string
  ) => {
    const annotation: Annotation = {
      id: Date.now().toString(),
      page: currentPage,
      type,
      content,
      position: { x: Math.random() * 100, y: Math.random() * 100 },
      timestamp: new Date().toISOString(),
    };
    setAnnotations((prev) => [...prev, annotation]);
  };

  const addBookmark = () => {
    if (newBookmark.title.trim()) {
      const bookmark: Bookmark = {
        id: Date.now().toString(),
        page: currentPage,
        title: newBookmark.title,
        description: newBookmark.description,
      };
      setBookmarks((prev) => [...prev, bookmark]);
      setNewBookmark({ title: "", description: "" });
      setShowBookmarkDialog(false);
    }
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
  };

  const deleteBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
  };

  const completeActivity = () => {
    setIsCompleted(true);
    setIsReading(false);
    const points = Math.round((readingProgress / 100) * activity.points);
    onComplete(points);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPageAnnotations = (page: number) => {
    return annotations.filter((ann) => ann.page === page);
  };

  const getPageBookmarks = (page: number) => {
    return bookmarks.filter((bookmark) => bookmark.page === page);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <File className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{activity.title}</h2>
              <p className="text-sm text-gray-600">PDF Document Activity</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">
                {readingProgress.toFixed(1)}% Complete
              </div>
              <Progress value={readingProgress} className="w-24 h-2" />
            </div>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(completionTime)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 flex flex-col">
          {/* PDF Controls */}
          <div className="bg-white border-b p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  ←
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  →
                </Button>
              </div>

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

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search in document..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-48"
                />
                {searchResults.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {currentSearchIndex + 1} of {searchResults.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* PDF Content */}
          <div className="flex-1 bg-gray-100 p-4">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full">
              <iframe
                ref={pdfRef}
                src={`${activity.content.document_url}#page=${currentPage}&zoom=${zoom}`}
                className="w-full h-full border-0"
                title={activity.title}
              />
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="bg-white border-t p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBookmarkDialog(true)}
                >
                  <Bookmark className="h-4 w-4 mr-1" />
                  Bookmark
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addAnnotation("note", "Note at page " + currentPage)
                  }
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addAnnotation("highlight", "Highlighted text")}
                >
                  <Highlighter className="h-4 w-4 mr-1" />
                  Highlight
                </Button>
              </div>

              <Button
                onClick={completeActivity}
                disabled={isCompleted}
                className="min-w-[120px]"
              >
                {isCompleted ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completed
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Complete Activity
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l overflow-y-auto">
          <Tabs defaultValue="annotations" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="annotations">Notes</TabsTrigger>
              <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
            </TabsList>

            <TabsContent value="annotations" className="p-4 space-y-4">
              <div className="space-y-3">
                {getPageAnnotations(currentPage).map((annotation) => (
                  <Card key={annotation.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {annotation.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Page {annotation.page}
                          </span>
                        </div>
                        <p className="text-sm">{annotation.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAnnotation(annotation.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="bookmarks" className="p-4 space-y-4">
              <div className="space-y-3">
                {bookmarks.map((bookmark) => (
                  <Card key={bookmark.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {bookmark.title}
                        </h4>
                        <p className="text-xs text-gray-600 mb-1">
                          Page {bookmark.page}
                        </p>
                        <p className="text-sm">{bookmark.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBookmark(bookmark.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="quiz" className="p-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Comprehension Quiz</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      Quiz questions will appear here after reading the document
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bookmark Dialog */}
      {showBookmarkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Bookmark</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newBookmark.title}
                  onChange={(e) =>
                    setNewBookmark((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Bookmark title..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newBookmark.description}
                  onChange={(e) =>
                    setNewBookmark((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addBookmark} className="flex-1">
                  Add Bookmark
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBookmarkDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
