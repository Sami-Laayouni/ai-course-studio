import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';

/**
 * Find curriculum sections similar to an activity using vector similarity
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { activity_id, curriculum_document_id, similarity_threshold = 0.7, max_results = 5 } = await request.json();

    if (!activity_id || !curriculum_document_id) {
      return NextResponse.json(
        { error: "activity_id and curriculum_document_id are required" },
        { status: 400 }
      );
    }

    // Get activity embedding
    const { data: activityEmbedding, error: activityError } = await supabase
      .from("activity_embeddings")
      .select("embedding")
      .eq("activity_id", activity_id)
      .single();

    if (activityError || !activityEmbedding || !activityEmbedding.embedding) {
      return NextResponse.json(
        { error: "Activity embedding not found. Please generate embedding first." },
        { status: 404 }
      );
    }

    // Use the database function to find similar sections
    const { data: similarSections, error: similarityError } = await supabase.rpc(
      'find_similar_curriculum_sections',
      {
        activity_embedding: activityEmbedding.embedding,
        document_id: curriculum_document_id,
        similarity_threshold: similarity_threshold,
        max_results: max_results
      }
    );

    if (similarityError) {
      console.error("Error finding similar sections:", similarityError);
      return NextResponse.json(
        { error: "Failed to find similar sections", details: similarityError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      activity_id,
      curriculum_document_id,
      similar_sections: similarSections || [],
      count: similarSections?.length || 0,
    });
  } catch (error: any) {
    console.error("Error finding similar sections:", error);
    return NextResponse.json(
      { error: error.message || "Failed to find similar sections" },
      { status: 500 }
    );
  }
}

