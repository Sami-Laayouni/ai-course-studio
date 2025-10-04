"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DatabaseStatus {
  tables: Record<string, boolean>;
  triggerExists: boolean;
  userCount: number;
  message: string;
}

export default function DatabaseStatusPage() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDatabase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/check-database");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check database");
      }

      setStatus(data);
    } catch (error) {
      console.error("Error checking database:", error);
      setError(
        error instanceof Error ? error.message : "Failed to check database"
      );
      toast({
        title: "Error",
        description: "Failed to check database status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  const getStatusIcon = (exists: boolean) => {
    return exists ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (exists: boolean) => {
    return (
      <Badge variant={exists ? "default" : "destructive"}>
        {exists ? "Exists" : "Missing"}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Database Status
          </h1>
          <p className="text-muted-foreground mt-1">
            Check if your database tables and triggers are set up correctly
          </p>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6">
          <Button onClick={checkDatabase} disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Checking..." : "Check Database"}
          </Button>
        </div>

        {status && (
          <div className="space-y-6">
            {/* Overall Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Overview
                </CardTitle>
                <CardDescription>
                  Current status of your database setup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(status.tables).filter(Boolean).length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tables Created
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {status.userCount}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {status.triggerExists ? "✓" : "✗"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Profile Trigger
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table Status */}
            <Card>
              <CardHeader>
                <CardTitle>Table Status</CardTitle>
                <CardDescription>
                  Check which database tables exist
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(status.tables).map(([table, exists]) => (
                    <div
                      key={table}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(exists)}
                        <span className="font-medium">{table}</span>
                      </div>
                      {getStatusBadge(exists)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trigger Status */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Trigger Status</CardTitle>
                <CardDescription>
                  The trigger that automatically creates user profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.triggerExists)}
                    <span className="font-medium">on_auth_user_created</span>
                  </div>
                  {getStatusBadge(status.triggerExists)}
                </div>
              </CardContent>
            </Card>

            {/* Setup Instructions */}
            {(!status.triggerExists ||
              Object.values(status.tables).some((exists) => !exists)) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Database setup incomplete!</p>
                    <p>
                      You need to run the SQL scripts in your Supabase
                      dashboard:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Go to your Supabase dashboard</li>
                      <li>Open the SQL Editor</li>
                      <li>
                        Run the scripts from the <code>scripts/</code> folder in
                        order
                      </li>
                      <li>
                        Check the <code>DATABASE_SETUP_GUIDE.md</code> for
                        detailed instructions
                      </li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {status.triggerExists &&
              Object.values(status.tables).every((exists) => exists) && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="text-green-800">
                      <p className="font-medium">Database setup complete! 🎉</p>
                      <p>
                        All tables and triggers are properly configured. You can
                        now create accounts and they should work correctly.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
