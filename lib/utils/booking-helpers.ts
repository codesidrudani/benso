export function generateTimeSlots(
  garageOpenTime: string | null,
  garageCloseTime: string | null,
  serviceDuration: number, // in hours
  existingBookings: Array<{ start_time: string; end_time: string }>,
  carsPerHour: number,
): string[] {
  const slots: string[] = []

  // Validate inputs
  if (!garageOpenTime || !garageCloseTime) {
    console.error("Garage opening or closing time is missing")
    return []
  }

  if (!garageOpenTime.includes(":") || !garageCloseTime.includes(":")) {
    console.error("Invalid time format")
    return []
  }

  const [openHour, openMin] = garageOpenTime.split(":").map(Number)
  const [closeHour, closeMin] = garageCloseTime.split(":").map(Number)

  // Validate parsed times
  if (isNaN(openHour) || isNaN(openMin) || isNaN(closeHour) || isNaN(closeMin)) {
    console.error("Invalid time values")
    return []
  }

  const openTotalMin = openHour * 60 + openMin
  const closeTotalMin = closeHour * 60 + closeMin
  const serviceTotalMin = serviceDuration * 60

  // Check if there's enough time for at least one slot
  if (closeTotalMin <= openTotalMin || serviceTotalMin > closeTotalMin - openTotalMin) {
    console.error("Not enough time between opening and closing for service duration")
    return []
  }

  for (let currentMin = openTotalMin; currentMin + serviceTotalMin <= closeTotalMin; currentMin += 60) {
    const slotStartHour = Math.floor(currentMin / 60)
    const slotStartMin = currentMin % 60
    const slotStart = `${String(slotStartHour).padStart(2, "0")}:${String(slotStartMin).padStart(2, "0")}`

    const slotEndMin = currentMin + serviceTotalMin
    const slotEndHour = Math.floor(slotEndMin / 60)
    const slotEndMin_ = slotEndMin % 60
    const slotEnd = `${String(slotEndHour).padStart(2, "0")}:${String(slotEndMin_).padStart(2, "0")}`

    // Count overlapping bookings
    const overlappingBookings = existingBookings.filter((booking) => {
      if (!booking.start_time || !booking.end_time) return false
      
      const bookingStartMin =
        Number.parseInt(booking.start_time.split(":")[0]) * 60 + Number.parseInt(booking.start_time.split(":")[1])
      const bookingEndMin =
        Number.parseInt(booking.end_time.split(":")[0]) * 60 + Number.parseInt(booking.end_time.split(":")[1])

      // Check if slots overlap
      return !(slotEndMin <= bookingStartMin || currentMin >= bookingEndMin)
    })

    if (overlappingBookings.length < (carsPerHour || 2)) {
      slots.push(slotStart)
    }
  }

  return slots
}
