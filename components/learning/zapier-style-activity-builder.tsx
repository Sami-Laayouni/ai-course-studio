"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { generateUUID } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Settings,
  Zap,
  ArrowRight,
  ArrowLeft,
  Target,
  Brain,
  Gamepad2,
  Users,
  FileText,
  Video,
  CheckCircle,
  Clock,
  Star,
  Move,
  Copy,
  Edit,
  BookOpen,
  File,
  Play as PlayIcon,
  UploadCloud,
  Save,
} from "lucide-react";
import ContextSelector from "./context-selector";

interface ActivityNode {
  id: string;
  type: string;
  title: string;
  description: string;
  position: { x: number; y: number };
  config: any;
  connections: string[];
}

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

interface ActivityBuilderProps {
  onActivityCreated: (activity: any) => void;
  onClose: () => void;
  courseId?: string;
  title?: string;
  description?: string;
  activityId?: string;
  initialContent?: any;
}

const NODE_TYPES = [
  {
    id: "start",
    name: "Start",
    description: "Activity begins here",
    icon: Play,
    color: "bg-green-500",
    category: "flow",
    isRequired: true,
  },
  {
    id: "quiz",
    name: "Quiz",
    description: "Interactive questions and answers",
    icon: Target,
    color: "bg-blue-500",
    category: "assessment",
  },
  {
    id: "ai_chat",
    name: "AI Tutor",
    description: "Personalized AI tutoring with context",
    icon: Brain,
    color: "bg-purple-500",
    category: "interactive",
  },
  {
    id: "video",
    name: "Video",
    description: "YouTube video with interactions",
    icon: Video,
    color: "bg-red-500",
    category: "content",
  },
  {
    id: "pdf",
    name: "Document Upload",
    description: "Upload PDFs, slideshows, and documents",
    icon: UploadCloud,
    color: "bg-orange-500",
    category: "content",
  },
  {
    id: "game",
    name: "Game",
    description: "Educational games and simulations",
    icon: Gamepad2,
    color: "bg-yellow-500",
    category: "interactive",
  },
  {
    id: "collaboration",
    name: "Collaboration",
    description: "Group work and peer learning",
    icon: Users,
    color: "bg-pink-500",
    category: "social",
  },
  {
    id: "end",
    name: "Complete",
    description: "Activity completion",
    icon: CheckCircle,
    color: "bg-gray-500",
    category: "flow",
  },
];

const CATEGORIES = [
  { id: "all", name: "All", icon: Zap },
  { id: "flow", name: "Flow Control", icon: ArrowRight },
  { id: "assessment", name: "Assessment", icon: Target },
  { id: "interactive", name: "Interactive", icon: Brain },
  { id: "social", name: "Social", icon: Users },
  { id: "content", name: "Content", icon: FileText },
];

export default function ZapierStyleActivityBuilder({
  onActivityCreated,
  onClose,
  courseId,
  title = "",
  description = "",
  activityId,
  initialContent,
}: ActivityBuilderProps) {
  const [nodes, setNodes] = useState<ActivityNode[]>([]);
  const [connections, setConnections] = useState<
    Array<{ from: string; to: string }>
  >([]);
  const [selectedNode, setSelectedNode] = useState<ActivityNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedContextSources, setSelectedContextSources] = useState<
    ContextSource[]
  >([]);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeIdCounter = useRef(0);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getNextNodeId = () => `node_${++nodeIdCounter.current}`;

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!courseId) return; // Don't auto-save if we don't have courseId
    const finalTitle = title || "Custom Activity";

    setIsAutoSaving(true);
    try {
      const activityData = {
        course_id: courseId,
        title: finalTitle,
        description: description || "",
        content: {
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            description: node.description,
            position: node.position,
            config: {
              ...node.config,
              ...(node.type === "ai_chat" && {
                context_sources: selectedContextSources,
              }),
            },
          })),
          connections,
          workflow_type: "enhanced",
          context_sources: selectedContextSources,
        },
        activity_type: "custom",
        activity_subtype: "zapier_workflow",
        is_enhanced: true,
        is_adaptive: true,
      };

      // Save to localStorage as draft
      const draftKey = `activity_draft_${activityId || courseId}_${Date.now()}`;
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          ...activityData,
          lastSaved: new Date().toISOString(),
        })
      );

      // If we have an activityId, try to save to database
      if (activityId) {
        try {
          const response = await fetch("/api/activities", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: activityId,
              ...activityData,
            }),
          });
          if (response.ok) {
            setLastSaved(new Date());
          }
        } catch (error) {
          console.error("Auto-save to database failed:", error);
        }
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [
    courseId,
    title,
    description,
    nodes,
    connections,
    selectedContextSources,
    activityId,
  ]);

  // Debounced auto-save
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (nodes.length > 0 || connections.length > 0) {
        autoSave();
      }
    }, 2000); // Auto-save 2 seconds after last change

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [nodes, connections, autoSave]);

  // Load initial content if provided
  useEffect(() => {
    if (initialContent?.nodes && initialContent?.connections) {
      setNodes(initialContent.nodes);
      setConnections(initialContent.connections);
      if (initialContent.context_sources) {
        setSelectedContextSources(initialContent.context_sources);
      }
    } else if (nodes.length === 0) {
      // Auto-add start and end nodes if empty
      const startNode: ActivityNode = {
        id: getNextNodeId(),
        type: "start",
        title: "Start",
        description: "Activity begins here",
        position: { x: 200, y: 200 },
        config: {},
        connections: [],
      };
      const endNode: ActivityNode = {
        id: getNextNodeId(),
        type: "end",
        title: "Complete",
        description: "Activity completion",
        position: { x: 600, y: 200 },
        config: {},
        connections: [],
      };
      setNodes([startNode, endNode]);
    }
  }, [initialContent]);

  const addNode = (nodeType: any, position: { x: number; y: number }) => {
    const newNode: ActivityNode = {
      id: getNextNodeId(),
      type: nodeType.id,
      title: nodeType.name,
      description: nodeType.description,
      position,
      config: {},
      connections: [],
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
  };

  const updateNode = (nodeId: string, updates: Partial<ActivityNode>) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, ...updates } : node))
    );
  };

  const deleteNode = (nodeId: string) => {
    const nodeType = NODE_TYPES.find(
      (nt) => nt.id === nodes.find((n) => n.id === nodeId)?.type
    );
    if (nodeType?.isRequired) return; // Don't delete required nodes

    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setConnections((prev) =>
      prev.filter((conn) => conn.from !== nodeId && conn.to !== nodeId)
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleNodeDragStart = (e: React.MouseEvent, node: ActivityNode) => {
    e.preventDefault();
    setDraggedNode(node);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleNodeDrag = (e: React.MouseEvent) => {
    if (!draggedNode || !isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    updateNode(draggedNode.id, {
      position: {
        x: draggedNode.position.x + deltaX,
        y: draggedNode.position.y + deltaY,
      },
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleNodeDragEnd = () => {
    setDraggedNode(null);
    setIsDragging(false);
  };

  const handleNodeClick = (node: ActivityNode) => {
    setSelectedNode(node);
  };

  const handleConnectionStart = (nodeId: string) => {
    setIsConnecting(true);
    setConnectionStart(nodeId);
  };

  const handleConnectionEnd = (nodeId: string) => {
    if (isConnecting && connectionStart && connectionStart !== nodeId) {
      const newConnection = { from: connectionStart, to: nodeId };
      if (
        !connections.some(
          (conn) => conn.from === connectionStart && conn.to === nodeId
        )
      ) {
        setConnections((prev) => [...prev, newConnection]);
      }
    }
    setIsConnecting(false);
    setConnectionStart(null);
  };

  const deleteConnection = (from: string, to: string) => {
    setConnections((prev) =>
      prev.filter((conn) => !(conn.from === from && conn.to === to))
    );
  };

  const getNodeType = (typeId: string) => {
    return NODE_TYPES.find((nt) => nt.id === typeId) || NODE_TYPES[0];
  };

  const getFilteredNodeTypes = () => {
    if (selectedCategory === "all") return NODE_TYPES;
    return NODE_TYPES.filter((nt) => nt.category === selectedCategory);
  };

  const generateActivity = async () => {
    const finalTitle = title || "Custom Activity";
    if (!finalTitle) {
      alert("Please provide a title for the activity");
      return;
    }

    setIsSaving(true);
    try {
      // Check for enhanced features
      const hasAIChatNodes = nodes.some((n) => n.type === "ai_chat");
      const hasUploadNodes = nodes.some((n) => n.type === "pdf");
      const hasVideoNodes = nodes.some((n) => n.type === "video");

      const activity = {
        id: activityId || generateUUID(),
        type: "enhanced_workflow",
        title: finalTitle, // Use title from props or default
        description: description || "", // Use description from props
        content: {
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            description: node.description,
            position: node.position,
            config: {
              ...node.config,
              // Add context sources for AI chat nodes
              ...(node.type === "ai_chat" && {
                context_sources: selectedContextSources,
              }),
              // Add upload configuration for PDF nodes
              ...(node.type === "pdf" && {
                upload_enabled: true,
                accepted_types: [
                  ".pdf",
                  ".pptx",
                  ".ppt",
                  ".docx",
                  ".doc",
                  ".jpg",
                  ".jpeg",
                  ".png",
                ],
                max_size_mb: 10,
              }),
            },
          })),
          connections,
          workflow_type: "enhanced",
          context_sources: selectedContextSources,
          features: {
            ai_tutoring: hasAIChatNodes,
            document_upload: hasUploadNodes,
            video_content: hasVideoNodes,
            performance_tracking: hasAIChatNodes,
          },
        },
        points: Math.max(50, nodes.length * 15),
        estimated_duration: Math.max(15, nodes.length * 5),
        difficulty_level: Math.min(
          5,
          Math.max(1, Math.floor(nodes.length / 2))
        ),
        is_adaptive: true,
        is_enhanced: true,
        supports_upload: hasUploadNodes,
        supports_slideshow: hasUploadNodes,
        performance_tracking: hasAIChatNodes,
      };

      onActivityCreated(activity);
    } catch (error) {
      console.error("Error generating activity:", error);
      alert("Failed to save activity. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderNode = (node: ActivityNode) => {
    const nodeType = getNodeType(node.type);
    const Icon = nodeType.icon;

    return (
      <div
        key={node.id}
        className={`absolute cursor-move select-none ${
          selectedNode?.id === node.id ? "ring-2 ring-blue-500" : ""
        } ${
          isConnecting && connectionStart === node.id
            ? "ring-2 ring-green-500"
            : ""
        }`}
        style={{
          left: node.position.x,
          top: node.position.y,
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={(e) => handleNodeDragStart(e, node)}
        onClick={() => handleNodeClick(node)}
      >
        <Card className="w-48 p-3 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1 rounded ${nodeType.color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium">{node.title}</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">{node.description}</p>

          {/* Connection Points */}
          <div className="flex justify-between">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleConnectionStart(node.id);
              }}
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleConnectionEnd(node.id);
              }}
            >
              <ArrowRight className="h-3 w-3 rotate-180" />
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  const renderConnection = (connection: { from: string; to: string }) => {
    const fromNode = nodes.find((n) => n.id === connection.from);
    const toNode = nodes.find((n) => n.id === connection.to);

    if (!fromNode || !toNode) return null;

    return (
      <svg
        key={`${connection.from}-${connection.to}`}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <line
          x1={fromNode.position.x}
          y1={fromNode.position.y}
          x2={toNode.position.x}
          y2={toNode.position.y}
          stroke="#3b82f6"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
        <circle
          cx={(fromNode.position.x + toNode.position.x) / 2}
          cy={(fromNode.position.y + toNode.position.y) / 2}
          r="4"
          fill="#3b82f6"
          className="cursor-pointer hover:r-6"
          onClick={() => deleteConnection(connection.from, connection.to)}
        />
      </svg>
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Activity Builder</h2>
            <p className="text-sm text-gray-600">
              {title || "Create custom activities with drag & drop"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAutoSaving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Save className="h-4 w-4 animate-pulse" />
              <span>Saving...</span>
            </div>
          )}
          {lastSaved && !isAutoSaving && (
            <div className="text-xs text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={generateActivity}
            disabled={nodes.length === 0 || isSaving}
          >
            {isSaving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Save Activity
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-80 border-r bg-gray-50">
          <Tabs defaultValue="nodes" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="nodes">Nodes</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
            </TabsList>

            <TabsContent value="nodes" className="p-4 space-y-4">
              {/* Category Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Categories
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    return (
                      <Button
                        key={category.id}
                        variant={
                          selectedCategory === category.id
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                        className="justify-start"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {category.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Node Types */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Add Nodes
                </Label>
                <div className="space-y-2">
                  {getFilteredNodeTypes().map((nodeType) => {
                    const Icon = nodeType.icon;
                    return (
                      <Card
                        key={nodeType.id}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "nodeType",
                            JSON.stringify(nodeType)
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${nodeType.color}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {nodeType.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {nodeType.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Activity Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Activity Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Nodes:</span>
                    <span>{nodes.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Connections:</span>
                    <span>{connections.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Est. Duration:</span>
                    <span>{nodes.length * 5} min</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="properties" className="p-4">
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="node-title">Node Title</Label>
                    <Input
                      id="node-title"
                      value={selectedNode.title}
                      onChange={(e) =>
                        updateNode(selectedNode.id, { title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="node-description">Description</Label>
                    <Textarea
                      id="node-description"
                      value={selectedNode.description}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  {/* Context Sources for AI Chat nodes */}
                  {selectedNode.type === "ai_chat" && courseId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Context Sources
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowContextSelector(!showContextSelector)
                          }
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          {showContextSelector ? "Hide" : "Configure"} Context
                        </Button>
                      </div>

                      {selectedContextSources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedContextSources.map((source) => (
                            <Badge
                              key={source.id}
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {source.type === "pdf" ? (
                                <File className="h-3 w-3" />
                              ) : (
                                <PlayIcon className="h-3 w-3" />
                              )}
                              {source.title}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {showContextSelector && (
                        <ContextSelector
                          onContextSelected={setSelectedContextSources}
                          selectedSources={selectedContextSources}
                          courseId={courseId}
                        />
                      )}
                    </div>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteNode(selectedNode.id)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Node
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a node to edit its properties</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full relative bg-gray-100"
            onMouseMove={handleNodeDrag}
            onMouseUp={handleNodeDragEnd}
            onMouseLeave={handleNodeDragEnd}
            onDrop={(e) => {
              e.preventDefault();
              const nodeTypeData = e.dataTransfer.getData("nodeType");
              if (nodeTypeData) {
                const nodeType = JSON.parse(nodeTypeData);
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  addNode(nodeType, {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }
              }
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            {/* SVG for connections */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 1 }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
              </defs>
            </svg>

            {/* Render connections */}
            {connections.map(renderConnection)}

            {/* Render nodes */}
            {nodes.map(renderNode)}

            {/* Empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Zap className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Start Building Your Activity
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Drag nodes from the sidebar to create your activity workflow
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => addNode(NODE_TYPES[0], { x: 200, y: 200 })}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Start Node
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
