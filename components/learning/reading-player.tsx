"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BookOpen, CheckCircle } from "lucide-react"

interface ReadingPlayerProps {
  activity: any
  progress: any
  onComplete: (responses: any) => void
}

export function ReadingPlayer({ activity, progress, onComplete }: ReadingPlayerProps) {
  const content = activity.content
  const sections = content?.sections || []
  const vocabulary = content?.vocabulary || []
  const [currentSection, setCurrentSection] = useState(0)
  const [readingSections, setReadingSections] = useState<Set<number>>(new Set())

  const handleSectionRead = (sectionIndex: number) => {
    setReadingSections((prev) => new Set([...prev, sectionIndex]))
  }

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      handleSectionRead(currentSection)
      setCurrentSection(currentSection + 1)
    }
  }

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }

  const handleComplete = () => {
    handleSectionRead(currentSection)
    onComplete({
      sections_read: Array.from(readingSections),
      completion_time: new Date().toISOString(),
    })
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No content available</h3>
          <p className="text-muted-foreground">This reading activity doesn't have any content yet.</p>
        </CardContent>
      </Card>
    )
  }

  const section = sections[currentSection]
  const progressPercentage = ((currentSection + 1) / sections.length) * 100

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {content.title || activity.title}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Section {currentSection + 1} of {sections.length}
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardHeader>
      </Card>

      {/* Reading Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{section.heading}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="text-base leading-relaxed whitespace-pre-wrap">{section.content}</div>
        </CardContent>
      </Card>

      {/* Vocabulary Sidebar */}
      {vocabulary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Vocabulary</CardTitle>
            <CardDescription>Important terms from this reading</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vocabulary.map((term: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="font-semibold text-sm">{term.term}</div>
                  <div className="text-sm text-muted-foreground mt-1">{term.definition}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handlePrevious} disabled={currentSection === 0}>
              Previous Section
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: sections.length }, (_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i <= currentSection ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            {currentSection === sections.length - 1 ? (
              <Button onClick={handleComplete}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Reading
              </Button>
            ) : (
              <Button onClick={handleNext}>Next Section</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
