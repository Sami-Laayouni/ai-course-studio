import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import genAI from "@/lib/genai";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    // Authentication is optional; proceed in anonymous mode when not logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const {
      activityId,
      nodeId,
      studentResponse,
      contextSources = [],
      performanceHistory = [],
      threshold = 70,
    } = await request.json();

    if (!activityId || !nodeId || !studentResponse) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get node configuration
    const { data: activity } = await supabase
      .from("activities")
      .select("content")
      .eq("id", activityId)
      .single();

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    const nodes = activity.content?.nodes || [];
    const connections = activity.content?.connections || [];
    const node = nodes.find((n: any) => n.id === nodeId);

    if (!node || node.type !== "condition") {
      return NextResponse.json(
        { error: "Condition node not found" },
        { status: 404 }
      );
    }

    const config = node.config || {};
    const conditionType = config.condition_type || "performance";
    const performanceThreshold = config.performance_threshold || threshold;
    const useAIClassification = config.ai_classification !== false;

    let shouldTakeMasteryPath = false;
    let confidence = 0.5;
    let reasoning = "";

    if (
      conditionType === "performance" &&
      useAIClassification &&
      process.env.GOOGLE_AI_API_KEY
    ) {
      // Use AI to classify performance
      const contextText = contextSources
        .map(
          (source: any) =>
            `${source.title}: ${
              source.summary || source.key_points?.join(", ") || ""
            }`
        )
        .join("\n\n");

      const prompt = `Analyze the student's performance and determine if they should take the mastery path or novel path.

Student Response: "${studentResponse}"

Context Sources:
${contextText}

Performance History:
${performanceHistory
  .map((p: any) => `- ${p.type}: ${p.score || p.performance}%`)
  .join("\n")}

Threshold for Mastery: ${performanceThreshold}%

Consider:
1. Understanding depth and accuracy
2. Use of context and sources
3. Critical thinking and analysis
4. Previous performance patterns
5. Engagement and effort

Respond with JSON:
{
  "shouldTakeMasteryPath": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of the decision",
  "performanceScore": 0-100
}`;

      try {
        if (!process.env.GOOGLE_AI_API_KEY) {
          throw new Error("Google AI API key not configured");
        }

        const config = {
          responseMimeType: "application/json",
          maxOutputTokens: 500,
          systemInstruction: [
            {
              text: "You are an expert educational AI that evaluates student performance to determine appropriate learning paths. Be fair and encouraging while maintaining academic standards.",
            },
          ],
        };

        const response = await genAI.models.generateContentStream({
          model: "gemini-2.0-flash-lite",
          config,
          contents: [
            {
              role: "user",
              text: prompt,
            },
          ],
        });

        let text = "";
        for await (const chunk of response) {
          if (chunk.text) {
            text += chunk.text;
          }
        }

        if (text) {
          const parsed = JSON.parse(text);
          shouldTakeMasteryPath = parsed.shouldTakeMasteryPath || false;
          confidence = parsed.confidence || 0.5;
          reasoning = parsed.reasoning || "";
        }
      } catch (aiError) {
        console.error("AI classification error:", aiError);
        // Fallback to simple scoring
        shouldTakeMasteryPath = calculateSimpleScore(
          studentResponse,
          performanceThreshold
        );
        reasoning = "Used fallback scoring method";
      }
    } else {
      // Use simple scoring or other methods
      shouldTakeMasteryPath = calculateSimpleScore(
        studentResponse,
        performanceThreshold
      );
      reasoning = "Used simple scoring method";
    }

    // Save the decision to database
    if (user) {
      const { error: saveError } = await supabase
        .from("student_performance")
        .insert({
          id: `perf_${Date.now()}`,
          user_id: user.id,
          activity_id: activityId,
          node_id: nodeId,
          response: studentResponse,
          should_take_mastery_path: shouldTakeMasteryPath,
          confidence,
          reasoning,
          threshold_used: performanceThreshold,
          created_at: new Date().toISOString(),
        });
      if (saveError) {
        console.error("Error saving performance data:", saveError);
      }
    }

    const nextNodeId = findNextNodeId(
      connections,
      nodeId,
      shouldTakeMasteryPath ? "mastery" : "novel"
    );
    return NextResponse.json({
      shouldTakeMasteryPath,
      confidence,
      reasoning,
      pathLabel: shouldTakeMasteryPath
        ? config.mastery_path || "Mastery Path"
        : config.novel_path || "Novel Path",
      nextNodeId,
    });
  } catch (error) {
    console.error("Phase transition check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check phase transition",
        shouldTakeMasteryPath: false,
        confidence: 0.5,
        reasoning: "Error occurred during analysis",
      },
      { status: 500 }
    );
  }
}

function calculateSimpleScore(response: string, threshold: number): boolean {
  // Simple heuristics for scoring
  const wordCount = response.split(" ").length;
  const hasQuestions = response.includes("?");
  const hasAnalysis =
    response.includes("because") ||
    response.includes("therefore") ||
    response.includes("however");
  const hasContext = response.length > 100;

  let score = 0;
  if (wordCount > 50) score += 20;
  if (hasQuestions) score += 15;
  if (hasAnalysis) score += 25;
  if (hasContext) score += 20;
  if (response.length > 200) score += 20;

  return score >= threshold;
}

function findNextNodeId(
  connections: Array<{ from: string; to: string; label?: string }>,
  currentNodeId: string,
  pathType: "mastery" | "novel" | string
): string | null {
  if (!Array.isArray(connections)) return null;
  // Prefer labeled connections matching the path type
  const labeled = connections.find(
    (c) =>
      c.from === currentNodeId &&
      (c.label || "").toLowerCase() === pathType.toLowerCase()
  );
  if (labeled) return labeled.to || null;
  // Fallback: first outgoing connection
  const first = connections.find((c) => c.from === currentNodeId);
  return first ? first.to : null;
}
