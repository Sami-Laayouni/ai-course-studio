"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, FileText, Target, Clock } from "lucide-react"

interface AssignmentPlayerProps {
  activity: any
  progress: any
  onComplete: (responses: any) => void
}

export function AssignmentPlayer({ activity, progress, onComplete }: AssignmentPlayerProps) {
  const content = activity.content
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(0)

  const objectives = content?.objectives || []
  const instructions = content?.instructions || ""
  const materials = content?.materials || []
  const assessmentCriteria = content?.assessment_criteria || []
  const timeline = content?.timeline || ""

  const handleResponseChange = (key: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleComplete = () => {
    onComplete({
      responses,
      submission_time: new Date().toISOString(),
      status: "submitted",
    })
  }

  return (
    <div className="space-y-6">
      {/* Assignment Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {content.title || activity.title}
          </CardTitle>
          <CardDescription>{content.overview}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Learning Objectives */}
          {objectives.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Learning Objectives
              </h4>
              <ul className="space-y-1">
                {objectives.map((objective: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline */}
          {timeline && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </h4>
              <p className="text-sm text-muted-foreground">{timeline}</p>
            </div>
          )}

          {/* Materials */}
          {materials.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Required Materials</h4>
              <div className="flex flex-wrap gap-2">
                {materials.map((material: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {material}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{instructions}</div>
          </div>
        </CardContent>
      </Card>

      {/* Work Area */}
      <Card>
        <CardHeader>
          <CardTitle>Your Work</CardTitle>
          <CardDescription>Complete your assignment in the space below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Assignment Response</label>
            <Textarea
              placeholder="Enter your work here..."
              value={responses.main_response || ""}
              onChange={(e) => handleResponseChange("main_response", e.target.value)}
              rows={10}
              className="min-h-[200px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Reflection (Optional)</label>
            <Textarea
              placeholder="What did you learn? What challenges did you face?"
              value={responses.reflection || ""}
              onChange={(e) => handleResponseChange("reflection", e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Assessment Criteria */}
      {assessmentCriteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Criteria</CardTitle>
            <CardDescription>Your work will be evaluated based on these criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {assessmentCriteria.map((criteria: string, index: number) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{criteria}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Make sure to review your work before submitting</div>
            <Button onClick={handleComplete} disabled={!responses.main_response?.trim()}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Assignment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
