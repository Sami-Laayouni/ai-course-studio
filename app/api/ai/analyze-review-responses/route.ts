import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateContent, createCacheKey } from "@/lib/genai-utils";
import { checkRateLimit } from "@/lib/rate-limiter";

const toSentenceList = (items: string[], conjunction = "and") => {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  const head = items.slice(0, -1).join(", ");
  const tail = items[items.length - 1];
  return `${head}, ${conjunction} ${tail}`;
};

const buildTeacherSummary = (
  studentName: string,
  misconceptions: any[],
  strengths: string[]
) => {
  const name = studentName || "This student";
  if (misconceptions.length === 0) {
    if (strengths.length === 0) {
      return `${name} demonstrated solid understanding during this activity.`;
    }
    return `${name} showed strong understanding of ${toSentenceList(
      strengths.map((item) => item.toLowerCase())
    )}.`;
  }

  const statements = misconceptions.map((m: any) => {
    const concept = m.concept || "this concept";
    const detail =
      m.misconception_description ||
      m.correct_understanding ||
      "needs additional clarification.";
    return `${name.split(" ")[0]} is struggling with ${concept.toLowerCase()} — ${detail}`;
  });

  return statements.join(" ");
};

const buildStudentSummary = (
  studentName: string,
  strengths: string[],
  misconceptions: any[]
) => {
  const nameFragment = studentName ? `${studentName.split(" ")[0]}, ` : "";
  const highlight = strengths.length
    ? `You explained ${toSentenceList(
        strengths.map((item) => item.toLowerCase())
      )} really well`
    : "You made a thoughtful effort";

  if (misconceptions.length === 0) {
    return `${nameFragment}${highlight}! Keep building on this momentum.`;
  }

  const primary = misconceptions[0];
  const conceptFragment = primary?.concept
    ? `${primary.concept.toLowerCase()}`
    : "this idea";
  const correction =
    primary?.correct_understanding ||
    "Take a moment to review the correct explanation and compare it with your response.";

  return `${nameFragment}${highlight}, however let's take another look at ${conceptFragment}. ${correction}`;
};

export async function POST(request: NextRequest) {
  try {
    const {
      activity_id,
      node_id,
      student_id,
      responses,
      context,
      context_sources = [],
    } = await request.json();

    if (!activity_id || !student_id || !responses) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS for server-side inserts
    const supabase = createServiceClient();

    // Check rate limits first
    const rateLimitCheck = checkRateLimit(student_id, "analyze-review-responses");
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitCheck.message || "Rate limit exceeded",
          retry_after: rateLimitCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    // Check if analysis already exists for this student/activity/node combination
    const { data: existingAnalysis } = await supabase
      .from("student_misconceptions")
      .select("id")
      .eq("student_id", student_id)
      .eq("activity_id", activity_id)
      .eq("node_id", node_id || "")
      .limit(1);

    if (existingAnalysis && existingAnalysis.length > 0) {
      console.log("✅ Analysis already exists, skipping AI call");
      return NextResponse.json({
        success: true,
        message: "Analysis already completed",
      });
    }

    // Build context text
    let contextText = context || "";
    if (context_sources && context_sources.length > 0) {
      const contextParts = context_sources.map((source: any) => {
        if (source.type === "document" || source.type === "pdf") {
          return `Document: ${source.title}\n${source.summary || ""}\nKey Points: ${(source.key_points || []).join(", ")}`;
        } else if (source.type === "youtube" || source.type === "video") {
          return `Video: ${source.title}\n${source.summary || ""}\nKey Concepts: ${(source.key_concepts || []).join(", ")}`;
        }
        return "";
      });
      contextText = contextParts.join("\n\n") + "\n\n" + contextText;
    }

    // Analyze responses based on review type
    let analysisPrompt = "";
    if (responses.review_type === "flashcards") {
      const termsData = responses.flashcard_terms || [];
      analysisPrompt = `Analyze the following student flashcard definitions and identify:
1. Concepts the student understands correctly
2. Concepts the student has misconceptions about
3. Specific misconceptions with evidence
4. Recommended review concepts

Context:
${contextText}

Student Definitions:
${termsData.map((t: any, i: number) => `${i + 1}. Term: ${t.term}\n   Student Definition: ${t.student_definition}`).join("\n\n")}

Return JSON:
{
  "concepts_understood": ["list of concepts student understands"],
  "misconceptions": [
    {
      "concept": "concept name",
      "misconception": "description of misconception",
      "evidence": "student's definition that shows the misconception",
      "severity": "low|medium|high",
      "correct_understanding": "what the correct understanding should be"
    }
  ],
  "recommended_review": ["concepts that need review"],
  "overall_assessment": "brief assessment of student understanding"
}`;
    } else if (responses.review_type === "teacher_review") {
      const promptsData = responses.teacher_responses || [];
      analysisPrompt = `Analyze the following student responses to teacher prompts and identify misconceptions and areas of strength.

Context:
${contextText}

Student Responses:
${promptsData.map((r: any, i: number) => `Prompt ${i + 1}: ${r.prompt}\nResponse: ${r.response}`).join("\n\n")}

Return JSON:
{
  "strengths": ["areas where student shows understanding"],
  "misconceptions": [
    {
      "concept": "concept name",
      "misconception": "description of misconception",
      "evidence": "student response that shows the misconception",
      "severity": "low|medium|high",
      "correct_understanding": "what the correct understanding should be"
    }
  ],
  "recommended_review": ["concepts that need review"],
  "overall_assessment": "brief assessment of student understanding"
}`;
    }

    // Use genAI utility with deduplication and rate limiting
    const cacheKey = createCacheKey(
      "analyze-review",
      activity_id,
      node_id,
      student_id
    );

    const normalizeText = (raw: string) => {
      if (!raw) return "";
      // Remove Markdown code fences if present
      const trimmed = raw.trim();
      if (trimmed.startsWith("```")) {
        return trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      }
      return trimmed;
    };

    const parseAnalysis = (raw: string) => {
      const text = normalizeText(raw);
      const bracesMatch = text.match(/\{[\s\S]*\}/);
      const candidate = bracesMatch ? bracesMatch[0] : text;

      try {
        return JSON.parse(candidate);
      } catch (error) {
        console.error("Error parsing analysis JSON:", error, candidate);
        return null;
      }
    };

    const sanitizeMisconceptions = (items: any[] | undefined) => {
      if (!Array.isArray(items)) return [];
      return items
        .map((item) => {
          if (!item) return null;
          return {
            concept: item.concept || item.topic || "Unknown Concept",
            misconception:
              item.misconception ||
              item.misconception_description ||
              item.description ||
              "",
            evidence:
              item.evidence?.response ||
              item.student_definition ||
              item.student_response ||
              item.evidence ||
              "",
            severity:
              typeof item.severity === "string"
                ? item.severity.toLowerCase()
                : undefined,
            correct_understanding:
              item.correct_understanding ||
              item.correct_explanation ||
              item.explanation ||
              "",
          };
        })
        .filter(Boolean);
    };

    const sanitizeArray = (value: any): string[] => {
      if (Array.isArray(value)) {
        return value
          .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
          .filter(Boolean);
      }
      if (typeof value === "string" && value.trim()) {
        return [value.trim()];
      }
      return [];
    };

    let text = "";
    try {
      text = await generateContent(analysisPrompt, {
        maxRetries: 2,
        retryDelay: 3000,
        cacheKey,
        userId: student_id,
        endpoint: "analyze-review-responses",
        minInterval: 5000, // Minimum 5 seconds between calls for same analysis
      });
    } catch (error: any) {
      console.error("❌ Failed to generate analysis:", error);
      // Return 429 if rate limited, otherwise 500
      if (error?.message?.includes("Rate limit")) {
        return NextResponse.json(
          {
            error:
              "Rate limit exceeded. Please try again in a few minutes. The analysis will be processed when the rate limit resets.",
            retry_after: 300,
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Failed to analyze responses" },
        { status: 500 }
      );
    }

    let analysis =
      parseAnalysis(text) ||
      parseAnalysis(text.replace(/\n+/g, " ")) ||
      {};

    // Some models wrap JSON inside an `analysis` property
    if (analysis && analysis.analysis && typeof analysis.analysis === "object") {
      analysis = analysis.analysis;
    }

    analysis = {
      concepts_understood: sanitizeArray(
        analysis.concepts_understood || analysis.strengths
      ),
      strengths: sanitizeArray(analysis.strengths || analysis.concepts_understood),
      misconceptions: sanitizeMisconceptions(analysis.misconceptions),
      recommended_review: sanitizeArray(analysis.recommended_review),
      overall_assessment:
        analysis.overall_assessment ||
        analysis.summary ||
        "Keep reviewing and focus on concepts highlighted below.",
    };

    // Log the full AI analysis
    console.log("🤖 AI Misconception Analysis Results:");
    console.log("   Overall Assessment:", analysis.overall_assessment);
    console.log("   Concepts Understood:", analysis.concepts_understood);
    console.log("   Strengths:", analysis.strengths);
    console.log("   Recommended Review:", analysis.recommended_review);
    console.log("   Misconceptions Found:", analysis.misconceptions.length);
    analysis.misconceptions.forEach((m: any, idx: number) => {
      console.log(`   Misconception ${idx + 1}:`);
      console.log(`     - Concept: ${m.concept}`);
      console.log(`     - Description: ${m.misconception || m.misconception_description || "N/A"}`);
      console.log(`     - Severity: ${m.severity || "medium"}`);
      console.log(`     - Evidence: ${m.evidence || "N/A"}`);
      console.log(`     - Correct Understanding: ${m.correct_understanding || "N/A"}`);
    });
    console.log("📋 Full Analysis JSON:", JSON.stringify(analysis, null, 2));

    // Save misconceptions to database
    const misconceptionsArray = Array.isArray(analysis.misconceptions)
      ? analysis.misconceptions
      : [];

    console.log(`💾 Saving ${misconceptionsArray.length} misconceptions to database...`);

    if (misconceptionsArray.length > 0) {
      const insertPromises = misconceptionsArray.map(async (misconception) => {
        const insertData = {
          student_id,
          activity_id,
          node_id: node_id || "",
          concept: misconception.concept || "Unknown Concept",
          misconception_description: misconception.misconception || misconception.misconception_description || "",
          evidence: {
            response: misconception.evidence || misconception.evidence?.response || "",
            correct_understanding: misconception.correct_understanding || "",
          },
          severity: (misconception.severity || "medium").toLowerCase(),
          ai_analysis: analysis,
        };

        // Try the insert
        const { data, error } = await supabase
          .from("student_misconceptions")
          .insert(insertData)
          .select();

        if (error) {
          console.error(`❌ Error inserting misconception for concept "${misconception.concept}":`, error);
          console.error("   Error code:", error.code);
          console.error("   Error message:", error.message);
          console.error("   Error hint:", error.hint);
          console.error("   Error details:", JSON.stringify(error, null, 2));
          console.error("   Insert data:", JSON.stringify(insertData, null, 2));
          
          // Log the actual error - don't assume it's an API key error
          throw error;
        }

        console.log(`✅ Saved misconception: ${misconception.concept}`, data?.[0]?.id);
        return data;
      });

      const results = await Promise.allSettled(insertPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        console.log(`✅ Successfully saved ${successful} out of ${misconceptionsArray.length} misconceptions`);
      }
      if (failed > 0) {
        console.error(`❌ Failed to save ${failed} misconceptions`);
        results.forEach((result, idx) => {
          if (result.status === 'rejected') {
            const error = result.reason;
            console.error(`   Failed misconception ${idx + 1} (${misconceptionsArray[idx]?.concept || 'unknown'}):`, error?.message || error);
          }
        });
      }
    } else {
      console.log("ℹ️ No misconceptions to save");
    }

    // Update concept mastery
    const understoodConcepts = Array.isArray(analysis.concepts_understood)
      ? analysis.concepts_understood
      : [];

    if (understoodConcepts.length > 0) {
      console.log(`💾 Updating concept mastery for ${understoodConcepts.length} concepts...`);
      const masteryPromises = understoodConcepts.map(async (concept) => {
        const { error } = await supabase
          .from("concept_mastery")
          .upsert(
            {
              student_id,
              activity_id,
              concept: typeof concept === "string" ? concept : String(concept),
              mastery_level: 0.8, // High mastery for understood concepts
              evidence_count: 1,
              last_updated: new Date().toISOString(),
            },
            { onConflict: "student_id,activity_id,concept" }
          );

        if (error) {
          console.error(`❌ Error updating concept mastery for "${concept}":`, error);
        }
      });

      await Promise.all(masteryPromises);
    }

    // Update real-time analytics
    console.log("💾 Saving real-time analytics...");
    let studentName = "";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", student_id)
        .maybeSingle();
      studentName = profile?.full_name || "";
    } catch (profileError) {
      console.warn("⚠️ Unable to fetch student profile for analytics summary:", profileError);
    }

    const teacherSummary = buildTeacherSummary(
      studentName,
      misconceptionsArray,
      sanitizeArray(analysis.strengths || analysis.concepts_understood)
    );
    const studentSummary = buildStudentSummary(
      studentName,
      sanitizeArray(analysis.strengths || analysis.concepts_understood),
      misconceptionsArray
    );

    const analyticsData = {
      student_id,
      activity_id,
      node_id: node_id || "",
      node_type: "review",
      performance_data: {
        review_type: responses.review_type,
        completion_status: "completed",
        student_name: studentName || undefined,
        teacher_summary: teacherSummary,
        student_summary: studentSummary,
      },
      strengths_identified:
        sanitizeArray(analysis.strengths) || sanitizeArray(analysis.concepts_understood),
      weaknesses_identified: misconceptionsArray
        .map((m: any) => m.concept)
        .filter(Boolean),
      concepts_addressed: [
        ...sanitizeArray(analysis.concepts_understood),
        ...misconceptionsArray.map((m: any) => m.concept).filter(Boolean),
      ],
      adaptation_suggestions: {
        recommended_review: sanitizeArray(analysis.recommended_review),
        overall_assessment: analysis.overall_assessment || "",
      },
    };

    const { data: analyticsResult, error: analyticsError } = await supabase
      .from("real_time_analytics")
      .insert(analyticsData)
      .select();

    if (analyticsError) {
      console.error("❌ Error inserting real-time analytics:", analyticsError);
    } else {
      console.log("✅ Saved real-time analytics:", analyticsResult?.[0]?.id);
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error("❌ Error analyzing review responses:", error);
    console.error("   Error type:", error?.constructor?.name);
    console.error("   Error message:", error?.message);
    console.error("   Error stack:", error?.stack);
    
    // If it's an API key error, provide more helpful message
    if (error?.message?.includes("Invalid API key") || error?.message?.includes("JWT")) {
      return NextResponse.json(
        { 
          error: "Database configuration error",
          details: "Invalid Supabase API key. Please check your SUPABASE_SERVICE_ROLE_KEY in .env.local",
          hint: "Make sure you're using the service_role key (not the anon key) from Supabase Dashboard → Settings → API"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to analyze responses",
        details: error?.message || "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}

