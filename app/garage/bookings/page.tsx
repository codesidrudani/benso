"use client"

import { useEffect, useState } from "react"
import { CalendarIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { format } from "date-fns"
import { getCarBrandLogo } from "@/lib/utils/car-logos"
import MapComponent from "@/components/map-component"

type FilterType =
  | "all"
  | "pending_request"
  | "pickup_pending"
  | "service_pending"
  | "delivery_pending"
  | "upcoming_orders"
  | "rejected_orders"

export default function GarageBookings() {
  const router = useRouter()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [additionalServiceName, setAdditionalServiceName] = useState("")
  const [additionalServicePrice, setAdditionalServicePrice] = useState("")
  const [additionalServiceDescription, setAdditionalServiceDescription] = useState("")
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false)
  const [showPickupDialog, setShowPickupDialog] = useState(false)
  const [pickupBooking, setPickupBooking] = useState<any>(null)
  const [otpInput, setOtpInput] = useState("")

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

        // Get garage
        const { data: garageData } = await supabase.from("garages").select("id").eq("user_id", user.id).single()

        if (garageData) {
          // Get bookings (include customer location fields for pickup flow)
          const { data: bookingsData } = await supabase
            .from("bookings")
            .select(`
              *,
              customer:customers(full_name, latitude, longitude, address, phone),
              car:customer_cars(brand, model, registration_number)
            `)
            .eq("garage_id", garageData.id)
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

  const handleAcceptRequest = async (bookingId: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId)

    if (!error) {
      setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, status: "confirmed" } : b)))
    }
  }

  const handleRejectRequest = async (bookingId: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from("bookings").update({ status: "rejected" }).eq("id", bookingId)

    if (!error) {
      setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, status: "rejected" } : b)))
    }
  }

  const handleMarkInspectionDone = async (bookingId: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("bookings")
      .update({ inspection_done: true, status: "service_pending" })
      .eq("id", bookingId)

    if (!error) {
      setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, inspection_done: true, status: "service_pending" } : b)))
    }
  }

  const handleAddAdditionalService = async () => {
    if (!selectedBooking || !additionalServiceName || !additionalServicePrice) {
      alert("Please fill in service name and price")
      return
    }

    const supabase = getSupabaseClient()
    const newService = {
      name: additionalServiceName,
      price: parseFloat(additionalServicePrice),
      description: additionalServiceDescription,
    }

    const existingServices = selectedBooking.additional_services || []
    const updatedServices = [...existingServices, newService]

    const { error } = await supabase
      .from("bookings")
      .update({
        additional_services: updatedServices,
        additional_services_status: "pending",
        status: "additional_services_pending",
      })
      .eq("id", selectedBooking.id)

    if (!error) {
      setBookings(
        bookings.map((b) =>
          b.id === selectedBooking.id
            ? {
                ...b,
                additional_services: updatedServices,
                additional_services_status: "pending",
                status: "additional_services_pending",
              }
            : b
        )
      )
      setShowAddServiceDialog(false)
      setAdditionalServiceName("")
      setAdditionalServicePrice("")
      setAdditionalServiceDescription("")
      setSelectedBooking(null)
    } else {
      alert("Error adding service: " + error.message)
    }
  }

  const handleMarkVehicleReady = async (bookingId: string) => {
    const supabase = getSupabaseClient()
    const booking = bookings.find((b) => b.id === bookingId)

    if (!booking) {
      alert("Booking not found")
      return
    }

    // Only allow if customer has responded to additional services
    if (booking.additional_services && booking.additional_services.length > 0) {
      if (!booking.additional_services_status || booking.additional_services_status === "pending") {
        alert("Please wait for customer to respond to additional services")
        return
      }
    }

    // Generate a random 6-digit delivery OTP
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString()

    const { error } = await supabase
      .from("bookings")
      .update({ vehicle_ready: true, status: "delivery_pending", delivery_otp: deliveryOtp })
      .eq("id", bookingId)

    if (!error) {
      setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, vehicle_ready: true, status: "delivery_pending", delivery_otp: deliveryOtp } : b)))
      alert("Vehicle marked ready for delivery! OTP: " + deliveryOtp)
    } else {
      alert("Error marking vehicle ready: " + error.message)
    }
  }

  const openPickupDialog = (booking: any) => {
    if (!booking?.customer?.latitude || !booking?.customer?.longitude) {
      alert("Customer location not available")
      return
    }
    setPickupBooking(booking)
    setShowPickupDialog(true)
  }

  const handleArrivedAtLocation = async (bookingId: string) => {
    const supabase = getSupabaseClient()
    const now = new Date().toISOString()
    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const { error } = await supabase
      .from("bookings")
      .update({ status: "pickup_in_progress", pickup_arrived: true, pickup_arrived_at: now, pickup_otp: otp })
      .eq("id", bookingId)

    if (!error) {
      setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, status: "pickup_in_progress", pickup_arrived: true, pickup_arrived_at: now, pickup_otp: otp } : b)))
      setShowPickupDialog(false)
      setPickupBooking(null)
    } else {
      alert("Error updating booking: " + error.message)
    }
  }

  const getFilteredBookings = () => {
    let filtered = [...bookings]
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Filter by date if selected
    if (selectedDate) {
      const selected = new Date(selectedDate)
      selected.setHours(0, 0, 0, 0)
      filtered = filtered.filter((booking) => {
        const bookingDate = new Date(booking.booking_date)
        bookingDate.setHours(0, 0, 0, 0)
        return bookingDate.getTime() === selected.getTime()
      })
    }

    // Filter by status type
    switch (activeFilter) {
      case "pending_request":
        filtered = filtered.filter((b) => b.status === "pending")
        break
      case "pickup_pending":
        filtered = filtered.filter((b) => {
          const bookingDate = new Date(b.booking_date)
          bookingDate.setHours(0, 0, 0, 0)
          return b.status === "confirmed" && bookingDate > today
        })
        break
      case "service_pending":
        filtered = filtered.filter((b) => {
          return b.status === "service_pending"
        })
        break
      case "delivery_pending":
        filtered = filtered.filter((b) => {
          const bookingDate = new Date(b.booking_date)
          bookingDate.setHours(0, 0, 0, 0)
          return b.status === "ready_for_pickup"
        })
        break
      case "upcoming_orders":
        filtered = filtered.filter((b) => {
          const bookingDate = new Date(b.booking_date)
          bookingDate.setHours(0, 0, 0, 0)
          return bookingDate > today && b.status !== "rejected" && b.status !== "cancelled"
        })
        break
      case "rejected_orders":
        filtered = filtered.filter((b) => b.status === "rejected" || b.status === "cancelled")
        break
      default:
        // "all" - no additional filtering
        break
    }

    return filtered
  }

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return bookings.filter((b) => {
      const bookingDate = new Date(b.booking_date)
      return format(bookingDate, "yyyy-MM-dd") === dateStr
    })
  }

  const datesWithBookings = bookings.map((b) => {
    const date = new Date(b.booking_date)
    date.setHours(0, 0, 0, 0)
    return date
  })

  const filterCards = [
    { id: "all" as FilterType, label: "All Bookings", count: bookings.length },
    {
      id: "pending_request" as FilterType,
      label: "Pending Request",
      count: bookings.filter((b) => b.status === "pending").length,
    },
    {
      id: "pickup_pending" as FilterType,
      label: "Pickup Pending",
      count: bookings.filter((b) => {
        const bookingDate = new Date(b.booking_date)
        bookingDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return b.status === "confirmed" && bookingDate > today
      }).length,
    },
    {
      id: "service_pending" as FilterType,
      label: "Service Pending",
      count: bookings.filter((b) => b.status === "service_pending").length,
    },
    {
      id: "delivery_pending" as FilterType,
      label: "Delivery Pending",
      count: bookings.filter((b) => b.status === "ready_for_pickup").length,
    },
    {
      id: "upcoming_orders" as FilterType,
      label: "Upcoming Orders",
      count: bookings.filter((b) => {
        const bookingDate = new Date(b.booking_date)
        bookingDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return bookingDate > today && b.status !== "rejected" && b.status !== "cancelled"
      }).length,
    },
    {
      id: "rejected_orders" as FilterType,
      label: "Rejected Orders",
      count: bookings.filter((b) => b.status === "rejected" || b.status === "cancelled").length,
    },
  ]

  const filteredBookings = getFilteredBookings()

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
          <h1 className="text-2xl font-bold mt-4 flex items-center gap-2"><CalendarIcon size={22} />Garage Bookings</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Calendar View */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    hasBookings: datesWithBookings,
                  }}
                  modifiersClassNames={{
                    hasBookings: "bg-primary/10 text-primary font-semibold",
                  }}
                />
              </div>
              {selectedDate && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(undefined)}>
                    Clear Date Filter
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Showing {getBookingsForDate(selectedDate).length} booking(s) for {format(selectedDate, "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {filterCards.map((filter) => (
              <Card
                key={filter.id}
                className={`cursor-pointer transition-all duration-300 ${
                  activeFilter === filter.id 
                    ? "ring-2 ring-primary shadow-lg scale-105 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30" 
                    : "hover:shadow-md hover:scale-102 border-2 hover:border-primary/20"
                }`}
                onClick={() => setActiveFilter(filter.id)}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <p className={`text-3xl font-bold mb-1 ${
                      activeFilter === filter.id ? "text-primary" : "text-foreground"
                    }`}>
                      {filter.count}
                    </p>
                    <p className={`text-xs font-medium mt-1 ${
                      activeFilter === filter.id ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {filter.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Booking Cards */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {selectedDate
                ? `Bookings for ${format(selectedDate, "MMMM d, yyyy")}`
                : activeFilter !== "all"
                  ? filterCards.find((f) => f.id === activeFilter)?.label
                  : "All Bookings"}{" "}
              ({filteredBookings.length})
            </h2>
            {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No bookings found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
                {filteredBookings.map((booking) => (
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
                            <CardTitle className="mb-1">{booking.customer.full_name}</CardTitle>
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                            booking.status === "confirmed" || booking.status === "ready_for_pickup"
                          ? "bg-green-100 text-green-800"
                          : booking.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                                : booking.status === "service_pending" || booking.status === "additional_services_pending"
                              ? "bg-blue-100 text-blue-800"
                                  : booking.status === "rejected" || booking.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                      }`}
                    >
                          {booking.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Date:</strong> {new Date(booking.booking_date).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Time:</strong> {booking.start_time} - {booking.end_time}
                    </p>
                    <p>
                      <strong>Registration:</strong> {booking.car.registration_number}
                    </p>
                    <p>
                      <strong>Service:</strong> {booking.service_type || "General Service"}
                    </p>
                        {booking.payment_status === "paid" && (
                          <p>
                            <strong>Payment:</strong> ₹{booking.payment_amount?.toLocaleString()} (Paid)
                          </p>
                        )}
                        {booking.additional_services && booking.additional_services.length > 0 && (
                          <div className="mt-3">
                            <strong>Additional Services:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {booking.additional_services.map((service: any, idx: number) => (
                                <li key={idx} className="text-xs">
                                  {service.name} - ₹{service.price?.toLocaleString()}
                                  {service.description && <span className="text-muted-foreground"> ({service.description})</span>}
                                </li>
                              ))}
                            </ul>
                            <p className="text-xs mt-1">
                              Status: <strong>{booking.additional_services_status || "pending"}</strong>
                            </p>
                          </div>
                        )}
                    {booking.notes && (
                      <p>
                        <strong>Notes:</strong> {booking.notes}
                      </p>
                    )}
                  </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                    {booking.status === "pending" && (
                      <>
                            <Button size="sm" onClick={() => handleAcceptRequest(booking.id)}>
                              Accept Request
                        </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectRequest(booking.id)}>
                              Reject Request
                        </Button>
                      </>
                    )}
                        {booking.status === "confirmed" && !booking.inspection_done && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleMarkInspectionDone(booking.id)}
                              disabled={booking.request_type === "pickup" && !booking.pickup_arrived}
                            >
                              Mark {booking.request_type === "walk_in" ? "Walk-In" : "Pickup"} Inspection Done
                            </Button>
                            {booking.request_type === "pickup" && (
                              <Button size="sm" variant="outline" onClick={() => openPickupDialog(booking)}>
                                Show Pickup Location
                              </Button>
                            )}
                          </>
                        )}

                        {/* Pickup In Progress: OTP Validation Dialog */}
                        {booking.request_type === "pickup" && booking.status === "pickup_in_progress" && !booking.inspection_done && (
                          <Dialog open={selectedBooking?.id === booking.id}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                Validate Pickup OTP
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Validate Pickup OTP</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Input
                                  type="text"
                                  placeholder="Enter OTP from customer card"
                                  value={additionalServiceName}
                                  onChange={(e) => setAdditionalServiceName(e.target.value)}
                                />
                                <Button
                                  onClick={async () => {
                                    if (additionalServiceName === booking.pickup_otp) {
                                      await handleMarkInspectionDone(booking.id)
                                      setSelectedBooking(null)
                                    } else {
                                      alert("Invalid OTP. Please check and try again.")
                                    }
                                  }}
                                >
                                  Validate & Proceed to Inspection
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {booking.status === "service_pending" && (
                          <Dialog open={showAddServiceDialog && selectedBooking?.id === booking.id}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedBooking(booking)
                                  setShowAddServiceDialog(true)
                                }}
                              >
                                Add Additional Service
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Additional Service</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Service Name</label>
                                  <Input
                                    value={additionalServiceName}
                                    onChange={(e) => setAdditionalServiceName(e.target.value)}
                                    placeholder="e.g., Brake Pad Replacement"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Price (₹)</label>
                                  <Input
                                    type="number"
                                    value={additionalServicePrice}
                                    onChange={(e) => setAdditionalServicePrice(e.target.value)}
                                    placeholder="2000"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Description (Optional)</label>
                                  <Textarea
                                    value={additionalServiceDescription}
                                    onChange={(e) => setAdditionalServiceDescription(e.target.value)}
                                    placeholder="Additional details about the service..."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={handleAddAdditionalService} className="flex-1">
                                    Add Service
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setShowAddServiceDialog(false)
                                      setSelectedBooking(null)
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {(booking.status === "additional_services_accepted" ||
                          booking.status === "additional_services_rejected" ||
                          (booking.status === "service_pending" && (!booking.additional_services || booking.additional_services.length === 0))) &&
                          !booking.vehicle_ready && (
                            <Button size="sm" onClick={() => handleMarkVehicleReady(booking.id)}>
                              Mark Vehicle Ready for Delivery
                            </Button>
                          )}
                        {booking.vehicle_ready && booking.status === "delivery_pending" && (
                          <span className="text-sm text-green-600 font-medium">Vehicle Ready ✓</span>
                        )}
                        {booking.status === "delivery_pending" && !booking.inspection_done && (
                          <Dialog open={selectedBooking?.id === booking.id}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedBooking(booking)
                                  setOtpInput("")
                                }}
                              >
                                Validate Delivery OTP
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Validate Delivery OTP</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Customer will provide OTP for delivery verification</p>
                                <Input
                                  type="text"
                                  placeholder="Enter OTP from customer"
                                  value={otpInput}
                                  onChange={(e) => setOtpInput(e.target.value)}
                                />
                                <Button
                                  onClick={async () => {
                                    if (otpInput === booking.delivery_otp) {
                                      const supabase = getSupabaseClient()
                                      const { error } = await supabase
                                        .from("bookings")
                                        .update({ status: "delivered" })
                                        .eq("id", booking.id)
                                      if (!error) {
                                        setBookings(bookings.map((b) => (b.id === booking.id ? { ...b, status: "delivered" } : b)))
                                        setSelectedBooking(null)
                                        setOtpInput("")
                                        alert("Delivery confirmed! Order marked as delivered.")
                                      }
                                    } else {
                                      alert("Invalid OTP. Please check and try again.")
                                    }
                                  }}
                                >
                                  Confirm Delivery
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </div>

        {/* Pickup Location Dialog */}
        <Dialog open={showPickupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pickup Location</DialogTitle>
            </DialogHeader>
            <div className="h-96">
              {pickupBooking?.customer?.latitude && (
                <MapComponent
                  initialLat={pickupBooking.customer.latitude}
                  initialLng={pickupBooking.customer.longitude}
                  onLocationSelect={() => {}}
                  draggable={false}
                />
              )}
            </div>
            <div className="mt-4 flex gap-2">
              {pickupBooking?.customer?.latitude && (
                <a
                  className="inline-block"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${pickupBooking.customer.latitude},${pickupBooking.customer.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline">Open in Maps</Button>
                </a>
              )}
              <Button onClick={() => handleArrivedAtLocation(pickupBooking?.id)}>Arrived at Location</Button>
              <Button variant="outline" onClick={() => { setShowPickupDialog(false); setPickupBooking(null) }}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </main>
    </div>
  )
}
