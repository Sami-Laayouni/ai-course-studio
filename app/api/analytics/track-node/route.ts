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
  weaknesses: string[],
  nodeType: string
) => {
  const subject = studentName ? studentName.split(" ")[0] : "This student";
  if (!weaknesses || weaknesses.length === 0) {
    return `${subject} is progressing well on this ${nodeType} activity.`;
  }

  const formatted = weaknesses.map((concept) =>
    concept.toLowerCase().replace(/\.$/, "")
  );

  return `${subject} is struggling with ${toSentenceList(formatted)} during this ${nodeType} activity.`;
};

const buildStudentSummary = (
  strengths: string[],
  weaknesses: string[],
  nodeType: string
) => {
  const strengthsText = strengths && strengths.length > 0
    ? `You did a great job with ${toSentenceList(
        strengths.map((s) => s.toLowerCase())
      )}`
    : `You made steady progress on this ${nodeType} activity`;

  if (!weaknesses || weaknesses.length === 0) {
    return `${strengthsText}! Keep it up.`;
  }

  const focusConcept = weaknesses[0].toLowerCase();
  return `${strengthsText}, however let's review ${focusConcept}. Here's a quick tip: revisit the key ideas and try another example to lock it in.`;
};

export async function POST(request: NextRequest) {
  try {
    const {
      student_id,
      activity_id,
      node_id,
      node_type,
      performance_data,
      student_response,
      context_sources = [],
    } = await request.json();

    if (!student_id || !activity_id || !node_id || !node_type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS for server-side inserts
    const supabase = createServiceClient();

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

    // Check rate limits (more lenient for analytics)
    const rateLimitCheck = checkRateLimit(student_id, "track-node");
    if (!rateLimitCheck.allowed) {
      // For analytics, we can skip AI analysis but still save basic data
      console.log("⚠️ Rate limited for analytics, skipping AI analysis");
      // Still save basic analytics without AI
      const teacherSummary = buildTeacherSummary(studentName, [], node_type);
      const studentSummary = buildStudentSummary([], [], node_type);

      await supabase.from("real_time_analytics").insert({
        student_id,
        activity_id,
        node_id,
        node_type,
        performance_data: {
          ...(performance_data || {}),
          student_name: studentName || undefined,
          teacher_summary: teacherSummary,
          student_summary: studentSummary,
        },
        strengths_identified: [],
        weaknesses_identified: [],
        concepts_addressed: [],
        adaptation_suggestions: {},
      });
      return NextResponse.json({
        success: true,
        message: "Analytics saved (AI analysis skipped due to rate limit)",
      });
    }

    // Check if analytics already tracked for this node (prevent duplicate calls)
    const { data: existing } = await supabase
      .from("real_time_analytics")
      .select("id")
      .eq("student_id", student_id)
      .eq("activity_id", activity_id)
      .eq("node_id", node_id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("✅ Analytics already tracked for this node, skipping AI analysis");
      return NextResponse.json({
        success: true,
        message: "Analytics already tracked",
      });
    }

    // Use AI to analyze performance and identify strengths/weaknesses
    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let concepts_addressed: string[] = [];
    let adaptation_suggestions: any = {};

    try {
      const analysisPrompt = `Analyze the following student performance data and identify:
1. Strengths (what the student understands well)
2. Weaknesses (areas of struggle)
3. Concepts addressed
4. Adaptation suggestions for next steps

Node Type: ${node_type}
Performance Data: ${JSON.stringify(performance_data)}
Student Response: ${student_response || "N/A"}

Return JSON:
{
  "strengths": ["list of strengths"],
  "weaknesses": ["list of weaknesses"],
  "concepts_addressed": ["concepts covered"],
  "adaptation_suggestions": {
    "next_difficulty": "easier|same|harder",
    "recommended_topics": ["topics to focus on"],
    "intervention_needed": true/false
  }
}`;

      // Use genAI utility with deduplication and rate limiting
      const cacheKey = createCacheKey("track-node", activity_id, node_id, student_id);
      
      let text = "";
      try {
        text = await generateContent(analysisPrompt, {
          maxRetries: 1, // Fewer retries for analytics to avoid blocking
          retryDelay: 2000,
          cacheKey,
          userId: student_id,
          endpoint: "track-node",
          minInterval: 2000, // Minimum 2 seconds between calls for same node
        });
      } catch (error: any) {
        // If rate limited, continue without AI analysis
        if (error?.message?.includes("Rate limit")) {
          console.log("⚠️ Analytics: Rate limit exceeded, skipping AI analysis");
          text = ""; // Empty text means we'll use default empty arrays
        } else {
          throw error;
        }
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        strengths = analysis.strengths || [];
        weaknesses = analysis.weaknesses || [];
        concepts_addressed = analysis.concepts_addressed || [];
        adaptation_suggestions = analysis.adaptation_suggestions || {};
      }
    } catch (error) {
      console.error("Error in AI analysis:", error);
      // Continue with empty arrays if AI analysis fails
    }

    // Save to real_time_analytics
    const teacherSummary = buildTeacherSummary(
      studentName,
      weaknesses,
      node_type
    );
    const studentSummary = buildStudentSummary(
      strengths,
      weaknesses,
      node_type
    );

    const { error: insertError } = await supabase
      .from("real_time_analytics")
      .insert({
        student_id,
        activity_id,
        node_id,
        node_type,
        performance_data: {
          ...(performance_data || {}),
          student_name: studentName || undefined,
          teacher_summary: teacherSummary,
          student_summary: studentSummary,
        },
        strengths_identified: strengths,
        weaknesses_identified: weaknesses,
        concepts_addressed,
        adaptation_suggestions,
      });

    if (insertError) {
      console.error("Error inserting analytics:", insertError);
    }

    // Update concept mastery based on performance
    if (concepts_addressed.length > 0) {
      const score = performance_data?.score || performance_data?.percentage || 0;
      const masteryLevel = score >= 80 ? 0.8 : score >= 60 ? 0.6 : 0.4;

      for (const concept of concepts_addressed) {
        await supabase
          .from("concept_mastery")
          .upsert(
            {
              student_id,
              activity_id,
              concept,
              mastery_level: masteryLevel,
              evidence_count: 1,
              last_updated: new Date().toISOString(),
            },
            {
              onConflict: "student_id,activity_id,concept",
              ignoreDuplicates: false,
            }
          );
      }
    }

    // Update common struggles aggregation
    if (weaknesses.length > 0) {
      for (const weakness of weaknesses) {
        // Get current count
        const { data: existing } = await supabase
          .from("common_struggles")
          .select("struggling_student_count, total_student_count")
          .eq("activity_id", activity_id)
          .eq("concept", weakness)
          .single();

        if (existing) {
          await supabase
            .from("common_struggles")
            .update({
              struggling_student_count: existing.struggling_student_count + 1,
              last_updated: new Date().toISOString(),
            })
            .eq("activity_id", activity_id)
            .eq("concept", weakness);
        } else {
          // Get total students for this activity
          const { data: activityData } = await supabase
            .from("activities")
            .select("course_id")
            .eq("id", activity_id)
            .single();
          
          const { count: totalStudents } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("course_id", activityData?.course_id || "");

          await supabase.from("common_struggles").insert({
            activity_id,
            concept: weakness,
            struggling_student_count: 1,
            total_student_count: totalStudents || 0,
            last_updated: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      analytics: {
        strengths,
        weaknesses,
        concepts_addressed,
        adaptation_suggestions,
      },
    });
  } catch (error) {
    console.error("Error tracking analytics:", error);
    return NextResponse.json(
      { error: "Failed to track analytics" },
      { status: 500 }
    );
  }
}

