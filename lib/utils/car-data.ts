export const CAR_MODELS: Record<string, Record<string, string[]>> = {
  Toyota: {
    Ignition: ["Fortuner", "Glanza", "Innova", "Corolla", "Etios", "Camry", "Urban Cruiser", "Yaris", "Rumion", "Hilux", "Land Cruiser"],
    Hybrid: ["Prius", "Fortuner Hybrid", "Camry Hybrid", "Vellfire", "Urban Cruiser Hyryder"],
    Electric: ["bZ4X"],
  },
  Honda: {
    Ignition: ["Brio", "WR-V", "City", "Jazz", "CR-V", "Civic", "BR-V", "Amaze", "Elevate"],
    Hybrid: ["City Hybrid", "CR-V Hybrid"],
  },
  Nissan: {
    Ignition: ["Sunny", "Terrano", "Magnite", "Kicks"],
  },
  "Mercedes-Benz": {
    Ignition: ["E-Class", "GLE", "GLA", "C-Class", "S-Class", "B-Class", "CLA", "A-Class", "GLC", "GLS", "G-Class"],
    Hybrid: ["GLE Hybrid", "C-Class Hybrid", "S-Class Hybrid"],
    Electric: ["EQA", "EQB", "EQC", "EQE", "EQS"],
  },
  Hyundai: {
    Ignition: ["Verna", "i20", "Grand i10 Nios", "Xcent", "Creta", "Elite i20", "Elantra", "i10", "Alcazar", "Venue", "Exter", "Tucson"],
    Electric: ["Kona Electric", "IONIQ 5"],
  },
  "Maruti Suzuki": {
    Ignition: ["Swift", "Baleno", "Celerio", "Ritz", "A-Star", "SX4", "Dzire", "Ciaz", "S-Cross", "Vitara Brezza", "Wagon R", "Ertiga", "XL6", "Jimny", "Fronx", "Grand Vitara"],
    Hybrid: ["Swift Hybrid", "Ciaz Hybrid", "Grand Vitara Hybrid"],
  },
  Renault: {
    Ignition: ["Pulse", "Lodgy", "Duster", "Kwid", "Triber", "Kiger"],
    Electric: ["Zoe", "Megane E-Tech"],
  },
  Volkswagen: {
    Ignition: ["Polo", "Vento", "Taigun", "Virtus", "Tiguan"],
    Electric: ["ID. Buzz", "ID.4", "ID.3"],
  },
  Skoda: {
    Ignition: ["Rapid", "Superb", "Octavia", "Kushaq", "Slavia", "Kodiaq"],
    Electric: ["Enyaq", "Enyaq Coupe"],
  },
  BMW: {
    Ignition: ["3 Series", "GLE", "X1", "Z4", "X3", "7 Series", "5 Series", "X5", "X7", "M3", "M5"],
    Electric: ["i4", "iX", "i7", "iX1", "i5"],
  },
  Audi: {
    Ignition: ["Q5", "A3", "A4", "Q3", "Q7", "A6", "A8", "Q8", "S5", "RS7"],
    Electric: ["Q4 e-tron", "e-tron GT", "e-tron"],
  },
  Ford: {
    Ignition: ["Endeavour", "Figo", "EcoSport", "Mustang"],
    Electric: ["Mustang Mach-E", "F-150 Lightning"],
  },
  Mahindra: {
    Ignition: ["XUV500", "KUV100", "TUV300", "Bolero", "Thar", "Scorpio", "XUV700", "XUV300"],
    Electric: ["XUV400", "e2o"],
  },
  Tata: {
    Ignition: ["Nano", "Tiago", "Altroz", "Zest", "Harrier", "Safari", "Punch"],
    Electric: ["Nexon EV", "Tigor EV", "Tiago EV", "Punch EV"],
  },
  MINI: {
    Ignition: ["Countryman", "Cooper", "Clubman"],
    Electric: ["Cooper SE", "Countryman SE"],
  },
  Jaguar: {
    Ignition: ["F-Pace", "XE", "XF", "F-Type"],
    Electric: ["I-PACE"],
  },
  "Land Rover": {
    Ignition: ["Evoque", "Freelander", "Discovery", "Defender", "Range Rover Sport", "Range Rover Velar"],
  },
  Lamborghini: {
    Ignition: ["Gallardo", "Huracan", "Aventador", "Urus"],
    Hybrid: ["Revuelto"],
  },
  Bentley: {
    Ignition: ["Continental", "Flying Spur", "Bentayga"],
  },
  Porsche: {
    Ignition: ["Cayenne", "911", "Panamera", "Macan"],
    Electric: ["Taycan", "Macan EV"],
  },
  Volvo: {
    Ignition: ["V40", "S90", "XC90", "XC40"],
    Hybrid: ["XC60 Hybrid", "S90 Hybrid"],
    Electric: ["C40 Recharge", "EX30", "EX90"],
  },
  Chevrolet: {
    Ignition: ["Beat", "Cruze", "Enjoy"],
  },
  Jeep: {
    Ignition: ["Compass", "Wrangler", "Meridian"],
    Hybrid: ["Wrangler 4xe"],
  },
  Datsun: {
    Ignition: ["redi-GO", "Go", "Go+", "on-DO"],
  },
}

export const CAR_BRANDS = Object.keys(CAR_MODELS).sort()

export const FUEL_TYPES = ["Ignition", "Hybrid", "Electric"]

export function getModelsForBrand(brand: string): string[] {
  const brandModels = CAR_MODELS[brand] || {}
  const allModels = new Set<string>()

  Object.values(brandModels).forEach((fuelTypeModels) => {
    fuelTypeModels.forEach((model) => allModels.add(model))
  })

  return Array.from(allModels).sort()
}

export function getModelsForBrandAndFuelType(brand: string, fuelType: string): string[] {
  return CAR_MODELS[brand]?.[fuelType] || []
}
