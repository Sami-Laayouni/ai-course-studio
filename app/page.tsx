"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Users, Zap, ArrowRight, Sparkles, CheckCircle2, TrendingUp, Globe, Play, BarChart3, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const SUBJECTS = [
  "Quantum Physics",
  "Finance",
  "Machine Learning",
  "Biochemistry",
  "Data Science",
  "Astrophysics",
  "Neuroscience",
  "Cryptography",
  "Robotics",
  "Genetics",
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
    { path: "M 50 50 Q 150 80, 250 100 Q 300 120, 350 150", color: "#8b5cf6", delay: 0 },
    { path: "M 50 100 Q 150 120, 250 130 Q 300 140, 350 150", color: "#a855f7", delay: 0.1 },
    { path: "M 50 150 Q 150 160, 250 160 Q 300 155, 350 150", color: "#ec4899", delay: 0.2 },
    { path: "M 50 200 Q 150 200, 250 190 Q 300 170, 350 150", color: "#d946ef", delay: 0.3 },
    { path: "M 50 80 Q 200 60, 350 150", color: "#8b5cf6", delay: 0.15 },
    { path: "M 50 120 Q 200 100, 350 150", color: "#a855f7", delay: 0.25 },
    { path: "M 50 170 Q 200 180, 350 150", color: "#ec4899", delay: 0.35 },
  ];

  const pathLength = 400;

  return (
    <div className="w-full h-full relative bg-gray-900/50 rounded-2xl border border-gray-700/50 p-8">
      <svg className="w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet">
        {/* Multiple paths drawing */}
        {paths.map((pathData, i) => {
          const effectiveProgress = Math.max(0, Math.min(1, (drawProgress - pathData.delay) / (1 - pathData.delay)));
          
          return (
            <path
              key={i}
              d={pathData.path}
              fill="none"
              stroke={pathData.color}
              strokeWidth="2.5"
              strokeDasharray={pathLength}
              strokeDashoffset={visible ? pathLength * (1 - effectiveProgress) : pathLength}
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
        <g className={visible ? "animate-fade-in" : ""} style={{ animationDelay: "0.5s", opacity: drawProgress > 0.3 ? 1 : 0 }}>
          <circle cx="350" cy="150" r="12" fill="#8b5cf6" />
          <circle cx="350" cy="150" r="8" fill="white" />
          <text x="350" y="175" textAnchor="middle" fill="#8b5cf6" fontSize="12" fontWeight="bold">Mastery</text>
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
  const [paths, setPaths] = useState<Array<{ id: number; connections: number[]; visible: boolean; progress: number }>>([]);

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
      setPaths(prev => prev.map((path, i) => {
        const pathStartProgress = i / prev.length;
        const pathEndProgress = (i + 1) / prev.length;
        const isVisible = progress >= pathStartProgress;
        const pathProgress = isVisible ? Math.min(1, (progress - pathStartProgress) / (pathEndProgress - pathStartProgress)) : 0;
        
        return {
          ...path,
          visible: isVisible,
          progress: pathProgress,
        };
      }));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [visible]);

  // Block positions and types - using percentage for better scaling
  const blocks = [
    { id: 1, x: 50, y: 50, type: "Video", color: "#8b5cf6", width: 80, height: 40 },
    { id: 2, x: 200, y: 50, type: "Quiz", color: "#a855f7", width: 80, height: 40 },
    { id: 3, x: 350, y: 50, type: "AI Chat", color: "#ec4899", width: 80, height: 40 },
    { id: 4, x: 50, y: 150, type: "Reading", color: "#d946ef", width: 80, height: 40 },
    { id: 5, x: 200, y: 150, type: "Practice", color: "#8b5cf6", width: 80, height: 40 },
    { id: 6, x: 350, y: 150, type: "Assessment", color: "#a855f7", width: 80, height: 40 },
  ];

  // Path colors for different workflows
  const pathColors = ["#8b5cf6", "#a855f7", "#ec4899", "#d946ef"];

  // Generate all path segments with proper coordinates
  const pathSegments: Array<{ key: string; d: string; color: string; progress: number; visible: boolean; pathLength: number }> = [];
  
  paths.forEach((path, pathIndex) => {
    if (!path.visible) return;
    
    path.connections.forEach((blockId, i) => {
      if (i === 0) return;
      
      const fromBlock = blocks.find(b => b.id === path.connections[i - 1]);
      const toBlock = blocks.find(b => b.id === blockId);
      
      if (!fromBlock || !toBlock) return;
      
      // Calculate connection points (center of blocks)
      const fromX = fromBlock.x + fromBlock.width / 2;
      const fromY = fromBlock.y + fromBlock.height / 2;
      const toX = toBlock.x + toBlock.width / 2;
      const toY = toBlock.y + toBlock.height / 2;
      
      // Calculate curved path with control point
      const midX = (fromX + toX) / 2;
      const midY = fromY < toY 
        ? Math.min(fromY, toY) - 30 
        : Math.max(fromY, toY) + 30;
      
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
        <h4 className="text-lg font-semibold text-white mb-1">Visual Activity Builder</h4>
        <p className="text-xs text-gray-400">Multiple connected learning paths</p>
      </div>
      
      <div className="relative w-full h-full min-h-[250px]" style={{ width: "100%", height: "100%" }}>
        {/* Canvas background */}
        <div className="absolute inset-0 bg-gray-800/30 rounded-lg border border-gray-700/50" />
        
        {/* Connection lines showing different paths - render first so blocks appear on top */}
        <svg 
          className="absolute inset-0 pointer-events-none" 
          style={{ zIndex: 1, width: "100%", height: "100%" }}
          preserveAspectRatio="none"
        >
          {pathSegments.map((segment) => {
            const strokeDashoffset = segment.pathLength * (1 - segment.progress);
            
            return (
              <path
                key={segment.key}
                d={segment.d}
                fill="none"
                stroke={segment.color}
                strokeWidth="3"
                strokeDasharray={segment.pathLength}
                strokeDashoffset={segment.visible ? strokeDashoffset : segment.pathLength}
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
              <div className="text-white text-xs font-semibold text-center whitespace-nowrap">{block.type}</div>
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
        <h4 className="text-lg font-semibold text-white mb-1">Scalability Comparison</h4>
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
              <div className="relative w-full flex items-end justify-center" style={{ height: `${chartHeight}px` }}>
                <div
                  className={`w-full rounded-t transition-all duration-500 ${
                    isUs ? "bg-gradient-to-t from-purple-600 to-purple-400" : "bg-gradient-to-t from-gray-600 to-gray-400"
                  }`}
                  style={{
                    height: visible ? `${animatedHeight}px` : "0px",
                    minHeight: "4px",
                    opacity: show ? 1 : 0,
                  }}
                />
              </div>
              <div className="text-xs text-gray-400 text-center font-medium">{point.label}</div>
              {visible && show && (
                <div className={`text-xs font-semibold ${isUs ? "text-purple-400" : "text-gray-400"}`}>
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

// Analytics Dashboard - Dashboard Style
function DashboardAnimation({ visible }: { visible: boolean }) {
  const [metrics, setMetrics] = useState({
    engagement: 0,
    users: 0,
    completion: 0,
    scores: 0,
  });

  useEffect(() => {
    if (!visible) {
      setMetrics({ engagement: 0, users: 0, completion: 0, scores: 0 });
      return;
    }
    
    const duration = 2000;
    const startTime = Date.now();
    
    const targetMetrics = { engagement: 87, users: 523, completion: 92, scores: 88 };
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setMetrics({
        engagement: Math.round(targetMetrics.engagement * progress),
        users: Math.round(targetMetrics.users * progress),
        completion: Math.round(targetMetrics.completion * progress),
        scores: Math.round(targetMetrics.scores * progress),
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [visible]);

  return (
    <div className="w-full h-full relative bg-gray-900/50 rounded-2xl border border-gray-700/50 p-6">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-white mb-1">Analytics Dashboard</h4>
        <p className="text-xs text-gray-400">Real-time metrics</p>
      </div>
      
      {/* Dashboard cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-2">Engagement</div>
          <div className="text-2xl font-bold text-purple-400">{metrics.engagement}%</div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
              style={{ width: visible ? `${metrics.engagement}%` : "0%" }}
            />
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-2">Active Users</div>
          <div className="text-2xl font-bold text-purple-400">{metrics.users}</div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
              style={{ width: visible ? `${(metrics.users / 600) * 100}%` : "0%" }}
            />
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-2">Completion Rate</div>
          <div className="text-2xl font-bold text-purple-400">{metrics.completion}%</div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
              style={{ width: visible ? `${metrics.completion}%` : "0%" }}
            />
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-2">Avg. Scores</div>
          <div className="text-2xl font-bold text-purple-400">{metrics.scores}%</div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
              style={{ width: visible ? `${metrics.scores}%` : "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Perfect Fit - Completely Different Design
function PerfectFitAnimation({ visible }: { visible: boolean }) {
  const [matchProgress, setMatchProgress] = useState(0);
  const [rings, setRings] = useState<Array<{ id: number; progress: number; visible: boolean }>>([]);

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
      setRings(prev => prev.map((ring, i) => ({
        ...ring,
        visible: progress >= (i + 1) / prev.length,
        progress: progress >= (i + 1) / prev.length ? Math.min(1, (progress - (i / prev.length)) * prev.length) : 0,
      })));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [visible]);

  return (
    <div className="w-full h-full relative bg-gray-900/50 rounded-2xl border border-gray-700/50 p-8">
      <div className="text-center mb-6">
        <h4 className="text-lg font-semibold text-white mb-1">Perfect Fit for Every Student</h4>
        <p className="text-xs text-gray-400">Personalized learning paths</p>
      </div>
      
      <div className="flex flex-col items-center justify-center h-[250px] relative overflow-visible">
        {/* Concentric rings showing matching progress */}
        <svg width="240" height="240" viewBox="0 0 240 240" className="relative" style={{ overflow: "visible" }}>
          {rings.map((ring, i) => {
            const radius = 30 + (i * 15);
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
                strokeDashoffset={ring.visible ? strokeDashoffset : circumference}
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
            style={{ animationDelay: "0.5s", opacity: matchProgress > 0.3 ? 1 : 0 }}
          />
          <text
            x="120"
            y="125"
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
            className={visible ? "animate-fade-in" : ""}
            style={{ animationDelay: "0.5s", opacity: matchProgress > 0.3 ? 1 : 0 }}
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
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        const userRole = profile?.role || "student";
        if (userRole === "admin") {
          router.push("/admin");
        } else if (userRole === "teacher") {
          router.push("/dashboard");
        } else {
          router.push("/learn");
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
          const sectionIndex = parseInt(entry.target.getAttribute('data-section-index') || '0');
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, sectionIndex]));
          }
        });
      },
      { threshold: 0.2 }
    );

    const sections = document.querySelectorAll('section[data-section-index]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-purple-950/40 to-fuchsia-950/40"></div>
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-violet-500/20 rounded-full blur-[200px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-fuchsia-500/20 rounded-full blur-[200px] animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Hero Section */}
      <section data-section-index={0} className="min-h-screen flex items-center justify-center px-2 sm:px-4 py-12">
        <div className="max-w-5xl mx-auto text-center w-full">
          <div className="mb-16">
            <h1 className="text-6xl md:text-8xl lg:text-[120px] font-black mb-8 leading-[0.95] tracking-tight">
              <span className="block">Teach</span>
              <span className="relative inline-block mt-2">
                <span
                  key={currentSubject}
                  className="inline-block bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent animate-fade-in"
                >
                  {SUBJECTS[currentSubject]}
                </span>
              </span>
            </h1>
          </div>
          
          <p className="text-2xl md:text-3xl lg:text-4xl font-light text-gray-300 mb-8 tracking-wide max-w-3xl mx-auto leading-relaxed">
            Explain · Understand · Tailor
          </p>

          {/* 500+ Students Display */}
          <div className="mb-12 relative">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 blur-xl opacity-40 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-8 py-4 rounded-xl shadow-xl">
                <div className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-1">
                  500+
                </div>
                <div className="text-lg md:text-xl lg:text-2xl font-bold text-white/90">
                  STUDENTS AT A TIME
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <Button 
              asChild 
              size="lg" 
              className="text-lg px-12 py-7 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 rounded-full font-semibold"
            >
              <Link href="/auth/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-12 py-7 bg-transparent border-2 border-gray-700 hover:border-gray-600 hover:bg-white/5 rounded-full font-semibold backdrop-blur-sm"
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
      <section data-section-index={1} className="min-h-screen flex items-center justify-center px-2 sm:px-4 py-16">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
              Everything you need to create personalized learning experiences
            </p>
          </div>

          <div className="space-y-20 max-w-6xl mx-auto">
            {/* Feature 1: Custom Paths */}
            <div className={`flex flex-col lg:flex-row items-center gap-16 ${visibleSections.has(1) ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-xl shadow-violet-500/30">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                    Custom Paths
                  </h3>
                </div>
                <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
                  Every student follows a unique learning journey designed for their needs. 
                  AI-powered branching creates personalized paths that adapt in real-time.
                </p>
              </div>
              <div className="flex-1 w-full h-[500px] relative">
                <CustomPathsAnimation visible={visibleSections.has(1)} />
              </div>
            </div>

            {/* Feature 2: Visual Builder */}
            <div className={`flex flex-col lg:flex-row-reverse items-center gap-16 ${visibleSections.has(1) ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/30">
                    <Zap className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Visual Builder
                  </h3>
                </div>
                <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
                  Drag-and-drop activity builder. Create custom learning workflows with AI, 
                  quizzes, videos, and interactive content. No coding required.
                </p>
              </div>
              <div className="flex-1 w-full h-[500px] relative">
                <VisualBuilderAnimation visible={visibleSections.has(1)} />
              </div>
            </div>

            {/* Feature 3: Scaling */}
            <div className={`flex flex-col lg:flex-row items-center gap-16 ${visibleSections.has(1) ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-pink-500/30">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Scale to 500+
                  </h3>
                </div>
                <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
                  Teach hundreds of students simultaneously. Each gets a unique, tailored experience. 
                  Compare our scalability to other platforms.
                </p>
              </div>
              <div className="flex-1 w-full h-[500px] relative">
                <ScalingComparisonAnimation visible={visibleSections.has(1)} />
              </div>
            </div>

            {/* Feature 4: Dashboard Analytics */}
            <div className={`flex flex-col lg:flex-row-reverse items-center gap-16 ${visibleSections.has(1) ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center shadow-xl shadow-fuchsia-500/30">
                    <LayoutDashboard className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                    Real-time Analytics
                  </h3>
                </div>
                <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
                  Track progress, identify learning gaps, and optimize each student's path in real-time. 
                  Beautiful dashboards with actionable insights.
                </p>
              </div>
              <div className="flex-1 w-full h-[500px] relative">
                <DashboardAnimation visible={visibleSections.has(1)} />
              </div>
            </div>

            {/* Feature 5: Perfect Fit */}
            <div className={`flex flex-col lg:flex-row items-center gap-16 ${visibleSections.has(1) ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.8s' }}>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-violet-500/30">
                    <CheckCircle2 className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Perfect Fit for Every Student
                  </h3>
                </div>
                <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
                  Each learning experience is uniquely matched to every student's needs, pace, and learning style. 
                  No two paths are the same - every student gets their perfect fit.
                </p>
              </div>
              <div className="flex-1 w-full h-[500px] relative">
                <PerfectFitAnimation visible={visibleSections.has(1)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section data-section-index={4} className="min-h-screen flex items-center justify-center px-2 sm:px-4 py-16">
        <div className="max-w-4xl mx-auto text-center w-full">
          <h2 className="text-5xl md:text-7xl font-black mb-8 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Welcome to the Future of Education
          </h2>
          <p className="text-2xl text-gray-400 mb-12 font-light">
            Join educators creating the future of personalized learning
          </p>
          <Button 
            asChild 
            size="lg" 
            className="text-xl px-16 py-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 rounded-full font-semibold"
          >
            <Link href="/auth/signup">
              Start Building Today
              <ArrowRight className="ml-3 h-6 w-6" />
            </Link>
          </Button>
        </div>
      </section>

      <style jsx global>{`
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
          0%, 100% {
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
      `}</style>
    </div>
  );
}
