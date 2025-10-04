"use client";

import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Play,
  Plus,
  Search,
  Check,
  X,
  BookOpen,
  Video,
  File,
} from "lucide-react";

interface ContextSource {
  id: string;
  type: "pdf" | "youtube";
  title: string;
  url?: string;
  filename?: string;
  summary?: string;
  key_points?: string[];
  key_concepts?: string[];
  thumbnail?: string;
}

interface ContextSelectorProps {
  onContextSelected: (sources: ContextSource[]) => void;
  selectedSources: ContextSource[];
  courseId: string;
}

export default function ContextSelector({
  onContextSelected,
  selectedSources,
  courseId,
}: ContextSelectorProps) {
  const [availableSources, setAvailableSources] = useState<ContextSource[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newYouTubeUrl, setNewYouTubeUrl] = useState("");
  const [isAddingYouTube, setIsAddingYouTube] = useState(false);

  useEffect(() => {
    loadAvailableSources();
  }, [courseId]);

  const loadAvailableSources = async () => {
    setIsLoading(true);
    try {
      // Load PDFs and YouTube videos from the course
      const response = await fetch(`/api/courses/${courseId}/context-sources`);
      const data = await response.json();
      setAvailableSources(data.sources || []);
    } catch (error) {
      console.error("Error loading context sources:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addYouTubeVideo = async () => {
    if (!newYouTubeUrl.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/extract-youtube-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newYouTubeUrl,
          courseId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newSource: ContextSource = {
          id: data.source.id,
          type: "youtube",
          title: data.source.title,
          url: newYouTubeUrl,
          summary: data.source.summary,
          key_concepts: data.source.key_concepts,
          thumbnail: data.source.thumbnail,
        };

        setAvailableSources((prev) => [...prev, newSource]);
        setNewYouTubeUrl("");
        setIsAddingYouTube(false);
      }
    } catch (error) {
      console.error("Error adding YouTube video:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSourceSelection = (source: ContextSource) => {
    const isSelected = selectedSources.some((s) => s.id === source.id);
    
    if (isSelected) {
      onContextSelected(selectedSources.filter((s) => s.id !== source.id));
    } else {
      onContextSelected([...selectedSources, source]);
    }
  };

  const filteredSources = availableSources.filter((source) =>
    source.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pdfSources = filteredSources.filter((source) => source.type === "pdf");
  const youtubeSources = filteredSources.filter((source) => source.type === "youtube");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Select Context Sources
        </CardTitle>
        <CardDescription>
          Choose PDFs and YouTube videos to provide context for the AI chatbot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search context sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Add YouTube Video */}
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => setIsAddingYouTube(!isAddingYouTube)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add YouTube Video
            </Button>
            
            {isAddingYouTube && (
              <div className="space-y-2 p-4 border rounded-lg">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="youtube-url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={newYouTubeUrl}
                    onChange={(e) => setNewYouTubeUrl(e.target.value)}
                  />
                  <Button onClick={addYouTubeVideo} disabled={isLoading}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Selected Sources */}
          {selectedSources.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Sources ({selectedSources.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedSources.map((source) => (
                  <Badge
                    key={source.id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {source.type === "pdf" ? (
                      <File className="h-3 w-3" />
                    ) : (
                      <Video className="h-3 w-3" />
                    )}
                    {source.title}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => toggleSourceSelection(source)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available Sources */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Sources</TabsTrigger>
              <TabsTrigger value="pdfs">PDFs</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2">
              {isLoading ? (
                <div className="text-center py-4">Loading sources...</div>
              ) : filteredSources.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No sources found
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredSources.map((source) => {
                    const isSelected = selectedSources.some((s) => s.id === source.id);
                    return (
                      <Card
                        key={source.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "ring-2 ring-primary" : "hover:bg-muted"
                        }`}
                        onClick={() => toggleSourceSelection(source)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              {source.type === "pdf" ? (
                                <FileText className="h-5 w-5 text-red-500" />
                              ) : (
                                <Play className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">
                                  {source.title}
                                </h4>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              {source.summary && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {source.summary}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {source.type === "pdf" ? "PDF" : "Video"}
                                </Badge>
                                {source.key_points && source.key_points.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {source.key_points.length} key points
                                  </span>
                                )}
                                {source.key_concepts && source.key_concepts.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {source.key_concepts.length} concepts
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pdfs" className="space-y-2">
              {pdfSources.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No PDFs found
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pdfSources.map((source) => {
                    const isSelected = selectedSources.some((s) => s.id === source.id);
                    return (
                      <Card
                        key={source.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "ring-2 ring-primary" : "hover:bg-muted"
                        }`}
                        onClick={() => toggleSourceSelection(source)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">
                                  {source.title}
                                </h4>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              {source.summary && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {source.summary}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="videos" className="space-y-2">
              {youtubeSources.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No videos found
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {youtubeSources.map((source) => {
                    const isSelected = selectedSources.some((s) => s.id === source.id);
                    return (
                      <Card
                        key={source.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "ring-2 ring-primary" : "hover:bg-muted"
                        }`}
                        onClick={() => toggleSourceSelection(source)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Play className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">
                                  {source.title}
                                </h4>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              {source.summary && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {source.summary}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
