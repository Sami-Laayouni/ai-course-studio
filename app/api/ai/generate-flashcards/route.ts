import { NextRequest, NextResponse } from "next/server";
import { generateContent, createCacheKey } from "@/lib/genai-utils";
import { checkRateLimit } from "@/lib/rate-limiter";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { context, num_terms, node_id, user_id } = await request.json();

    if (!context) {
      return NextResponse.json(
        { error: "Context is required" },
        { status: 400 }
      );
    }

    // Check rate limits
    const rateLimitCheck = checkRateLimit(user_id, "generate-flashcards");
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitCheck.message || "Rate limit exceeded",
          retry_after: rateLimitCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    const prompt = `Based on the following context from documents and videos, generate ${num_terms || 10} important terms/concepts that students should learn. Return only a JSON array of term strings, nothing else.

Context:
${context}

Return a JSON array like: ["Term 1", "Term 2", "Term 3", ...]`;

    // Use genAI utility with deduplication (cache by context hash)
    const contextHash = context.substring(0, 50).replace(/\s/g, "");
    const cacheKey = createCacheKey("generate-flashcards", contextHash, num_terms, node_id);
    
    let text = "";
    try {
      text = await generateContent(prompt, {
        maxRetries: 0, // No retries - use API as intended
        cacheKey,
        userId: user_id,
        endpoint: "generate-flashcards",
        minInterval: 3000, // Minimum 3 seconds between calls for same flashcards
      });
    } catch (error: any) {
      console.error("❌ Failed to generate flashcards:", error);
      // Return default terms if rate limited or any error
      console.log("⚠️ API call failed, using default terms");
      const defaultTerms = Array.from(
        { length: num_terms || 10 },
        (_, i) => `Term ${i + 1}`
      );
      return NextResponse.json({ terms: defaultTerms });
    }

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const terms = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ terms });
    }

    // Fallback: try to parse lines as terms
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("[") && !line.startsWith("]"));
    
    return NextResponse.json({ terms: lines.slice(0, num_terms || 10) });
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}

