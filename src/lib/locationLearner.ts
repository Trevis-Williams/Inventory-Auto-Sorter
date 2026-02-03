import {
  InventoryItem,
  PrefixLocationMap,
  LocationCount,
  PlacementSuggestion,
} from '../types/inventory'
import { parseFBPN, compareFBPN } from './sequenceAnalyzer'

/**
 * Build a map of FBPN prefixes to their most common locations
 * This "learns" from the existing inventory data
 */
export function buildPrefixLocationMap(items: InventoryItem[]): PrefixLocationMap {
  const prefixMap: PrefixLocationMap = {}

  // Count occurrences of each prefix at each location
  const prefixLocationCounts: { [prefix: string]: { [location: string]: number } } = {}

  for (const item of items) {
    const parsed = parseFBPN(item.fbpn)
    if (!parsed.isValid) continue

    const prefix = parsed.prefix
    const location = item.location

    if (!prefixLocationCounts[prefix]) {
      prefixLocationCounts[prefix] = {}
    }

    if (!prefixLocationCounts[prefix][location]) {
      prefixLocationCounts[prefix][location] = 0
    }

    prefixLocationCounts[prefix][location]++
  }

  // Convert counts to sorted LocationCount arrays with percentages
  for (const prefix in prefixLocationCounts) {
    const locations = prefixLocationCounts[prefix]
    const totalForPrefix = Object.values(locations).reduce((sum, count) => sum + count, 0)

    const locationCounts: LocationCount[] = Object.entries(locations)
      .map(([location, count]) => ({
        location,
        count,
        percentage: Math.round((count / totalForPrefix) * 100),
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending

    prefixMap[prefix] = locationCounts
  }

  return prefixMap
}

/**
 * Get the suggested location for a given FBPN based on the prefix map
 */
export function suggestLocation(
  fbpn: string,
  prefixMap: PrefixLocationMap
): { location: string | null; confidence: number; totalItems: number; alternatives: LocationCount[] } {
  const parsed = parseFBPN(fbpn)

  if (!parsed.isValid) {
    return { location: null, confidence: 0, totalItems: 0, alternatives: [] }
  }

  const locationCounts = prefixMap[parsed.prefix]

  if (!locationCounts || locationCounts.length === 0) {
    return { location: null, confidence: 0, totalItems: 0, alternatives: [] }
  }

  const topLocation = locationCounts[0]
  const totalItems = locationCounts.reduce((sum, lc) => sum + lc.count, 0)

  return {
    location: topLocation.location,
    confidence: topLocation.percentage,
    totalItems,
    alternatives: locationCounts.slice(1), // All except the top suggestion
  }
}

/**
 * Find the exact position where a new FBPN should be placed
 * Returns the FBPNs that should come before and after
 */
export function findPlacementPosition(
  fbpn: string,
  items: InventoryItem[],
  location: string
): { before: string | null; after: string | null } {
  // Filter items at the specified location
  const locationItems = items
    .filter(item => item.location === location)
    .sort((a, b) => compareFBPN(a.fbpn, b.fbpn))

  if (locationItems.length === 0) {
    return { before: null, after: null }
  }

  // Find where the new FBPN would fit in the sorted order
  let insertIndex = 0
  for (let i = 0; i < locationItems.length; i++) {
    if (compareFBPN(fbpn, locationItems[i].fbpn) > 0) {
      insertIndex = i + 1
    } else {
      break
    }
  }

  const before = insertIndex > 0 ? locationItems[insertIndex - 1].fbpn : null
  const after = insertIndex < locationItems.length ? locationItems[insertIndex].fbpn : null

  return { before, after }
}

/**
 * Check if an FBPN already exists in the inventory
 */
export function findExistingItem(
  fbpn: string,
  items: InventoryItem[]
): { exists: boolean; location: string | null; item: InventoryItem | null } {
  const normalizedFbpn = fbpn.trim().toUpperCase()
  const existingItem = items.find(item => item.fbpn.trim().toUpperCase() === normalizedFbpn)

  if (existingItem) {
    return { exists: true, location: existingItem.location, item: existingItem }
  }

  return { exists: false, location: null, item: null }
}

/**
 * Get a complete placement suggestion for a new FBPN
 */
export function getPlacementSuggestion(
  fbpn: string,
  items: InventoryItem[],
  prefixMap: PrefixLocationMap
): PlacementSuggestion {
  const parsed = parseFBPN(fbpn)

  // Check if FBPN already exists
  const existing = findExistingItem(fbpn, items)

  if (!parsed.isValid) {
    return {
      fbpn,
      isValid: false,
      suggestedLocation: null,
      confidence: 0,
      totalSimilarItems: 0,
      beforeFBPN: null,
      afterFBPN: null,
      alternativeLocations: [],
      existsInInventory: existing.exists,
      existingLocation: existing.location,
    }
  }

  // Get location suggestion
  const suggestion = suggestLocation(fbpn, prefixMap)

  // Get placement position if we have a suggested location
  let before: string | null = null
  let after: string | null = null

  if (suggestion.location) {
    const position = findPlacementPosition(fbpn, items, suggestion.location)
    before = position.before
    after = position.after
  }

  return {
    fbpn,
    isValid: true,
    suggestedLocation: suggestion.location,
    confidence: suggestion.confidence,
    totalSimilarItems: suggestion.totalItems,
    beforeFBPN: before,
    afterFBPN: after,
    alternativeLocations: suggestion.alternatives,
    existsInInventory: existing.exists,
    existingLocation: existing.location,
  }
}

/**
 * Get all unique prefixes from the inventory
 */
export function getUniquePrefixes(items: InventoryItem[]): string[] {
  const prefixes = new Set<string>()

  for (const item of items) {
    const parsed = parseFBPN(item.fbpn)
    if (parsed.isValid) {
      prefixes.add(parsed.prefix)
    }
  }

  return [...prefixes].sort()
}
