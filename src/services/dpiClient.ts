// DPI Client - wrapper for DPI bypass service
import { dpiBypass } from './dpi-bypass'

/**
 * Fetch a URL with DPI bypass enabled
 * This is a convenience wrapper around the DPI bypass service
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Response from the fetch request
 */
export async function dpiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    // Use DPI bypass service for the fetch
    return await dpiBypass.fetchWithBypass(url, options)
  } catch (error) {
    console.warn('DPI bypass fetch failed, attempting direct fetch:', error)
    // Fallback to direct fetch if DPI bypass fails
    return await fetch(url, options)
  }
}

/**
 * Check if DPI bypass is available
 */
export function isDpiBypassAvailable(): boolean {
  return dpiBypass.isAvailable()
}

/**
 * Get DPI bypass statistics
 */
export function getDpiBypassStats() {
  return dpiBypass.getStats()
}
