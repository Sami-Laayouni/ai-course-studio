"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, HelpCircle } from "lucide-react"

interface Question {
  question: string
  type: "multiple_choice" | "true_false" | "short_answer"
  options?: string[]
  correct_answer: string
  explanation?: string
}

interface QuizPlayerProps {
  activity: any
  progress: any
  onComplete: (responses: any, score: number) => void
}

export function QuizPlayer({ activity, progress, onComplete }: QuizPlayerProps) {
  const questions: Question[] = activity.content?.questions || []
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  const handleAnswer = (questionIndex: number, answer: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionIndex]: answer,
    }))
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      submitQuiz()
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const submitQuiz = () => {
    let correctAnswers = 0
    questions.forEach((question, index) => {
      const userAnswer = responses[index]?.toLowerCase().trim()
      const correctAnswer = question.correct_answer.toLowerCase().trim()

      if (question.type === "multiple_choice" || question.type === "true_false") {
        if (userAnswer === correctAnswer) {
          correctAnswers++
        }
      } else if (question.type === "short_answer") {
        // Simple string matching for short answers
        if (userAnswer === correctAnswer || userAnswer.includes(correctAnswer)) {
          correctAnswers++
        }
      }
    })

    const finalScore = Math.round((correctAnswers / questions.length) * 100)
    setScore(finalScore)
    setShowResults(true)
  }

  const handleComplete = () => {
    onComplete(responses, score)
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No questions available</h3>
          <p className="text-muted-foreground">This quiz doesn't have any questions yet.</p>
        </CardContent>
      </Card>
    )
  }

  if (showResults) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Quiz Results</CardTitle>
          <CardDescription>You've completed the quiz!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{score}%</div>
            <p className="text-muted-foreground">
              {score >= 80 ? "Excellent work!" : score >= 60 ? "Good job!" : "Keep practicing!"}
            </p>
          </div>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="font-semibold">Review Your Answers</h3>
            {questions.map((question, index) => {
              const userAnswer = responses[index]
              const isCorrect = userAnswer?.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()

              return (
                <Card key={index} className="border-l-4 border-l-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-2">{question.question}</p>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">Your answer:</span>{" "}
                            <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                              {userAnswer || "No answer"}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p>
                              <span className="text-muted-foreground">Correct answer:</span>{" "}
                              <span className="text-green-600">{question.correct_answer}</span>
                            </p>
                          )}
                          {question.explanation && <p className="text-muted-foreground mt-2">{question.explanation}</p>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex justify-center">
            <Button onClick={handleComplete} size="lg">
              Complete Activity
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const question = questions[currentQuestion]
  const currentAnswer = responses[currentQuestion] || ""

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Question {currentQuestion + 1} of {questions.length}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete
          </div>
        </div>
        <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">{question.question}</h3>

          {/* Multiple Choice */}
          {question.type === "multiple_choice" && question.options && (
            <RadioGroup value={currentAnswer} onValueChange={(value) => handleAnswer(currentQuestion, value)}>
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* True/False */}
          {question.type === "true_false" && (
            <RadioGroup value={currentAnswer} onValueChange={(value) => handleAnswer(currentQuestion, value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer">
                  True
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer">
                  False
                </Label>
              </div>
            </RadioGroup>
          )}

          {/* Short Answer */}
          {question.type === "short_answer" && (
            <Textarea
              placeholder="Enter your answer..."
              value={currentAnswer}
              onChange={(e) => handleAnswer(currentQuestion, e.target.value)}
              rows={3}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={currentQuestion === 0}>
            Previous
          </Button>
          <Button onClick={handleNext} disabled={!currentAnswer.trim()}>
            {currentQuestion === questions.length - 1 ? "Submit Quiz" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
