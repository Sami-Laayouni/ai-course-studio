import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome to AI Course Authoring Studio!</CardTitle>
              <CardDescription>Check your email to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                We&apos;ve sent you a confirmation email. Please click the link in the email to verify your account and
                start creating amazing educational content with AI assistance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
