import { NextRequest, NextResponse } from "next/server";
import { ai, getModelName, getDefaultConfig, requireAIConfiguration } from "@/lib/ai-config";

/**
 * Earl - The Intelligent Activity Analyzer
 * Generates captivating questions based on activity context
 */
export async function POST(request: NextRequest) {
  console.log("🔔 Earl: Starting question generation...");
  
  try {
    try {
      requireAIConfiguration();
      console.log("✅ Earl: GEMINI_API_KEY found");
    } catch (error) {
      console.error("❌ Earl: GEMINI_API_KEY not found");
      return NextResponse.json(
        {
          question: "What would you like to learn from this activity?",
          success: false,
          error: "GEMINI_API_KEY not configured. Please set GEMINI_API_KEY in your .env.local file",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log("📥 Earl: Received request body:", {
      hasTitle: !!body.activityTitle,
      hasDescription: !!body.activityDescription,
      youtubeTranscriptsCount: body.youtubeTranscripts?.length || 0,
      pdfTextsCount: body.pdfTexts?.length || 0,
      contextSourcesCount: body.contextSources?.length || 0,
    });

    const {
      activityTitle,
      activityDescription,
      youtubeTranscripts = [],
      pdfTexts = [],
      contextSources = [],
    } = body;

    // Collect all context text
    let allContext = "";

    // Add activity title and description
    if (activityTitle) {
      allContext += `Activity Title: ${activityTitle}\n\n`;
      console.log("📝 Earl: Added activity title:", activityTitle);
    }
    if (activityDescription) {
      allContext += `Activity Description: ${activityDescription}\n\n`;
      console.log("📝 Earl: Added activity description");
    }

    // Add YouTube transcripts
    if (youtubeTranscripts.length > 0) {
      console.log(`🎥 Earl: Processing ${youtubeTranscripts.length} YouTube transcript(s)`);
      allContext += "YouTube Video Transcripts:\n";
      youtubeTranscripts.forEach((transcript: string, index: number) => {
        const transcriptPreview = transcript.substring(0, 2000);
        allContext += `\nVideo ${index + 1}:\n${transcriptPreview}\n`;
        console.log(`📹 Earl: Added YouTube transcript ${index + 1} (${transcript.length} chars, using first 2000)`);
      });
      allContext += "\n";
    }

    // Add PDF texts
    if (pdfTexts.length > 0) {
      console.log(`📄 Earl: Processing ${pdfTexts.length} PDF text(s)`);
      allContext += "PDF Document Content:\n";
      pdfTexts.forEach((text: string, index: number) => {
        const textPreview = text.substring(0, 2000);
        allContext += `\nDocument ${index + 1}:\n${textPreview}\n`;
        console.log(`📄 Earl: Added PDF text ${index + 1} (${text.length} chars, using first 2000)`);
      });
      allContext += "\n";
    }

    // Add context sources summaries
    if (contextSources.length > 0) {
      console.log(`🔗 Earl: Processing ${contextSources.length} context source(s)`);
      allContext += "Additional Context:\n";
      contextSources.forEach((source: any) => {
        if (source.summary) {
          allContext += `- ${source.title || "Source"}: ${source.summary}\n`;
        }
        if (source.key_points && source.key_points.length > 0) {
          allContext += `  Key Points: ${source.key_points.join(", ")}\n`;
        }
        if (source.key_concepts && source.key_concepts.length > 0) {
          allContext += `  Key Concepts: ${source.key_concepts.join(", ")}\n`;
        }
      });
      allContext += "\n";
    }

    const contextLength = allContext.trim().length;
    console.log(`📊 Earl: Total context length: ${contextLength} characters`);

    if (!allContext || contextLength < 50) {
      console.log("⚠️ Earl: Insufficient context, returning default question");
      return NextResponse.json({
        question: "What would you like to learn from this activity?",
        success: true,
      });
    }

    // Generate captivating question using Google AI
    const prompt = `You are Earl, an intelligent AI that creates captivating, curiosity-driven questions for educational activities.

Your goal is to create a single, thought-provoking question that will spark students' curiosity and make them excited to learn. The question should:

1. Be intriguing and make students think "I want to know the answer to that!"
2. Connect to the core concepts in the content
3. Be phrased in a way that creates wonder and curiosity
4. Be specific enough to be meaningful but open enough to be engaging
5. Use everyday language that students can relate to

Examples of great questions:
- "Why you don't get cancer every minute?" (for microbiome/immune system content)
- "How does your brain decide what to remember?" (for memory/neuroscience content)
- "What if gravity worked backwards?" (for physics content)
- "Why do some people learn languages faster than others?" (for language learning content)

Now, analyze the following educational content and create ONE captivating question:

${allContext.substring(0, 8000)}

Return ONLY the question itself, nothing else. Make it short, punchy, and curiosity-driven.`;

    console.log(`🤖 Earl: Calling Google AI (${getModelName()})...`);
    console.log(`📝 Earl: Prompt length: ${prompt.length} characters`);

    try {
      const config = {
        responseMimeType: "text/plain",
        maxOutputTokens: 150,
      };

      // Retry logic for rate limits
      let text = "";
      let retries = 0;
      const maxRetries = 3;
      
      while (retries <= maxRetries) {
        try {
          const response = await ai.models.generateContentStream({
            model: getModelName(),
            config,
            contents: [
              {
                role: "user",
                text: prompt,
              },
            ],
          });

          for await (const chunk of response) {
            if (chunk.text) {
              text += chunk.text;
            }
          }
          break; // Success, exit retry loop
        } catch (rateLimitError: any) {
          // Check if it's a rate limit error (429)
          if (rateLimitError?.status === 429 || rateLimitError?.code === 429) {
            if (retries < maxRetries) {
              const retryDelay = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff, max 10s
              console.log(`⏳ Earl: Rate limit hit, retrying in ${retryDelay}ms (attempt ${retries + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retries++;
              continue;
            } else {
              // Max retries reached, return default question
              console.log("⚠️ Earl: Rate limit exceeded, returning default question");
              return NextResponse.json({
                question: "What would you like to learn from this activity?",
                success: true,
              });
            }
          }
          throw rateLimitError; // Not a rate limit error, rethrow
        }
      }

      console.log("✅ Earl: AI response received");
      console.log(`💬 Earl: Raw response: "${text}"`);

      // Clean up the response (remove quotes, extra whitespace, etc.)
      let question = text.trim();
      // Remove surrounding quotes if present
      if (
        (question.startsWith('"') && question.endsWith('"')) ||
        (question.startsWith("'") && question.endsWith("'"))
      ) {
        question = question.slice(1, -1);
        console.log("🧹 Earl: Removed surrounding quotes");
      }
      // Remove "Question:" prefix if present
      if (question.toLowerCase().startsWith("question:")) {
        question = question.substring(9).trim();
        console.log("🧹 Earl: Removed 'Question:' prefix");
      }

      const finalQuestion = question || "What would you like to learn from this activity?";
      console.log(`✨ Earl: Final question: "${finalQuestion}"`);

      return NextResponse.json({
        question: finalQuestion,
        success: true,
      });
    } catch (aiError: any) {
      // Handle rate limit errors gracefully
      if (aiError?.status === 429 || aiError?.code === 429) {
        console.log("⚠️ Earl: Rate limit exceeded, returning default question");
        return NextResponse.json({
          question: "What would you like to learn from this activity?",
          success: true,
        });
      }
      
      console.error("❌ Earl: AI generation error:", aiError);
      console.error("❌ Earl: Error details:", {
        message: aiError?.message,
        cause: aiError?.cause,
        stack: aiError?.stack,
      });
      throw aiError;
    }
  } catch (error: any) {
    // Handle rate limit errors gracefully
    if (error?.status === 429 || error?.code === 429) {
      console.log("⚠️ Earl: Rate limit exceeded, returning default question");
      return NextResponse.json({
        question: "What would you like to learn from this activity?",
        success: true,
      });
    }
    
    console.error("❌ Earl: Question generation error:", error);
    console.error("❌ Earl: Error details:", {
      message: error?.message,
      cause: error?.cause,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Return default question instead of error for better UX
    return NextResponse.json({
      question: "What would you like to learn from this activity?",
      success: true,
    });
  }
}

