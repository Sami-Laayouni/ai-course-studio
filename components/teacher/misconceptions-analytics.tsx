"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, TrendingUp, Lightbulb, CheckCircle } from "lucide-react";

interface MisconceptionsAnalyticsProps {
  activityId: string;
}

export default function MisconceptionsAnalytics({
  activityId,
}: MisconceptionsAnalyticsProps) {
  const [misconceptions, setMisconceptions] = useState<any[]>([]);
  const [commonStruggles, setCommonStruggles] = useState<any[]>([]);
  const [studentMisconceptions, setStudentMisconceptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [activityId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log("📊 Loading misconceptions for activity:", activityId);

      // Load all misconceptions for this activity (including resolved ones for full picture)
      const { data: allMisconceptions, error: misconceptionsError } = await supabase
        .from("student_misconceptions")
        .select(`
          *,
          student:profiles!student_misconceptions_student_id_fkey(id, full_name, email)
        `)
        .eq("activity_id", activityId)
        .order("detected_at", { ascending: false });

      if (misconceptionsError) {
        console.error("❌ Error loading misconceptions:", misconceptionsError);
        throw misconceptionsError;
      }

      console.log(`✅ Loaded ${allMisconceptions?.length || 0} misconceptions`);

      // Load common struggles
      const { data: struggles, error: strugglesError } = await supabase
        .from("common_struggles")
        .select("*")
        .eq("activity_id", activityId)
        .order("struggling_student_count", { ascending: false });

      if (strugglesError) {
        console.error("❌ Error loading common struggles:", strugglesError);
      }

      // Filter unresolved misconceptions for display
      const unresolved = (allMisconceptions || []).filter((m) => !m.resolved_at);
      setMisconceptions(unresolved);
      setCommonStruggles(struggles || []);

      // Group by student (show both resolved and unresolved)
      const grouped = (allMisconceptions || []).reduce((acc: any, m: any) => {
        const studentId = m.student_id;
        if (!acc[studentId]) {
          acc[studentId] = {
            student: m.student || { id: studentId, full_name: "Unknown Student", email: "" },
            misconceptions: [],
          };
        }
        acc[studentId].misconceptions.push(m);
        return acc;
      }, {});

      const studentGroups = Object.values(grouped);
      console.log(`✅ Grouped into ${studentGroups.length} students`);
      setStudentMisconceptions(studentGroups);
    } catch (error) {
      console.error("❌ Error loading misconceptions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading misconceptions data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Misconceptions
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{misconceptions.length}</div>
            <p className="text-xs text-muted-foreground">
              Unresolved misconceptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Students Affected
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentMisconceptions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Students with misconceptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Common Struggles
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commonStruggles.length}</div>
            <p className="text-xs text-muted-foreground">
              Concepts with common issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Student Struggles */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Student Struggles</CardTitle>
          <CardDescription>
            Detailed breakdown of what each student is struggling with
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studentMisconceptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No misconceptions identified yet.
              </div>
            ) : (
              studentMisconceptions.map((studentData: any, idx: number) => {
                const unresolved = studentData.misconceptions.filter((m: any) => !m.resolved_at);
                const studentName = studentData.student?.full_name || "Unknown Student";
                
                return (
                  <Card key={idx} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {unresolved.length === 0 ? (
                          <div className="text-center py-4 text-green-600">
                            <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                            <p className="font-medium">{studentName} has no unresolved misconceptions</p>
                          </div>
                        ) : (
                          unresolved.map((m: any, mIdx: number) => {
                            // Format: "Hiba is struggling with understanding the role of the mitochondria in the cell"
                            const struggleText = m.misconception_description 
                              ? `${studentName} is struggling with ${m.misconception_description.toLowerCase()}`
                              : `${studentName} is struggling with ${m.concept}`;
                            
                            return (
                              <div
                                key={mIdx}
                                className="bg-red-50 border-l-4 border-l-red-500 rounded-lg p-4"
                              >
                                <p className="text-base font-medium text-gray-900 mb-2">
                                  {struggleText}
                                </p>
                                {m.evidence?.response && (
                                  <p className="text-sm text-gray-600 italic mb-2">
                                    Evidence: "{m.evidence.response}"
                                  </p>
                                )}
                                {m.severity && (
                                  <Badge
                                    variant={
                                      m.severity === "high"
                                        ? "destructive"
                                        : m.severity === "medium"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs mt-2"
                                  >
                                    {m.severity} severity
                                  </Badge>
                                )}
                              </div>
                            );
                          })
                        )}
                        {studentData.misconceptions.filter((m: any) => m.resolved_at).length > 0 && (
                          <div className="text-xs text-gray-500 mt-2">
                            {studentData.misconceptions.filter((m: any) => m.resolved_at).length} misconception(s) resolved
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Common Struggles */}
      {commonStruggles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Common Struggles Across Students</CardTitle>
            <CardDescription>
              Concepts where multiple students are struggling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {commonStruggles.map((struggle: any, idx: number) => (
                <Card key={idx} className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="text-base">{struggle.concept}</CardTitle>
                    <CardDescription>
                      {struggle.struggling_student_count} of{" "}
                      {struggle.total_student_count} students struggling
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {struggle.common_misconceptions &&
                      struggle.common_misconceptions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Common Misconceptions:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {struggle.common_misconceptions.map(
                              (m: string, mIdx: number) => (
                                <Badge key={mIdx} variant="outline" className="text-xs">
                                  {m}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    {struggle.recommended_interventions &&
                      struggle.recommended_interventions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">
                            Recommended Interventions:
                          </p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {struggle.recommended_interventions.map(
                              (intervention: string, iIdx: number) => (
                                <li key={iIdx}>• {intervention}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Lightbulb className="h-5 w-5" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-800">
            {commonStruggles.length > 0 ? (
              <>
                <p>
                  <strong>Pattern Detected:</strong> Multiple students showing
                  similar struggle patterns in{" "}
                  {commonStruggles
                    .slice(0, 3)
                    .map((s) => s.concept)
                    .join(", ")}
                  .
                </p>
                <p>
                  <strong>Recommendation:</strong> Consider creating additional
                  review activities or providing targeted interventions for these
                  concepts.
                </p>
              </>
            ) : (
              <p>
                No common patterns detected yet. Continue monitoring student
                performance as they complete activities.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

