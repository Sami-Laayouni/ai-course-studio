import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runEarlAnalysis } from "@/lib/earl-analyzer";

/**
 * Earl Analysis Endpoint
 * Can be called to analyze an existing activity and generate a captivating question
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activity_id } = body;

    if (!activity_id) {
      return NextResponse.json(
        { error: "Missing activity_id" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the activity
    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select("*")
      .eq("id", activity_id)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    // Check if question already exists
    const contentObj = activity.content || {};
    if (contentObj.earl_generated && contentObj.captivating_question) {
      return NextResponse.json({
        success: true,
        activity,
        message: "Question already generated",
      });
    }

    // Run Earl analysis
    await runEarlAnalysis(activity, supabase);

    // Fetch updated activity
    const { data: updatedActivity } = await supabase
      .from("activities")
      .select("*")
      .eq("id", activity_id)
      .single();

    return NextResponse.json({
      success: true,
      activity: updatedActivity,
      message: "Earl analysis completed",
    });
  } catch (error) {
    console.error("Earl analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
