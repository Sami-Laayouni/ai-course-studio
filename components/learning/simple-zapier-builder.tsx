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
import { Switch } from "@/components/ui/switch";
import {
  Play,
  Plus,
  Minus,
  Trash2,
  Settings,
  Zap,
  Target,
  Brain,
  FileText,
  Video,
  CheckCircle,
  X,
  Save,
  Eye,
  Link2,
  MousePointer,
  Hand,
  Upload,
  Copy,
  ExternalLink,
  Youtube,
  ArrowLeft,
  ArrowRight,
  ToggleRight,
  Users,
  BookOpen,
  MessageSquare,
  Award,
  Clock,
  Layers,
  UploadCloud,
  ClipboardCheck,
  Sparkles,
  PlusCircle,
  RefreshCcw,
  Maximize2,
} from "lucide-react";
import ContextSelector from "./context-selector";
import AgenticActivityPlayer from "./agentic-activity-player";
import { TextEditorModal } from "@/components/ui/text-editor-modal";
import SimpleActivityPlayer from "./simple-activity-player";

// Quiz Questions Component
const QuizQuestionsEditor = ({
  questions,
  onChange,
  questionType,
}: {
  questions: any[];
  onChange: (questions: any[]) => void;
  questionType: string;
}) => {
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      question: "",
      type: questionType,
      options: questionType === "multiple_choice" ? ["", "", "", ""] : [],
      correct_answer: "",
      explanation: "",
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    onChange(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const addOption = (questionId: string) => {
    updateQuestion(questionId, "options", [
      ...(questions.find((q) => q.id === questionId)?.options || []),
      "",
    ]);
  };

  const updateOption = (
    questionId: string,
    optionIndex: number,
    value: string
  ) => {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, "options", newOptions);
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options.length > 2) {
      const newOptions = question.options.filter(
        (_: string, i: number) => i !== optionIndex
      );
      updateQuestion(questionId, "options", newOptions);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Questions</h4>
        <Button size="sm" onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-1" />
          Add Question
        </Button>
      </div>

      {questions.map((question, index) => (
        <Card key={question.id} className="p-4">
          <div className="flex justify-between items-start mb-3">
            <h5 className="text-sm font-medium">Question {index + 1}</h5>
            <Button
              size="sm"
              variant="outline"
              onClick={() => removeQuestion(question.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Question Text</Label>
              <Textarea
                value={question.question}
                onChange={(e) =>
                  updateQuestion(question.id, "question", e.target.value)
                }
                placeholder="Enter your question here..."
                className="mt-1"
              />
            </div>

            {questionType === "multiple_choice" && (
              <div>
                <Label className="text-xs">Answer Options</Label>
                <div className="space-y-2 mt-1">
                  {question.options?.map(
                    (option: string, optionIndex: number) => (
                      <div
                        key={optionIndex}
                        className="flex items-center gap-2"
                      >
                        <Input
                          value={option}
                          onChange={(e) =>
                            updateOption(
                              question.id,
                              optionIndex,
                              e.target.value
                            )
                          }
                          placeholder={`Option ${optionIndex + 1}`}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeOption(question.id, optionIndex)}
                          disabled={question.options.length <= 2}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addOption(question.id)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">
                {questionType === "multiple_choice"
                  ? "Correct Answer"
                  : questionType === "true_false"
                  ? "Correct Answer"
                  : "Answer"}
              </Label>
              {questionType === "multiple_choice" ? (
                <select
                  value={question.correct_answer}
                  onChange={(e) =>
                    updateQuestion(
                      question.id,
                      "correct_answer",
                      e.target.value
                    )
                  }
                  className="w-full p-2 border border-gray-300 rounded-md mt-1"
                >
                  <option value="">Select correct answer</option>
                  {question.options?.map((option: string, index: number) => (
                    <option key={index} value={option}>
                      {option || `Option ${index + 1}`}
                    </option>
                  ))}
                </select>
              ) : questionType === "true_false" ? (
                <select
                  value={question.correct_answer}
                  onChange={(e) =>
                    updateQuestion(
                      question.id,
                      "correct_answer",
                      e.target.value
                    )
                  }
                  className="w-full p-2 border border-gray-300 rounded-md mt-1"
                >
                  <option value="">Select answer</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <Input
                  value={question.correct_answer}
                  onChange={(e) =>
                    updateQuestion(
                      question.id,
                      "correct_answer",
                      e.target.value
                    )
                  }
                  placeholder="Enter the correct answer..."
                  className="mt-1"
                />
              )}
            </div>

            <div>
              <Label className="text-xs">Explanation (Optional)</Label>
              <Textarea
                value={question.explanation}
                onChange={(e) =>
                  updateQuestion(question.id, "explanation", e.target.value)
                }
                placeholder="Explain why this is the correct answer..."
                className="mt-1"
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

interface ActivityNode {
  id: string;
  type: string;
  title: string;
  description: string;
  position: { x: number; y: number };
  config: any;
  connections: string[];
  isSelected: boolean;
  isDragging: boolean;
  color?: string;
  // Zapier-like features
  hasOutput?: boolean;
  outputConnections?: string[];
  isConnected?: boolean;
}

interface FlashcardConfigTerm {
  id: string;
  term: string;
  definition?: string;
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

interface SimpleZapierBuilderProps {
  onActivityCreated: (activity: any) => void;
  onClose: () => void;
  courseId?: string;
  lessonId?: string;
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
    color: "#10B981",
    isRequired: true,
    category: "flow",
  },
  {
    id: "end",
    name: "Complete",
    description: "Activity completion",
    icon: CheckCircle,
    color: "#6B7280",
    isRequired: false,
    category: "flow",
  },
  {
    id: "video",
    name: "Video",
    description: "YouTube video with interactions",
    icon: Video,
    color: "#EF4444",
    category: "content",
  },
  {
    id: "pdf",
    name: "Document Upload",
    description: "Upload PDFs, slideshows, and documents for students",
    icon: UploadCloud,
    color: "#F97316",
    category: "content",
  },
  {
    id: "ai_chat",
    name: "AI Tutor",
    description: "Personalized AI tutoring with context",
    icon: Brain,
    color: "#8B5CF6",
    category: "interactive",
  },
  {
    id: "quiz",
    name: "Quiz",
    description: "Interactive questions and answers",
    icon: Target,
    color: "#3B82F6",
    category: "assessment",
  },
  {
    id: "custom",
    name: "Custom Activity",
    description: "Custom learning activity",
    icon: Zap,
    color: "#7C3AED",
    category: "interactive",
  },
  {
    id: "review",
    name: "Review",
    description: "Review activity with flashcards and teacher prompts",
    icon: ClipboardCheck,
    color: "#10B981",
    category: "assessment",
  },
];

const getDefaultConfigForNode = (typeId: string) => {
  if (typeId === "review") {
    return {
      review_type: "flashcards",
      num_terms: 10,
      points: 50,
      context: "",
      flashcard_terms: [],
    };
  }
  return {};
};

const applyNodeDefaults = (node: ActivityNode): ActivityNode => {
  const defaults = getDefaultConfigForNode(node.type);
  return {
    ...node,
    config: {
      ...defaults,
      ...(node.config || {}),
    },
  };
};

const normalizeFlashcardTerms = (terms: any[]): FlashcardConfigTerm[] => {
  if (!Array.isArray(terms)) return [];
  return terms
    .map((term, index) => {
      if (typeof term === "string") {
        return {
          id: `term_${index}`,
          term,
        };
      }
      if (term && typeof term === "object") {
        return {
          id: term.id || `term_${index}`,
          term: term.term || "",
          definition: term.definition,
        };
      }
      return null;
    })
    .filter(Boolean) as FlashcardConfigTerm[];
};

const applyDefaultsToNodeList = (nodeList: ActivityNode[] = []) =>
  nodeList.map((node) => applyNodeDefaults(node));

export default function SimpleZapierBuilder({
  onActivityCreated,
  onClose,
  courseId,
  lessonId,
  title = "",
  description = "",
  activityId,
  initialContent,
}: SimpleZapierBuilderProps) {
  const [nodes, setNodes] = useState<ActivityNode[]>([]);
  const [connections, setConnections] = useState<
    Array<{ from: string; to: string; id: string }>
  >([]);
  const [selectedNode, setSelectedNode] = useState<ActivityNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<any>(null);
  const [selectedContextSources, setSelectedContextSources] = useState<
    ContextSource[]
  >([]);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<
    string | null
  >(null);
  // Use props for title/description instead of internal state
  const workflowTitle = title || "";
  const workflowDescription = description || "";
  const [toolMode, setToolMode] = useState<"select">("select");
  const [activeTab, setActiveTab] = useState<"nodes" | "settings">("nodes");
  const [showPreview, setShowPreview] = useState(false);
  const [showPreviewFlow, setShowPreviewFlow] = useState(false);
  const [savedActivityId, setSavedActivityId] = useState<string | null>(null);
  const [autoSaveKey, setAutoSaveKey] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [generatingFlashcardsNodeId, setGeneratingFlashcardsNodeId] = useState<
    string | null
  >(null);
  const [flashcardGenerationError, setFlashcardGenerationError] = useState<
    string | null
  >(null);
  const [flashcardGenerationErrorNodeId, setFlashcardGenerationErrorNodeId] =
    useState<string | null>(null);
  useEffect(() => {
    setFlashcardGenerationError(null);
    setFlashcardGenerationErrorNodeId(null);
  }, [selectedNode?.id]);

  // Modal states for text editing
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [promptsModalOpen, setPromptsModalOpen] = useState(false);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 2000, height: 1500 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canvasMode, setCanvasMode] = useState<"select" | "pan" | "zoom">(
    "select"
  );
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [connectionFromNode, setConnectionFromNode] = useState<string | null>(
    null
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [showAIBranchingPopup, setShowAIBranchingPopup] = useState(false);
  const [aiBranchingNodeId, setAIBranchingNodeId] = useState<string | null>(
    null
  );
  const [showQuizBranchingPopup, setShowQuizBranchingPopup] = useState(false);
  const [quizBranchingNodeId, setQuizBranchingNodeId] = useState<string | null>(
    null
  );
  const [agentBuildSteps, setAgentBuildSteps] = useState<
    { id: string; label: string; status: "pending" | "active" | "done" }[]
  >([]);
  const [agentPreview, setAgentPreview] = useState<any | null>(null);
  const [isAgentBuilding, setIsAgentBuilding] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentCritique, setAgentCritique] = useState<string>("");
  const [agentRawJSON, setAgentRawJSON] = useState<string>("");
  const canPreviewFlow = nodes.length >= 2;

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeIdCounter = useRef(0);
  const connectionIdCounter = useRef(0);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isGeneratingQuestionsRef = useRef<Set<string>>(new Set());

  // Debounced auto-save functionality
  const autoSave = async () => {
    if (!courseId) return;

    // IMPORTANT: Don't auto-save if we're currently generating questions
    // This prevents database saves, EARL calls, and notifications during question generation
    if (isGeneratingQuestionsRef.current.size > 0) {
      console.log("⏸️ Auto-save skipped: questions are being generated");
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Debounce auto-save by 2 seconds
    autoSaveTimeoutRef.current = setTimeout(async () => {
      // Double-check we're not generating questions before saving
      if (isGeneratingQuestionsRef.current.size > 0) {
        console.log("⏸️ Auto-save skipped: questions are being generated");
        return;
      }

      if (isAutoSaving) return; // Prevent concurrent saves

      setIsAutoSaving(true);
      try {
        const activityData = {
          title: workflowTitle,
          description: workflowDescription,
          nodes,
          connections,
          courseId,
          activityId,
          context_sources: selectedContextSources,
          lastSaved: new Date().toISOString(),
        };

        // Use consistent key based on activityId or courseId
        const saveKey = activityId || autoSaveKey || `draft_${courseId}`;
        const draftKey = `activity_draft_${saveKey}`;

        localStorage.setItem(draftKey, JSON.stringify(activityData));
        setAutoSaveKey(saveKey);

        // If we have an activityId, also save to database
        if (activityId && courseId) {
          try {
            const content = {
              nodes: nodes.map((node) => ({
                id: node.id,
                type: node.type,
                title: node.title,
                description: node.description,
                position: node.position,
                config: node.config || {},
              })),
              connections: connections.map((conn) => ({
                id: conn.id,
                from: conn.from,
                to: conn.to,
              })),
              workflow_type: "enhanced",
              context_sources: selectedContextSources,
            };

            const response = await fetch("/api/activities", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: activityId,
                course_id: courseId,
                title: workflowTitle,
                description: workflowDescription,
                content: content,
                activity_type: "interactive",
                is_adaptive: true,
              }),
            });

            if (!response.ok) {
              console.error(
                "Auto-save to database failed:",
                await response.text()
              );
            }
          } catch (error) {
            console.error("Error auto-saving to database:", error);
          }
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setTimeout(() => setIsAutoSaving(false), 1000);
      }
    }, 2000); // 2 second debounce
  };

  // Load draft on component mount (only if no initialContent provided)
  useEffect(() => {
    if (initialContent) {
      // initialContent will be loaded by the other useEffect
      return;
    }

    // Try to load draft for this specific activity/course
    const draftKey = activityId
      ? `activity_draft_${activityId}`
      : courseId
      ? `activity_draft_draft_${courseId}`
      : null;

    if (draftKey) {
      const draftData = localStorage.getItem(draftKey);
      if (draftData) {
        try {
          const parsed = JSON.parse(draftData);
          // Only load if we don't have nodes already
          if (nodes.length === 0 && parsed.nodes && parsed.nodes.length > 0) {
            setNodes(applyDefaultsToNodeList(parsed.nodes || []));
            setConnections(parsed.connections || []);
            if (parsed.context_sources) {
              setSelectedContextSources(parsed.context_sources);
            }
            setAutoSaveKey(activityId || courseId || "");
            console.log("Loaded draft:", draftKey, parsed);
          }
        } catch (error) {
          console.error("Error loading draft:", error);
        }
      }
    }
  }, [activityId, courseId, initialContent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Save state to history
  const saveToHistory = () => {
    const newState = {
      nodes: [...nodes],
      connections: [...connections],
      // Note: workflowTitle and workflowDescription come from props, not state
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);

    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }

    setHistory(newHistory);
  };

  // Undo function
  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(applyDefaultsToNodeList(prevState.nodes || []));
      setConnections(prevState.connections);
      // Note: workflowTitle and workflowDescription come from props, not state
      setSelectedNode(null);
      setHistoryIndex(historyIndex - 1);
      console.log("Undo to state:", historyIndex - 1);
    }
  };

  // Redo function
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(applyDefaultsToNodeList(nextState.nodes || []));
      setConnections(nextState.connections);
      // Note: workflowTitle and workflowDescription come from props, not state
      setSelectedNode(null);
      setHistoryIndex(historyIndex + 1);
      console.log("Redo to state:", historyIndex + 1);
    }
  };

  const runAgentSteps = (current: number) => {
    setAgentBuildSteps((prev) =>
      prev.map((s, idx) =>
        idx < current
          ? { ...s, status: "done" }
          : idx === current
          ? { ...s, status: "active" }
          : { ...s, status: "pending" }
      )
    );
  };

  const buildAgenticForSelectedNode = async () => {
    if (!selectedNode) return;
    setIsAgentBuilding(true);
    setAgentPreview(null);
    setAgentLogs([]);
    setAgentCritique("");
    setAgentRawJSON("");
    setAgentBuildSteps([
      { id: "start", label: "Starting agent", status: "active" },
      { id: "draft", label: "Drafting", status: "pending" },
      { id: "critique", label: "Critiquing & refining", status: "pending" },
      { id: "validate", label: "Validating", status: "pending" },
      { id: "final", label: "Preview ready", status: "pending" },
    ]);

    try {
      const freeform =
        selectedNode.config?.agentic_requirements ||
        selectedNode.config?.instructions ||
        selectedNode.description ||
        workflowDescription ||
        workflowTitle ||
        "";

      if (!freeform || freeform.trim().length === 0) {
        setIsAgentBuilding(false);
        alert("Please add a clear description/instructions before building.");
        return;
      }

      const res = await fetch("/api/ai/generate-activity/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeform_prompt: `${freeform}\n\nConstraints: Return non-empty title, non-empty description, and content.instructions must be a clear, multi-sentence student-facing guide.`,
          lesson_context: {
            title: workflowTitle,
            description: workflowDescription,
          },
          learning_objectives: [],
          custom_requirements: "",
          maxIterations: 3,
          temperature: 0.7,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) {
        setIsAgentBuilding(false);
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";

      const setStepActive = (id: string) => {
        setAgentBuildSteps((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: "active" } : s))
        );
      };

      const sanitizeAgentActivity = (activity: any, fallback: string) => {
        try {
          if (!activity || typeof activity !== "object") return activity;
          const title =
            activity.title && String(activity.title).trim().length > 0
              ? activity.title
              : fallback
              ? `Custom Activity: ${fallback.slice(0, 60)}`
              : "Custom Activity";
          const description =
            activity.description &&
            String(activity.description).trim().length > 0
              ? activity.description
              : fallback || "";
          const content =
            activity.content && typeof activity.content === "object"
              ? { ...activity.content }
              : ({} as any);
          if (
            !content.instructions ||
            String(content.instructions).trim().length === 0
          ) {
            content.instructions =
              fallback || "Follow the steps to complete this activity.";
          }
          return { ...activity, title, description, content };
        } catch {
          return activity;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.replace("event:", "").trim();
          const json = dataLine.replace("data:", "").trim();
          let data: any = null;
          try {
            data = JSON.parse(json);
          } catch {
            data = { message: json };
          }

          setAgentLogs((prev) => [...prev, `${event}: ${json.slice(0, 200)}`]);

          if (event === "start") setStepActive("start");
          if (event === "draft") {
            setStepActive("draft");
            try {
              // Handle both JSON and raw code
              const code = data.code || data.preview || "";
              setAgentRawJSON(code);
              // Try to parse as JSON, fallback to raw code
              try {
                const parsed = JSON.parse(code);
                const sanitized = sanitizeAgentActivity(parsed, freeform);
                setAgentPreview(sanitized);
              } catch {
                // If not JSON, treat as raw code
                setAgentPreview({
                  title: "Generated Activity",
                  description: freeform,
                  content: { instructions: "Generated activity component" },
                  code: code,
                });
              }
            } catch {}
          }
          if (event === "critique") {
            setStepActive("critique");
            if (typeof data?.text === "string") setAgentCritique(data.text);
          }
          if (event === "validate") setStepActive("validate");
          if (event === "refine") {
            try {
              const code = data.code || data.preview || "";
              setAgentRawJSON(code);
              try {
                const parsed = JSON.parse(code);
                const sanitized = sanitizeAgentActivity(parsed, freeform);
                setAgentPreview(sanitized);
              } catch {
                setAgentPreview({
                  title: "Generated Activity",
                  description: freeform,
                  content: { instructions: "Generated activity component" },
                  code: code,
                });
              }
            } catch {}
          }
          if (event === "final") {
            const code = data.code || JSON.stringify(data, null, 2);
            setAgentRawJSON(code);
            try {
              const sanitized = sanitizeAgentActivity(data, freeform);
              setAgentPreview(sanitized);
            } catch {
              setAgentPreview({
                title: "Generated Activity",
                description: freeform,
                content: { instructions: "Generated activity component" },
                code: code,
              });
            }
            setAgentBuildSteps((prev) =>
              prev.map((s) =>
                s.id === "final"
                  ? { ...s, status: "done" }
                  : s.id !== "final"
                  ? { ...s, status: s.status === "active" ? "done" : s.status }
                  : s
              )
            );
          }
        }
      }
    } catch (e) {
      console.error("Agentic build (node) error:", e);
      setAgentLogs((prev) => [...prev, `error: ${String(e)}`]);
    } finally {
      setIsAgentBuilding(false);
    }
  };

  const applyAgentPreviewToNode = () => {
    if (!selectedNode || !agentPreview) return;
    updateNode(selectedNode.id, {
      title: agentPreview.title || selectedNode.title,
      description: agentPreview.description || selectedNode.description,
      config: {
        ...(selectedNode.config || {}),
        agentic_requirements:
          selectedNode.config?.agentic_requirements || selectedNode.description,
        generated: agentPreview,
        activity_type: "custom",
        mode: agentPreview.content?.mode || "custom",
      },
    } as any);
    autoSave();
  };

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle delete if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.contentEditable === "true")
      ) {
        return;
      }

      if (e.key === "Backspace" && selectedNode) {
        e.preventDefault();
        deleteNode(selectedNode.id);
      } else if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        e.ctrlKey &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, historyIndex, history]);

  const getNextNodeId = () => `node_${++nodeIdCounter.current}`;
  const getNextConnectionId = () => `conn_${++connectionIdCounter.current}`;

  // Load initial content if provided
  useEffect(() => {
    if (
      initialContent &&
      initialContent.nodes &&
      initialContent.nodes.length > 0
    ) {
      // Load saved content
      setNodes(applyDefaultsToNodeList(initialContent.nodes || []));
      setConnections(initialContent.connections || []);
      if (initialContent.context_sources) {
        setSelectedContextSources(initialContent.context_sources);
      }
      console.log("Loaded initial content:", initialContent);
    } else if (nodes.length === 0 && !initialContent) {
      // Only auto-add start/end nodes if no initial content and no existing nodes
      const startNode: ActivityNode = {
        id: getNextNodeId(),
        type: "start",
        title: "Start",
        description: "Activity begins here",
        position: { x: 200, y: 200 },
        config: {},
        connections: [],
        isSelected: false,
        isDragging: false,
      };
      const endNode: ActivityNode = {
        id: getNextNodeId(),
        type: "end",
        title: "Complete",
        description: "Activity completion",
        position: { x: 600, y: 200 },
        config: {},
        connections: [],
        isSelected: false,
        isDragging: false,
      };
      setNodes(applyDefaultsToNodeList([startNode, endNode]));
    }
  }, [initialContent]);

  const addNode = (nodeType: any, position: { x: number; y: number }) => {
    const newNode: ActivityNode = {
      id: getNextNodeId(),
      type: nodeType.id,
      title: nodeType.name,
      description: nodeType.description,
      position,
      config: getDefaultConfigForNode(nodeType.id),
      connections: [],
      isSelected: false,
      isDragging: false,
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
    setActiveTab("settings");
    saveToHistory();
    autoSave();
  };

  const updateNode = (nodeId: string, updates: Partial<ActivityNode>) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    );
    setSelectedNode((current) =>
      current && current.id === nodeId ? { ...current, ...updates } : current
    );
    saveToHistory();
    // Auto-save after each change
    autoSave();
  };

  const updateNodeConfig = (
    nodeId: string,
    config: any,
    skipAutoSave: boolean = false
  ) => {
    const updatedNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          config: { ...node.config, ...config },
        };
      }
      return node;
    });

    setNodes(updatedNodes);

    // Update selectedNode if it's the same node
    if (selectedNode && selectedNode.id === nodeId) {
      const updatedSelectedNode = updatedNodes.find((n) => n.id === nodeId);
      if (updatedSelectedNode) {
        setSelectedNode(updatedSelectedNode);
      }
    }

    // Save to history and auto-save (debounced)
    // IMPORTANT: Skip auto-save when generating questions to prevent database saves, EARL, and notifications
    saveToHistory();
    if (!skipAutoSave) {
      autoSave();
    }
  };

  const updateFlashcardTerms = (
    nodeId: string,
    updater: (terms: FlashcardConfigTerm[]) => FlashcardConfigTerm[]
  ) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const currentTerms = normalizeFlashcardTerms(
      node.config?.flashcard_terms || []
    );
    const updatedTerms = updater(currentTerms);
    updateNodeConfig(nodeId, {
      flashcard_terms: updatedTerms,
      num_terms: updatedTerms.length || node.config?.num_terms || 10,
    });
  };

  const handleAddFlashcardTerm = (nodeId: string) => {
    updateFlashcardTerms(nodeId, (terms) => [
      ...terms,
      { id: generateUUID(), term: "" },
    ]);
  };

  const handleRemoveFlashcardTerm = (nodeId: string, index: number) => {
    updateFlashcardTerms(nodeId, (terms) =>
      terms.filter((_, termIndex) => termIndex !== index)
    );
  };

  const handleFlashcardTermChange = (
    nodeId: string,
    index: number,
    value: string
  ) => {
    updateFlashcardTerms(nodeId, (terms) =>
      terms.map((term, termIndex) =>
        termIndex === index ? { ...term, term: value } : term
      )
    );
  };

  const buildFlashcardContext = (node: ActivityNode) => {
    let contextText = node.config?.context || "";
    if (selectedContextSources.length > 0) {
      const contextParts = selectedContextSources.map((source) => {
        if (source.type === "pdf") {
          return `Document: ${source.title}\n${
            source.summary || ""
          }\nKey Points: ${(source.key_points || []).join(", ")}`;
        }
        if (source.type === "youtube") {
          return `Video: ${source.title}\n${
            source.summary || ""
          }\nKey Concepts: ${(source.key_concepts || []).join(", ")}`;
        }
        return "";
      });
      contextText = `${contextParts.join("\n\n")}\n\n${contextText}`.trim();
    }
    return contextText;
  };

  const handleGenerateFlashcards = async (node: ActivityNode) => {
    setFlashcardGenerationError(null);
    setFlashcardGenerationErrorNodeId(null);
    if (!node) return;
    if (generatingFlashcardsNodeId === node.id) return;

    setGeneratingFlashcardsNodeId(node.id);
    try {
      const contextText = buildFlashcardContext(node);
      const response = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: contextText,
          num_terms: node.config?.num_terms || 10,
          node_id: node.id,
          course_id: courseId,
          activity_id: activityId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          "Unable to generate flashcards. Please adjust the context and try again."
        );
      }

      const data = await response.json();
      const terms = (data.terms || []).map(
        (term: string, index: number): FlashcardConfigTerm => ({
          id: `${node.id}-generated-${Date.now()}-${index}`,
          term,
        })
      );

      if (terms.length === 0) {
        throw new Error("No flashcards were generated. Try updating the context.");
      }

      updateNodeConfig(node.id, {
        flashcard_terms: terms,
        num_terms: terms.length,
        flashcards_generated_at: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error("Error generating flashcards in builder:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate flashcards. Please try again.";
      setFlashcardGenerationError(message);
      setFlashcardGenerationErrorNodeId(node.id);
    } finally {
      setGeneratingFlashcardsNodeId(null);
    }
  };

  const deleteNode = (nodeId: string) => {
    const nodeType = NODE_TYPES.find(
      (nt) => nt.id === nodes.find((n) => n.id === nodeId)?.type
    );
    if (nodeType?.isRequired) return;

    console.log("Deleting node:", nodeId);
    console.log("Current connections before deletion:", connections);

    // Remove all connections involving this node
    const updatedConnections = connections.filter(
      (conn) => conn.from !== nodeId && conn.to !== nodeId
    );
    console.log("Updated connections after deletion:", updatedConnections);

    setNodes(nodes.filter((node) => node.id !== nodeId));
    setConnections(updatedConnections);
    setSelectedNode(null);

    // Save to history and auto-save
    saveToHistory();
    autoSave();
  };

  const handleNodeDragStart = (e: React.MouseEvent, node: ActivityNode) => {
    // Always allow node selection
    e.preventDefault();
    e.stopPropagation();

    setDraggedNode(node);
    updateNode(node.id, { isDragging: true });
    setSelectedNode(node);
  };

  const handleNodeDrag = (e: React.MouseEvent) => {
    if (!draggedNode) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate position relative to canvas, accounting for zoom and pan
    const newPosition = {
      x: (e.clientX - rect.left) / zoom - pan.x / zoom,
      y: (e.clientY - rect.top) / zoom - pan.y / zoom,
    };

    updateNode(draggedNode.id, { position: newPosition });
  };

  const handleNodeDragEnd = () => {
    if (draggedNode) {
      updateNode(draggedNode.id, { isDragging: false });
    }
    setDraggedNode(null);
  };

  const handleNodeClick = (node: ActivityNode) => {
    console.log("Node clicked:", node);
    console.log("Setting selected node:", node);
    setSelectedNode(node);
    updateNode(node.id, { isSelected: true });
    // Deselect other nodes
    nodes.forEach((n) => {
      if (n.id !== node.id) {
        updateNode(n.id, { isSelected: false });
      }
    });
    // Auto-open settings tab
    setActiveTab("settings");
  };

  // Pan and zoom handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (
      canvasMode === "pan" ||
      e.button === 1 ||
      (e.button === 0 && e.ctrlKey)
    ) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (canvasMode === "select") {
      // Deselect all nodes when clicking on empty canvas
      setSelectedNode(null);
      nodes.forEach((n) => updateNode(n.id, { isSelected: false }));
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning && canvasMode === "pan") {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (canvasMode === "zoom") {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.95 : 1.05; // Less sensitive
      const newZoom = Math.min(Math.max(zoom * delta, 0.1), 3);
      setZoom(newZoom);

      // Expand canvas when zooming out
      if (newZoom < 0.5) {
        setCanvasSize({ width: 3000, height: 2000 });
      } else if (newZoom < 0.8) {
        setCanvasSize({ width: 2500, height: 1800 });
      } else {
        setCanvasSize({ width: 2000, height: 1500 });
      }
    }
  };

  const handleAddConnection = (fromNodeId: string) => {
    if (connectionFromNode === fromNodeId) {
      setConnectionFromNode(null);
      setIsConnecting(false);
      setConnectionStart(null);
      return;
    }

    setConnectionFromNode(fromNodeId);
    setShowNodePicker(true);
    setIsConnecting(true);
    setConnectionStart(fromNodeId);
  };

  const handleConnectButton = (fromNodeId: string) => {
    if (isConnecting && connectionStart && connectionStart !== fromNodeId) {
      // Complete the connection
      const newConnection = {
        from: connectionStart,
        to: fromNodeId,
        id: getNextConnectionId(),
      };
      setConnections([...connections, newConnection]);
      setIsConnecting(false);
      setConnectionStart(null);
      saveToHistory();
    } else {
      // Start connecting
      setIsConnecting(true);
      setConnectionStart(fromNodeId);
    }
  };

  const snapNodeToConnection = (nodeId: string, targetNodeId: string) => {
    // Use the current state to get the latest node positions
    setNodes((currentNodes) => {
      const node = currentNodes.find((n) => n.id === nodeId);
      const targetNode = currentNodes.find((n) => n.id === targetNodeId);

      if (node && targetNode) {
        // Snap the node to be positioned to the right of the target node
        const newPosition = {
          x: targetNode.position.x + 300, // 300px to the right
          y: targetNode.position.y,
        };

        // Update the node position
        return currentNodes.map((n) =>
          n.id === nodeId ? { ...n, position: newPosition } : n
        );
      }
      return currentNodes;
    });
  };

  const handleNodePickerSelect = (nodeType: any) => {
    if (connectionFromNode) {
      const fromNode = nodes.find((n) => n.id === connectionFromNode);

      // Regular single node creation
      const newNode = applyNodeDefaults({
        id: getNextNodeId(),
        type: nodeType.id,
        title: nodeType.name,
        description: nodeType.description,
        position: {
          x: (fromNode?.position.x || 100) + 300,
          y: fromNode?.position.y || 200,
        },
        config: {},
        connections: [],
        isSelected: false,
        isDragging: false,
        color: nodeType.color,
      });

      setNodes([...nodes, newNode]);

      // Create connection
      const newConnection = {
        from: connectionFromNode,
        to: newNode.id,
        id: getNextConnectionId(),
      };
      setConnections([...connections, newConnection]);

      // Snap the new node to the connection point
      setTimeout(() => {
        snapNodeToConnection(newNode.id, connectionFromNode);
      }, 50);

      // Save to history
      saveToHistory();
    } else {
      // No connection from node, just add the node
      const newNode = applyNodeDefaults({
        id: getNextNodeId(),
        type: nodeType.id,
        title: nodeType.name,
        description: nodeType.description,
        position: { x: 200, y: 200 },
        config: {},
        connections: [],
        isSelected: false,
        isDragging: false,
        color: nodeType.color,
      });

      setNodes([...nodes, newNode]);
      saveToHistory();
    }
    setShowNodePicker(false);
    setConnectionFromNode(null);
  };

  const handleConnectionEnd = (nodeId: string) => {
    if (isConnecting && connectionStart && connectionStart !== nodeId) {
      const newConnection = {
        from: connectionStart,
        to: nodeId,
        id: getNextConnectionId(),
      };

      if (
        !connections.some(
          (conn) => conn.from === connectionStart && conn.to === nodeId
        )
      ) {
        setConnections([...connections, newConnection]);

        // Auto-connect logic for Zapier-like behavior
        // This could be extended for automatic node placement
      }
    }
    setIsConnecting(false);
    setConnectionStart(null);
    // Clear all node selections
    nodes.forEach((n) => updateNode(n.id, { isSelected: false }));

    // Save to history
    saveToHistory();
  };

  const deleteConnection = (connectionId: string) => {
    setConnections(connections.filter((conn) => conn.id !== connectionId));
    saveToHistory();
  };

  const getNodeType = (typeId: string) => {
    return NODE_TYPES.find((nt) => nt.id === typeId) || NODE_TYPES[0];
  };

  const validateActivity = () => {
    // Check for required start node
    const startNode = nodes.find((n) => n.type === "start");
    if (!startNode) {
      alert("Please add a start node to begin your activity");
      return false;
    }

    // Check if we have at least one completion node
    const hasCompletion = nodes.some((node) => node.type === "end");
    if (!hasCompletion) {
      alert("Please add at least one completion node to finish your activity");
      return false;
    }

    // Check if all nodes are reachable from start
    const reachableNodes = new Set<string>();
    if (startNode) {
      const visitNode = (nodeId: string) => {
        if (reachableNodes.has(nodeId)) return;
        reachableNodes.add(nodeId);
        const outgoingConnections = connections.filter(
          (conn) => conn.from === nodeId
        );
        outgoingConnections.forEach((conn) => visitNode(conn.to));
      };
      visitNode(startNode.id);
    }

    const unreachableNodes = nodes.filter((n) => !reachableNodes.has(n.id));
    if (unreachableNodes.length > 0) {
      alert(
        "Some nodes are not reachable from the start node. Please check your connections."
      );
      return false;
    }

    // Check if workflow title is filled
    if (!workflowTitle.trim()) {
      alert("Please enter a title for your activity");
      return false;
    }

    // Validate each node's required parameters
    for (const node of nodes) {
      if (node.type === "video") {
        if (!node.config.youtube_url?.trim()) {
          alert(`Please add a YouTube URL for the video node "${node.title}"`);
          return false;
        }
        if (
          node.config.points === undefined ||
          node.config.points === null ||
          node.config.points <= 0
        ) {
          alert(`Please set points for the video node "${node.title}"`);
          return false;
        }
      } else if (node.type === "pdf") {
        if (!node.title?.trim()) {
          alert(`Please add a title for the PDF node "${node.title}"`);
          return false;
        }
        if (
          node.config.points === undefined ||
          node.config.points === null ||
          node.config.points <= 0
        ) {
          alert(`Please set points for the PDF node "${node.title}"`);
          return false;
        }
      } else if (node.type === "pdf" && node.config?.upload_enabled) {
        if (
          node.config.points === undefined ||
          node.config.points === null ||
          node.config.points <= 0
        ) {
          alert(`Please set points for the Document Upload node "${node.title}"`);
          return false;
        }
      } else if (node.type === "ai_chat") {
        if (!node.config.prompt?.trim()) {
          alert(`Please add a prompt for the AI Chat node "${node.title}"`);
          return false;
        }
        if (
          node.config.points === undefined ||
          node.config.points === null ||
          node.config.points <= 0
        ) {
          alert(`Please set points for the AI Chat node "${node.title}"`);
          return false;
        }
      } else if (node.type === "quiz") {
        if (!node.config.questions || node.config.questions.length === 0) {
          alert(
            `Please add at least one question for the quiz node "${node.title}"`
          );
          return false;
        }
        // Check if all questions have text
        for (let i = 0; i < node.config.questions.length; i++) {
          if (!node.config.questions[i].text?.trim()) {
            alert(
              `Please fill in question ${i + 1} for the quiz node "${
                node.title
              }"`
            );
            return false;
          }
        }
        if (
          node.config.points === undefined ||
          node.config.points === null ||
          node.config.points <= 0
        ) {
          alert(`Please set points for the quiz node "${node.title}"`);
          return false;
        }
      } else if (node.type === "custom") {
        if (!node.config.agentic_requirements?.trim()) {
          alert(
            `Please add agentic requirements for the custom activity node "${node.title}"`
          );
          return false;
        }
        if (
          node.config.points === undefined ||
          node.config.points === null ||
          node.config.points <= 0
        ) {
          alert(
            `Please set points for the custom activity node "${node.title}"`
          );
          return false;
        }
      }
    }

    return true;
  };

  const generateActivity = async () => {
    setIsGenerating(true);

    try {
      // Validate workflow
      if (!validateActivity()) {
        setIsGenerating(false);
        return;
      }

      // Use existing activityId if provided, otherwise generate new one
      const finalActivityId = activityId || generateUUID();
      const isUpdate = !!activityId;

      // Check for enhanced features
      const hasAIChatNodes = nodes.some((n) => n.type === "ai_chat");
      const hasAIBranching = nodes.some(
        (n) => n.type === "ai_chat" && n.config?.enable_branching
      );
      const hasUploadNodes = nodes.some((n) => n.type === "pdf" && n.config?.upload_enabled);
      const hasVideoNodes = nodes.some((n) => n.type === "video");

      // Calculate total points from nodes (sum of all node points)
      const totalPoints = nodes.reduce((sum, node) => {
        const nodePoints = node.config?.points;
        return sum + (nodePoints && nodePoints > 0 ? nodePoints : 0);
      }, 0);

      // Calculate total estimated duration from nodes (skip duration for video nodes)
      const totalDuration = nodes.reduce((sum, node) => {
        if (node.type === "video") {
          // Video duration is calculated from the video itself, not config
          return sum;
        }
        const nodeDuration =
          node.config?.estimated_time || node.config?.estimated_duration;
        return sum + (nodeDuration && nodeDuration > 0 ? nodeDuration : 0);
      }, 0);

      const activity = {
        id: finalActivityId,
        type: "enhanced_workflow",
        title: workflowTitle || "Custom Activity",
        description:
          workflowDescription ||
          "A custom learning activity created with the enhanced builder",
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
              // Add AI branching configuration for AI chat nodes
              ...(node.type === "ai_chat" && {
                enable_branching: node.config?.enable_branching || false,
                mastery_path: node.config?.mastery_path || "Mastery Path",
                novel_path: node.config?.novel_path || "Novel Path",
                performance_threshold: 70,
                ai_classification: true,
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
                google_cloud_upload: true,
              }),
              // Add auto-generated questions for video nodes
              ...(node.type === "video" && {
                auto_add_questions: node.config?.auto_add_questions || false,
                auto_questions: node.config?.auto_questions || [],
                question_timestamps: node.config?.question_timestamps || [],
                key_concepts: node.config?.key_concepts || [],
              }),
            },
          })),
          connections,
          workflow_type: "enhanced",
          context_sources: selectedContextSources,
          // Enhanced features metadata
          features: {
            ai_branching: hasAIBranching,
            document_upload: hasUploadNodes,
            ai_tutoring: hasAIChatNodes,
            video_content: hasVideoNodes,
            performance_tracking: hasAIBranching || hasAIChatNodes,
            multiple_completion_paths:
              nodes.filter((n) => n.type === "end").length > 1,
          },
          // AI branching configuration
          ai_branching_config: hasAIBranching
            ? {
                performance_threshold: 70,
                ai_classification: true,
                mastery_path_label: "Mastery Path",
                novel_path_label: "Novel Path",
              }
            : null,
        },
        points: totalPoints > 0 ? totalPoints : Math.max(50, nodes.length * 15),
        estimated_duration:
          totalDuration > 0 ? totalDuration : Math.max(15, nodes.length * 5),
        difficulty_level: Math.min(
          5,
          Math.max(1, Math.floor(nodes.length / 2))
        ),
        is_adaptive: true,
        is_collaborative: false,
        is_enhanced: true,
        // Enhanced activity metadata
        is_conditional: hasAIBranching,
        supports_upload: hasUploadNodes,
        supports_slideshow: nodes.some((n) => n.type === "pdf"),
        performance_tracking: hasAIBranching || hasAIChatNodes,
      };

      // Validate required fields
      if (!workflowTitle?.trim()) {
        alert("Please enter a title for your activity");
        setIsGenerating(false);
        return;
      }

      if (!courseId) {
        alert(
          "Error: Missing course information. Please ensure you're creating the activity from within a course."
        );
        setIsGenerating(false);
        return;
      }

      // Save to database
      // IMPORTANT: This is where the activity is saved to the database.
      // The /api/activities route will:
      // 1. Save the activity to the database
      // 2. Trigger EARL analysis (which generates captivating questions)
      // 3. Create notifications for enrolled students
      // This is the ONLY place where database saves, EARL, and notifications happen.
      // Question generation (when toggling "generate questions") does NOT trigger any of this.
      console.log(
        `Saving activity to database - ${isUpdate ? "UPDATE" : "CREATE"}`,
        { courseId, lessonId, activityId: finalActivityId }
      );

      try {
        const url = "/api/activities";
        const method = isUpdate ? "PUT" : "POST";

        const requestBody: any = {
          title: activity.title,
          description: activity.description,
          content: activity.content,
          course_id: courseId,
          lesson_id: lessonId || null,
          points: activity.points,
          estimated_duration: activity.estimated_duration,
          activity_type: "interactive",
          order_index: 0,
          is_adaptive: true,
        };

        // Add id for updates
        if (isUpdate) {
          requestBody.id = finalActivityId;
        }

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log("Activity saved to database:", result.activity);

          // Update activityId if it was a new activity
          const savedActivityId = result.activity?.id || finalActivityId;

          // Questions should already be generated when toggle was clicked
          // Just save the current state (which includes any generated questions)

          // Save to localStorage as backup
          const activityKey = `activity_${savedActivityId}`;
          localStorage.setItem(activityKey, JSON.stringify(activity));
          setSavedActivityId(savedActivityId);

          // Show success message
          const successMessage = isUpdate
            ? `Activity updated successfully!\n\nActivity ID: ${savedActivityId}\nTitle: ${result.activity.title}`
            : `Activity created successfully!\n\nActivity ID: ${savedActivityId}\nTitle: ${result.activity.title}\n\nCheck the lesson editor to see the activity.`;

          alert(successMessage);

          // Call the callback with the saved activity
          const savedActivity = {
            ...activity,
            id: savedActivityId,
            ...result.activity,
          };
          onActivityCreated(savedActivity);

          // Force refresh the lesson editor by triggering a custom event
          window.dispatchEvent(
            new CustomEvent("activitySaved", {
              detail: {
                activityId: savedActivityId,
                lessonId,
                courseId,
                activity: savedActivity,
              },
            })
          );
        } else {
          console.error("Failed to save activity to database:", result);
          const errorMessage =
            result.error || result.details || "Unknown error";
          alert(
            `Error saving to database: ${errorMessage}\n\nPlease check the console for more details.`
          );
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error("Error saving activity to database:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        alert(
          `Error saving to database: ${errorMessage}\n\nPlease check your connection and try again.`
        );
        throw error;
      }
    } catch (error) {
      console.error("Error generating activity:", error);
      alert("Error creating activity. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderNode = (node: ActivityNode) => {
    const nodeType = getNodeType(node.type);
    const Icon = nodeType.icon;
    const isRequired = nodeType.isRequired;
    const hasOutput = nodeType.id !== "end";
    const outputConnections = connections.filter(
      (conn) => conn.from === node.id
    );

    return (
      <div
        key={node.id}
        className={`absolute select-none transition-all duration-200 ${
          node.isSelected ? "ring-2 ring-blue-500 shadow-lg" : ""
        } ${node.isDragging ? "scale-105 shadow-xl" : ""} ${
          isRequired ? "opacity-100" : "opacity-90"
        }`}
        style={{
          left: node.position.x,
          top: node.position.y,
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={(e) => handleNodeDragStart(e, node)}
        onClick={() => handleNodeClick(node)}
      >
        {/* Zapier-style node */}
        <div className="relative">
          <Card
            className={`w-56 rounded-2xl min-h-[5rem] p-4 backdrop-blur-sm cursor-pointer border transition-all duration-200 ${
              node.isSelected
                ? "ring-2 ring-blue-500 shadow-lg border-blue-300"
                : "shadow-sm hover:shadow-md border-gray-200"
            } ${isRequired ? "bg-white" : "bg-white/95"}`}
            style={{
              borderColor: node.isSelected
                ? "#3b82f6"
                : isRequired
                ? "#fb923c"
                : "#e5e7eb",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2.5 rounded-xl flex-shrink-0 shadow-sm"
                style={{
                  backgroundColor: `${node.color || "#e5e7eb"}20`,
                  border: `1px solid ${node.color || "#e5e7eb"}`,
                }}
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: node.color || "#111827" }}
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900 leading-tight">
                    {node.title || nodeType.name}
                  </span>
                  {isRequired && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-800 border-orange-200 flex-shrink-0"
                    >
                      Required
                    </Badge>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wide border-dashed text-gray-600"
                >
                  {nodeType.category}
                </Badge>
                {node.description && (
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {node.description}
                  </p>
                )}
                {/* AI Chat branching toggle */}
                {node.type === "ai_chat" && (
                  <div
                    className="flex items-center gap-1.5 pt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Switch
                      checked={node.config?.enable_branching || false}
                      onCheckedChange={(checked) => {
                        updateNode(node.id, {
                          config: {
                            ...node.config,
                            enable_branching: checked,
                            mastery_path: checked ? "Mastery Path" : "",
                            novel_path: checked ? "Novel Path" : "",
                          },
                        });
                        if (checked) {
                          setShowAIBranchingPopup(true);
                          setAIBranchingNodeId(node.id);
                        }
                      }}
                      className="scale-75"
                    />
                    <span className="text-[10px] text-gray-600 font-medium">Branching</span>
                  </div>
                )}

                {/* Quiz branching toggle */}
                {node.type === "quiz" && (
                  <div
                    className="flex items-center gap-1.5 pt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Switch
                      checked={node.config?.enable_branching || false}
                      onCheckedChange={(checked) => {
                        updateNode(node.id, {
                          config: {
                            ...node.config,
                            enable_branching: checked,
                          },
                        });
                        if (checked) {
                          setShowQuizBranchingPopup(true);
                          setQuizBranchingNodeId(node.id);
                        }
                      }}
                      className="scale-75"
                    />
                    <span className="text-[10px] text-gray-600 font-medium">Branching</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Output connection point (like Zapier) */}
          {hasOutput && (
            <div className="absolute -right-3 top-1/2 transform -translate-y-1/2">
              <div className="relative flex flex-col gap-1">
                {/* Connection line */}
                <div
                  className="w-6 h-0.5"
                  style={{ backgroundColor: node.color }}
                ></div>

                {/* Connect buttons container */}
                <div className="flex gap-1">
                  {/* Add new node button */}
                  <button
                    className="w-7 h-7 bg-white border-2 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                    style={{ borderColor: node.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddConnection(node.id);
                    }}
                    title="Add new node"
                  >
                    <Plus className="h-3 w-3" style={{ color: node.color }} />
                  </button>

                  {/* Connect to existing node button */}
                  <button
                    className={`w-7 h-7 border-2 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                      isConnecting && connectionStart === node.id
                        ? "bg-blue-100 border-blue-500"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    style={{
                      borderColor:
                        isConnecting && connectionStart === node.id
                          ? "#3b82f6"
                          : node.color,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectButton(node.id);
                    }}
                    title="Connect to existing node"
                  >
                    <svg
                      className="h-3 w-3"
                      style={{ color: node.color }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input connection point */}
          {node.id !== "start" && (
            <div className="absolute -left-3 top-1/2 transform -translate-y-1/2">
              <div className="relative flex flex-col gap-1">
                {/* Connection line */}
                <div
                  className="w-6 h-0.5"
                  style={{
                    backgroundColor: connections.some(
                      (conn) => conn.to === node.id
                    )
                      ? node.color
                      : "#d1d5db",
                  }}
                ></div>

                {/* Connect to existing node button (for input) */}
                <button
                  className={`w-7 h-7 border-2 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                    isConnecting && connectionStart === node.id
                      ? "bg-blue-100 border-blue-500"
                      : "bg-white hover:bg-gray-50"
                  }`}
                  style={{
                    borderColor:
                      isConnecting && connectionStart === node.id
                        ? "#3b82f6"
                        : node.color,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnectButton(node.id);
                  }}
                  title="Connect to this node"
                >
                  <svg
                    className="h-3 w-3"
                    style={{ color: node.color }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConnection = (connection: {
    from: string;
    to: string;
    id: string;
    label?: string;
  }) => {
    const fromNode = nodes.find((n) => n.id === connection.from);
    const toNode = nodes.find((n) => n.id === connection.to);

    if (!fromNode || !toNode) return null;

    // Zapier-style connection points - from right edge to left edge
    const fromX = fromNode.position.x + 96; // Right edge of source node (compact nodes)
    const fromY = fromNode.position.y; // Center of source node
    const toX = toNode.position.x - 96; // Left edge of target node
    const toY = toNode.position.y; // Center of target node

    // Calculate deltas and distance
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Zapier-style routing with clean, organized paths
    let path = "";

    if (Math.abs(deltaY) < 20) {
      // Same height - straight horizontal line with slight curve
      const midX = (fromX + toX) / 2;
      path = `M ${fromX} ${fromY} Q ${midX} ${fromY - 10} ${toX} ${toY}`;
    } else if (deltaX > 50) {
      // Target to the right - clean L-shape with rounded corners
      const turnX = fromX + Math.max(60, deltaX * 0.4);
      const controlOffset = Math.min(30, Math.abs(deltaY) * 0.3);

      if (deltaY > 0) {
        // Target below
        path = `M ${fromX} ${fromY} 
                L ${turnX - 15} ${fromY} 
                Q ${turnX} ${fromY} ${turnX} ${fromY + controlOffset}
                L ${turnX} ${toY - controlOffset}
                Q ${turnX} ${toY} ${turnX + 15} ${toY}
                L ${toX} ${toY}`;
      } else {
        // Target above
        path = `M ${fromX} ${fromY} 
                L ${turnX - 15} ${fromY} 
                Q ${turnX} ${fromY} ${turnX} ${fromY - controlOffset}
                L ${turnX} ${toY + controlOffset}
                Q ${turnX} ${toY} ${turnX + 15} ${toY}
                L ${toX} ${toY}`;
      }
    } else {
      // Target to the left or very close - go around with smooth curves
      const backX = fromX + 80;
      const turnY = fromY + (deltaY > 0 ? 40 : -40);
      const approachX = toX - 80;

      path = `M ${fromX} ${fromY} 
              L ${backX - 15} ${fromY} 
              Q ${backX} ${fromY} ${backX} ${fromY + (deltaY > 0 ? 15 : -15)}
              L ${backX} ${turnY - (deltaY > 0 ? 15 : -15)}
              Q ${backX} ${turnY} ${backX + 15} ${turnY}
              L ${approachX - 15} ${turnY}
              Q ${approachX} ${turnY} ${approachX} ${
        turnY + (deltaY > 0 ? 15 : -15)
      }
              L ${approachX} ${toY - (deltaY > 0 ? 15 : -15)}
              Q ${approachX} ${toY} ${approachX + 15} ${toY}
              L ${toX} ${toY}`;
    }

    // Calculate midpoint for label and delete button
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    // Zapier-style color scheme
    const connectionColor =
      connection.label === "mastery"
        ? "#00D4AA" // Zapier green
        : connection.label === "novel"
        ? "#FF6B35" // Zapier orange
        : connection.label === "low_score"
        ? "#FF3B30" // Zapier red
        : connection.label === "medium_score"
        ? "#FF9500" // Zapier yellow
        : connection.label === "high_score"
        ? "#00D4AA" // Zapier green
        : "#8E8E93"; // Zapier gray

    return (
      <div
        key={connection.id}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Zapier-style arrowhead */}
            <marker
              id={`arrowhead-${connection.id}`}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={connectionColor} stroke="none" />
            </marker>

            {/* Glow effect for connections */}
            <filter id={`glow-${connection.id}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection path with Zapier styling */}
          <path
            d={path}
            stroke={connectionColor}
            strokeWidth="3"
            fill="none"
            markerEnd={`url(#arrowhead-${connection.id})`}
            className="opacity-90"
            style={{
              filter: `url(#glow-${connection.id})`,
            }}
          />

          {/* Connection label with Zapier styling */}
          {connection.label && (
            <g>
              {/* Label background */}
              <rect
                x={midX - 25}
                y={midY - 20}
                width="50"
                height="16"
                rx="8"
                fill="white"
                stroke={connectionColor}
                strokeWidth="1"
                className="opacity-95"
              />
              <text
                x={midX}
                y={midY - 10}
                textAnchor="middle"
                className="text-xs font-semibold pointer-events-none"
                fill={connectionColor}
              >
                {connection.label === "mastery"
                  ? "MASTERY"
                  : connection.label === "novel"
                  ? "NOVEL"
                  : connection.label === "low_score"
                  ? "LOW"
                  : connection.label === "medium_score"
                  ? "MEDIUM"
                  : connection.label === "high_score"
                  ? "HIGH"
                  : connection.label.toUpperCase()}
              </text>
            </g>
          )}

          {/* Delete button with Zapier styling */}
          <g className="pointer-events-auto">
            <circle
              cx={midX}
              cy={midY + 15}
              r="10"
              fill="white"
              stroke="#FF3B30"
              strokeWidth="2"
              className="cursor-pointer hover:fill-red-50 transition-all duration-200"
              onClick={() => deleteConnection(connection.id)}
            />
            <text
              x={midX}
              y={midY + 20}
              textAnchor="middle"
              className="text-sm font-bold cursor-pointer"
              fill="#FF3B30"
              onClick={() => deleteConnection(connection.id)}
            >
              ×
            </text>
          </g>
        </svg>
      </div>
    );
  };

  const renderNodeParameters = () => {
    console.log("renderNodeParameters called, selectedNode:", selectedNode);
    if (!selectedNode) {
      console.log("No selected node, returning null");
      return null;
    }

    const nodeType = getNodeType(selectedNode.type);
    const normalizedReviewFlashcards =
      selectedNode.type === "review"
        ? normalizeFlashcardTerms(selectedNode.config?.flashcard_terms || [])
        : [];
    const isGeneratingFlashcardsForSelectedNode =
      generatingFlashcardsNodeId === selectedNode.id;
    console.log("Node type:", nodeType);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {nodeType.name} Settings
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedNode(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Title</Label>
            <Input
              value={selectedNode.title}
              onChange={(e) =>
                updateNode(selectedNode.id, { title: e.target.value })
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              value={selectedNode.description}
              onChange={(e) =>
                updateNode(selectedNode.id, { description: e.target.value })
              }
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Video-specific parameters */}
          {selectedNode.type === "video" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  YouTube URL
                </Label>
                <Input
                  value={selectedNode.config.youtube_url || ""}
                  onChange={(e) => {
                    console.log("YouTube URL changing to:", e.target.value);
                    updateNodeConfig(selectedNode.id, {
                      youtube_url: e.target.value,
                    });
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current value: {selectedNode.config.youtube_url || "empty"}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedNode.config.auto_add_questions || false}
                    disabled={isGeneratingQuestions === selectedNode.id}
                    onCheckedChange={async (checked) => {
                      // IMPORTANT: Skip auto-save when toggling question generation to prevent database saves, EARL, and notifications
                      updateNodeConfig(
                        selectedNode.id,
                        {
                          auto_add_questions: checked,
                        },
                        true
                      ); // skipAutoSave=true to prevent database save

                      // If enabling, generate questions immediately
                      // IMPORTANT: This only generates questions and stores them in local state.
                      // Questions are NOT saved to database, EARL is NOT called, and notifications are NOT created.
                      // Questions will only be saved when the user clicks "Complete & Get URL" to create the activity.
                      if (checked && selectedNode.config.youtube_url) {
                        // Check if questions already exist
                        if (
                          selectedNode.config.has_auto_questions &&
                          selectedNode.config.auto_questions?.length > 0
                        ) {
                          console.log(
                            "✅ Questions already generated for this video"
                          );
                          return;
                        }

                        // IMPORTANT: Set ref BEFORE any async operations to prevent auto-save
                        console.log(
                          "🚫 Setting question generation flag to prevent auto-save/EARL"
                        );
                        isGeneratingQuestionsRef.current.add(selectedNode.id);
                        setIsGeneratingQuestions(selectedNode.id);

                        try {
                          console.log(
                            "🎬 Generating questions for video:",
                            selectedNode.config.youtube_url
                          );

                          const response = await fetch(
                            "/api/ai/generate-video-questions",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                youtube_url: selectedNode.config.youtube_url,
                              }),
                            }
                          );

                          if (response.ok) {
                            const data = await response.json();

                            if (
                              data.success &&
                              data.questions &&
                              data.questions.length > 0
                            ) {
                              // Update the video node config with questions (local state only, no database save)
                              // IMPORTANT: skipAutoSave=true prevents auto-save which would trigger database save, EARL, and notifications
                              updateNodeConfig(
                                selectedNode.id,
                                {
                                  auto_questions: data.questions,
                                  question_timestamps: data.questions.map(
                                    (q: any) => q.timestamp
                                  ),
                                  key_concepts: data.key_concepts || [],
                                  has_auto_questions: true,
                                },
                                true
                              ); // skipAutoSave=true to prevent database save

                              console.log(
                                `✅ Generated ${data.questions.length} questions for video (not saved yet)`
                              );
                            } else {
                              const errorMsg =
                                data.error ||
                                "Unable to generate questions. The video may not have captions available.";
                              alert(
                                `❌ ${errorMsg}\n\nPlease ensure the video has captions enabled, or try a different video.`
                              );
                            }
                          } else {
                            const errorData = await response
                              .json()
                              .catch(() => ({
                                error: `HTTP ${response.status}`,
                              }));
                            alert(
                              `❌ Failed to generate questions: ${
                                errorData.error || "Unknown error"
                              }`
                            );
                          }
                        } catch (error: any) {
                          console.error(
                            "❌ Error generating questions:",
                            error
                          );
                          alert(
                            `Error generating questions: ${
                              error?.message || "Unknown error"
                            }`
                          );
                        } finally {
                          setIsGeneratingQuestions(null);
                          isGeneratingQuestionsRef.current.delete(
                            selectedNode.id
                          );
                        }
                      } else if (!checked) {
                        // If disabling, clear questions from config (local state only)
                        // IMPORTANT: skipAutoSave=true prevents auto-save which would trigger database save, EARL, and notifications
                        updateNodeConfig(
                          selectedNode.id,
                          {
                            auto_questions: [],
                            question_timestamps: [],
                            key_concepts: [],
                            has_auto_questions: false,
                          },
                          true
                        ); // skipAutoSave=true to prevent database save
                      }
                    }}
                  />
                  <Label className="text-sm font-medium text-gray-700">
                    Automatically add questions
                  </Label>
                </div>
                <p className="text-xs text-gray-500 ml-8">
                  Analyzes transcript and adds questions at optimal learning
                  points
                </p>
                {isGeneratingQuestions === selectedNode.id && (
                  <div className="ml-8 mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      ⏳ Generating questions... This may take a moment.
                    </p>
                  </div>
                )}
                {selectedNode.config.auto_questions &&
                  selectedNode.config.auto_questions.length > 0 && (
                    <div className="ml-8 mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Generated {selectedNode.config.auto_questions.length}{" "}
                        questions:
                      </p>
                      <div className="space-y-2">
                        {selectedNode.config.auto_questions
                          .slice(0, 3)
                          .map((q: any, idx: number) => (
                            <div
                              key={idx}
                              className="text-xs text-blue-800 dark:text-blue-200"
                            >
                              <span className="font-medium">
                                @{Math.floor((q.timestamp || 0) / 60)}:
                                {(q.timestamp || 0) % 60}
                              </span>{" "}
                              - {q.question}
                            </div>
                          ))}
                        {selectedNode.config.auto_questions.length > 3 && (
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            +{selectedNode.config.auto_questions.length - 3}{" "}
                            more questions
                          </p>
                        )}
                      </div>
                    </div>
                  )}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Points for Completion
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.points ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      points: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter points"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* PDF-specific parameters */}
          {selectedNode.type === "pdf" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  PDF Content
                </Label>
                <Textarea
                  value={selectedNode.config.content || ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      content: e.target.value,
                    })
                  }
                  placeholder="Enter reading content or upload a PDF..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Estimated Reading Time (minutes)
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.estimated_time ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      estimated_time: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter reading time"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Points for Completion
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.points ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      points: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter points"
                  className="mt-1"
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // This would integrate with your existing PDF upload functionality
                  alert("PDF upload functionality would be integrated here");
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          )}

          {/* PDF/Upload node-specific parameters - merged into pdf node */}
          {selectedNode.type === "pdf" && selectedNode.config?.upload_enabled && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Instructions
                </Label>
                <Textarea
                  value={selectedNode.config.instructions || ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      instructions: e.target.value,
                    })
                  }
                  placeholder="Instructions for students viewing uploaded files..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Accepted File Types
                </Label>
                <Input
                  value={selectedNode.config.accepted_types?.join(", ") || ".pdf, .pptx, .docx, .doc, .jpg, .png"}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      accepted_types: e.target.value.split(",").map(t => t.trim()),
                    })
                  }
                  placeholder=".pdf, .pptx, .docx"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated list of file extensions
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Max File Size (MB)
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.max_size_mb ?? 10}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      max_size_mb: e.target.value ? Number(e.target.value) : 10,
                    })
                  }
                  placeholder="10"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Points for Completion
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.points ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      points: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter points"
                  className="mt-1"
                />
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  💡 Upload files using the button below. Files will be displayed to students in the activity player.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  if (!activityId || !selectedNode.id) {
                    alert("Please save the activity first before uploading files");
                    return;
                  }

                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = selectedNode.config.accepted_types?.join(",") || ".pdf,.pptx,.docx,.doc,.jpg,.png";
                  input.multiple = true;

                  input.onchange = async (e: any) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    for (const file of files) {
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("activityId", activityId);
                      formData.append("nodeId", selectedNode.id);
                      formData.append("extractText", "true");

                      try {
                        const response = await fetch("/api/upload/google-cloud", {
                          method: "POST",
                          body: formData,
                        });

                        if (response.ok) {
                          const data = await response.json();
                          console.log("File uploaded:", data);
                          alert(`File "${file.name}" uploaded successfully!`);
                        } else {
                          const error = await response.json();
                          alert(`Failed to upload "${file.name}": ${error.error}`);
                        }
                      } catch (error: any) {
                        console.error("Upload error:", error);
                        alert(`Error uploading "${file.name}": ${error.message}`);
                      }
                    }
                  };

                  input.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          )}

          {/* AI Chat-specific parameters */}
          {selectedNode.type === "ai_chat" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  AI Prompt
                </Label>
                <Textarea
                  value={selectedNode.config.prompt || ""}
                  onChange={(e) => {
                    console.log("AI Prompt changing to:", e.target.value);
                    updateNodeConfig(selectedNode.id, {
                      prompt: e.target.value,
                    });
                  }}
                  placeholder="You are a helpful tutor. Help the student learn."
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current value: {selectedNode.config.prompt || "empty"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Max Conversation Turns
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.max_turns ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      max_turns: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter max turns"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Points for Completion
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.points ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      points: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter points"
                  className="mt-1"
                />
              </div>
              {courseId && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Context Sources
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowContextSelector(!showContextSelector)}
                    className="w-full"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {showContextSelector ? "Hide" : "Configure"} Context
                  </Button>
                  {selectedContextSources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedContextSources.map((source) => (
                        <Badge
                          key={source.id}
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          {source.type === "pdf" ? (
                            <FileText className="h-3 w-3" />
                          ) : (
                            <Youtube className="h-3 w-3" />
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
            </div>
          )}

          {/* Quiz-specific parameters */}
          {selectedNode.type === "quiz" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Question Type
                </Label>
                <select
                  value={selectedNode.config.question_type || "multiple_choice"}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      question_type: e.target.value,
                      questions: [], // Reset questions when type changes
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md mt-1"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="fill_blank">Fill in the Blank</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>

              <div>
                <QuizQuestionsEditor
                  questions={selectedNode.config.questions || []}
                  onChange={(questions) =>
                    updateNodeConfig(selectedNode.id, { questions })
                  }
                  questionType={
                    selectedNode.config.question_type || "multiple_choice"
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Time Limit (minutes)
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.time_limit ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      time_limit: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter time limit"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Passing Score (%)
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.passing_score ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      passing_score: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter passing score"
                  min="0"
                  max="100"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Points for Completion
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.points ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      points: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter points"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Custom Activity-specific parameters */}
          {selectedNode.type === "custom" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Agentic Requirements
                </Label>
                <Textarea
                  value={selectedNode.config.agentic_requirements || ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      agentic_requirements: e.target.value,
                    })
                  }
                  placeholder="Describe exactly what to build (e.g., Carbon cycle diagram with blanks for processes and reservoirs)"
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This guides the agent to design and build the custom activity.
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Estimated Duration (minutes)
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.estimated_duration ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      estimated_duration: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter duration"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Points for Completion
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.points ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      points: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter points"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Build
                </Label>
                <div className="mt-1 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={buildAgenticForSelectedNode}
                    disabled={isAgentBuilding}
                  >
                    {isAgentBuilding ? "Building..." : "Build"}
                  </Button>
                  {agentBuildSteps.length > 0 && (
                    <ul className="text-xs space-y-1 text-gray-600">
                      {agentBuildSteps.map((s) => (
                        <li key={s.id}>
                          {s.status === "done"
                            ? "✓"
                            : s.status === "active"
                            ? "…"
                            : "•"}{" "}
                          {s.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  {agentPreview && (
                    <div className="p-2 border rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Agent Output</div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const text =
                                agentRawJSON ||
                                JSON.stringify(agentPreview, null, 2);
                              navigator.clipboard.writeText(text);
                            }}
                          >
                            Copy JSON
                          </Button>
                          <Button size="sm" onClick={applyAgentPreviewToNode}>
                            Use this activity
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Tabs defaultValue="preview">
                          <TabsList>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                            <TabsTrigger value="code">Code</TabsTrigger>
                            <TabsTrigger value="critique">Critique</TabsTrigger>
                            <TabsTrigger value="logs">Logs</TabsTrigger>
                          </TabsList>
                          <TabsContent value="preview" className="mt-3">
                            <AgenticActivityPlayer activity={agentPreview} />
                          </TabsContent>
                          <TabsContent value="code" className="mt-3">
                            <div className="relative">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-gray-600">
                                  Generated React TypeScript Component
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      agentRawJSON || ""
                                    );
                                  }}
                                >
                                  Copy Code
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <pre className="text-[11px] max-h-80 overflow-auto bg-gray-900 text-gray-100 p-4 rounded border">
                                  <code className="language-tsx">
                                    {agentRawJSON || "No code generated yet"}
                                  </code>
                                </pre>
                                <div className="border rounded overflow-hidden">
                                  <iframe
                                    title="Live Code Preview"
                                    sandbox="allow-scripts"
                                    className="w-full h-80 bg-white"
                                    srcDoc={`<!DOCTYPE html><html><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><style>body{font-family:sans-serif;padding:16px}</style></head><body><div id=\"root\"></div><script crossorigin src=\"https://unpkg.com/react@18/umd/react.production.min.js\"></script><script crossorigin src=\"https://unpkg.com/react-dom@18/umd/react-dom.production.min.js\"></script><script>
                                    try {
                                      const exports = {};
                                      (function(module){
                                        ${agentRawJSON || ""}
                                      })({exports});
                                      const Comp = exports.default || window.GeneratedActivity || null;
                                      if (Comp) {
                                        const root = ReactDOM.createRoot(document.getElementById('root'));
                                        root.render(React.createElement(Comp));
                                      } else {
                                        document.getElementById('root').innerText = 'No default export found.';
                                      }
                                    } catch (e) {
                                      document.getElementById('root').innerText = 'Preview error: ' + e.message;
                                    }
                                    </script></body></html>`}
                                  />
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="critique" className="mt-3">
                            <pre className="text-[10px] max-h-56 overflow-auto bg-muted/30 p-2 rounded whitespace-pre-wrap">
                              {agentCritique || "(no critique yet)"}
                            </pre>
                          </TabsContent>
                          <TabsContent value="logs" className="mt-3">
                            <div className="text-[10px] text-muted-foreground max-h-56 overflow-auto bg-muted/30 p-2 rounded">
                              {agentLogs.map((l, i) => (
                                <div key={i}>{l}</div>
                              ))}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Review-specific parameters */}
          {selectedNode.type === "review" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Review Type
                </Label>
                <select
                  value={selectedNode.config.review_type || "flashcards"}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      review_type: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md mt-1"
                >
                  <option value="flashcards">Flashcards</option>
                  <option value="teacher_review">Teacher Review</option>
                </select>
              </div>

              {selectedNode.config.review_type === "flashcards" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Context Configuration
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-1 justify-start"
                      onClick={() => setContextModalOpen(true)}
                    >
                      <Maximize2 className="h-4 w-4 mr-2" />
                      {selectedNode.config.context
                        ? `Edit Context (${selectedNode.config.context.length} chars)`
                        : "Edit Context"}
                    </Button>
                    {selectedNode.config.context && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {selectedNode.config.context.substring(0, 100)}
                        {selectedNode.config.context.length > 100 ? "..." : ""}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Describe the context or let the AI analyze uploaded documents/videos automatically. Supports math notation (x^2, H2O, sqrt(x)).
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Number of Terms
                    </Label>
                    <Input
                      type="number"
                      value={selectedNode.config.num_terms ?? ""}
                      onChange={(e) =>
                        updateNodeConfig(selectedNode.id, {
                          num_terms:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                      placeholder="Number of flashcard terms"
                      min="1"
                      max="50"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={isGeneratingFlashcardsForSelectedNode}
                      onClick={() => handleGenerateFlashcards(selectedNode)}
                    >
                      {isGeneratingFlashcardsForSelectedNode ? (
                        <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {isGeneratingFlashcardsForSelectedNode
                        ? "Generating..."
                        : "Generate Cards"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleAddFlashcardTerm(selectedNode.id)}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Term
                    </Button>
                  </div>
                  {flashcardGenerationError &&
                    flashcardGenerationErrorNodeId === selectedNode.id && (
                      <p className="text-xs text-red-600">
                        {flashcardGenerationError}
                      </p>
                    )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Flashcard Terms
                    </Label>
                    {normalizedReviewFlashcards.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No flashcards yet. Use Generate Cards or Add Term to get
                        started.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {normalizedReviewFlashcards.map((term, index) => (
                          <div
                            key={term.id || `term-${index}`}
                            className="flex items-center gap-2"
                          >
                            <Input
                              value={term.term}
                              onChange={(e) =>
                                handleFlashcardTermChange(
                                  selectedNode.id,
                                  index,
                                  e.target.value
                                )
                              }
                              placeholder={`Term ${index + 1}`}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                handleRemoveFlashcardTerm(
                                  selectedNode.id,
                                  index
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedNode.config.review_type === "teacher_review" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Context Configuration
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-1 justify-start"
                      onClick={() => setContextModalOpen(true)}
                    >
                      <Maximize2 className="h-4 w-4 mr-2" />
                      {selectedNode.config.context
                        ? `Edit Context (${selectedNode.config.context.length} chars)`
                        : "Edit Context"}
                    </Button>
                    {selectedNode.config.context && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {selectedNode.config.context.substring(0, 100)}
                        {selectedNode.config.context.length > 100 ? "..." : ""}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Supports math notation (x^2, H2O, sqrt(x)).
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Review Prompts
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-1 justify-start"
                      onClick={() => setPromptsModalOpen(true)}
                    >
                      <Maximize2 className="h-4 w-4 mr-2" />
                      {selectedNode.config.prompts
                        ? `Edit Prompts (${selectedNode.config.prompts.split('\n').length} prompts)`
                        : "Edit Prompts"}
                    </Button>
                    {selectedNode.config.prompts && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {selectedNode.config.prompts.split('\n')[0]}
                        {selectedNode.config.prompts.split('\n').length > 1 ? ` (+${selectedNode.config.prompts.split('\n').length - 1} more)` : ""}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Enter one prompt per line. Students will complete each prompt. Supports math notation.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Custom Instructions
                </Label>
                <Input
                  value={selectedNode.config.instructions || "Write on your notebook and then here"}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      instructions: e.target.value,
                    })
                  }
                  placeholder="Write on your notebook and then here"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: "Write on your notebook and then here". You can customize this instruction (e.g., "Write on your notebook and write here. Be sure to show all your steps").
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Points for Completion
                </Label>
                <Input
                  type="number"
                  value={selectedNode.config.points ?? ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      points: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Enter points"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {!nodeType.isRequired && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteNode(selectedNode.id)}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Node
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Zapier-style Header with Back Button */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Activity Builder
            </h2>
            <p className="text-sm text-gray-600">
              {workflowTitle || "Enhanced Activity Builder"}
              {isAutoSaving && (
                <span className="ml-2 text-green-600 text-xs inline">
                  Saving...
                </span>
              )}
              <button
                onClick={autoSave}
                className="ml-2 text-orange-600 text-xs underline hover:text-orange-700"
              >
                Save
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Zapier-style Controls */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200">
              <button
                onClick={() => setZoom((prev) => Math.min(prev * 1.2, 3))}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Zoom In"
              >
                <Plus className="h-3 w-3" />
              </button>
              <span className="text-xs font-medium min-w-[2.5rem] text-center text-gray-600">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((prev) => Math.max(prev * 0.8, 0.1))}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Zoom Out"
              >
                <Minus className="h-3 w-3" />
              </button>
            </div>

            {/* Canvas Mode Selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={canvasMode === "select" ? "default" : "ghost"}
                onClick={() => setCanvasMode("select")}
                className="h-7 px-2 text-xs"
                title="Select Mode"
              >
                <MousePointer className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant={canvasMode === "pan" ? "default" : "ghost"}
                onClick={() => setCanvasMode("pan")}
                className="h-7 px-2 text-xs"
                title="Pan Mode"
              >
                <Hand className="h-3 w-3" />
              </Button>
            </div>

            {/* Undo/Redo Controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="h-7 px-2"
                title="Undo (Ctrl+Z)"
              >
                <ArrowLeft className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="h-7 px-2"
                title="Redo (Ctrl+Y)"
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Cancel button removed - use Back button instead */}
            <Button
              variant="outline"
              onClick={() => setShowPreviewFlow(true)}
              disabled={!canPreviewFlow}
              title={
                canPreviewFlow
                  ? "Test this activity in the built-in player"
                  : "Add at least two nodes to preview the flow"
              }
              className={`h-8 px-4 text-sm border-blue-300 text-blue-700 hover:bg-blue-50 ${
                !canPreviewFlow ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <Play className="h-3 w-3 mr-1" />
              Preview Flow
            </Button>
            {savedActivityId && (
              <Button
                variant="outline"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/learn/activities/${savedActivityId}`;
                  window.open(shareUrl, "_blank");
                }}
                className="h-8 px-4 text-sm"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
            )}
            <Button
              onClick={generateActivity}
              disabled={nodes.length < 2 || isGenerating}
              className="h-8 px-4 text-sm bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isGenerating ? (
                <>
                  <Zap className="h-3 w-3 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Complete & Get URL
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Zapier-style Sidebar */}
        <div className="w-96 border-r bg-white">
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "nodes" | "settings")
            }
            className="h-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-50 rounded-none border-b">
              <TabsTrigger value="nodes" className="text-sm font-medium">
                Components
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-sm font-medium">
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nodes" className="p-3 space-y-3">
              {/* Activity Info - Title/Description come from props, not editable here */}
              {workflowTitle && (
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Activity Title
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {workflowTitle}
                  </p>
                  {workflowDescription && (
                    <>
                      <p className="text-xs font-medium text-gray-600 mt-2 mb-1">
                        Description
                      </p>
                      <p className="text-sm text-gray-700">
                        {workflowDescription}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Node Types */}
              <div>
                <Label className="text-xs font-medium mb-2 block text-gray-600">
                  Drag to Canvas
                </Label>

                {/* Flow Control */}
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Flow Control
                  </h4>
                  <div className="grid grid-cols-1 gap-1">
                    {NODE_TYPES.filter((nt) => nt.category === "flow").map(
                      (nodeType) => {
                        const Icon = nodeType.icon;
                        return (
                          <Card
                            key={nodeType.id}
                            className={`p-2 cursor-pointer hover:shadow-md transition-all duration-200 ${
                              nodeType.isRequired
                                ? "border-orange-300 bg-orange-50"
                                : "hover:scale-[1.02]"
                            }`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "nodeType",
                                JSON.stringify(nodeType)
                              );
                            }}
                            style={{
                              borderColor: nodeType.color,
                              borderWidth: "1px",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="p-1.5 rounded-lg"
                                style={{ backgroundColor: nodeType.color }}
                              >
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {nodeType.name}
                                </p>
                                {nodeType.isRequired && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs mt-0.5 bg-orange-100 text-orange-800"
                                  >
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Content
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {NODE_TYPES.filter((nt) => nt.category === "content").map(
                      (nodeType) => {
                        const Icon = nodeType.icon;
                        return (
                          <Card
                            key={nodeType.id}
                            className="p-2 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "nodeType",
                                JSON.stringify(nodeType)
                              );
                            }}
                            style={{
                              borderColor: nodeType.color,
                              borderWidth: "2px",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="p-1.5 rounded-lg"
                                style={{ backgroundColor: nodeType.color }}
                              >
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {nodeType.name}
                                </p>
                              </div>
                            </div>
                          </Card>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Interactive */}
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Interactive
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {NODE_TYPES.filter(
                      (nt) => nt.category === "interactive"
                    ).map((nodeType) => {
                      const Icon = nodeType.icon;
                      return (
                        <Card
                          key={nodeType.id}
                          className="p-2 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "nodeType",
                              JSON.stringify(nodeType)
                            );
                          }}
                          style={{
                            borderColor: nodeType.color,
                            borderWidth: "2px",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="p-1.5 rounded-lg"
                              style={{ backgroundColor: nodeType.color }}
                            >
                              <Icon className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {nodeType.name}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Assessment */}
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Assessment
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {NODE_TYPES.filter(
                      (nt) => nt.category === "assessment"
                    ).map((nodeType) => {
                      const Icon = nodeType.icon;
                      return (
                        <Card
                          key={nodeType.id}
                          className="p-2 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "nodeType",
                              JSON.stringify(nodeType)
                            );
                          }}
                          style={{
                            borderColor: nodeType.color,
                            borderWidth: "2px",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="p-1.5 rounded-lg"
                              style={{ backgroundColor: nodeType.color }}
                            >
                              <Icon className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {nodeType.name}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {nodes.length}
                    </div>
                    <div className="text-xs text-gray-600">Steps</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {connections.length}
                    </div>
                    <div className="text-xs text-gray-600">Connections</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="p-4">
              {selectedNode ? (
                renderNodeParameters()
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    No Node Selected
                  </h3>
                  <p className="text-sm">
                    Click on a node to edit its settings
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Single Build flow lives inside Settings → renderNodeParameters section */}
          </Tabs>
        </div>

        {/* Zapier-style Canvas */}
        <div className="flex-1 relative overflow-hidden bg-gray-50">
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            onMouseMove={handleNodeDrag}
            onMouseUp={handleNodeDragEnd}
            onMouseLeave={handleNodeDragEnd}
            onMouseDown={handleCanvasMouseDown}
            onWheel={handleWheel}
            style={{
              backgroundImage: `
                radial-gradient(circle, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: `${16 * zoom}px ${16 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${
                pan.y / zoom
              }px)`,
              transformOrigin: "0 0",
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
            }}
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
            {/* Render connections */}
            {connections.map(renderConnection)}

            {/* Render nodes */}
            {nodes.map(renderNode)}

            {/* Zapier-style Empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="p-4 bg-orange-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Zap className="h-10 w-10 text-orange-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Start Building Your Activity
                  </h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    Drag components from the sidebar to create your learning
                    workflow
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Drag & drop to get started</span>
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Tool Mode Indicator */}
          </div>
        </div>
      </div>

      {/* AI Branching Popup */}
      {showAIBranchingPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              AI Tutor Branching Setup
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select existing nodes to connect for mastery and novel learning
              paths.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mastery Path
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        const masteryConnection = {
                          from: aiBranchingNodeId!,
                          to: e.target.value,
                          id: getNextConnectionId(),
                          label: "mastery",
                        };
                        setConnections([...connections, masteryConnection]);
                        saveToHistory();
                      }
                    }}
                  >
                    <option value="">Select node for mastery path</option>
                    {nodes
                      .filter((n) => n.id !== aiBranchingNodeId)
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Novel Path
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        const novelConnection = {
                          from: aiBranchingNodeId!,
                          to: e.target.value,
                          id: getNextConnectionId(),
                          label: "novel",
                        };
                        setConnections([...connections, novelConnection]);
                        saveToHistory();
                      }
                    }}
                  >
                    <option value="">Select node for novel path</option>
                    {nodes
                      .filter((n) => n.id !== aiBranchingNodeId)
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAIBranchingPopup(false);
                  setAIBranchingNodeId(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Branching Popup */}
      {showQuizBranchingPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Quiz Branching Setup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select existing nodes to connect for different performance levels.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Low Score (&lt;60%)
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        const lowConnection = {
                          from: quizBranchingNodeId!,
                          to: e.target.value,
                          id: getNextConnectionId(),
                          label: "low_score",
                        };
                        setConnections([...connections, lowConnection]);
                        saveToHistory();
                      }
                    }}
                  >
                    <option value="">Select node for low score</option>
                    {nodes
                      .filter((n) => n.id !== quizBranchingNodeId)
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medium Score (60-80%)
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        const mediumConnection = {
                          from: quizBranchingNodeId!,
                          to: e.target.value,
                          id: getNextConnectionId(),
                          label: "medium_score",
                        };
                        setConnections([...connections, mediumConnection]);
                        saveToHistory();
                      }
                    }}
                  >
                    <option value="">Select node for medium score</option>
                    {nodes
                      .filter((n) => n.id !== quizBranchingNodeId)
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    High Score (&gt;80%)
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        const highConnection = {
                          from: quizBranchingNodeId!,
                          to: e.target.value,
                          id: getNextConnectionId(),
                          label: "high_score",
                        };
                        setConnections([...connections, highConnection]);
                        saveToHistory();
                      }
                    }}
                  >
                    <option value="">Select node for high score</option>
                    {nodes
                      .filter((n) => n.id !== quizBranchingNodeId)
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuizBranchingPopup(false);
                  setQuizBranchingNodeId(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Flow Modal */}
      {showPreviewFlow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold">Preview Activity Flow</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Test your activity flow in preview mode
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPreviewFlow(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <SimpleActivityPlayer
                activity={{
                  id: "preview",
                  title: workflowTitle || "Preview Activity",
                  description: workflowDescription || "",
                  content: {
                    nodes: nodes.map((node) => ({
                      id: node.id,
                      type: node.type,
                      title: node.title,
                      description: node.description,
                      config: node.config,
                    })),
                    connections: connections,
                  },
                  points: 0,
                  estimated_duration: 0,
                }}
                isPreview={true}
                onComplete={(score, timeSpent) => {
                  console.log("Preview completed:", { score, timeSpent });
                  // Optionally show a success message
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && savedActivityId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Activity Preview</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/learn/activities/${savedActivityId}`;
                    window.open(shareUrl, "_blank");
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <iframe
                src={`/learn/activities/${savedActivityId}`}
                className="w-full h-full border rounded"
                title="Activity Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Node Picker Modal */}
      {showNodePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Add Next Step</h3>
              <Button
                variant="outline"
                onClick={() => setShowNodePicker(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {NODE_TYPES.filter((nt) => nt.id !== "start").map(
                  (nodeType) => {
                    const Icon = nodeType.icon;
                    return (
                      <Card
                        key={nodeType.id}
                        className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                        onClick={() => handleNodePickerSelect(nodeType)}
                        style={{
                          borderColor: nodeType.color,
                          borderWidth: "2px",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: nodeType.color }}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {nodeType.name}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {nodeType.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Editor Modals */}
      {selectedNode && (
        <>
          <TextEditorModal
            open={contextModalOpen}
            onOpenChange={setContextModalOpen}
            value={selectedNode.config.context || ""}
            onChange={(value) =>
              updateNodeConfig(selectedNode.id, { context: value })
            }
            title="Edit Context Configuration"
            description="Configure context for flashcards or teacher review. Supports math notation (x^2, H2O, sqrt(x))."
            placeholder="Configure context based on uploaded documents and YouTube videos..."
          />
          <TextEditorModal
            open={promptsModalOpen}
            onOpenChange={setPromptsModalOpen}
            value={selectedNode.config.prompts || ""}
            onChange={(value) =>
              updateNodeConfig(selectedNode.id, { prompts: value })
            }
            title="Edit Review Prompts"
            description="Enter one prompt per line. Students will complete each prompt. Supports math notation."
            placeholder="Enter review prompts (one per line). Example: 'Use a semicolon in a sentence'"
          />
        </>
      )}
    </div>
  );
}
