import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>Check your email for a verification link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We&apos;ve sent a verification email to your inbox. Click the link to verify your account and get started.
          </p>
          <Link href="/auth/login">
            <Button className="w-full">Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
