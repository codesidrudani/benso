"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"

const PRICING = {
  basic: 2000,
  standard: 4000,
}

export default function PaymentPage() {
  const router = useRouter()
  const params = useParams()
  const garageId = params.garageId as string

  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [processing, setProcessing] = useState(false)

  // Get booking details from query params or state
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const serviceType = searchParams?.get("serviceType") || "basic"
  const amount = PRICING[serviceType as keyof typeof PRICING] || PRICING.basic
  const bookingData = searchParams?.get("bookingData") ? JSON.parse(decodeURIComponent(searchParams.get("bookingData")!)) : null

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

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setProcessing(false)

    // Redirect back to booking page with payment success
    const bookingDataWithPayment = {
      ...bookingData,
      payment_status: "paid",
      payment_amount: amount,
    }

    router.push(
      `/customer/book/${garageId}/confirm?${new URLSearchParams({
        bookingData: encodeURIComponent(JSON.stringify(bookingDataWithPayment)),
      }).toString()}`
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/customer/book/${garageId}`} className="text-primary hover:underline">
            ← Back to Booking
          </Link>
          <h1 className="text-2xl font-bold mt-4">Payment</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Type:</span>
                <span className="font-medium capitalize">{serviceType} Service</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total Amount:</span>
                <span>₹{amount.toLocaleString()}</span>
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
              {processing ? "Processing Payment..." : `Pay ₹${amount.toLocaleString()}`}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

