"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Brain,
  Users,
  Zap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Globe,
  Play,
  BarChart3,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const SUBJECTS = [
  "Quantum Physics",
  "Linear Algebra",
  "Machine Learning",
  "Biochemistry",
  "Data Science",
  "Astrophysics",
  "American Literature",
  "Cryptography",
  "Microbiology",
  "Political Science",
];

// Personalized Learning Path - Many Paths to Mastery
function CustomPathsAnimation({ visible }: { visible: boolean }) {
  const [drawProgress, setDrawProgress] = useState(0);

  useEffect(() => {
    if (!visible) return;

    const duration = 3000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDrawProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [visible]);

  // Multiple paths all ending at Mastery
  const paths = [
    {
      path: "M 50 50 Q 150 80, 250 100 Q 300 120, 350 150",
      color: "#8b5cf6",
      delay: 0,
    },
    {
      path: "M 50 100 Q 150 120, 250 130 Q 300 140, 350 150",
      color: "#a855f7",
      delay: 0.1,
    },
    {
      path: "M 50 150 Q 150 160, 250 160 Q 300 155, 350 150",
      color: "#ec4899",
      delay: 0.2,
    },
    {
      path: "M 50 200 Q 150 200, 250 190 Q 300 170, 350 150",
      color: "#d946ef",
      delay: 0.3,
    },
    { path: "M 50 80 Q 200 60, 350 150", color: "#8b5cf6", delay: 0.15 },
    { path: "M 50 120 Q 200 100, 350 150", color: "#a855f7", delay: 0.25 },
    { path: "M 50 170 Q 200 180, 350 150", color: "#ec4899", delay: 0.35 },
  ];

  const pathLength = 400;

  return (
    <div className="w-full h-full relative bg-gray-900/50 rounded-2xl border border-gray-700/50 p-8">
      <svg
        className="w-full h-full"
        viewBox="0 0 400 250"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Multiple paths drawing */}
        {paths.map((pathData, i) => {
          const effectiveProgress = Math.max(
            0,
            Math.min(1, (drawProgress - pathData.delay) / (1 - pathData.delay))
          );

          return (
            <path
              key={i}
              d={pathData.path}
              fill="none"
              stroke={pathData.color}
              strokeWidth="2.5"
              strokeDasharray={pathLength}
              strokeDashoffset={
                visible ? pathLength * (1 - effectiveProgress) : pathLength
              }
              className="transition-all duration-300"
              style={{ opacity: effectiveProgress > 0 ? 1 : 0 }}
            />
          );
        })}

        {/* Start points */}
        {paths.map((_, i) => {
          const startY = [50, 100, 150, 200, 80, 120, 170][i];
          return (
            <circle
              key={`start-${i}`}
              cx="50"
              cy={startY}
              r="5"
              fill="#8b5cf6"
              className={visible ? "animate-fade-in" : ""}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          );
        })}

        {/* Mastery endpoint - all paths converge here */}
        <g
          className={visible ? "animate-fade-in" : ""}
          style={{
            animationDelay: "0.5s",
            opacity: drawProgress > 0.3 ? 1 : 0,
          }}
        >
          <circle cx="350" cy="150" r="12" fill="#8b5cf6" />
          <circle cx="350" cy="150" r="8" fill="white" />
          <text
            x="350"
            y="175"
            textAnchor="middle"
            fill="#8b5cf6"
            fontSize="12"
            fontWeight="bold"
          >
            Mastery
          </text>
        </g>

        {/* Label */}
        <text
          x="200"
          y="30"
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="14"
          fontWeight="500"
          className={visible ? "animate-fade-in-up" : ""}
        >
          Personalized Learning Paths
        </text>
      </svg>
    </div>
  );
}

// Visual Builder - Multiple Connected Paths
function VisualBuilderAnimation({ visible }: { visible: boolean }) {
  const [buildProgress, setBuildProgress] = useState(0);
  const [paths, setPaths] = useState<
    Array<{
      id: number;
      connections: number[];
      visible: boolean;
      progress: number;
    }>
  >([]);

  useEffect(() => {
    if (!visible) {
      setBuildProgress(0);
      setPaths([]);
      return;
    }

    const duration = 3000;
    const startTime = Date.now();

    // Define different workflow paths
    const workflowPaths = [
      { id: 1, connections: [1, 2, 6], visible: false, progress: 0 }, // Video -> Quiz -> Assessment
      { id: 2, connections: [4, 5, 2], visible: false, progress: 0 }, // Reading -> Practice -> Quiz
      { id: 3, connections: [3, 5, 6], visible: false, progress: 0 }, // AI Chat -> Practice -> Assessment
      { id: 4, connections: [1, 3, 5], visible: false, progress: 0 }, // Video -> AI Chat -> Practice
    ];
    setPaths(workflowPaths);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setBuildProgress(progress);

      // Show paths sequentially with drawing animation
      setPaths((prev) =>
        prev.map((path, i) => {
          const pathStartProgress = i / prev.length;
          const pathEndProgress = (i + 1) / prev.length;
          const isVisible = progress >= pathStartProgress;
          const pathProgress = isVisible
            ? Math.min(
                1,
                (progress - pathStartProgress) /
                  (pathEndProgress - pathStartProgress)
              )
            : 0;

          return {
            ...path,
            visible: isVisible,
            progress: pathProgress,
          };
        })
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [visible]);

  // Block positions and types - using percentage for better scaling
  const blocks = [
    {
      id: 1,
      x: 50,
      y: 50,
      type: "Video",
      color: "#8b5cf6",
      width: 80,
      height: 40,
    },
    {
      id: 2,
      x: 200,
      y: 50,
      type: "Quiz",
      color: "#a855f7",
      width: 80,
      height: 40,
    },
    {
      id: 3,
      x: 350,
      y: 50,
      type: "AI Chat",
      color: "#ec4899",
      width: 80,
      height: 40,
    },
    {
      id: 4,
      x: 50,
      y: 150,
      type: "Reading",
      color: "#d946ef",
      width: 80,
      height: 40,
    },
    {
      id: 5,
      x: 200,
      y: 150,
      type: "Practice",
      color: "#8b5cf6",
      width: 80,
      height: 40,
    },
    {
      id: 6,
      x: 350,
      y: 150,
      type: "Assessment",
      color: "#a855f7",
      width: 80,
      height: 40,
    },
  ];

  // Path colors for different workflows
  const pathColors = ["#8b5cf6", "#a855f7", "#ec4899", "#d946ef"];

  // Generate all path segments with proper coordinates
  const pathSegments: Array<{
    key: string;
    d: string;
    color: string;
    progress: number;
    visible: boolean;
    pathLength: number;
  }> = [];

  paths.forEach((path, pathIndex) => {
    if (!path.visible) return;

    path.connections.forEach((blockId, i) => {
      if (i === 0) return;

      const fromBlock = blocks.find((b) => b.id === path.connections[i - 1]);
      const toBlock = blocks.find((b) => b.id === blockId);

      if (!fromBlock || !toBlock) return;

      // Calculate connection points (center of blocks)
      const fromX = fromBlock.x + fromBlock.width / 2;
      const fromY = fromBlock.y + fromBlock.height / 2;
      const toX = toBlock.x + toBlock.width / 2;
      const toY = toBlock.y + toBlock.height / 2;

      // Calculate curved path with control point
      const midX = (fromX + toX) / 2;
      const midY =
        fromY < toY ? Math.min(fromY, toY) - 30 : Math.max(fromY, toY) + 30;

      const pathD = `M ${fromX} ${fromY} Q ${midX} ${midY}, ${toX} ${toY}`;

      // Calculate approximate path length for animation
      const dx = toX - fromX;
      const dy = toY - fromY;
      const straightDist = Math.sqrt(dx * dx + dy * dy);
      const pathLength = straightDist * 1.5; // Approximate for curved path

      pathSegments.push({
        key: `path-${path.id}-${i}`,
        d: pathD,
        color: pathColors[pathIndex],
        progress: path.progress,
        visible: path.visible,
        pathLength: pathLength,
      });
    });
  });

  return (
    <div className="w-full h-full relative bg-gray-900/50 rounded-2xl border border-gray-700/50 p-8">
      <div className="text-center mb-4">
        <h4 className="text-lg font-semibold text-white mb-1">
          Visual Activity Builder
        </h4>
        <p className="text-xs text-gray-400">
          Multiple connected learning paths
        </p>
      </div>

      <div
        className="relative w-full h-full min-h-[250px]"
        style={{ width: "100%", height: "100%" }}
      >
        {/* Canvas background */}
        <div className="absolute inset-0 bg-gray-800/30 rounded-lg border border-gray-700/50" />

        {/* Connection lines showing different paths - render first so blocks appear on top */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 1, width: "100%", height: "100%" }}
          preserveAspectRatio="none"
        >
          {pathSegments.map((segment) => {
            const strokeDashoffset =
              segment.pathLength * (1 - segment.progress);

            return (
              <path
                key={segment.key}
                d={segment.d}
                fill="none"
                stroke={segment.color}
                strokeWidth="3"
                strokeDasharray={segment.pathLength}
                strokeDashoffset={
                  segment.visible ? strokeDashoffset : segment.pathLength
                }
                className="transition-all duration-300"
                opacity={segment.visible ? 0.8 : 0}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Activity blocks - render on top */}
        {blocks.map((block) => (
          <div
            key={block.id}
            className="absolute transition-all duration-500 z-10"
            style={{
              left: `${block.x}px`,
              top: `${block.y}px`,
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.8)",
            }}
          >
            <div
              className="px-4 py-3 rounded-lg shadow-lg border"
              style={{
                background: `linear-gradient(135deg, ${block.color}, ${block.color}dd)`,
                borderColor: `${block.color}50`,
                width: `${block.width}px`,
                height: `${block.height}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div className="text-white text-xs font-semibold text-center whitespace-nowrap">
                {block.type}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Scalability - Bar Chart
function ScalingComparisonAnimation({ visible }: { visible: boolean }) {
  const [barProgress, setBarProgress] = useState(0);

  const dataPoints = [
    { label: "Traditional", value: 25 },
    { label: "Online", value: 30 },
    { label: "Hybrid", value: 35 },
    { label: "LMS", value: 50 },
    { label: "Us", value: 500 },
  ];

  useEffect(() => {
    if (!visible) return;

    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setBarProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [visible]);

  const maxValue = 500;
  const barWidth = 60;
  const barSpacing = 20;
  const chartHeight = 200;
  const chartPadding = 40;

  return (
    <div className="w-full h-full relative bg-gray-900/50 rounded-2xl border border-gray-700/50 p-8">
      <div className="text-center mb-4">
        <h4 className="text-lg font-semibold text-white mb-1">
          Scalability Comparison
        </h4>
        <p className="text-xs text-gray-400">Students per class/session</p>
      </div>

      <div className="flex items-end justify-center gap-4 h-[250px] px-4">
        {dataPoints.map((point, i) => {
          const barHeight = (point.value / maxValue) * chartHeight;
          const animatedHeight = barHeight * barProgress;
          const isUs = point.label === "Us";
          const show = barProgress >= (i + 1) / dataPoints.length;

          return (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div
                className="relative w-full flex items-end justify-center"
                style={{ height: `${chartHeight}px` }}
              >
                <div
                  className={`w-full rounded-t transition-all duration-500 ${
                    isUs
                      ? "bg-gradient-to-t from-purple-600 to-purple-400"
                      : "bg-gradient-to-t from-gray-600 to-gray-400"
                  }`}
                  style={{
                    height: visible ? `${animatedHeight}px` : "0px",
                    minHeight: "4px",
                    opacity: show ? 1 : 0,
                  }}
                />
              </div>
              <div className="text-xs text-gray-400 text-center font-medium">
                {point.label}
              </div>
              {visible && show && (
                <div
                  className={`text-xs font-semibold ${
                    isUs ? "text-purple-400" : "text-gray-400"
                  }`}
                >
                  {point.value}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Smart Analytics Dashboard - Actionable Insights
function DashboardAnimation({ visible }: { visible: boolean }) {
  const [insights, setInsights] = useState<
    Array<{
      id: number;
      student: string;
      topic: string;
      issue: string;
      severity: "high" | "medium" | "low";
      visible: boolean;
    }>
  >([]);

  const insightsData = [
    {
      id: 1,
      student: "Sarah Chen",
      topic: "Quantum Mechanics",
      issue: "Struggling with wave-particle duality",
      severity: "high" as const,
    },
    {
      id: 2,
      student: "Marcus Johnson",
      topic: "Calculus",
      issue: "Needs more practice with derivatives",
      severity: "medium" as const,
    },
    {
      id: 3,
      student: "Emma Williams",
      topic: "Organic Chemistry",
      issue: "Difficulty understanding reaction mechanisms",
      severity: "high" as const,
    },
    {
      id: 4,
      student: "Alex Rivera",
      topic: "Linear Algebra",
      issue: "Matrix operations need reinforcement",
      severity: "low" as const,
    },
  ];

  useEffect(() => {
    if (!visible) {
      setInsights([]);
      return;
    }

    // Show insights sequentially
    const duration = 2500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Calculate which insights should be visible
      const visibleCount = Math.floor(progress * insightsData.length);
      const newInsights = insightsData.map((insight, index) => ({
        ...insight,
        visible: index < visibleCount,
      }));

      setInsights(newInsights);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [visible]);

  const getSeverityColor = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return "from-red-500 to-orange-500";
      case "medium":
        return "from-yellow-500 to-orange-500";
      case "low":
        return "from-blue-500 to-cyan-500";
    }
  };

  const getSeverityBadge = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    }
  };

  return (
    <div className="w-full h-full relative bg-gray-900/50 rounded-2xl border border-gray-700/50 p-4 sm:p-6 flex flex-col max-h-[400px] sm:max-h-[500px]">
      <div className="mb-3 sm:mb-4 flex-shrink-0">
        <h4 className="text-base sm:text-lg font-semibold text-white mb-1">
          Smart Analytics
        </h4>
        <p className="text-xs text-gray-400">AI-powered actionable insights</p>
      </div>

      <div className="space-y-2 sm:space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-gray-800/50">
        {insights.map((insight, index) => (
          <div
            key={insight.id}
            className={`bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 transition-all duration-500 ${
              insight.visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
            style={{
              transitionDelay: `${index * 0.1}s`,
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {insight.student
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">
                    {insight.student}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${getSeverityBadge(
                      insight.severity
                    )} whitespace-nowrap`}
                  >
                    {insight.severity.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-1.5">
                  <span className="text-purple-400 font-medium">
                    {insight.topic}
                  </span>
                </div>
                <div className="text-sm text-gray-300 leading-relaxed">
                  {insight.issue}
                </div>
              </div>
            </div>
            <button
              className={`w-full px-4 py-2.5 rounded-lg bg-gradient-to-r ${getSeverityColor(
                insight.severity
              )} text-white text-xs font-semibold hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl`}
              style={{
                opacity: insight.visible ? 1 : 0,
                pointerEvents: insight.visible ? "auto" : "none",
              }}
            >
              Focus More on This
            </button>
          </div>
        ))}

        {/* Additional Smart Analytics Cards */}
        {insights.length > 0 && insights[insights.length - 1]?.visible && (
          <div
            className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/30 animate-fade-in-up"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-purple-400">
                Learning Pattern Detected
              </span>
            </div>
            <div className="text-sm text-gray-300 mb-3 leading-relaxed">
              3 students showing similar struggle patterns in advanced topics
            </div>
            <button className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors">
              View Pattern Analysis →
            </button>
          </div>
        )}

        {insights.length > 0 && insights[insights.length - 1]?.visible && (
          <div
            className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-4 border border-blue-500/30 animate-fade-in-up"
            style={{ animationDelay: "0.7s" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-400">
                Engagement Alert
              </span>
            </div>
            <div className="text-sm text-gray-300 mb-3 leading-relaxed">
              Peak learning time detected: 2-4 PM. Schedule more sessions?
            </div>
            <button className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Optimize Schedule →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Perfect Fit - Completely Different Design
function PerfectFitAnimation({ visible }: { visible: boolean }) {
  const [matchProgress, setMatchProgress] = useState(0);
  const [rings, setRings] = useState<
    Array<{ id: number; progress: number; visible: boolean }>
  >([]);

  useEffect(() => {
    if (!visible) {
      setMatchProgress(0);
      setRings([]);
      return;
    }

    const duration = 2500;
    const startTime = Date.now();

    // Initialize rings
    const initialRings = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      progress: 0,
      visible: false,
    }));
    setRings(initialRings);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setMatchProgress(progress);

      // Animate rings sequentially
      setRings((prev) =>
        prev.map((ring, i) => ({
          ...ring,
          visible: progress >= (i + 1) / prev.length,
          progress:
            progress >= (i + 1) / prev.length
              ? Math.min(1, (progress - i / prev.length) * prev.length)
              : 0,
        }))
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [visible]);

  return (
    <div className="w-full h-full relative bg-gray-900/50 rounded-2xl border border-gray-700/50 p-8">
      <div className="text-center mb-6">
        <h4 className="text-lg font-semibold text-white mb-1">
          Perfect Fit for Every Student
        </h4>
        <p className="text-xs text-gray-400">Personalized learning paths</p>
      </div>

      <div className="flex flex-col items-center justify-center h-[250px] relative overflow-visible">
        {/* Concentric rings showing matching progress */}
        <svg
          width="240"
          height="240"
          viewBox="0 0 240 240"
          className="relative"
          style={{ overflow: "visible" }}
        >
          {rings.map((ring, i) => {
            const radius = 30 + i * 15;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference * (1 - ring.progress);
            const centerX = 120;
            const centerY = 120;

            return (
              <circle
                key={ring.id}
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={ring.visible ? "#8b5cf6" : "#374151"}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={
                  ring.visible ? strokeDashoffset : circumference
                }
                className="transition-all duration-500"
                style={{
                  opacity: ring.visible ? 1 : 0.3,
                  transform: "rotate(-90deg)",
                  transformOrigin: `${centerX}px ${centerY}px`,
                }}
              />
            );
          })}

          {/* Center circle */}
          <circle
            cx="120"
            cy="120"
            r="20"
            fill="#8b5cf6"
            className={visible ? "animate-fade-in" : ""}
            style={{
              animationDelay: "0.5s",
              opacity: matchProgress > 0.3 ? 1 : 0,
            }}
          />
          <text
            x="120"
            y="125"
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
            className={visible ? "animate-fade-in" : ""}
            style={{
              animationDelay: "0.5s",
              opacity: matchProgress > 0.3 ? 1 : 0,
            }}
          >
            Fit
          </text>
        </svg>

        {/* Percentage display */}
        {visible && (
          <div className="mt-4 text-center animate-fade-in-up">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {Math.floor(matchProgress * 100)}%
            </div>
            <div className="text-xs text-gray-400">Perfect Match</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [currentSubject, setCurrentSubject] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(
    new Set()
  );
  const [visibleFeatures, setVisibleFeatures] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, has_completed_assessment")
          .eq("id", user.id)
          .single();

        const userRole = profile?.role || "student";
        if (userRole === "admin") {
          router.push("/admin");
        } else if (userRole === "teacher") {
          router.push("/dashboard");
        } else {
          // Check if student has completed assessment
          if (!profile?.has_completed_assessment) {
            router.push("/learn/assessment");
          } else {
            router.push("/learn");
          }
        }
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubject((prev) => (prev + 1) % SUBJECTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionIndex = parseInt(
            entry.target.getAttribute("data-section-index") || "0"
          );
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, sectionIndex]));
          }
        });
      },
      { threshold: 0.2 }
    );

    const sections = document.querySelectorAll("section[data-section-index]");
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const featureId = entry.target.getAttribute("data-feature-id");
          if (featureId) {
            if (entry.isIntersecting) {
              setVisibleFeatures((prev) => new Set([...prev, featureId]));
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    const features = document.querySelectorAll("[data-feature-id]");
    features.forEach((feature) => observer.observe(feature));

    return () => {
      features.forEach((feature) => observer.unobserve(feature));
    };
  }, []);

  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-purple-950/40 to-fuchsia-950/40"></div>
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-violet-500/20 rounded-full blur-[200px] animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-fuchsia-500/20 rounded-full blur-[200px] animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Course Studio
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="#features"
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Features
              </Link>
              <Link
                href="#about"
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                About
              </Link>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:flex text-xs sm:text-sm text-gray-400 hover:text-white px-3 sm:px-4"
              >
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="text-xs sm:text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 px-3 sm:px-4"
              >
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        data-section-index={0}
        className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 pt-20 sm:pt-24"
      >
        <div className="max-w-7xl mx-auto text-center w-full">
          <div className="mb-8 sm:mb-12 md:mb-16">
            <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[120px] font-black mb-4 sm:mb-6 md:mb-8 leading-[0.95] tracking-tight px-2">
              <span className="block">Teach</span>
              <span className="relative inline-block mt-1 sm:mt-2">
                <span
                  key={currentSubject}
                  className="inline-block bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent animate-fade-in"
                >
                  {SUBJECTS[currentSubject]}
                </span>
              </span>
            </h1>
          </div>

          <p className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-light text-gray-300 mb-6 sm:mb-8 tracking-wide max-w-3xl mx-auto leading-relaxed px-4">
            Explain · Understand · Tailor
          </p>

          {/* 500+ Students Display */}
          <div className="mb-8 sm:mb-12 relative px-4">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 blur-xl opacity-40 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-xl">
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-1">
                  500+
                </div>
                <div className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-white/90">
                  STUDENTS AT A TIME
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-16 md:mb-20 px-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 rounded-full font-semibold"
            >
              <Link href="/auth/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 bg-transparent border-2 border-gray-700 hover:border-gray-600 hover:bg-white/5 rounded-full font-semibold backdrop-blur-sm"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex items-start justify-center p-2">
              <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - List Layout with Animations */}
      <section
        id="features"
        data-section-index={1}
        className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-12 sm:mb-16 md:mb-24 px-4">
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto">
              Everything you need to create personalized learning experiences
            </p>
          </div>

          <div className="space-y-12 sm:space-y-16 md:space-y-20 max-w-6xl mx-auto px-4">
            {/* Feature 1: Custom Paths */}
            <div
              data-feature-id="custom-paths"
              className={`flex flex-col lg:flex-row items-center gap-8 sm:gap-12 md:gap-16 transition-opacity duration-700 ${
                visibleFeatures.has("custom-paths")
                  ? "opacity-100 animate-fade-in-up"
                  : "opacity-0"
              }`}
            >
              <div className="flex-1 w-full lg:w-auto">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-xl shadow-violet-500/30 flex-shrink-0">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                    Custom Paths
                  </h3>
                </div>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 leading-relaxed font-light">
                  Every student follows a unique learning journey designed for
                  their needs. AI-powered branching creates personalized paths
                  that adapt in real-time.
                </p>
              </div>
              <div className="flex-1 w-full h-[300px] sm:h-[400px] md:h-[500px] relative">
                <CustomPathsAnimation
                  visible={visibleFeatures.has("custom-paths")}
                />
              </div>
            </div>

            {/* Feature 2: Visual Builder */}
            <div
              data-feature-id="visual-builder"
              className={`flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-12 md:gap-16 transition-opacity duration-700 ${
                visibleFeatures.has("visual-builder")
                  ? "opacity-100 animate-fade-in-up"
                  : "opacity-0"
              }`}
            >
              <div className="flex-1 w-full lg:w-auto">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/30 flex-shrink-0">
                    <Zap className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Visual Builder
                  </h3>
                </div>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 leading-relaxed font-light">
                  Drag-and-drop activity builder. Create custom learning
                  workflows with AI, quizzes, videos, and interactive content.
                  No coding required.
                </p>
              </div>
              <div className="flex-1 w-full h-[300px] sm:h-[400px] md:h-[500px] relative">
                <VisualBuilderAnimation
                  visible={visibleFeatures.has("visual-builder")}
                />
              </div>
            </div>

            {/* Feature 3: Scaling */}
            <div
              data-feature-id="scaling"
              className={`flex flex-col lg:flex-row items-center gap-8 sm:gap-12 md:gap-16 transition-opacity duration-700 ${
                visibleFeatures.has("scaling")
                  ? "opacity-100 animate-fade-in-up"
                  : "opacity-0"
              }`}
            >
              <div className="flex-1 w-full lg:w-auto">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-pink-500/30 flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Scale to 500+
                  </h3>
                </div>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 leading-relaxed font-light">
                  Teach hundreds of students simultaneously. Each gets a unique,
                  tailored experience. Compare our scalability to other
                  platforms.
                </p>
              </div>
              <div className="flex-1 w-full h-[300px] sm:h-[400px] md:h-[500px] relative">
                <ScalingComparisonAnimation
                  visible={visibleFeatures.has("scaling")}
                />
              </div>
            </div>

            {/* Feature 4: Dashboard Analytics */}
            <div
              data-feature-id="analytics"
              className={`flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-12 md:gap-16 transition-opacity duration-700 ${
                visibleFeatures.has("analytics")
                  ? "opacity-100 animate-fade-in-up"
                  : "opacity-0"
              }`}
            >
              <div className="flex-1 w-full lg:w-auto">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center shadow-xl shadow-fuchsia-500/30 flex-shrink-0">
                    <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                    Smart Analytics
                  </h3>
                </div>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 leading-relaxed font-light">
                  AI-powered insights that tell you exactly which students are
                  struggling with specific topics. Get actionable alerts with
                  one-click solutions to focus more on problem areas.
                </p>
              </div>
              <div className="flex-1 w-full h-[300px] sm:h-[400px] md:h-[500px] relative">
                <DashboardAnimation
                  visible={visibleFeatures.has("analytics")}
                />
              </div>
            </div>

            {/* Feature 5: Perfect Fit */}
            <div
              data-feature-id="perfect-fit"
              className={`flex flex-col lg:flex-row items-center gap-8 sm:gap-12 md:gap-16 transition-opacity duration-700 ${
                visibleFeatures.has("perfect-fit")
                  ? "opacity-100 animate-fade-in-up"
                  : "opacity-0"
              }`}
            >
              <div className="flex-1 w-full lg:w-auto">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-violet-500/30 flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Perfect Fit for Every Student
                  </h3>
                </div>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 leading-relaxed font-light">
                  Each learning experience is uniquely matched to every
                  student's needs, pace, and learning style. No two paths are
                  the same - every student gets their perfect fit.
                </p>
              </div>
              <div className="flex-1 w-full h-[300px] sm:h-[400px] md:h-[500px] relative">
                <PerfectFitAnimation
                  visible={visibleFeatures.has("perfect-fit")}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        data-section-index={4}
        className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16"
      >
        <div className="max-w-4xl mx-auto text-center w-full px-4">
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black mb-6 sm:mb-8 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Welcome to the Future of Education
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-400 mb-8 sm:mb-12 font-light">
            Join educators creating the future of personalized learning
          </p>
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto text-base sm:text-xl px-8 sm:px-16 py-6 sm:py-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 rounded-full font-semibold"
          >
            <Link href="/auth/signup">
              Start Building Today
              <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-gray-800/50 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="col-span-1 sm:col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Course Studio
                </span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm max-w-md leading-relaxed">
                The future of personalized education. Create, teach, and scale
                with AI-powered learning experiences.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3 sm:mb-4 text-xs sm:text-sm">
                Product
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#features"
                    className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#demo"
                    className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
                  >
                    Demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3 sm:mb-4 text-xs sm:text-sm">
                Company
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#about"
                    className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#blog"
                    className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="#contact"
                    className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-6 sm:pt-8 border-t border-gray-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-xs sm:text-sm text-center sm:text-left">
              © {new Date().getFullYear()} Course Studio. All rights reserved.
            </p>
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
              <Link
                href="#privacy"
                className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
              >
                Privacy
              </Link>
              <Link
                href="#terms"
                className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
              >
                Terms
              </Link>
              <div className="flex items-center gap-3 sm:gap-4">
                <Link
                  href="#twitter"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Globe className="h-4 w-4" />
                </Link>
                <Link
                  href="#github"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Globe className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
        /* Custom scrollbar styles */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
