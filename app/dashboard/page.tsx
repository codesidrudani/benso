"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeDeliveryOtps, setActiveDeliveryOtps] = useState<any[]>([])

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = getSupabaseClient()

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
          console.log("[v0] Auth state changed:", event, session?.user?.id)

          if (!session) {
            console.log("[v0] No session, redirecting to login")
            router.push("/auth/login")
            return
          }

          try {
            const { data: userProfile } = await supabase.from("users").select("*").eq("id", session.user.id).single()

            setUser(session.user)
            setUserType(userProfile?.user_type || "customer")
            setLoading(false)

            // Fetch active delivery OTPs for garage
            if (userProfile?.user_type === "garage") {
              const { data: garageData } = await supabase.from("garages").select("id").eq("user_id", session.user.id).single()
              if (garageData) {
                const { data: bookingsData } = await supabase
                  .from("bookings")
                  .select("id, delivery_otp, customer:customers(full_name), car:customer_cars(brand, model)")
                  .eq("garage_id", garageData.id)
                  .eq("status", "delivery_pending")
                  .not("delivery_otp", "is", null)
                setActiveDeliveryOtps(bookingsData || [])
              }
            }
          } catch (err) {
            console.log("[v0] Error loading user profile:", err)
            setError("Failed to load profile")
            setLoading(false)
          }
        })

        return () => {
          subscription?.unsubscribe()
        }
      } catch (err: any) {
        console.log("[v0] Auth check error:", err)
        setError(err.message || "Failed to load user")
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <div className="text-destructive">{error}</div>
            <Button onClick={() => router.push("/auth/login")} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">BENSO Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {userType === "garage" ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Welcome, Garage Owner!</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/garage/profile">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">Manage Profile</h3>
                    <p className="text-muted-foreground">Update your garage details, hours, and services</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/garage/bookings">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">View Bookings</h3>
                    <p className="text-muted-foreground">Manage customer bookings and schedules</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">Welcome, {user?.email}!</h2>
              <Button variant="outline" onClick={() => router.push('/customer/profile')}>
                Edit Profile
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/customer/profile">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">My Profile</h3>
                        <p className="text-muted-foreground">Manage your profile and vehicles</p>
                      </div>
                      <div className="shrink-0">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); /* allow link click as fallback */ window.location.href = '/customer/profile' }}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/customer/discover">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">Find Services</h3>
                    <p className="text-muted-foreground">Discover garages near you</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/customer/bookings">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">My Bookings</h3>
                    <p className="text-muted-foreground">View your service bookings</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Active Delivery OTPs - Bottom Left Corner (Garage Only) */}
      {userType === "garage" && activeDeliveryOtps.length > 0 && (
        <div className="fixed bottom-4 left-4 max-w-sm">
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-lg">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-sm mb-3 text-yellow-900">Active Delivery OTPs</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeDeliveryOtps.map((booking) => (
                  <div key={booking.id} className="bg-white p-2 rounded border border-yellow-200 text-xs">
                    <p className="font-medium text-gray-800">
                      {booking.car?.brand} {booking.car?.model}
                    </p>
                    <p className="text-gray-600">{booking.customer?.full_name}</p>
                    <p className="font-mono bg-yellow-100 px-2 py-1 rounded text-center font-bold mt-1 text-sm">
                      {booking.delivery_otp}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}