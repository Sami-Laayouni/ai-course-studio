import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ytdl from "ytdl-core";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, activityId, nodeId } = await request.json();

    if (!url || !ytdl.validateURL(url)) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Get video info
    const videoInfo = await ytdl.getInfo(url);
    const videoDetails = videoInfo.videoDetails;

    // Extract transcript if available
    let transcript = "";
    let keyPoints: string[] = [];
    let keyConcepts: string[] = [];

    try {
      // Try to get transcript
      const captions =
        videoInfo.player_response.captions?.playerCaptionsTracklistRenderer
          ?.captionTracks;
      if (captions && captions.length > 0) {
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
        }
      }
    } catch (error) {
      console.error("Error extracting transcript:", error);
    }

    // If no transcript, use description and title for context
    if (!transcript) {
      transcript = `${videoDetails.title}\n\n${videoDetails.description}`;
    }

    // Extract key points and concepts using AI
    if (transcript) {
      try {
        const keyPointsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/extract-key-points`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: transcript,
              type: "video",
              title: videoDetails.title,
            }),
          }
        );

        if (keyPointsResponse.ok) {
          const keyPointsData = await keyPointsResponse.json();
          keyPoints = keyPointsData.keyPoints || [];
          keyConcepts = keyPointsData.keyConcepts || [];
        }
      } catch (error) {
        console.error("Error extracting key points:", error);
      }
    }

    // Save to database
    const { error: dbError } = await supabase.from("context_sources").insert({
      id: `yt_${Date.now()}`,
      type: "youtube",
      title: videoDetails.title,
      url: url,
      summary:
        transcript.substring(0, 500) + (transcript.length > 500 ? "..." : ""),
      key_points: keyPoints,
      key_concepts: keyConcepts,
      user_id: user.id,
      activity_id: activityId,
      node_id: nodeId,
      thumbnail: videoDetails.thumbnails?.[0]?.url,
      duration: parseInt(videoDetails.lengthSeconds),
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save video info" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      video: {
        id: `yt_${Date.now()}`,
        title: videoDetails.title,
        url: url,
        transcript,
        keyPoints,
        keyConcepts,
        thumbnail: videoDetails.thumbnails?.[0]?.url,
        duration: parseInt(videoDetails.lengthSeconds),
        description: videoDetails.description,
      },
    });
  } catch (error) {
    console.error("YouTube context extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract video context" },
      { status: 500 }
    );
  }
}
