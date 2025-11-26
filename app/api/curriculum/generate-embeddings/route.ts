import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding, prepareTextForEmbedding, combineTextFields } from "@/lib/embeddings";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // This route uses cookies/auth, must be dynamic

/**
 * Generate embeddings for curriculum document sections
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { curriculum_document_id } = await request.json();

    if (!curriculum_document_id) {
      return NextResponse.json({ error: "curriculum_document_id is required" }, { status: 400 });
    }

    // Get curriculum document
    const { data: curriculum, error: curriculumError } = await supabase
      .from("curriculum_documents")
      .select("*")
      .eq("id", curriculum_document_id)
      .single();

    if (curriculumError || !curriculum) {
      return NextResponse.json({ error: "Curriculum document not found" }, { status: 404 });
    }

    // Update status
    await supabase
      .from("curriculum_documents")
      .update({ 
        embeddings_status: "processing",
        embeddings_progress: 0 
      })
      .eq("id", curriculum_document_id);

    const sections = curriculum.sections || [];
    if (sections.length === 0) {
      await supabase
        .from("curriculum_documents")
        .update({ 
          embeddings_status: "completed",
          embeddings_progress: 100 
        })
        .eq("id", curriculum_document_id);
      
      return NextResponse.json({ message: "No sections to embed", sections: 0 });
    }

    let processed = 0;
    const total = sections.length;

    // Generate embeddings for each section
    for (const section of sections) {
      try {
        // Combine section text for embedding
        const sectionText = combineTextFields({
          title: section.title || "",
          description: section.description || "",
          content: section.text || "",
        });

        if (!sectionText || sectionText.trim().length === 0) {
          console.warn(`Skipping section ${section.id}: empty text`);
          processed++;
          continue;
        }

        // Generate embedding
        const embedding = await generateEmbedding(sectionText);

        // Store embedding - pgvector expects the vector as a string in format '[1,2,3,...]'
        // Ensure all values are properly formatted as numbers
        const embeddingString = `[${embedding.map(v => {
          const num = typeof v === 'number' ? v : parseFloat(v);
          return isNaN(num) ? 0 : num;
        }).join(',')}]`;

        // Store embedding using RPC call to ensure proper vector format
        let insertError;
        try {
          const { error: rpcError } = await supabase.rpc('upsert_curriculum_section_embedding', {
            p_curriculum_document_id: curriculum_document_id,
            p_section_id: section.id || `section_${processed}`,
            p_section_title: section.title || "",
            p_section_text: sectionText,
            p_embedding: embeddingString,
            p_page_number: section.pageNumber || null,
            p_concepts: section.concepts || [],
          });
          insertError = rpcError;
        } catch (rpcError: any) {
          // Fallback to direct insert if RPC doesn't exist
          console.warn("RPC function not found, using direct insert:", rpcError);
          const { error: directError } = await supabase
            .from("curriculum_section_embeddings")
            .upsert({
              curriculum_document_id,
              section_id: section.id || `section_${processed}`,
              section_title: section.title || "",
              section_text: sectionText,
              embedding: embeddingString,
              page_number: section.pageNumber || null,
              concepts: section.concepts || [],
            }, {
              onConflict: "curriculum_document_id,section_id"
            });
          insertError = directError;
        }

        if (insertError) {
          console.error(`Error storing embedding for section ${section.id}:`, insertError);
        } else {
          processed++;
        }

        // Update progress
        const progress = Math.floor((processed / total) * 100);
        await supabase
          .from("curriculum_documents")
          .update({ embeddings_progress: progress })
          .eq("id", curriculum_document_id);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        console.error(`Error processing section ${section.id}:`, error);
        // Continue with next section
      }
    }

    // Mark as completed
    await supabase
      .from("curriculum_documents")
      .update({ 
        embeddings_status: "completed",
        embeddings_progress: 100 
      })
      .eq("id", curriculum_document_id);

    return NextResponse.json({ 
      message: "Embeddings generated successfully",
      sections: processed,
      total 
    });
  } catch (error: any) {
    console.error("Error generating embeddings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}

