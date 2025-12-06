"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { getCarBrandLogo } from "@/lib/utils/car-logos"
import { calculateDistance } from "@/lib/utils/distance"

export default function DiscoverGarages() {
  const router = useRouter()
  const [customerCars, setCustomerCars] = useState<any[]>([])
  const [garages, setGarages] = useState<any[]>([])
  const [garagesWithDistance, setGaragesWithDistance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCar, setSelectedCar] = useState<any>(null)
  const [customerLocation, setCustomerLocation] = useState<any>(null)

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

      // Fetch customer and their cars
      const { data: customerData } = await supabase.from("customers").select("*").eq("user_id", user.id).single()

      if (customerData) {
        const { data: carsData } = await supabase.from("customer_cars").select("*").eq("customer_id", customerData.id)
        setCustomerCars(carsData || [])

        // Store customer location for distance calculation
        setCustomerLocation({
          latitude: customerData.latitude,
          longitude: customerData.longitude,
        })
      }

      // Fetch all garages with their services
      const { data: garagesData } = await supabase.from("garages").select(`
          *,
          garage_services(car_brand, car_model)
        `)

      setGarages(garagesData || [])
      setLoading(false)
    }

    fetchData()
  }, [router])

  const filteredGarages = useMemo(() => {
    if (!selectedCar) return []
    return garages.filter((garage) => {
      const garageServices = garage.garage_services || []
      return garageServices.some(
        (service: any) =>
          service.car_brand.toLowerCase() === selectedCar.brand.toLowerCase() &&
          (service.car_model === selectedCar.model || service.car_model == null),
      )
    })
  }, [garages, selectedCar])

  // Calculate distances and sort by nearest
  useEffect(() => {
    if (filteredGarages.length > 0 && customerLocation?.latitude && customerLocation?.longitude) {
      const garagesWithDist = filteredGarages.map((garage) => ({
        ...garage,
        distance: calculateDistance(
          customerLocation.latitude,
          customerLocation.longitude,
          garage.latitude || 0,
          garage.longitude || 0,
        ),
      }))

      garagesWithDist.sort((a, b) => a.distance - b.distance)
      setGaragesWithDistance(garagesWithDist)
    } else {
      setGaragesWithDistance(filteredGarages)
    }
  }, [filteredGarages, customerLocation])

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
          <h1 className="text-2xl font-bold mt-4">Find Services for Your Car</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {customerCars.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">No vehicles added yet</p>
              <Link href="/customer/profile">
                <Button>Add Your First Vehicle</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Step 1: Car Selection */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Select Your Vehicle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerCars.map((car) => (
                  <Card
                    key={car.id}
                    className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${
                      selectedCar?.id === car.id 
                        ? "ring-2 ring-primary shadow-lg scale-105 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10" 
                        : "hover:shadow-lg hover:scale-102 border-2 hover:border-primary/20"
                    }`}
                    onClick={() => setSelectedCar(car)}
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
                          <p className="font-bold text-lg text-foreground truncate">
                            {car.brand}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground truncate">
                            {car.model}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            {car.year && <span className="px-2 py-1 bg-muted rounded-md">{car.year}</span>}
                            <span className="px-2 py-1 bg-muted rounded-md font-mono">{car.registration_number}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {selectedCar && (
                <Button variant="outline" onClick={() => setSelectedCar(null)} className="mt-4">
                  Change Vehicle
                </Button>
              )}
            </div>

            {/* Step 2: Compatible Garages */}
            {selectedCar && (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Available Garages for {selectedCar.brand} {selectedCar.model}
                </h2>
                {garagesWithDistance.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">
                        No garages found that service {selectedCar.brand} {selectedCar.model} vehicles
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {garagesWithDistance.map((garage) => (
                      <Card key={garage.id} className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 overflow-hidden relative">
                        {garage.distance && (
                          <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                            ~{garage.distance.toFixed(1)} km
                          </div>
                        )}
                        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                          <CardTitle className="text-xl">{garage.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-6">
                          <div className="text-sm space-y-1">
                            <p>
                              <strong>Address:</strong> {garage.address}
                            </p>
                            <p>
                              <strong>Phone:</strong> {garage.phone || "N/A"}
                            </p>
                            <p>
                              <strong>Hours:</strong> {garage.opening_time} - {garage.closing_time}
                            </p>
                            <p>
                              <strong>Capacity:</strong> {garage.cars_per_hour} cars/hour
                            </p>
                            {garage.description && (
                              <p>
                                <strong>About:</strong> {garage.description}
                              </p>
                            )}
                            <p>
                              <strong>Services:</strong>{" "}
                              {garage.garage_services
                                ?.map((s: any) => `${s.car_brand}${s.car_model ? ` ${s.car_model}` : ""}`)
                                .join(", ") || "N/A"}
                            </p>
                          </div>
                          <Link
                            href={`/customer/book/${garage.id}?${new URLSearchParams({
                              selectedCarId: selectedCar.id,
                            }).toString()}`}
                          >
                            <Button className="w-full">Book Service</Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
