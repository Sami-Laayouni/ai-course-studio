"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Lightbulb,
  RotateCcw,
  Eye,
  EyeOff,
  Brain,
  Target,
  TrendingUp,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  MessageSquare,
} from "lucide-react";

interface EnhancedQuizActivityProps {
  activity: {
    id: string;
    title: string;
    description: string;
    content: {
      instructions: string;
      questions: Array<{
        id: string;
        question: string;
        type:
          | "multiple_choice"
          | "true_false"
          | "short_answer"
          | "matching"
          | "essay";
        options?: string[];
        correct_answer: string | string[];
        explanation: string;
        difficulty: number;
        learning_objective: string;
        hints?: string[];
        points: number;
      }>;
      adaptive_features?: {
        difficulty_progression: boolean;
        hint_system: boolean;
        retry_mechanism: boolean;
        personalized_feedback: boolean;
      };
      collaboration_settings?: {
        peer_review: boolean;
        group_quizzes: boolean;
        discussion_enabled: boolean;
      };
    };
    points: number;
    estimated_duration: number;
  };
  onComplete: (points: number) => void;
}

interface Answer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  attempts: number;
}

interface QuizStats {
  totalQuestions: number;
  correctAnswers: number;
  totalTime: number;
  hintsUsed: number;
  attempts: number;
  score: number;
  masteryLevel: number;
}

export default function EnhancedQuizActivity({
  activity,
  onComplete,
}: EnhancedQuizActivityProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>("");
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizStats, setQuizStats] = useState<QuizStats>({
    totalQuestions: activity.content.questions.length,
    correctAnswers: 0,
    totalTime: 0,
    hintsUsed: 0,
    attempts: 0,
    score: 0,
    masteryLevel: 0,
  });
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(3);
  const [personalizedFeedback, setPersonalizedFeedback] = useState("");
  const [peerReviews, setPeerReviews] = useState<any[]>([]);

  const currentQuestion = activity.content.questions[currentQuestionIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setQuestionStartTime(Date.now());
    setCurrentAnswer("");
    setShowHints(false);
    setShowExplanation(false);
  }, [currentQuestionIndex]);

  const handleAnswerChange = (value: string | string[]) => {
    setCurrentAnswer(value);
  };

  const handleMultipleChoiceChange = (value: string) => {
    setCurrentAnswer(value);
  };

  const handleMultipleSelectChange = (option: string, checked: boolean) => {
    const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
    if (checked) {
      setCurrentAnswer([...currentAnswers, option]);
    } else {
      setCurrentAnswer(currentAnswers.filter((a) => a !== option));
    }
  };

  const submitAnswer = () => {
    const timeForQuestion = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = checkAnswer(
      currentAnswer,
      currentQuestion.correct_answer
    );

    const answer: Answer = {
      questionId: currentQuestion.id,
      answer: currentAnswer,
      isCorrect,
      timeSpent: timeForQuestion,
      hintsUsed: hintsUsed,
      attempts: 1,
    };

    setAnswers((prev) => [...prev, answer]);
    setShowExplanation(true);

    // Update stats
    setQuizStats((prev) => ({
      ...prev,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      totalTime: prev.totalTime + timeForQuestion,
      hintsUsed: prev.hintsUsed + hintsUsed,
    }));

    // Adaptive difficulty adjustment
    if (isCorrect && adaptiveDifficulty < 5) {
      setAdaptiveDifficulty((prev) => prev + 1);
    } else if (!isCorrect && adaptiveDifficulty > 1) {
      setAdaptiveDifficulty((prev) => prev - 1);
    }

    // Generate personalized feedback
    generatePersonalizedFeedback(answer);
  };

  const checkAnswer = (
    userAnswer: string | string[],
    correctAnswer: string | string[]
  ) => {
    if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
      return (
        userAnswer.length === correctAnswer.length &&
        userAnswer.every((answer) => correctAnswer.includes(answer))
      );
    }
    return userAnswer === correctAnswer;
  };

  const generatePersonalizedFeedback = (answer: Answer) => {
    let feedback = "";

    if (answer.isCorrect) {
      if (answer.timeSpent < 30) {
        feedback =
          "Excellent! You answered quickly and correctly. You clearly understand this concept.";
      } else if (answer.timeSpent < 60) {
        feedback =
          "Great job! You got it right. Consider reviewing similar concepts to build confidence.";
      } else {
        feedback =
          "Good work! You got the correct answer. Take your time to think through the reasoning.";
      }
    } else {
      if (answer.hintsUsed > 0) {
        feedback =
          "You used hints effectively. Review the explanation and try similar questions to reinforce learning.";
      } else {
        feedback =
          "Not quite right, but that's okay! Learning happens through mistakes. Review the explanation carefully.";
      }
    }

    setPersonalizedFeedback(feedback);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < activity.content.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      completeQuiz();
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const retryQuestion = () => {
    setCurrentAnswer("");
    setShowHints(false);
    setShowExplanation(false);
    setHintsUsed(0);
    setQuestionStartTime(Date.now());
    setQuizStats((prev) => ({
      ...prev,
      attempts: prev.attempts + 1,
    }));
  };

  const useHint = () => {
    if (currentQuestion.hints && hintsUsed < currentQuestion.hints.length) {
      setHintsUsed((prev) => prev + 1);
      setShowHints(true);
    }
  };

  const completeQuiz = () => {
    const finalScore =
      (quizStats.correctAnswers / quizStats.totalQuestions) * 100;
    const masteryLevel = Math.min(
      100,
      finalScore + quizStats.hintsUsed * -5 + quizStats.attempts * -2
    );

    setQuizStats((prev) => ({
      ...prev,
      score: finalScore,
      masteryLevel: Math.max(0, masteryLevel),
    }));

    setIsCompleted(true);
    setShowResults(true);

    // Award points based on performance
    const pointsEarned = Math.round((finalScore / 100) * activity.points);
    onComplete(pointsEarned);
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "text-green-600";
    if (difficulty <= 3) return "text-yellow-600";
    if (difficulty <= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  if (showResults) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quiz Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${getScoreColor(
                    quizStats.score
                  )}`}
                >
                  {Math.round(quizStats.score)}%
                </div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {quizStats.correctAnswers}/{quizStats.totalQuestions}
                </div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.floor(quizStats.totalTime / 60)}m{" "}
                  {quizStats.totalTime % 60}s
                </div>
                <div className="text-sm text-muted-foreground">Time</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${getScoreColor(
                    quizStats.masteryLevel
                  )}`}
                >
                  {Math.round(quizStats.masteryLevel)}%
                </div>
                <div className="text-sm text-muted-foreground">Mastery</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Performance Breakdown</h3>
                <div className="space-y-2">
                  {answers.map((answer, index) => {
                    const question = activity.content.questions.find(
                      (q) => q.id === answer.questionId
                    );
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {answer.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span className="text-sm">Question {index + 1}</span>
                          <Badge variant="outline" className="text-xs">
                            {question?.difficulty}/5 difficulty
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{answer.timeSpent}s</span>
                          {answer.hintsUsed > 0 && (
                            <span>{answer.hintsUsed} hints</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {personalizedFeedback && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Personalized Feedback
                  </h3>
                  <p className="text-sm">{personalizedFeedback}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake Quiz
                </Button>
                <Button onClick={() => setShowResults(false)}>
                  Review Answers
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                {activity.title}
              </CardTitle>
              <CardDescription>{activity.description}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className={getDifficultyColor(adaptiveDifficulty)}
              >
                Difficulty: {adaptiveDifficulty}/5
              </Badge>
              <div className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of{" "}
                {activity.content.questions.length}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>
                {Math.round(
                  ((currentQuestionIndex + 1) /
                    activity.content.questions.length) *
                    100
                )}
                %
              </span>
            </div>
            <Progress
              value={
                ((currentQuestionIndex + 1) /
                  activity.content.questions.length) *
                100
              }
              className="h-2"
            />

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                </span>
                <span className="flex items-center gap-1">
                  <Lightbulb className="h-4 w-4" />
                  {hintsUsed} hints used
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                {currentQuestion.points} points
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Quiz Area */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQuestion.question}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={getDifficultyColor(currentQuestion.difficulty)}
                >
                  Difficulty: {currentQuestion.difficulty}/5
                </Badge>
                <Badge variant="secondary">
                  {currentQuestion.type.replace("_", " ").toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {currentQuestion.learning_objective}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Question Content */}
                {currentQuestion.type === "multiple_choice" && (
                  <RadioGroup
                    value={currentAnswer as string}
                    onValueChange={handleMultipleChoiceChange}
                  >
                    {currentQuestion.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <label htmlFor={`option-${index}`} className="text-sm">
                          {option}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.type === "true_false" && (
                  <RadioGroup
                    value={currentAnswer as string}
                    onValueChange={handleMultipleChoiceChange}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="true" />
                      <label htmlFor="true" className="text-sm">
                        True
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="false" />
                      <label htmlFor="false" className="text-sm">
                        False
                      </label>
                    </div>
                  </RadioGroup>
                )}

                {currentQuestion.type === "multiple_select" && (
                  <div className="space-y-2">
                    {currentQuestion.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`option-${index}`}
                          checked={
                            (currentAnswer as string[])?.includes(option) ||
                            false
                          }
                          onCheckedChange={(checked) =>
                            handleMultipleSelectChange(
                              option,
                              checked as boolean
                            )
                          }
                        />
                        <label htmlFor={`option-${index}`} className="text-sm">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "short_answer" && (
                  <Input
                    value={currentAnswer as string}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Enter your answer..."
                  />
                )}

                {currentQuestion.type === "essay" && (
                  <Textarea
                    value={currentAnswer as string}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Write your essay response..."
                    className="min-h-[200px]"
                  />
                )}

                {/* Hints */}
                {showHints && currentQuestion.hints && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Hint {hintsUsed}:
                    </h4>
                    <p className="text-sm text-yellow-700">
                      {currentQuestion.hints[hintsUsed - 1]}
                    </p>
                  </div>
                )}

                {/* Explanation */}
                {showExplanation && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Explanation:
                    </h4>
                    <p className="text-sm text-blue-700">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4">
                  {!showExplanation ? (
                    <>
                      <Button onClick={submitAnswer} disabled={!currentAnswer}>
                        Submit Answer
                      </Button>
                      {currentQuestion.hints &&
                        hintsUsed < currentQuestion.hints.length && (
                          <Button variant="outline" onClick={useHint}>
                            <Lightbulb className="h-4 w-4 mr-2" />
                            Use Hint ({hintsUsed}/{currentQuestion.hints.length}
                            )
                          </Button>
                        )}
                    </>
                  ) : (
                    <>
                      <Button onClick={nextQuestion}>
                        {currentQuestionIndex <
                        activity.content.questions.length - 1
                          ? "Next Question"
                          : "Finish Quiz"}
                      </Button>
                      <Button variant="outline" onClick={retryQuestion}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quiz Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quiz Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Correct Answers</span>
                <span className="font-medium">
                  {quizStats.correctAnswers}/{quizStats.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Time Spent</span>
                <span className="font-medium">
                  {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Hints Used</span>
                <span className="font-medium">{hintsUsed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Current Score</span>
                <span
                  className={`font-medium ${getScoreColor(
                    (quizStats.correctAnswers / (currentQuestionIndex + 1)) *
                      100
                  )}`}
                >
                  {Math.round(
                    (quizStats.correctAnswers / (currentQuestionIndex + 1)) *
                      100
                  )}
                  %
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Learning Objectives */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Learning Objectives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from(
                  new Set(
                    activity.content.questions.map((q) => q.learning_objective)
                  )
                ).map((objective, index) => (
                  <div key={index} className="text-sm p-2 bg-muted rounded">
                    {objective}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Personalized Feedback */}
          {personalizedFeedback && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{personalizedFeedback}</p>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="w-full justify-start"
                >
                  ← Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextQuestion}
                  disabled={
                    currentQuestionIndex ===
                    activity.content.questions.length - 1
                  }
                  className="w-full justify-start"
                >
                  Next →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
