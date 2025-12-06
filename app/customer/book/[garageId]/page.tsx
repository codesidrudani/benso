"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { generateTimeSlots } from "@/lib/utils/booking-helpers"
import { getCarBrandLogo } from "@/lib/utils/car-logos"

const SERVICE_TYPES = {
  basic: { label: "Basic Service", duration: 2, price: 2000 },
  standard: { label: "Standard Service", duration: 4, price: 4000 },
}

export default function BookService() {
  const router = useRouter()
  const params = useParams()
  const garageId = params.garageId as string

  const [garage, setGarage] = useState<any>(null)
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<"car" | "service" | "time" | "request_type">("car")
  const [selectedCar, setSelectedCar] = useState<string>("")
  const [selectedService, setSelectedService] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [requestType, setRequestType] = useState<"walk_in" | "pickup" | "">("")
  const [booking_date, setBookingDate] = useState<string>("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Fetch garage
      const { data: garageData } = await supabase.from("garages").select("*").eq("id", garageId).single()
      setGarage(garageData)

      // Fetch customer cars
      const { data: customerData } = await supabase.from("customers").select("id").eq("user_id", user.id).single()

      if (customerData) {
        const { data: carsData } = await supabase.from("customer_cars").select("*").eq("customer_id", customerData.id)
        setCars(carsData || [])
        // If a selectedCarId was passed via query params, preselect it and advance step
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search)
          const selectedCarId = params.get("selectedCarId")
          if (selectedCarId) {
            // Only set if the car exists in customer's cars
            const exists = (carsData || []).some((c: any) => String(c.id) === String(selectedCarId))
            if (exists) {
              setSelectedCar(selectedCarId)
              setStep("service")
            }
          }
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [garageId, router])

  const handleProceedToPayment = () => {
    if (!booking_date || !selectedService || !selectedTime || !requestType) {
      alert("Please complete all steps")
      return
    }

    const supabase = getSupabaseClient()
    const serviceDuration = SERVICE_TYPES[selectedService as keyof typeof SERVICE_TYPES].duration
    const startDate = new Date(`2000-01-01T${selectedTime}`)
    const endDate = new Date(startDate.getTime() + serviceDuration * 60 * 60000)
    const endTime = endDate.toTimeString().slice(0, 5)

    // Prepare booking data to pass to payment page
    const bookingData = {
      garage_id: garageId,
      car_id: selectedCar,
      booking_date,
      start_time: selectedTime,
      end_time: endTime,
      service_type: selectedService,
      request_type: requestType,
    }

    // Redirect to payment page
    router.push(
      `/customer/book/${garageId}/payment?${new URLSearchParams({
        serviceType: selectedService,
        bookingData: encodeURIComponent(JSON.stringify(bookingData)),
      }).toString()}`
    )
  }

  const handleDateChange = async (date: string) => {
    setBookingDate(date)

    if (!selectedService || !garage) return

    // Check if garage has opening and closing times set
    if (!garage.opening_time || !garage.closing_time) {
      alert("This garage hasn't set their operating hours. Please contact them directly.")
      setAvailableSlots([])
      return
    }

    const supabase = getSupabaseClient()
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("garage_id", garageId)
      .eq("booking_date", date)
      .in("status", [
        "pending",
        "confirmed",
        "inspection_pending",
        "inspection_done",
        "additional_services_pending",
        "additional_services_accepted",
        "ready_for_pickup",
      ])

    const serviceDuration = SERVICE_TYPES[selectedService as keyof typeof SERVICE_TYPES].duration
    
    try {
      console.log("Generating slots with:", {
        opening_time: garage.opening_time,
        closing_time: garage.closing_time,
        serviceDuration,
        existingBookings: bookingsData?.length || 0,
        carsPerHour: garage.cars_per_hour || 2,
      })

      const slots = generateTimeSlots(
        garage.opening_time,
        garage.closing_time,
        serviceDuration,
        bookingsData || [],
        garage.cars_per_hour || 2,
      )

      console.log("Generated slots:", slots)
      setAvailableSlots(slots)
    } catch (error) {
      console.error("Error generating time slots:", error)
      alert("Error generating time slots. Please try again.")
      setAvailableSlots([])
    }
    
    setSelectedTime("")
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!garage) {
    return <div className="flex items-center justify-center h-screen">Garage not found</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/customer/discover" className="text-primary hover:underline">
            ← Back to Garages
          </Link>
          <h1 className="text-2xl font-bold mt-4">Book Service at {garage.name}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Car Selection */}
        {step === "car" && (
          <div>
            <h2 className="text-xl font-bold mb-6">Step 1: Select Your Vehicle</h2>
            {cars.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground mb-4">No vehicles found</p>
                  <Link href="/customer/profile">
                    <Button>Add Vehicle</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {cars.map((car) => (
                  <Card
                    key={car.id}
                    className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${
                      selectedCar === car.id 
                        ? "ring-2 ring-primary shadow-lg scale-105 border-primary/30" 
                        : "hover:shadow-lg hover:scale-102 border-2 hover:border-primary/20"
                    }`}
                    onClick={() => setSelectedCar(car.id)}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
                      <img
                        src={getCarBrandLogo(car.brand)}
                        alt={car.brand}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                    <CardContent className="pt-6 relative">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-2 border-primary/20 shrink-0">
                          <img
                            src={getCarBrandLogo(car.brand)}
                            alt={car.brand}
                            className="w-12 h-12 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-logo.svg'
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg text-foreground truncate">{car.brand}</p>
                          <p className="text-sm font-medium text-muted-foreground truncate">{car.model}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground font-mono">{car.registration_number}</p>
                            {car.year && <p className="text-xs text-muted-foreground">Year: {car.year}</p>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Button onClick={() => setStep("service")} disabled={!selectedCar} className="w-full md:w-auto">
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Service Type Selection */}
        {step === "service" && (
          <div>
            <h2 className="text-xl font-bold mb-6">Step 2: Select Service Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {Object.entries(SERVICE_TYPES).map(([key, service]) => (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${
                    selectedService === key 
                      ? "ring-2 ring-primary shadow-lg scale-105 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10" 
                      : "hover:shadow-lg hover:scale-102 border-2 hover:border-primary/20"
                  }`}
                  onClick={() => {
                    setSelectedService(key)
                    setSelectedTime("")
                    setAvailableSlots([])
                  }}
                >
                  <CardContent className="pt-6">
                    <p className="font-bold text-xl mb-2">{service.label}</p>
                    <p className="text-sm text-muted-foreground mb-3">Duration: {service.duration} hours</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-primary">₹{service.price.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">one-time</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex gap-4">
              <Button onClick={() => setStep("car")} variant="outline">
                Back
              </Button>
              <Button onClick={() => setStep("time")} disabled={!selectedService}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Date and Time Slot Selection */}
        {step === "time" && (
          <div>
            <h2 className="text-xl font-bold mb-6">Step 3: Select Date & Time Slot</h2>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <input
                      type="date"
                      value={booking_date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full border rounded-md p-2 mt-2"
                    />
                  </div>

                  {booking_date && availableSlots.length > 0 && (
                    <div>
                      <label className="text-sm font-medium block mb-3">Available Time Slots</label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTime === slot ? "default" : "outline"}
                            onClick={() => setSelectedTime(slot)}
                            className="text-sm"
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {booking_date && availableSlots.length === 0 && (
                    <p className="text-sm text-red-500">
                      No available slots for this date. Please select another date.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button onClick={() => setStep("service")} variant="outline">
                Back
              </Button>
              <Button onClick={() => setStep("request_type")} disabled={!selectedTime}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Request Type Selection */}
        {step === "request_type" && (
          <div>
            <h2 className="text-xl font-bold mb-6">Step 4: Select Request Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card
                className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${
                  requestType === "walk_in" 
                    ? "ring-2 ring-primary shadow-lg scale-105 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10" 
                    : "hover:shadow-lg hover:scale-102 border-2 hover:border-primary/20"
                }`}
                onClick={() => setRequestType("walk_in")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Walk-In</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Bring your vehicle to the garage at the scheduled time
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${
                  requestType === "pickup" 
                    ? "ring-2 ring-primary shadow-lg scale-105 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10" 
                    : "hover:shadow-lg hover:scale-102 border-2 hover:border-primary/20"
                }`}
                onClick={() => setRequestType("pickup")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Pickup Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    We will pick up your vehicle from your location
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service:</span>
                      <span className="font-medium capitalize">
                        {SERVICE_TYPES[selectedService as keyof typeof SERVICE_TYPES].label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{new Date(booking_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-primary">
                        ₹{SERVICE_TYPES[selectedService as keyof typeof SERVICE_TYPES].price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => setStep("time")} variant="outline">
                Back
              </Button>
              <Button onClick={handleProceedToPayment} disabled={!requestType} size="lg" className="flex-1">
                Proceed to Payment
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
