// Car brand logo URLs - using a CDN service for car logos
// These are placeholder URLs - you can replace with actual logo URLs or use a service like logo.dev
export const CAR_BRAND_LOGOS: Record<string, string> = {
  Toyota: "https://logo.clearbit.com/toyota.com",
  Honda: "https://logo.clearbit.com/honda.com",
  Nissan: "https://logo.clearbit.com/nissan.com",
  "Mercedes-Benz": "https://logo.clearbit.com/mercedes-benz.com",
  Hyundai: "https://logo.clearbit.com/hyundai.com",
  "Maruti Suzuki": "https://logo.clearbit.com/marutisuzuki.com",
  Renault: "https://logo.clearbit.com/renault.com",
  Volkswagen: "https://logo.clearbit.com/volkswagen.com",
  Skoda: "https://logo.clearbit.com/skoda-auto.com",
  BMW: "https://logo.clearbit.com/bmw.com",
  Audi: "https://logo.clearbit.com/audi.com",
  Ford: "https://logo.clearbit.com/ford.com",
  Mahindra: "https://logo.clearbit.com/mahindra.com",
  Tata: "https://logo.clearbit.com/tatamotors.com",
  MINI: "https://logo.clearbit.com/mini.com",
  Jaguar: "https://logo.clearbit.com/jaguar.com",
  "Land Rover": "https://logo.clearbit.com/landrover.com",
  Lamborghini: "https://logo.clearbit.com/lamborghini.com",
  Bentley: "https://logo.clearbit.com/bentleymotors.com",
  Porsche: "https://logo.clearbit.com/porsche.com",
  Volvo: "https://logo.clearbit.com/volvocars.com",
  Chevrolet: "https://logo.clearbit.com/chevrolet.com",
  Jeep: "https://logo.clearbit.com/jeep.com",
  Datsun: "https://logo.clearbit.com/datsun.com",
}

// Fallback to a generic car icon if logo not found
export function getCarBrandLogo(brand: string): string {
  return CAR_BRAND_LOGOS[brand] || "/placeholder-logo.svg"
}

