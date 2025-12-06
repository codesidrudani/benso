"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ConfirmBooking() {
  const router = useRouter()
  const params = useParams()
  const garageId = params.garageId as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [bookingId, setBookingId] = useState<string | null>(null)
  const hasCreatedBooking = useRef(false)

  useEffect(() => {
    const createBooking = async () => {
      // Parse bookingData from URL first
      const searchParams = new URLSearchParams(window.location.search)
      const bookingDataStr = searchParams.get("bookingData")

      if (!bookingDataStr) {
        setError("Invalid booking data")
        setLoading(false)
        return
      }

      const bookingData = JSON.parse(decodeURIComponent(bookingDataStr))

      // Prevent duplicate booking creation in this tab/session
      const bookingKey = `booking:${bookingData.garage_id}:${bookingData.car_id}:${bookingData.booking_date}:${bookingData.start_time}`

      if (hasCreatedBooking.current) {
        return
      }

      // If another mount/refresh already started creating this booking (React Strict Mode can remount),
      // use sessionStorage as a cross-mount/tab guard.
      if (typeof window !== "undefined") {
        const existingFlag = sessionStorage.getItem(bookingKey)
        if (existingFlag === "created") {
          // Booking already created in this session — try to fetch and reuse
          const { data: existingBooking } = await getSupabaseClient()
            .from("bookings")
            .select("id")
            .eq("garage_id", bookingData.garage_id)
            .eq("customer_id", customerData.id)
            .eq("car_id", bookingData.car_id)
            .eq("booking_date", bookingData.booking_date)
            .eq("start_time", bookingData.start_time)
            .maybeSingle()

          if (existingBooking) {
            setBookingId(existingBooking.id)
            setLoading(false)
            hasCreatedBooking.current = true
            return
          }
        }
        // Mark as creating so remounts won't create again
        sessionStorage.setItem(bookingKey, "creating")
      }

      if (bookingData.payment_status !== "paid") {
        setError("Payment not completed")
        setLoading(false)
        return
      }

      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: customerData } = await supabase.from("customers").select("id").eq("user_id", user.id).single()

      if (!customerData) {
        setError("Customer profile not found")
        setLoading(false)
        return
      }

      // Check if booking already exists to prevent duplicates (either unpaid or paid)
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("*")
        .eq("garage_id", bookingData.garage_id)
        .eq("customer_id", customerData.id)
        .eq("car_id", bookingData.car_id)
        .eq("booking_date", bookingData.booking_date)
        .eq("start_time", bookingData.start_time)
        .maybeSingle()

      // Mark that we're handling booking creation to prevent duplicates in this lifecycle
      hasCreatedBooking.current = true

      if (existingBooking) {
        // If an unpaid booking exists, update it to paid instead of inserting a new one
        if (existingBooking.payment_status !== "paid") {
          const { data: updated, error: updateError } = await supabase
            .from("bookings")
            .update({
              payment_status: "paid",
              payment_amount: bookingData.payment_amount,
              status: existingBooking.status || "pending",
            })
            .eq("id", existingBooking.id)
            .select()
            .single()

          setLoading(false)

          if (updateError) {
            setError(updateError.message)
            hasCreatedBooking.current = false // allow retry
            if (typeof window !== "undefined") sessionStorage.removeItem(bookingKey)
            return
          }

          setBookingId(updated.id)
          return
        }

        // Already paid booking exists — reuse it
        setBookingId(existingBooking.id)
        setLoading(false)
        return
      }

      // No existing booking — insert a new paid booking
      const { data, error: insertError } = await supabase
        .from("bookings")
        .insert({
          garage_id: bookingData.garage_id,
          customer_id: customerData.id,
          car_id: bookingData.car_id,
          booking_date: bookingData.booking_date,
          start_time: bookingData.start_time,
          end_time: bookingData.end_time,
          service_type: bookingData.service_type,
          request_type: bookingData.request_type,
          payment_status: "paid",
          payment_amount: bookingData.payment_amount,
          status: "pending",
        })
        .select()
        .single()

      setLoading(false)

      if (insertError) {
        setError(insertError.message)
        hasCreatedBooking.current = false // Reset on error so user can retry
        if (typeof window !== "undefined") sessionStorage.removeItem(bookingKey)
      } else {
        setBookingId(data.id)
        if (typeof window !== "undefined") sessionStorage.setItem(bookingKey, "created")
      }
    }

    createBooking()
  }, [router, garageId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Creating your booking...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Link href={`/customer/book/${garageId}`}>
              <Button>Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-green-600">Booking Request Sent!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your booking request has been sent to the garage. They will review and confirm your booking shortly.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
            <strong>Payment Status:</strong> Paid ✓
          </div>
          <div className="flex gap-2">
            <Link href="/customer/bookings" className="flex-1">
              <Button className="w-full">View My Bookings</Button>
            </Link>
            <Link href="/customer/discover" className="flex-1">
              <Button variant="outline" className="w-full">
                Browse More Garages
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

