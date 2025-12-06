"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function AdditionalServicesPaymentPage() {
  const router = useRouter()
  const params = useParams()
  const bookingId = params.bookingId as string

  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [processing, setProcessing] = useState(false)

  // Get payment details from query params
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const paymentDataStr = searchParams?.get("paymentData")
  const paymentData = paymentDataStr ? JSON.parse(decodeURIComponent(paymentDataStr)) : null

  const handlePayment = async () => {
    if (!cardNumber || !cardName || !expiry || !cvv) {
      alert("Please fill in all payment details")
      return
    }

    // Basic validation
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      alert("Please enter a valid 16-digit card number")
      return
    }

    if (cvv.length !== 3) {
      alert("Please enter a valid 3-digit CVV")
      return
    }

    setProcessing(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update booking status to accepted after payment
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from("bookings")
        .update({
          additional_services_status: "accepted",
          status: "additional_services_accepted",
        })
        .eq("id", bookingId)

      setProcessing(false)

      if (error) {
        alert("Error updating booking: " + error.message)
        return
      }

      // Redirect back to bookings with success message
      router.push("/customer/bookings?success=additional_services_paid")
    } catch (err: any) {
      setProcessing(false)
      alert("Payment failed: " + (err.message || "Unknown error"))
    }
  }

  if (!paymentData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive">Invalid payment data. Redirecting...</p>
            <Button 
              onClick={() => router.push("/customer/bookings")} 
              className="mt-4 w-full"
            >
              Back to Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/customer/bookings" className="text-primary hover:underline">
            ← Back to Bookings
          </Link>
          <h1 className="text-2xl font-bold mt-4">Pay for Additional Services</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Additional Services Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentData.additionalServices.map((service: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start pb-2 border-b">
                  <div>
                    <p className="font-semibold">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                  <p className="font-semibold">₹{service.price?.toLocaleString()}</p>
                </div>
              ))}
              <div className="flex justify-between text-lg font-bold pt-4 border-t">
                <span>Total Amount:</span>
                <span className="text-primary">₹{paymentData.additionalServicesTotal.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Card Number</label>
              <Input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, "")
                  const formatted = value.match(/.{1,4}/g)?.join(" ") || value
                  setCardNumber(formatted.slice(0, 19))
                }}
                maxLength={19}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cardholder Name</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Expiry Date</label>
                <Input
                  type="text"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "")
                    if (value.length <= 4) {
                      const formatted = value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value
                      setExpiry(formatted)
                    }
                  }}
                  maxLength={5}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">CVV</label>
                <Input
                  type="text"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "")
                    setCvv(value.slice(0, 3))
                  }}
                  maxLength={3}
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              <strong>Note:</strong> This is a demo payment. No actual charges will be made.
            </div>

            <Button onClick={handlePayment} disabled={processing} className="w-full" size="lg">
              {processing ? "Processing Payment..." : `Pay ₹${paymentData.additionalServicesTotal.toLocaleString()}`}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
