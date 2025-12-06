"use client"

import { useEffect, useState } from "react"
import { User } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { validateRegistrationNumber, formatRegistrationNumber } from "@/lib/utils/validation"
import { CAR_BRANDS, getModelsForBrand } from "@/lib/utils/car-data"
import { getCarBrandLogo } from "@/lib/utils/car-logos"
import LocationPicker from "@/components/location-picker"

export default function CustomerProfile() {
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCar, setShowAddCar] = useState(false)
  const [registrationError, setRegistrationError] = useState("")
  const [editingLocation, setEditingLocation] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
  })
  const [phoneError, setPhoneError] = useState("")

  const [carFormData, setCarFormData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    registration_number: "",
  })

  const [locationData, setLocationData] = useState({
    latitude: 0,
    longitude: 0,
  })

  const availableModels = carFormData.brand ? getModelsForBrand(carFormData.brand) : []

  useEffect(() => {
    const fetchCustomerData = async () => {
      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Fetch customer data
      const { data: customerData } = await supabase.from("customers").select("*").eq("user_id", user.id).single()

      setCustomer(customerData)

      if (customerData) {
        // Initialize profile form
        setProfileForm({
          full_name: customerData.full_name || "",
          phone: customerData.phone || "",
        })
        // Fetch cars
        const { data: carsData } = await supabase.from("customer_cars").select("*").eq("customer_id", customerData.id)

        setCars(carsData || [])

        // Initialize location data
        setLocationData({
          latitude: customerData.latitude || 0,
          longitude: customerData.longitude || 0,
        })
      }

      setLoading(false)
    }

    fetchCustomerData()
  }, [router])

  const handleAddCar = async () => {
    if (!customer) return

    setRegistrationError("")

    if (!validateRegistrationNumber(carFormData.registration_number)) {
      setRegistrationError(
        "Invalid registration format. Expected: 2 state letters + 2 numbers + 2 letters + 4 numbers (e.g., KA01AB1234)",
      )
      return
    }

    const supabase = getSupabaseClient()
    const { data: newCar, error } = await supabase
      .from("customer_cars")
      .insert({
        customer_id: customer.id,
        ...carFormData,
        registration_number: formatRegistrationNumber(carFormData.registration_number),
      })
      .select()

    if (!error && newCar) {
      setCars([...cars, newCar[0]])
      setCarFormData({
        brand: "",
        model: "",
        year: new Date().getFullYear(),
        registration_number: "",
      })
      setShowAddCar(false)
    }
  }

  const handleDeleteCar = async (carId: string) => {
    const supabase = getSupabaseClient()
    await supabase.from("customer_cars").delete().eq("id", carId)
    setCars(cars.filter((c) => c.id !== carId))
  }

  const handleLocationSelect = async (lat: number, lng: number, address: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("customers")
      .update({
        latitude: lat,
        longitude: lng,
        address: address,
      })
      .eq("id", customer.id)

    if (!error) {
      setCustomer({ ...customer, latitude: lat, longitude: lng, address })
      setEditingLocation(false)
    } else {
      alert("Error saving location")
    }
  }

  const handleSaveProfile = async () => {
    if (!customer) return
    // Validate phone: if provided, must be exactly 10 digits
    if (profileForm.phone && !/^\d{10}$/.test(String(profileForm.phone))) {
      setPhoneError("Phone number must be 10 digits")
      return
    }
    setPhoneError("")
    const supabase = getSupabaseClient()
    const { error } = await supabase.from("customers").update({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
    }).eq("id", customer.id)

    if (!error) {
      setCustomer({ ...customer, full_name: profileForm.full_name, phone: profileForm.phone })
      setEditingProfile(false)
    } else {
      alert("Error saving profile")
    }
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
          <h1 className="text-2xl font-bold mt-4 flex items-center gap-2"><User size={22} />My Profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Profile Info */}
          <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><User size={16} />Profile Information</CardTitle>
                <div>
                  {!editingProfile ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)}>Edit</Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleSaveProfile}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingProfile(false); setProfileForm({ full_name: customer?.full_name || "", phone: customer?.phone || "" }) }}>Cancel</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {!editingProfile ? (
                  <>
                    <p>
                      <strong>Name:</strong> {customer?.full_name}
                    </p>
                    <p>
                      <strong>Phone:</strong> {customer?.phone || "Not set"}
                    </p>
                    <p>
                      <strong>Address:</strong> {customer?.address || "Not set"}
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium">Full Name</label>
                      <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="mt-1" />
                      {phoneError && <p className="text-destructive text-xs mt-1">{phoneError}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
          </Card>

        <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">My Vehicles</h2>
              <Button onClick={() => setShowAddCar(!showAddCar)}>{showAddCar ? "Cancel" : "Add Vehicle"}</Button>
            </div>

            {showAddCar && (
              <Card className="mb-4">
                <CardContent className="pt-6 space-y-4">
                  <Select
                    value={carFormData.brand}
                    onValueChange={(value) => setCarFormData({ ...carFormData, brand: value, model: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select car brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAR_BRANDS.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={carFormData.model}
                    onValueChange={(value) => setCarFormData({ ...carFormData, model: value })}
                    disabled={!carFormData.brand}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={carFormData.brand ? "Select model" : "Select a brand first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder="Year"
                    value={carFormData.year}
                    onChange={(e) => setCarFormData({ ...carFormData, year: Number.parseInt(e.target.value) })}
                  />
                  <div>
                    <Input
                      placeholder="Registration Number (e.g., KA01AB1234)"
                      value={carFormData.registration_number}
                      onChange={(e) => {
                        setCarFormData({ ...carFormData, registration_number: e.target.value })
                        setRegistrationError("")
                      }}
                    />
                    {registrationError && <p className="text-destructive text-xs mt-1">{registrationError}</p>}
                  </div>
                  <Button onClick={handleAddCar} className="w-full">
                    Add Vehicle
                  </Button>
                </CardContent>
              </Card>
            )}

            {cars.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No vehicles added yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cars.map((car) => (
                  <Card key={car.id} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                    <div className="absolute top-2 right-2 w-16 h-16 opacity-10">
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
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20">
                              <img
                                src={getCarBrandLogo(car.brand)}
                                alt={car.brand}
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-logo.svg'
                                }}
                              />
                            </div>
                            <div>
                              <p className="font-bold text-lg text-foreground">
                                {car.brand}
                              </p>
                              <p className="text-sm font-medium text-muted-foreground">
                                {car.model}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            {car.year && <span className="px-2 py-1 bg-muted rounded-md">{car.year}</span>}
                            <span className="px-2 py-1 bg-muted rounded-md font-mono">{car.registration_number}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCar(car.id)} className="shrink-0">
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Home Location */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Home Location</CardTitle>
              {!editingLocation && (customer?.latitude && customer?.longitude) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingLocation(true)}
                >
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {editingLocation ? (
                <>
                  <LocationPicker
                    onLocationSelect={handleLocationSelect}
                    initialLat={customer?.latitude || 0}
                    initialLng={customer?.longitude || 0}
                    initialAddress={customer?.address}
                    title="Set Home Location"
                  />
                </>
              ) : (
                <div className="space-y-2 text-sm">
                  {customer?.latitude && customer?.longitude ? (
                    <>
                      <p>
                        <strong>Latitude:</strong> {customer.latitude.toFixed(4)}
                      </p>
                      <p>
                        <strong>Longitude:</strong> {customer.longitude.toFixed(4)}
                      </p>
                      <p>
                        <strong>Address:</strong> {customer.address || "Not set"}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setEditingLocation(true)}
                      >
                        Change Location
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">Location not set yet</p>
                      <Button
                        className="w-full"
                        onClick={() => setEditingLocation(true)}
                      >
                        Set Home Location
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
