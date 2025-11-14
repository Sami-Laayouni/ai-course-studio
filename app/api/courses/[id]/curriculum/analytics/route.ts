import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ai, getModelName } from "@/lib/ai-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const { curriculum_id } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get curriculum document
    const { data: curriculum, error: curriculumError } = await supabase
      .from("curriculum_documents")
      .select("*")
      .eq("id", curriculum_id)
      .eq("course_id", courseId)
      .single();

    if (curriculumError || !curriculum) {
      return NextResponse.json({ error: "Curriculum not found" }, { status: 404 });
    }

    // Check if processing is still in progress
    if (curriculum.processing_status && 
        curriculum.processing_status !== "completed" && 
        curriculum.processing_status !== "failed") {
      return NextResponse.json({
        success: false,
        message: "Curriculum is still being processed. Please wait for processing to complete.",
        processing_status: curriculum.processing_status,
        processing_progress: curriculum.processing_progress,
      });
    }

    // Get all activities for this course
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("id, title, description, content")
      .eq("course_id", courseId);

    if (activitiesError) {
      return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
    }

    // Get all student progress for these activities
    const activityIds = activities?.map((a) => a.id) || [];
    const { data: progressData, error: progressError } = await supabase
      .from("student_progress")
      .select("*")
      .in("activity_id", activityIds);

    if (progressError) {
      console.error("Error fetching progress:", progressError);
    }

    // Get enrollments to count total students
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId);

    const totalStudents = enrollments?.length || 0;

    // Map activities to curriculum sections (using AI if mappings don't exist)
    const sections = curriculum.sections || [];
    const analytics: any[] = [];

    for (const section of sections) {
      const sectionId = section.id || section.title;

      // Find activities mapped to this section
      const { data: mappings } = await supabase
        .from("activity_curriculum_mappings")
        .select("activity_id")
        .eq("curriculum_document_id", curriculum_id)
        .eq("section_id", sectionId);

      const mappedActivityIds = mappings?.map((m) => m.activity_id) || [];

      // If no mappings exist, try to auto-map using vector similarity
      if (mappedActivityIds.length === 0 && activities && activities.length > 0) {
        try {
          // Get section embedding
          const { data: sectionEmbedding } = await supabase
            .from("curriculum_section_embeddings")
            .select("embedding")
            .eq("curriculum_document_id", curriculum_id)
            .eq("section_id", sectionId)
            .single();

          if (sectionEmbedding && sectionEmbedding.embedding) {
            // Get all activity embeddings for this course
            const activityIds = activities.map(a => a.id);
            const { data: activityEmbeddings } = await supabase
              .from("activity_embeddings")
              .select("activity_id, embedding")
              .in("activity_id", activityIds);

            if (activityEmbeddings && activityEmbeddings.length > 0) {
              // Calculate similarity for each activity using SQL
              // Use the update_activity_curriculum_mappings function which handles vector similarity
              for (const activityEmbedding of activityEmbeddings) {
                if (!activityEmbedding.embedding) continue;

                try {
                  // Use the database function to find and create mappings
                  const { data: mappings } = await supabase.rpc(
                    'update_activity_curriculum_mappings',
                    {
                      p_activity_id: activityEmbedding.activity_id,
                      p_curriculum_document_id: curriculum_id,
                      p_similarity_threshold: 0.7
                    }
                  );

                  if (mappings && mappings.length > 0) {
                    const matchingMappings = mappings.filter((m: any) => m.section_id === sectionId);
                    if (matchingMappings.length > 0) {
                      mappedActivityIds.push(activityEmbedding.activity_id);
                    }
                  }
                } catch (err) {
                  console.error(`Error mapping activity ${activityEmbedding.activity_id}:`, err);
                }
              }
            } else {
              // Generate embeddings for activities that don't have them
              for (const activity of activities) {
                try {
                  await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/activities/generate-embedding`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ activity_id: activity.id }),
                  });
                } catch (err) {
                  console.error(`Error generating embedding for activity ${activity.id}:`, err);
                }
              }
            }
          } else {
            // Section embedding not found - trigger embedding generation
            console.log(`Section embedding not found for section ${sectionId}, triggering generation...`);
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/curriculum/generate-embeddings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ curriculum_document_id: curriculum_id }),
            }).catch(err => console.error("Error triggering embedding generation:", err));
          }
        } catch (error) {
          console.error("Error auto-mapping activities with vector similarity:", error);
        }
      }

      // Calculate statistics for this section
      const sectionProgress = progressData?.filter((p) =>
        mappedActivityIds.includes(p.activity_id)
      ) || [];

      const studentsAttempted = new Set(
        sectionProgress.map((p) => p.student_id)
      ).size;
      const studentsCompleted = sectionProgress.filter(
        (p) => p.status === "completed"
      ).length;
      const completedProgress = sectionProgress.filter(
        (p) => p.status === "completed" && p.score !== null
      );
      const averageScore =
        completedProgress.length > 0
          ? completedProgress.reduce((sum, p) => sum + (p.score || 0), 0) /
            completedProgress.length
          : 0;

      // Calculate average time spent
      const timeSpentData = sectionProgress
        .filter((p) => p.time_spent)
        .map((p) => p.time_spent || 0);
      const averageTimeSpent =
        timeSpentData.length > 0
          ? timeSpentData.reduce((sum, t) => sum + t, 0) / timeSpentData.length
          : 0;

      // Identify common misconceptions using AI
      let misconceptions: any[] = [];
      let performanceInsights: any = {};

      if (sectionProgress.length > 0) {
        try {
          const misconceptionPrompt = `Analyze student performance data for this curriculum section and identify:
1. Common misconceptions students have
2. Concepts students understand well
3. Concepts students struggle with
4. Suggestions for improvement

Section: ${section.title}
Concepts: ${(section.concepts || []).join(", ")}
Total Students: ${totalStudents}
Students Attempted: ${studentsAttempted}
Students Completed: ${studentsCompleted}
Average Score: ${averageScore.toFixed(1)}%

Student Responses/Feedback (sample):
${sectionProgress
  .slice(0, 10)
  .map((p) => JSON.stringify(p.responses || {}))
  .join("\n")}

Return a JSON object with:
{
  "common_misconceptions": [{"concept": "...", "description": "...", "frequency": 0-100}],
  "strong_concepts": ["concept1", "concept2"],
  "weak_concepts": ["concept1", "concept2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

          const response = await genAI.models.generateContent({
            model: getModelName(),
            contents: misconceptionPrompt,
          });

          let responseText = "";
          if (typeof (response as any).outputText === "function") {
            responseText = (response as any).outputText();
          } else if ((response as any).outputText) {
            responseText = (response as any).outputText;
          }

          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const insights = JSON.parse(jsonMatch[0]);
            misconceptions = insights.common_misconceptions || [];
            performanceInsights = {
              strong_concepts: insights.strong_concepts || [],
              weak_concepts: insights.weak_concepts || [],
              suggestions: insights.suggestions || [],
            };
          }
        } catch (error) {
          console.error("Error generating insights:", error);
        }
      }

      // Calculate concept mastery
      const conceptMastery: any = {};
      if (section.concepts && Array.isArray(section.concepts)) {
        for (const concept of section.concepts) {
          const conceptProgress = sectionProgress.filter((p) => {
            const responses = p.responses || {};
            return JSON.stringify(responses).toLowerCase().includes(concept.toLowerCase());
          });
          const conceptCompleted = conceptProgress.filter(
            (p) => p.status === "completed"
          );
          conceptMastery[concept] =
            conceptProgress.length > 0
              ? (conceptCompleted.length / conceptProgress.length) * 100
              : 0;
        }
      }

      // Save or update analytics
      const analyticsData = {
        curriculum_document_id: curriculum_id,
        section_id: sectionId,
        course_id: courseId,
        total_students: totalStudents,
        students_attempted: studentsAttempted,
        students_completed: studentsCompleted,
        average_score: averageScore,
        average_time_spent: Math.round(averageTimeSpent),
        common_misconceptions: misconceptions,
        performance_insights: performanceInsights,
        concept_mastery: conceptMastery,
        last_calculated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("curriculum_analytics")
        .upsert(analyticsData, {
          onConflict: "curriculum_document_id,section_id",
        });

      if (upsertError) {
        console.error("Error saving analytics:", upsertError);
      }

      analytics.push({
        ...analyticsData,
        section_title: section.title,
      });
    }

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Error calculating analytics:", error);
    return NextResponse.json(
      { error: "Failed to calculate analytics" },
      { status: 500 }
    );
  }
}

