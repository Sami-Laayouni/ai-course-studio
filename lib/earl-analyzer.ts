import ytdl from "ytdl-core";
import { YoutubeTranscript } from "youtube-transcript";

/**
 * Earl Analysis Function
 * Analyzes activities and generates captivating questions
 */
// Track running analyses to prevent duplicates - use Map with timestamps
const runningAnalyses = new Map<string, number>();
const ANALYSIS_TIMEOUT = 60000; // 60 seconds timeout

export async function runEarlAnalysis(activity: any, supabase: any) {
  const activityId = activity.id;

  try {
    // Check if analysis is already running for this activity (with timeout)
    const runningSince = runningAnalyses.get(activityId);
    if (runningSince) {
      const elapsed = Date.now() - runningSince;
      if (elapsed < ANALYSIS_TIMEOUT) {
        console.log(
          `Earl: Analysis already running for activity ${activityId} (${Math.floor(
            elapsed / 1000
          )}s ago)`
        );
        return; // Skip if already running
      } else {
        // Timeout expired, remove from set
        console.log(
          `Earl: Previous analysis timed out for activity ${activityId}, starting new one`
        );
        runningAnalyses.delete(activityId);
      }
    }

    // Fetch the latest activity from database to check current state FIRST
    const { data: latestActivity, error: fetchError } = await supabase
      .from("activities")
      .select("content, course_id")
      .eq("id", activityId)
      .single();

    if (fetchError) {
      console.error("Earl: Error fetching activity:", fetchError);
      return;
    }

    const contentObj = latestActivity?.content || activity.content || {};
    const courseId = latestActivity?.course_id || activity.course_id;

    // Check if Earl has already generated a question for this activity
    if (contentObj.earl_generated && contentObj.captivating_question) {
      console.log("Earl: Question already generated for activity", activityId);
      return; // Skip if already generated
    }

    // Mark as running NOW (before any async operations)
    runningAnalyses.set(activityId, Date.now());
    console.log("Earl: Starting analysis for activity", activityId);

    const youtubeTranscripts: string[] = [];
    const pdfTexts: string[] = [];
    const contextSources: any[] = [];
    const youtubeUrl =
      contentObj.video_url || contentObj.youtube_url || contentObj.url;

    // Check for YouTube URLs in content
    if (youtubeUrl && ytdl.validateURL(youtubeUrl)) {
      try {
        console.log("Earl: Fetching YouTube transcript...");

        // Extract video ID from URL
        const videoIdMatch = youtubeUrl.match(
          /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
        );
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (!videoId) {
          console.error("Earl: Could not extract video ID from URL");
          return;
        }

        // Try to get video info for title/description fallback
        let videoInfo: any = null;
        let videoDetails: any = null;
        try {
          videoInfo = await ytdl.getInfo(youtubeUrl);
          videoDetails = videoInfo.videoDetails;
        } catch (ytdlError) {
          console.log(
            "Earl: Could not fetch video info via ytdl, will try oEmbed"
          );
        }

        // Extract transcript using youtube-transcript
        let transcript = "";
        try {
          console.log("Earl: Fetching transcript using youtube-transcript...");
          const transcriptItems = await YoutubeTranscript.fetchTranscript(
            videoId
          );

          if (transcriptItems && transcriptItems.length > 0) {
            transcript = transcriptItems.map((item) => item.text).join(" ");
            console.log(
              `Earl: Transcript extracted: ${transcript.length} characters`
            );
          }
        } catch (transcriptError: any) {
          console.error(
            "Earl: Error fetching transcript with youtube-transcript:",
            transcriptError?.message
          );

          // Fallback: Try to get transcript from ytdl if available
          try {
            if (
              videoInfo?.player_response?.captions
                ?.playerCaptionsTracklistRenderer?.captionTracks
            ) {
              const captions =
                videoInfo.player_response.captions
                  .playerCaptionsTracklistRenderer.captionTracks;
              if (captions && captions.length > 0) {
                console.log(
                  "Earl: Trying fallback: extracting transcript from ytdl captions..."
                );
                const transcriptUrl = captions[0].baseUrl;
                const transcriptResponse = await fetch(transcriptUrl);
                const transcriptData = await transcriptResponse.text();

                // Parse transcript XML
                const transcriptMatch = transcriptData.match(
                  /<text[^>]*>([^<]*)<\/text>/g
                );
                if (transcriptMatch) {
                  transcript = transcriptMatch
                    .map((match) => match.replace(/<[^>]*>/g, ""))
                    .join(" ")
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
                  console.log(
                    `Earl: Transcript extracted via fallback: ${transcript.length} characters`
                  );
                }
              }
            }
          } catch (fallbackError) {
            console.error(
              "Earl: Fallback transcript extraction also failed:",
              fallbackError
            );
          }
        }

        // If no transcript, use description and title
        if (!transcript) {
          if (videoDetails) {
            transcript = `${videoDetails.title}\n\n${
              videoDetails.description || ""
            }`;
          } else {
            // Try oEmbed as last resort
            try {
              const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
                youtubeUrl
              )}&format=json`;
              const oEmbedResponse = await fetch(oEmbedUrl);
              const oEmbedData = await oEmbedResponse.json();

              if (oEmbedData) {
                transcript = `${oEmbedData.title || "Video"}\n\n${
                  oEmbedData.description || ""
                }`;
              }
            } catch (oEmbedError) {
              console.error("Earl: oEmbed also failed:", oEmbedError);
            }
          }
        }

        if (transcript) {
          youtubeTranscripts.push(transcript);
          console.log("Earl: YouTube transcript fetched successfully");
        }
      } catch (error) {
        console.error("Earl: Error fetching YouTube transcript:", error);
      }
    }

    // Check for PDFs in context_sources for this activity
    try {
      const { data: pdfSources } = await supabase
        .from("context_sources")
        .select("*")
        .eq("activity_id", activityId)
        .or("type.eq.document,type.eq.pdf,mime_type.eq.application/pdf");

      if (pdfSources && pdfSources.length > 0) {
        for (const source of pdfSources) {
          // Get text from summary (may be truncated) or metadata
          let pdfText = "";
          if (source.summary && source.summary.length > 100) {
            pdfText = source.summary;
          }
          // Check if full text is stored in metadata
          if (source.metadata && source.metadata.full_text) {
            pdfText = source.metadata.full_text;
          }
          if (pdfText) {
            pdfTexts.push(pdfText);
          }
          contextSources.push(source);
        }
        console.log(`Earl: Found ${pdfSources.length} PDF source(s)`);
      }
    } catch (error) {
      console.error("Earl: Error fetching PDF sources:", error);
    }

    // Also check for existing context sources from the course
    try {
      const { data: courseContextSources } = await supabase
        .from("context_sources")
        .select("*")
        .eq("course_id", courseId)
        .limit(10);

      if (courseContextSources && courseContextSources.length > 0) {
        for (const source of courseContextSources) {
          if (!contextSources.find((s) => s.id === source.id)) {
            contextSources.push(source);
          }
        }
      }
    } catch (error) {
      console.error("Earl: Error fetching course context sources:", error);
    }

    // Call Earl to generate captivating question
    if (
      youtubeTranscripts.length > 0 ||
      pdfTexts.length > 0 ||
      contextSources.length > 0 ||
      activity.title ||
      activity.description
    ) {
      try {
        const earlUrl = `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/ai/earl-generate-question`;

        console.log("🔔 Earl: Calling Earl API at:", earlUrl);
        console.log("📤 Earl: Request payload:", {
          activityTitle: activity.title,
          hasDescription: !!activity.description,
          youtubeTranscriptsCount: youtubeTranscripts.length,
          pdfTextsCount: pdfTexts.length,
          contextSourcesCount: contextSources.length,
        });

        const earlResponse = await fetch(earlUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityTitle: activity.title,
            activityDescription: activity.description || "",
            youtubeTranscripts,
            pdfTexts,
            contextSources,
          }),
        });

        console.log(
          "📥 Earl: Response status:",
          earlResponse.status,
          earlResponse.statusText
        );

        if (earlResponse.ok) {
          const earlData = await earlResponse.json();
          console.log("✅ Earl: Response data:", earlData);
          const captivatingQuestion = earlData.question || "";

          if (captivatingQuestion) {
            // Fetch latest content again to avoid race conditions
            const { data: currentActivity } = await supabase
              .from("activities")
              .select("content")
              .eq("id", activityId)
              .single();

            const currentContent = currentActivity?.content || {};

            // Double-check if question was already generated (race condition protection)
            if (
              currentContent.earl_generated &&
              currentContent.captivating_question
            ) {
              console.log(
                "Earl: Question already generated (race condition detected), skipping update"
              );
              return;
            }

            // Mark as generated in the content
            const finalContent = {
              ...currentContent,
              captivating_question: captivatingQuestion,
              earl_generated: true,
              earl_generated_at: new Date().toISOString(),
            };

            // Update activity content with the question
            const { error: updateError } = await supabase
              .from("activities")
              .update({ content: finalContent })
              .eq("id", activityId);

            if (updateError) {
              console.error("Earl: Error updating activity:", updateError);
            } else {
              console.log(
                "Earl: Generated captivating question:",
                captivatingQuestion
              );
            }

            // Don't create notifications here - they will be created when activity is saved
            // Notifications should only be sent after the activity is saved, not during analysis
          }
        } else {
          const errorText = await earlResponse.text();
          console.error(
            "❌ Earl: API returned error status:",
            earlResponse.status
          );
          console.error("❌ Earl: Error response:", errorText);
          try {
            const errorData = JSON.parse(errorText);
            console.error("❌ Earl: Parsed error:", errorData);
          } catch (e) {
            console.error("❌ Earl: Could not parse error response as JSON");
          }
        }
      } catch (earlError: any) {
        console.error("❌ Earl: Error generating question:", earlError);
        console.error("❌ Earl: Error details:", {
          message: earlError?.message,
          cause: earlError?.cause,
          stack: earlError?.stack,
        });
      }
    } else {
      console.log(
        "Earl: No context sources found, skipping question generation"
      );
    }
  } catch (earlError) {
    console.error("Earl: Error in activity analysis:", earlError);
  } finally {
    // Always remove from running set
    runningAnalyses.delete(activityId);
  }
}
