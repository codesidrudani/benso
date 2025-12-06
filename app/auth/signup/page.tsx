"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [userType, setUserType] = useState<"customer" | "garage">("customer")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = getSupabaseClient()

      // Sign up
      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) throw signUpError
      if (!user) throw new Error("Failed to create user")

      const { error: profileError } = await supabase.from("users").insert({
        id: user.id,
        email,
        full_name: fullName,
        phone,
        address,
        user_type: userType,
      })

      if (profileError) throw profileError

      // Create garage or customer profile
      if (userType === "garage") {
        const { error: garageError } = await supabase.from("garages").insert({
          user_id: user.id,
          name: fullName,
          address,
          phone,
          latitude: 0,
          longitude: 0,
        })
        if (garageError) throw garageError
      } else {
        const { error: customerError } = await supabase.from("customers").insert({
          user_id: user.id,
          full_name: fullName,
          phone,
          address,
        })
        if (customerError) throw customerError
      }

      router.push("/auth/verify")
    } catch (err: any) {
      setError(err.message || "Failed to sign up")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background px-4 py-8">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription className="text-base">Join BENSO as a customer or garage owner</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11" />
              <Input
                placeholder="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-11"
              />
              <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} required className="h-11" />
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              <Input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
              <Select value={userType} onValueChange={(value: any) => setUserType(value)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="garage">Garage Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>

            <div className="text-center text-sm pt-2">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
