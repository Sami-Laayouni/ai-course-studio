"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  Clock,
  Star,
  Zap,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";

interface InteractiveSimulationProps {
  activityId: string;
  activity: any;
  onComplete: (points: number) => void;
}

interface SimulationState {
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  variables: Record<string, any>;
  results: any[];
  score: number;
  hintsUsed: number;
  timeSpent: number;
}

interface SimulationStep {
  id: string;
  title: string;
  description: string;
  action: string;
  expectedResult: any;
  hint: string;
  points: number;
}

export default function InteractiveSimulation({
  activityId,
  activity,
  onComplete,
}: InteractiveSimulationProps) {
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    currentStep: 0,
    totalSteps: 0,
    variables: {},
    results: [],
    score: 0,
    hintsUsed: 0,
    timeSpent: 0,
  });

  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [currentAction, setCurrentAction] = useState("");
  const [actionResult, setActionResult] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    initializeSimulation();
  }, [activityId]);

  useEffect(() => {
    if (simulationState.isRunning && startTime) {
      const interval = setInterval(() => {
        setSimulationState((prev) => ({
          ...prev,
          timeSpent: Math.floor((Date.now() - startTime.getTime()) / 1000),
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [simulationState.isRunning, startTime]);

  const initializeSimulation = async () => {
    try {
      // Generate simulation steps based on activity
      const generatedSteps = await generateSimulationSteps();
      setSteps(generatedSteps);
      setSimulationState((prev) => ({
        ...prev,
        totalSteps: generatedSteps.length,
        variables: generateInitialVariables(generatedSteps),
      }));
    } catch (error) {
      console.error("Error initializing simulation:", error);
    }
  };

  const generateSimulationSteps = async (): Promise<SimulationStep[]> => {
    // This would typically call an API to generate steps based on the activity
    // For now, we'll create a sample simulation
    return [
      {
        id: "step1",
        title: "Set Initial Parameters",
        description: "Configure the basic parameters for your experiment",
        action: "Set temperature to 25°C and pressure to 1 atm",
        expectedResult: { temperature: 25, pressure: 1 },
        hint: "Look for the temperature and pressure controls in the interface",
        points: 10,
      },
      {
        id: "step2",
        title: "Add Reactants",
        description: "Add the required reactants to the reaction vessel",
        action: "Add 2 moles of hydrogen and 1 mole of oxygen",
        expectedResult: { hydrogen: 2, oxygen: 1 },
        hint: "Use the reactant addition controls to specify the amounts",
        points: 15,
      },
      {
        id: "step3",
        title: "Initiate Reaction",
        description: "Start the chemical reaction process",
        action: "Activate the catalyst and begin the reaction",
        expectedResult: { reaction_active: true, catalyst: true },
        hint: "Click the 'Start Reaction' button after adding the catalyst",
        points: 20,
      },
      {
        id: "step4",
        title: "Monitor Progress",
        description: "Observe the reaction progress and collect data",
        action: "Record the temperature increase and product formation",
        expectedResult: { temperature_increase: true, products_formed: true },
        hint: "Watch the temperature gauge and product counter",
        points: 15,
      },
      {
        id: "step5",
        title: "Analyze Results",
        description: "Calculate the yield and efficiency of the reaction",
        action: "Calculate the percentage yield of water produced",
        expectedResult: { yield_calculated: true, efficiency: ">90%" },
        hint: "Use the formula: (actual yield / theoretical yield) × 100",
        points: 20,
      },
    ];
  };

  const generateInitialVariables = (steps: SimulationStep[]) => {
    return {
      temperature: 20,
      pressure: 1,
      hydrogen: 0,
      oxygen: 0,
      water: 0,
      reaction_active: false,
      catalyst: false,
      yield: 0,
      efficiency: 0,
    };
  };

  const startSimulation = () => {
    setSimulationState((prev) => ({ ...prev, isRunning: true }));
    setStartTime(new Date());
  };

  const pauseSimulation = () => {
    setSimulationState((prev) => ({ ...prev, isRunning: false }));
  };

  const resetSimulation = () => {
    setSimulationState({
      isRunning: false,
      currentStep: 0,
      totalSteps: steps.length,
      variables: generateInitialVariables(steps),
      results: [],
      score: 0,
      hintsUsed: 0,
      timeSpent: 0,
    });
    setCurrentAction("");
    setActionResult("");
    setIsCorrect(null);
    setStartTime(null);
  };

  const executeAction = () => {
    if (!currentAction.trim()) return;

    const currentStepData = steps[simulationState.currentStep];
    const result = simulateAction(currentAction, currentStepData);

    setActionResult(result.message);
    setIsCorrect(result.isCorrect);

    if (result.isCorrect) {
      setSimulationState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        score: prev.score + currentStepData.points,
        results: [
          ...prev.results,
          {
            step: prev.currentStep,
            action: currentAction,
            result: result.message,
            points: currentStepData.points,
          },
        ],
      }));

      // Check if simulation is complete
      if (simulationState.currentStep + 1 >= steps.length) {
        completeSimulation();
      }
    }

    setCurrentAction("");
  };

  const simulateAction = (action: string, step: SimulationStep) => {
    // Simple simulation logic - in a real app, this would be more sophisticated
    const actionLower = action.toLowerCase();
    const stepActionLower = step.action.toLowerCase();

    // Check if the action matches the expected action
    const isCorrect =
      actionLower.includes(stepActionLower.split(" ")[0]) ||
      actionLower.includes(stepActionLower.split(" ")[1]);

    if (isCorrect) {
      // Update variables based on the step
      setSimulationState((prev) => ({
        ...prev,
        variables: {
          ...prev.variables,
          ...step.expectedResult,
        },
      }));
    }

    return {
      isCorrect,
      message: isCorrect
        ? `✅ Correct! ${step.description}`
        : `❌ Not quite right. ${step.hint}`,
    };
  };

  const useHint = () => {
    setShowHints(true);
    setSimulationState((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
  };

  const completeSimulation = () => {
    setSimulationState((prev) => ({ ...prev, isRunning: false }));
    const totalPoints =
      simulationState.score + (simulationState.hintsUsed === 0 ? 50 : 0); // Bonus for no hints
    onComplete(totalPoints);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentStepData = steps[simulationState.currentStep];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Interactive Simulation</h1>
            <p className="text-muted-foreground">{activity?.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Simulation
            </Badge>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {formatTime(simulationState.timeSpent)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulation Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Simulation Control Panel
                    </CardTitle>
                    <CardDescription>
                      Step {simulationState.currentStep + 1} of{" "}
                      {simulationState.totalSteps}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {!simulationState.isRunning ? (
                      <Button
                        onClick={startSimulation}
                        disabled={simulationState.currentStep >= steps.length}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </Button>
                    ) : (
                      <Button onClick={pauseSimulation}>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    <Button variant="outline" onClick={resetSimulation}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Current Step */}
                {currentStepData && (
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">
                      {currentStepData.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {currentStepData.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {currentStepData.points} points
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={useHint}
                        className="text-xs"
                      >
                        <Lightbulb className="h-3 w-3 mr-1" />
                        Hint ({simulationState.hintsUsed})
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Input */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">
                    What would you like to do?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentAction}
                      onChange={(e) => setCurrentAction(e.target.value)}
                      placeholder="Describe your action..."
                      className="flex-1 px-3 py-2 border border-input rounded-md"
                      disabled={
                        !simulationState.isRunning ||
                        simulationState.currentStep >= steps.length
                      }
                    />
                    <Button
                      onClick={executeAction}
                      disabled={
                        !currentAction.trim() ||
                        !simulationState.isRunning ||
                        simulationState.currentStep >= steps.length
                      }
                    >
                      Execute
                    </Button>
                  </div>
                </div>

                {/* Result Display */}
                {actionResult && (
                  <div
                    className={`p-3 rounded-lg mb-4 ${
                      isCorrect
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        {isCorrect ? "Success!" : "Try Again"}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{actionResult}</p>
                  </div>
                )}

                {/* Hints */}
                {showHints && currentStepData && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Hint
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      {currentStepData.hint}
                    </p>
                  </div>
                )}

                {/* Simulation Variables */}
                <div className="flex-1 overflow-y-auto">
                  <h4 className="font-medium mb-3">Simulation State</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(simulationState.variables).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between p-2 bg-muted rounded"
                        >
                          <span className="capitalize">
                            {key.replace("_", " ")}:
                          </span>
                          <span className="font-mono">{String(value)}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Panel */}
          <div className="space-y-4">
            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Steps Completed</span>
                    <span>
                      {simulationState.currentStep} /{" "}
                      {simulationState.totalSteps}
                    </span>
                  </div>
                  <Progress
                    value={
                      (simulationState.currentStep /
                        simulationState.totalSteps) *
                      100
                    }
                    className="h-2"
                  />

                  <div className="flex justify-between text-sm">
                    <span>Score</span>
                    <span className="font-medium">
                      {simulationState.score} points
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Hints Used</span>
                    <span>{simulationState.hintsUsed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Results History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {simulationState.results.map((result, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">
                          Step {result.step + 1}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          +{result.points}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {result.action}
                      </p>
                    </div>
                  ))}
                  {simulationState.results.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No results yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowHints(!showHints)}
                >
                  {showHints ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {showHints ? "Hide" : "Show"} Hints
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={resetSimulation}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Simulation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
