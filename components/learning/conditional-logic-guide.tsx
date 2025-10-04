"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ToggleRight,
  Brain,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

export default function ConditionalLogicGuide() {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <ToggleRight className="h-5 w-5" />
          AI Decision Branching Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 border border-amber-200">
          <h4 className="font-semibold text-gray-900 mb-3">
            How to Create Conditional Logic:
          </h4>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Add AI Tutor Node</p>
                <p className="text-sm text-gray-600">
                  Drag "AI Tutor" from the Interactive category
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Brain className="h-4 w-4 text-blue-500" />
                  <Badge variant="outline" className="text-xs">
                    Interactive
                  </Badge>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Add AI Decision Branch
                </p>
                <p className="text-sm text-gray-600">
                  Drag "AI Decision Branch" from the Flow category
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <ToggleRight className="h-4 w-4 text-amber-500" />
                  <Badge variant="outline" className="text-xs">
                    Flow
                  </Badge>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Connect Decision Branch TO AI Tutor
                </p>
                <p className="text-sm text-gray-600">
                  Use connection mode to connect the Decision Branch to the AI
                  Tutor
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <ArrowRight className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">
                    Auto-configures AI connection
                  </span>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Create Two Paths FROM Decision Branch
                </p>
                <p className="text-sm text-gray-600">
                  Connect two different paths for Mastery and Novel learning
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-purple-600 font-medium">
                    Mastery Path & Novel Path
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">How It Works:</p>
              <p className="text-xs text-blue-800 mt-1">
                When students interact with the AI Tutor, their responses are
                automatically analyzed. Based on their performance level,
                they'll be directed to either the Mastery Path (for advanced
                learners) or the Novel Path (for those needing more support).
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Success Indicators:
              </p>
              <ul className="text-xs text-green-800 mt-1 space-y-1">
                <li>
                  • Decision Branch shows "Connected to AI Chat" indicator
                </li>
                <li>• Two paths lead from the Decision Branch</li>
                <li>• AI Tutor is properly configured with context sources</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
