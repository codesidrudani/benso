"use client"

import { useEffect, useState } from "react"
import { Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { getCarBrandLogo } from "@/lib/utils/car-logos"

export default function MyBookings() {
  const router = useRouter()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deliveryOtpInput, setDeliveryOtpInput] = useState("")
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [selectedDeliveryBooking, setSelectedDeliveryBooking] = useState<any>(null)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        // Get customer
        const { data: customerData } = await supabase.from("customers").select("id").eq("user_id", user.id).single()

        if (customerData) {
          // Get bookings
          const { data: bookingsData } = await supabase
            .from("bookings")
            .select(`
              *,
              garage:garages(name, phone),
              car:customer_cars(brand, model, registration_number)
            `)
            .eq("customer_id", customerData.id)
            .order("booking_date", { ascending: false })

          setBookings(bookingsData || [])
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching bookings:", error)
        setLoading(false)
      }
    }

    fetchBookings()
  }, [router])

  const handleAcceptAdditionalServices = async (bookingId: string) => {
    // Find the booking to get additional services total
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking || !booking.additional_services || booking.additional_services.length === 0) {
      alert("No additional services found")
      return
    }

    // Calculate total of additional services
    const additionalServicesTotal = booking.additional_services.reduce(
      (sum: number, service: any) => sum + (service.price || 0),
      0
    )

    // Redirect to payment page for additional services
    const paymentData = {
      bookingId,
      additionalServices: booking.additional_services,
      additionalServicesTotal,
      garageId: booking.garage_id,
    }

    router.push(
      `/customer/bookings/${bookingId}/payment-additional?paymentData=${encodeURIComponent(JSON.stringify(paymentData))}`
    )
  }

  const handleRejectAdditionalServices = async (bookingId: string) => {
    if (!confirm("Are you sure you want to reject these additional services?")) {
      return
    }
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("bookings")
      .update({ additional_services_status: "rejected", status: "additional_services_rejected" })
      .eq("id", bookingId)

    if (!error) {
      setBookings(
        bookings.map((b) =>
          b.id === bookingId
            ? { ...b, additional_services_status: "rejected", status: "additional_services_rejected" }
            : b
        )
      )
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId)

    if (!error) {
      setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)))
    }
  }

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getStatusColor = (status: string) => {
    if (status === "confirmed" || status === "ready_for_pickup" || status === "additional_services_accepted") {
      return "bg-green-100 text-green-800"
    }
    if (status === "pending") {
      return "bg-yellow-100 text-yellow-800"
    }
    if (status === "service_pending" || status === "additional_services_pending") {
      return "bg-blue-100 text-blue-800"
    }
    if (status === "rejected" || status === "cancelled" || status === "additional_services_rejected") {
      return "bg-red-100 text-red-800"
    }
    return "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-primary hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-4 flex items-center gap-2"><Calendar size={22} />My Bookings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No bookings yet</p>
              <Link href="/customer/discover">
                <Button className="mt-4">Find Services</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                  <img
                    src={getCarBrandLogo(booking.car.brand)}
                    alt={booking.car.brand}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <CardHeader className="relative">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-2 border-primary/20 shrink-0">
                        <img
                          src={getCarBrandLogo(booking.car.brand)}
                          alt={booking.car.brand}
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-logo.svg'
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="mb-1 flex items-center gap-2"><Calendar size={16} />{booking.garage.name}</CardTitle>
                        <p className="text-sm font-semibold text-foreground">
                        {booking.car.brand} {booking.car.model}
                      </p>
                        {booking.request_type && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Type: {booking.request_type === "walk_in" ? "Walk-In" : "Pickup"}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium shrink-0 ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Status Timeline */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3">Service Status Timeline</h3>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      
                      {/* Timeline steps */}
                      <div className="space-y-4">
                        {/* Payment */}
                        <div className="relative flex items-start gap-3">
                          <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                            booking.payment_status === "paid" ? "bg-green-500" : "bg-gray-300"
                          }`}>
                            {booking.payment_status === "paid" ? (
                              <span className="text-white text-xs">✓</span>
                            ) : (
                              <span className="text-white text-xs">1</span>
                            )}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className={`text-sm font-medium ${
                              booking.payment_status === "paid" ? "text-green-600" : "text-gray-500"
                            }`}>
                              Payment {booking.payment_status === "paid" ? "Completed" : "Pending"}
                            </p>
                            {booking.payment_status === "paid" && (
                              <p className="text-xs text-muted-foreground">₹{booking.payment_amount?.toLocaleString()} paid</p>
                            )}
                          </div>
                        </div>

                        {/* Request Accepted */}
                        <div className="relative flex items-start gap-3">
                          <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                            booking.status === "confirmed" || booking.status === "service_pending" || booking.status === "additional_services_pending" || booking.status === "additional_services_accepted" || booking.status === "additional_services_rejected" || booking.status === "ready_for_pickup" || booking.status === "completed"
                              ? "bg-green-500" 
                              : booking.status === "pending" 
                                ? "bg-yellow-500" 
                                : booking.status === "rejected" || booking.status === "cancelled"
                                  ? "bg-red-500"
                                  : "bg-gray-300"
                          }`}>
                            {["confirmed", "service_pending", "additional_services_pending", "additional_services_accepted", "additional_services_rejected", "ready_for_pickup", "completed"].includes(booking.status) ? (
                              <span className="text-white text-xs">✓</span>
                            ) : booking.status === "rejected" || booking.status === "cancelled" ? (
                              <span className="text-white text-xs">✗</span>
                            ) : (
                              <span className="text-white text-xs">2</span>
                            )}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className={`text-sm font-medium ${
                              ["confirmed", "service_pending", "additional_services_pending", "additional_services_accepted", "additional_services_rejected", "ready_for_pickup", "completed"].includes(booking.status)
                                ? "text-green-600" 
                                : booking.status === "pending" 
                                  ? "text-yellow-600" 
                                  : booking.status === "rejected" || booking.status === "cancelled"
                                    ? "text-red-600"
                                    : "text-gray-500"
                            }`}>
                              Request {booking.status === "pending" ? "Pending" : booking.status === "rejected" || booking.status === "cancelled" ? "Rejected" : "Accepted"}
                            </p>
                          </div>
                        </div>

                        {/* Inspection */}
                        <div className="relative flex items-start gap-3">
                          <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                            booking.inspection_done || booking.status === "service_pending" || booking.status === "additional_services_pending" || booking.status === "additional_services_accepted" || booking.status === "additional_services_rejected" || booking.status === "ready_for_pickup" || booking.status === "completed"
                              ? "bg-green-500" 
                              : booking.status === "confirmed" 
                                ? "bg-blue-500" 
                                : "bg-gray-300"
                          }`}>
                            {booking.inspection_done || ["service_pending", "additional_services_pending", "additional_services_accepted", "additional_services_rejected", "ready_for_pickup", "completed"].includes(booking.status) ? (
                              <span className="text-white text-xs">✓</span>
                            ) : booking.status === "confirmed" ? (
                              <span className="text-white text-xs">3</span>
                            ) : (
                              <span className="text-white text-xs">-</span>
                            )}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className={`text-sm font-medium ${
                              booking.inspection_done || ["service_pending", "additional_services_pending", "additional_services_accepted", "additional_services_rejected", "ready_for_pickup", "completed"].includes(booking.status)
                                ? "text-green-600" 
                                : booking.status === "confirmed" 
                                  ? "text-blue-600" 
                                  : "text-gray-500"
                            }`}>
                              Inspection {booking.inspection_done ? "Completed" : booking.status === "confirmed" ? "In Progress" : "Pending"}
                            </p>
                          </div>
                        </div>

                        {/* Service */}
                        <div className="relative flex items-start gap-3">
                          <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                            booking.status === "service_pending" || booking.status === "additional_services_pending" || booking.status === "additional_services_accepted" || booking.status === "additional_services_rejected" || booking.status === "ready_for_pickup" || booking.status === "completed"
                              ? "bg-green-500" 
                              : booking.inspection_done 
                                ? "bg-blue-500" 
                                : "bg-gray-300"
                          }`}>
                            {["service_pending", "additional_services_pending", "additional_services_accepted", "additional_services_rejected", "ready_for_pickup", "completed"].includes(booking.status) ? (
                              <span className="text-white text-xs">✓</span>
                            ) : booking.inspection_done ? (
                              <span className="text-white text-xs">4</span>
                            ) : (
                              <span className="text-white text-xs">-</span>
                            )}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className={`text-sm font-medium ${
                              ["service_pending", "additional_services_pending", "additional_services_accepted", "additional_services_rejected", "ready_for_pickup", "completed"].includes(booking.status)
                                ? "text-green-600" 
                                : booking.inspection_done 
                                  ? "text-blue-600" 
                                  : "text-gray-500"
                            }`}>
                              Service {["service_pending", "additional_services_pending", "additional_services_accepted", "additional_services_rejected", "ready_for_pickup", "completed"].includes(booking.status) ? "In Progress" : booking.inspection_done ? "Starting" : "Pending"}
                            </p>
                          </div>
                        </div>

                        {/* Ready for Pickup */}
                        <div className="relative flex items-start gap-3">
                          <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                            booking.vehicle_ready || booking.status === "ready_for_pickup" || booking.status === "completed"
                              ? "bg-green-500" 
                              : booking.status === "additional_services_accepted" || booking.status === "additional_services_rejected"
                                ? "bg-blue-500" 
                                : "bg-gray-300"
                          }`}>
                            {booking.vehicle_ready || booking.status === "ready_for_pickup" || booking.status === "completed" ? (
                              <span className="text-white text-xs">✓</span>
                            ) : booking.status === "additional_services_accepted" || booking.status === "additional_services_rejected" ? (
                              <span className="text-white text-xs">5</span>
                            ) : (
                              <span className="text-white text-xs">-</span>
                            )}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className={`text-sm font-medium ${
                              booking.vehicle_ready || booking.status === "ready_for_pickup" || booking.status === "completed"
                                ? "text-green-600" 
                                : booking.status === "additional_services_accepted" || booking.status === "additional_services_rejected"
                                  ? "text-blue-600" 
                                  : "text-gray-500"
                            }`}>
                              {booking.vehicle_ready || booking.status === "ready_for_pickup" || booking.status === "completed" ? "Ready for Pickup" : "Awaiting Completion"}
                            </p>
                          </div>
                        </div>

                        {/* Pickup Pending (for pickup requests) - after Ready for Pickup, before Inspection/Service */}
                        {booking.request_type === "pickup" && booking.status === "ready_for_pickup" && !booking.pickup_arrived && (
                          <div className="relative flex items-start gap-3">
                            <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500">
                              <span className="text-white text-xs">⏳</span>
                            </div>
                            <div className="flex-1 pt-1">
                              <p className="text-sm font-medium text-yellow-600">Pickup Pending</p>
                              <p className="text-xs text-muted-foreground">Waiting for garage to arrive at your location</p>
                            </div>
                          </div>
                        )}

                        {/* Pickup In Progress: Show OTP */}
                        {booking.request_type === "pickup" && booking.status === "pickup_in_progress" && (
                          <div className="relative flex items-start gap-3">
                            <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                              <span className="text-white text-xs">🔒</span>
                            </div>
                            <div className="flex-1 pt-1">
                              <p className="text-sm font-medium text-blue-600">Pickup In Progress</p>
                              <p className="text-xs text-muted-foreground">Share this OTP with the garage to validate pickup:</p>
                              <span className="font-mono text-lg bg-blue-100 px-2 py-1 rounded mt-1 inline-block">{booking.pickup_otp || "----"}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm border-t pt-4">
                    <p>
                      <strong>Date:</strong> {new Date(booking.booking_date).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Time:</strong> {booking.start_time} - {booking.end_time}
                    </p>
                    <p>
                      <strong>Vehicle:</strong> {booking.car.registration_number}
                    </p>
                    <p>
                      <strong>Service:</strong> {booking.service_type || "General Service"}
                    </p>
                    <p>
                      <strong>Phone:</strong> {booking.garage.phone}
                    </p>
                    {booking.additional_services && booking.additional_services.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <strong className="block mb-2">Additional Services Suggested:</strong>
                        <ul className="list-disc list-inside space-y-1">
                          {booking.additional_services.map((service: any, idx: number) => (
                            <li key={idx} className="text-sm">
                              {service.name} - ₹{service.price?.toLocaleString()}
                              {service.description && <span className="text-muted-foreground"> ({service.description})</span>}
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm font-medium mt-2">
                          Total Additional Cost: ₹
                          {booking.additional_services
                            .reduce((sum: number, s: any) => sum + (s.price || 0), 0)
                            .toLocaleString()}
                        </p>
                        {booking.additional_services_status === "pending" && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptAdditionalServices(booking.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectAdditionalServices(booking.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {booking.additional_services_status === "accepted" && (
                          <p className="text-green-600 font-medium mt-2">✓ You have accepted the additional services</p>
                        )}
                        {booking.additional_services_status === "rejected" && (
                          <p className="text-red-600 font-medium mt-2">✗ You have rejected the additional services</p>
                        )}
                      </div>
                    )}
                    {booking.vehicle_ready && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-green-700 font-medium">✓ Your vehicle is ready for pickup!</p>
                      </div>
                    )}
                    {booking.status === "delivery_pending" && (
                      <Dialog open={selectedDeliveryBooking?.id === booking.id}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            className="mt-3 w-full"
                            onClick={() => {
                              setSelectedDeliveryBooking(booking)
                              setDeliveryOtpInput("")
                            }}
                          >
                            Enter Delivery OTP
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Delivery</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Enter the OTP provided by the delivery personnel to confirm delivery:</p>
                            <Input
                              type="text"
                              placeholder="Enter 6-digit OTP"
                              value={deliveryOtpInput}
                              onChange={(e) => setDeliveryOtpInput(e.target.value)}
                              maxLength={6}
                            />
                            <Button
                              onClick={async () => {
                                const supabase = getSupabaseClient()
                                const { error } = await supabase
                                  .from("bookings")
                                  .update({ status: "delivered" })
                                  .eq("id", booking.id)
                                if (!error) {
                                  setBookings(bookings.map((b) => (b.id === booking.id ? { ...b, status: "delivered" } : b)))
                                  setSelectedDeliveryBooking(null)
                                  setDeliveryOtpInput("")
                                  alert("Delivery confirmed! Your order has been marked as delivered.")
                                } else {
                                  alert("Error confirming delivery: " + error.message)
                                }
                              }}
                            >
                              Confirm Delivery
                            </Button>
                            <Button variant="outline" onClick={() => setSelectedDeliveryBooking(null)}>
                              Cancel
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {booking.status === "delivered" && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-green-700 font-medium">✓ Order Delivered!</p>
                      </div>
                    )}
                    {booking.notes && (
                      <p>
                        <strong>Notes:</strong> {booking.notes}
                      </p>
                    )}
                  </div>
                  {booking.status === "pending" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="mt-4"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      Cancel Booking
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
