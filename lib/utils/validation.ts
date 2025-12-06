import { INDIAN_STATE_CODES } from "./state-codes"

/**
 * Validates Indian vehicle registration number format
 * Format: 2 state letters + 2 numbers + 2 letters + 4 numbers
 * Example: KA01AB1234
 */
export function validateRegistrationNumber(registrationNumber: string): boolean {
  const formatted = registrationNumber.toUpperCase().trim()

  // Check pattern: 2 letters + 2 digits + 2 letters + 4 digits
  const pattern = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/
  if (!pattern.test(formatted)) {
    return false
  }

  const stateCode = formatted.substring(0, 2)
  return INDIAN_STATE_CODES.includes(stateCode)
}

export function formatRegistrationNumber(registrationNumber: string): string {
  return registrationNumber.toUpperCase().trim()
}
