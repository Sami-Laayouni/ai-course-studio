import { NextRequest, NextResponse } from "next/server";
import genAI from "@/lib/genai";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { text, type = "document", title = "" } = await request.json();

    if (!text || text.length < 50) {
      return NextResponse.json({ 
        keyPoints: [], 
        keyConcepts: [] 
      });
    }

    const prompt = `Analyze the following ${type} content and extract key points and concepts:

Title: ${title}
Content: ${text.substring(0, 4000)} // Limit to avoid token limits

Please provide:
1. 5-10 key points (main ideas, important facts, or takeaways)
2. 5-10 key concepts (important terms, definitions, or concepts to understand)

Format your response as JSON:
{
  "keyPoints": ["point 1", "point 2", ...],
  "keyConcepts": ["concept 1", "concept 2", ...]
}`;

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Google AI API key not configured" },
        { status: 500 }
      );
    }

    const config = {
      responseMimeType: "application/json",
      maxOutputTokens: 1000,
      systemInstruction: [
        {
          text: "You are an expert educational content analyzer. Extract key points and concepts from educational content to help students learn effectively.",
        },
      ],
    };

    const response = await genAI.models.generateContentStream({
      model: "gemini-2.0-flash-lite",
      config,
      contents: [
        {
          role: "user",
          text: prompt,
        },
      ],
    });

    let text = "";
    for await (const chunk of response) {
      if (chunk.text) {
        text += chunk.text;
      }
    }
    
    if (!text) {
      throw new Error("No response from Google AI");
    }

    // Try to parse JSON response
    let keyPoints: string[] = [];
    let keyConcepts: string[] = [];

    try {
      const parsed = JSON.parse(text);
      keyPoints = parsed.keyPoints || [];
      keyConcepts = parsed.keyConcepts || [];
    } catch (parseError) {
      // Fallback: extract from text response
      const lines = text.split('\n');
      let currentSection = '';
      
      for (const line of lines) {
        if (line.toLowerCase().includes('key points') || line.toLowerCase().includes('points')) {
          currentSection = 'points';
          continue;
        }
        if (line.toLowerCase().includes('concepts') || line.toLowerCase().includes('terms')) {
          currentSection = 'concepts';
          continue;
        }
        
        if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./)) {
          const cleanLine = line.replace(/^[-•\d.\s]+/, '').trim();
          if (cleanLine) {
            if (currentSection === 'points') {
              keyPoints.push(cleanLine);
            } else if (currentSection === 'concepts') {
              keyConcepts.push(cleanLine);
            }
          }
        }
      }
    }

    return NextResponse.json({
      keyPoints: keyPoints.slice(0, 10), // Limit to 10
      keyConcepts: keyConcepts.slice(0, 10), // Limit to 10
    });

  } catch (error) {
    console.error("Key points extraction error:", error);
    return NextResponse.json({ 
      error: "Failed to extract key points",
      keyPoints: [],
      keyConcepts: []
    }, { status: 500 });
  }
}
