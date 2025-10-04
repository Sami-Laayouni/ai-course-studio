import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Sparkles } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-9 w-32 bg-muted animate-pulse rounded-md" />
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Content Generator</h1>
            <p className="text-muted-foreground">Create educational content with AI assistance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form Skeleton */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  Content Settings
                </CardTitle>
                <CardDescription>Loading content generator...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-20 w-full bg-muted animate-pulse rounded-md" />
                </div>
                <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
              </CardContent>
            </Card>
          </div>

          {/* Generated Content Skeleton */}
          <div>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Brain className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
