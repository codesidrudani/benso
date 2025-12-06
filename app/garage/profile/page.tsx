"use client"

import { useEffect, useState } from "react"
import { User } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CAR_BRANDS, CAR_MODELS, FUEL_TYPES, getModelsForBrand } from "@/lib/utils/car-data"
import LocationPicker from "@/components/location-picker"

export default function GarageProfile() {
  const router = useRouter()
  const [garage, setGarage] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    opening_time: "09:00",
    closing_time: "18:00",
    cars_per_hour: 2,
    description: "",
    latitude: 0,
    longitude: 0,
  })

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [excludedModels, setExcludedModels] = useState<string[]>([])
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [phoneError, setPhoneError] = useState("")

  useEffect(() => {
    const fetchGarageData = async () => {
      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Fetch garage data
      const { data: garageData } = await supabase.from("garages").select("*").eq("user_id", user.id).single()

      if (garageData) {
        setGarage(garageData)
        setFormData({
          name: garageData.name,
          address: garageData.address,
          phone: garageData.phone || "",
          email: garageData.email || "",
          opening_time: garageData.opening_time || "09:00",
          closing_time: garageData.closing_time || "18:00",
          cars_per_hour: garageData.cars_per_hour,
          description: garageData.description || "",
          latitude: garageData.latitude || 0,
          longitude: garageData.longitude || 0,
        })

        // Fetch services
        const { data: servicesData } = await supabase.from("garage_services").select("*").eq("garage_id", garageData.id)

        if (servicesData) {
          setServices(servicesData)
          const uniqueBrands = Array.from(new Set(servicesData.map((s: any) => s.car_brand as string))) as string[]
          setSelectedBrands(uniqueBrands)

          const includedModels = servicesData.map((s: any) => s.car_model as string).filter((m: string) => m != null)
          const allModelsForBrands: string[] = []
          const processedBrands = new Set<string>(servicesData.map((s: any) => s.car_brand as string))
          processedBrands.forEach((brand: string) => {
            getModelsForBrand(brand).forEach((model: string) => allModelsForBrands.push(model))
          })
          setExcludedModels(allModelsForBrands.filter((model) => !includedModels.includes(model)))
        }
      }

      setLoading(false)
    }

    fetchGarageData()
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Validate phone: if provided, must be exactly 10 digits
      if (formData.phone && !/^\d{10}$/.test(String(formData.phone))) {
        setPhoneError("Phone number must be 10 digits")
        setSaving(false)
        return
      }
      setPhoneError("")
      const supabase = getSupabaseClient()

      // Update garage
      const { error: updateError } = await supabase.from("garages").update(formData).eq("id", garage.id)

      if (updateError) throw updateError

      await supabase.from("garage_services").delete().eq("garage_id", garage.id)

      for (const brand of selectedBrands) {
        const allModels = getModelsForBrand(brand)
        const includedModels = allModels.filter((model) => !excludedModels.includes(model))

        for (const model of includedModels) {
          const { error: serviceError } = await supabase.from("garage_services").insert({
            garage_id: garage.id,
            car_brand: brand,
            car_model: model,
          })
          if (serviceError) throw serviceError
        }
      }

      alert("Profile updated successfully!")
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setSaving(false)
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
          <h1 className="text-2xl font-bold mt-4 flex items-center gap-2"><User size={22} />Garage Profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Manage Your Garage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Garage Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your Garage Name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                />
                {phoneError && <p className="text-destructive text-xs mt-1">{phoneError}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Opening Time</label>
                <Input
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Closing Time</label>
                <Input
                  type="time"
                  value={formData.closing_time}
                  onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                />
              </div>
            </div>

            {!showLocationPicker && (
              <div>
                <label className="text-sm font-medium block mb-2">Garage Location</label>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 mb-2">
                  Lat: {formData.latitude?.toFixed(4)}, Lng: {formData.longitude?.toFixed(4)}
                </div>
                <Button
                  onClick={() => setShowLocationPicker(true)}
                  variant="outline"
                  className="w-full"
                >
                  Set Location on Map
                </Button>
              </div>
            )}
            {showLocationPicker && (
              <LocationPicker
                onLocationSelect={(lat, lng) => {
                  setFormData({ ...formData, latitude: lat, longitude: lng })
                  setShowLocationPicker(false)
                }}
                initialLat={formData.latitude}
                initialLng={formData.longitude}
                title="Set Garage Location"
              />
            )}

            <div>
              <label className="text-sm font-medium">Cars Per Hour</label>
              <Input
                type="number"
                min="1"
                value={formData.cars_per_hour}
                onChange={(e) => setFormData({ ...formData, cars_per_hour: Number.parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell customers about your garage"
                className="w-full border rounded-md p-2 text-sm"
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Car Brands You Service</label>
              <div className="grid grid-cols-2 gap-2">
                {CAR_BRANDS.map((brand) => (
                  <label key={brand} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBrands([...selectedBrands, brand])
                        } else {
                          setSelectedBrands(selectedBrands.filter((b) => b !== brand))
                          const brandModels = getModelsForBrand(brand)
                          setExcludedModels(excludedModels.filter((model) => !brandModels.includes(model)))
                        }
                      }}
                    />
                    <span className="text-sm">{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Exclude Specific Models</label>
              <p className="text-xs text-muted-foreground mb-3">
                All models for selected brands are included by default. Uncheck to exclude specific models.
              </p>
              <div className="space-y-4">
                {selectedBrands.length > 0 ? (
                  selectedBrands.map((brand) => {
                    const brandData = CAR_MODELS[brand] || {}
                    return (
                      <div key={brand} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">{brand}</h4>
                        <div className="space-y-3">
                          {FUEL_TYPES.map((fuelType) => {
                            const models = brandData[fuelType] || []
                            if (models.length === 0) return null
                            return (
                              <div key={`${brand}-${fuelType}`}>
                                <p className="text-xs font-semibold text-muted-foreground mb-2">{fuelType}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {models.map((model, modelIndex) => (
                                    <label key={`${brand}-${fuelType}-${model}-${modelIndex}`} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!excludedModels.includes(model)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setExcludedModels(excludedModels.filter((m) => m !== model))
                                          } else {
                                            setExcludedModels([...excludedModels, model])
                                          }
                                        }}
                                      />
                                      <span className="text-sm">{model}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground col-span-2">Select car brands first</p>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
