import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { YoutubeTranscript } from "youtube-transcript";
import { ai, getModelName, getDefaultConfig } from "@/lib/ai-config";

/**
 * Generate questions for a YouTube video based on its transcript.
 *
 * This is a standalone API endpoint for generating video questions.
 * - Uses youtube-transcript library to fetch the video transcript
 * - Generates questions using AI
 * - Returns questions to the client
 *
 * This route does NOT:
 * - Save anything to the database
 * - Create notifications
 * - Have any connection to other analysis systems
 *
 * This is completely separate from activity creation/saving.
 */

// Types
interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

interface VideoMetadata {
  title: string;
  author: string;
  thumbnail: string;
}

interface Question {
  id: string;
  timestamp: number;
  question: string;
  concept: string;
  type: string;
}

interface QuestionsData {
  questions: Array<{
    timestamp: number;
    question: string;
    concept: string;
    type: string;
  }>;
  key_concepts: string[];
}

// Helper function to extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/\s]{11})/,
    /^([^&\?\/\s]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

// Helper function to get video metadata from oEmbed API
async function getVideoMetadata(videoId: string): Promise<VideoMetadata> {
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oEmbedUrl);

    if (!response.ok) {
      throw new Error(`oEmbed API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      title: data.title || "Untitled Video",
      author: data.author_name || "Unknown",
      thumbnail: data.thumbnail_url || "",
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching video metadata:", errorMessage);
    return {
      title: "Video",
      author: "Unknown",
      thumbnail: "",
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log("🎬 Video questions API called");

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { youtube_url } = body;

    console.log("📹 YouTube URL received:", youtube_url);

    if (!youtube_url || typeof youtube_url !== "string") {
      return NextResponse.json(
        { error: "YouTube URL is required", success: false },
        { status: 400 }
      );
    }

    // Validate and extract video ID
    const videoId = extractVideoId(youtube_url);

    if (!videoId) {
      return NextResponse.json(
        {
          error:
            "Invalid YouTube URL format. Please provide a valid YouTube video URL or video ID.",
          success: false,
        },
        { status: 400 }
      );
    }

    console.log("📹 Video ID extracted:", videoId);

    // Verify API key is configured
    const { requireAIConfiguration } = await import("@/lib/ai-config");
    requireAIConfiguration();

    // Fetch video metadata
    console.log("📥 Fetching video metadata...");
    const videoMetadata: VideoMetadata = await getVideoMetadata(videoId);
    console.log("✅ Video metadata:", videoMetadata.title);

    // Fetch transcript using ONLY youtube-transcript library
    console.log("📝 Fetching transcript using youtube-transcript...");
    console.log("📹 Video ID:", videoId);
    let transcriptItems: TranscriptItem[] = [];
    let transcript = "";

    let usedFallbackTranscript = false;

    try {
      console.log(
        "🔄 Attempting to fetch transcript via youtube-transcript library..."
      );
      console.log("📹 Fetching transcript for video ID:", videoId);
      console.log("📹 Original YouTube URL:", youtube_url);

      // Try with video ID first
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        console.log(
          `📊 Transcript fetch result (video ID): ${
            transcriptItems?.length || 0
          } items`
        );
      } catch (idError: unknown) {
        console.log("⚠️ Failed with video ID, trying with full URL...");
        console.error("Video ID error:", idError);

        // Try with full URL as fallback
        try {
          transcriptItems = await YoutubeTranscript.fetchTranscript(
            youtube_url
          );
          console.log(
            `📊 Transcript fetch result (full URL): ${
              transcriptItems?.length || 0
            } items`
          );
        } catch (urlError: unknown) {
          console.error("Full URL error:", urlError);
          throw idError; // Throw the original error
        }
      }

      console.log(
        "📝 Raw transcript items:",
        JSON.stringify(transcriptItems?.slice(0, 3) || [], null, 2)
      );

      if (transcriptItems && transcriptItems.length > 0) {
        console.log(`✅ Found ${transcriptItems.length} transcript segments`);

        // Build full transcript text
        transcript = transcriptItems
          .map((item: TranscriptItem) => item.text)
          .join(" ")
          .trim();

        console.log(`✅ Transcript extracted: ${transcript.length} characters`);
        console.log("📄 Full transcript text:", transcript);
        console.log("📄 First 500 characters:", transcript.substring(0, 500));
      } else {
        console.error("❌ Transcript array is empty or null");
        console.error("❌ transcriptItems:", transcriptItems);
        throw new Error(
          "No transcript items found - transcript array is empty. The video may not have captions enabled."
        );
      }
    } catch (transcriptError: unknown) {
      const errorMessage =
        transcriptError instanceof Error
          ? transcriptError.message
          : "Unknown error";
      console.error("❌ Error fetching transcript:", errorMessage);
      console.error("❌ Full error:", transcriptError);

      // Fallback: if no transcript, synthesize minimal context from metadata so users can still generate questions
      transcript = `Video Title: ${videoMetadata.title}\nDescription unavailable.\nGenerate 5 comprehension questions about this topic.`;
      usedFallbackTranscript = true;
      console.warn(
        "⚠️ Using fallback transcript composed from metadata because transcript fetch failed."
      );
    }

    // Validate transcript length (allow short if using fallback)
    if (!transcript || transcript.trim().length < 50) {
      if (!usedFallbackTranscript) {
        console.error(
          `❌ Transcript too short: ${transcript?.length || 0} characters`
        );
        return NextResponse.json(
          {
            success: false,
            error: `Video transcript is too short (${
              transcript?.length || 0
            } characters). Please try a video with substantial captions.`,
            questions: [],
            key_concepts: [],
          },
          { status: 400 }
        );
      }
    }

    // Generate questions using AI
    console.log("🤖 Generating questions with AI...");

    const analysisPrompt = `Analyze this video transcript and generate comprehension questions at optimal timestamps.

Video Title: ${videoMetadata.title}
Transcript (${transcript.length} characters): ${transcript.substring(0, 8000)}

Your task:
1. Identify 4-6 key moments where comprehension questions would be most effective
2. Place questions where:
   - Important concepts are introduced or explained
   - Key information is presented that requires understanding
   - Natural breaks occur in content flow
   - Students should pause and reflect

3. For each question:
   - Provide exact timestamp (in seconds) based on transcript timing
   - Write a clear comprehension question testing the concept just discussed
   - Identify the specific concept being tested
   - Ensure questions test understanding, not just recall

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "timestamp": 45,
      "question": "What is the main principle being explained?",
      "concept": "Core concept name",
      "type": "comprehension"
    }
  ],
  "key_concepts": ["concept1", "concept2", "concept3"]
}

Make questions clear, pedagogically sound, and placed at optimal learning moments.`;

    const config = {
      responseMimeType: "application/json",
      maxOutputTokens: 2000,
      temperature: 0.7,
    };

    let questionsData: QuestionsData = { questions: [], key_concepts: [] };

    // Retry logic for rate limits
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
              parts: [{ text: analysisPrompt }],
            },
          ],
        });

        let analysisText = "";
        for await (const chunk of response) {
          if (chunk.text) {
            analysisText += chunk.text;
          }
        }

        // Parse JSON response
        try {
          questionsData = JSON.parse(analysisText) as QuestionsData;
          console.log(
            `✅ Generated ${questionsData.questions?.length || 0} questions`
          );
          break;
        } catch (parseError) {
          // Try to extract JSON from markdown-wrapped response
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (jsonMatch && jsonMatch[0]) {
            questionsData = JSON.parse(jsonMatch[0]) as QuestionsData;
            console.log(
              `✅ Generated ${questionsData.questions?.length || 0} questions`
            );
            break;
          }
          throw new Error("Could not parse AI response as JSON");
        }
      } catch (aiError: unknown) {
        const errorMessage =
          aiError instanceof Error ? aiError.message : "Unknown error";
        const errorStatus = (aiError as any)?.status || (aiError as any)?.code;

        console.error(
          `❌ AI error (attempt ${retries + 1}/${maxRetries + 1}):`,
          errorMessage
        );

        // Handle rate limit with exponential backoff
        if (errorStatus === 429) {
          if (retries < maxRetries) {
            const retryDelay = Math.min(2000 * Math.pow(2, retries), 30000);
            console.log(`⏳ Rate limit hit, retrying in ${retryDelay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            retries++;
            continue;
          }

          return NextResponse.json(
            {
              error:
                "API rate limit exceeded. Please wait a moment and try again.",
              success: false,
              questions: [],
              key_concepts: [],
            },
            { status: 429 }
          );
        }

        // For other errors, return immediately
        return NextResponse.json(
          {
            error: `Failed to generate questions: ${errorMessage}`,
            success: false,
            questions: [],
            key_concepts: [],
          },
          { status: 500 }
        );
      }
    }

    // Validate and format questions
    const questions: Question[] = (questionsData.questions || [])
      .map((q, index: number) => {
        // Find corresponding transcript segment for accurate timestamp
        const timestamp = q.timestamp || 0;

        return {
          id: `q-${index}`,
          timestamp: Math.max(0, timestamp),
          question: q.question || "What did you learn from this section?",
          concept: q.concept || "General understanding",
          type: q.type || "comprehension",
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

    const timestamps: number[] = questions.map((q: Question) => q.timestamp);

    console.log(`✅ Successfully generated ${questions.length} questions`);

    return NextResponse.json({
      success: true,
      questions,
      timestamps,
      key_concepts: questionsData.key_concepts || [],
      video_title: videoMetadata.title,
      video_author: videoMetadata.author,
      transcript_length: transcript.length,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("❌ Unexpected error:", errorMessage);
    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500 }
    );
  }
}
