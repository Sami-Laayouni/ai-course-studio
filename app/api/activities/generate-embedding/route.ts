import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding, combineTextFields } from "@/lib/embeddings";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // This route uses cookies/auth, must be dynamic

/**
 * Generate embedding for an activity
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { activity_id } = await request.json();

    if (!activity_id) {
      return NextResponse.json({ error: "activity_id is required" }, { status: 400 });
    }

    // Get activity
    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select("*")
      .eq("id", activity_id)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Update embedding status
    await supabase
      .from("activities")
      .update({ embedding_status: "processing" })
      .eq("id", activity_id);

    // Extract comprehensive text from activity
    let activityContent = "";
    
    // Combine title and description
    activityContent += (activity.title || "") + " ";
    activityContent += (activity.description || "") + " ";

    // Extract comprehensive content from all nodes
    if (activity.nodes && Array.isArray(activity.nodes)) {
      for (const node of activity.nodes) {
        const nodeType = node.type || "";
        const nodeTitle = node.title || "";
        const nodeDesc = node.description || "";
        const config = node.config || {};

        // Add node metadata
        activityContent += `Node: ${nodeTitle} (${nodeType}) `;
        if (nodeDesc) activityContent += `${nodeDesc} `;

        // Extract content based on node type
        switch (nodeType) {
          case "video":
            if (config.youtube_url) activityContent += `Video: ${config.youtube_url} `;
            if (config.video_title) activityContent += `Video Title: ${config.video_title} `;
            if (config.key_concepts) {
              activityContent += `Video Concepts: ${Array.isArray(config.key_concepts) ? config.key_concepts.join(", ") : config.key_concepts} `;
            }
            if (config.auto_questions) {
              const questions = Array.isArray(config.auto_questions) 
                ? config.auto_questions.map((q: any) => q.question || q).join(" ")
                : config.auto_questions;
              activityContent += `Video Questions: ${questions} `;
            }
            break;

          case "pdf":
          case "upload":
            // Get uploaded files for this node from context_sources
            if (node.id) {
              const { data: uploadedFiles } = await supabase
                .from("context_sources")
                .select("title, summary, key_points, key_concepts, extracted_text")
                .eq("activity_id", activity_id)
                .eq("node_id", node.id)
                .eq("type", "document");

              if (uploadedFiles && uploadedFiles.length > 0) {
                uploadedFiles.forEach((file: any) => {
                  activityContent += `Uploaded Document: ${file.title || ""} `;
                  if (file.summary) activityContent += `Summary: ${file.summary} `;
                  if (file.extracted_text) {
                    // Include first 2000 chars of extracted text
                    activityContent += `Content: ${file.extracted_text.substring(0, 2000)} `;
                  }
                  if (file.key_points && Array.isArray(file.key_points)) {
                    activityContent += `Key Points: ${file.key_points.join(", ")} `;
                  }
                  if (file.key_concepts && Array.isArray(file.key_concepts)) {
                    activityContent += `Key Concepts: ${file.key_concepts.join(", ")} `;
                  }
                });
              }
            }
            if (config.title) activityContent += `Document Title: ${config.title} `;
            if (config.instructions) activityContent += `Instructions: ${config.instructions} `;
            break;

          case "ai_chat":
            if (config.prompt) activityContent += `AI Prompt: ${config.prompt} `;
            if (config.instructions) activityContent += `AI Instructions: ${config.instructions} `;
            if (config.context_sources && Array.isArray(config.context_sources)) {
              activityContent += `Context Sources: ${config.context_sources.map((cs: any) => cs.title || cs).join(", ")} `;
            }
            break;

          case "quiz":
            if (config.questions && Array.isArray(config.questions)) {
              config.questions.forEach((q: any, idx: number) => {
                activityContent += `Question ${idx + 1}: ${q.text || q.question || ""} `;
                if (q.options && Array.isArray(q.options)) {
                  activityContent += `Options: ${q.options.join(", ")} `;
                }
                if (q.correct_answer) activityContent += `Correct: ${q.correct_answer} `;
                if (q.explanation) activityContent += `Explanation: ${q.explanation} `;
              });
            }
            break;

          case "review":
            if (config.flashcard_terms && Array.isArray(config.flashcard_terms)) {
              config.flashcard_terms.forEach((term: any) => {
                activityContent += `Flashcard: ${term.term || term} `;
                if (term.definition) activityContent += `Definition: ${term.definition} `;
              });
            }
            if (config.context) activityContent += `Review Context: ${config.context} `;
            break;

          case "custom":
            if (config.agentic_requirements) {
              activityContent += `Custom Requirements: ${config.agentic_requirements} `;
            }
            if (config.instructions) activityContent += `Custom Instructions: ${config.instructions} `;
            break;

          default:
            // Generic extraction for any other node types
            if (config.instructions) activityContent += `Instructions: ${config.instructions} `;
            if (config.question) activityContent += `Question: ${config.question} `;
            if (config.content) {
              activityContent += typeof config.content === 'string' 
                ? `Content: ${config.content} ` 
                : `Content: ${JSON.stringify(config.content)} `;
            }
            break;
        }
      }
    }

    const combinedText = combineTextFields({
      title: activity.title || "",
      description: activity.description || "",
      content: activityContent,
    });

    if (!combinedText || combinedText.trim().length === 0) {
      await supabase
        .from("activities")
        .update({ embedding_status: "failed" })
        .eq("id", activity_id);
      
      return NextResponse.json({ error: "Activity has no text content to embed" }, { status: 400 });
    }

    // Generate embedding
    const embedding = await generateEmbedding(combinedText);

    // Store embedding - pgvector expects the vector as a string in format '[1,2,3,...]'
    // Ensure all values are properly formatted as numbers
    const embeddingString = `[${embedding.map(v => {
      const num = typeof v === 'number' ? v : parseFloat(v);
      return isNaN(num) ? 0 : num;
    }).join(',')}]`;

    // Store embedding using RPC call to ensure proper vector format
    let insertError;
    try {
      const { error: rpcError } = await supabase.rpc('upsert_activity_embedding', {
        p_activity_id: activity_id,
        p_activity_title: activity.title || "",
        p_activity_description: activity.description || "",
        p_activity_content: combinedText,
        p_embedding: embeddingString,
      });
      insertError = rpcError;
    } catch (rpcError: any) {
      // Fallback to direct insert if RPC doesn't exist
      console.warn("RPC function not found, using direct insert:", rpcError);
      const { error: directError } = await supabase
        .from("activity_embeddings")
        .upsert({
          activity_id,
          activity_title: activity.title || "",
          activity_description: activity.description || "",
          activity_content: combinedText,
          embedding: embeddingString,
        }, {
          onConflict: "activity_id"
        });
      insertError = directError;
    }

    if (insertError) {
      console.error("Error storing activity embedding:", insertError);
      await supabase
        .from("activities")
        .update({ embedding_status: "failed" })
        .eq("id", activity_id);
      
      return NextResponse.json(
        { error: "Failed to store embedding", details: insertError.message },
        { status: 500 }
      );
    }

    // Mark as completed
    await supabase
      .from("activities")
      .update({ embedding_status: "completed" })
      .eq("id", activity_id);

    return NextResponse.json({ 
      message: "Activity embedding generated successfully",
      activity_id 
    });
  } catch (error: any) {
    console.error("Error generating activity embedding:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate embedding" },
      { status: 500 }
    );
  }
}

