// Minimal inventory item interface for location parsing
// Only needs location and itemType fields
export interface LocationInput {
  location: string
  itemType?: string
}

/**
 * Location Parser
 * 
 * Parses location codes from CSV to extract shelf units and levels.
 * Location format: PRN5-1H15-J-01-C
 * - PRN5-1H15: Building/Area prefix
 * - J: Section/Row
 * - 01: Shelf number
 * - C: Level (A=1, B=2, C=3, D=4)
 */

// Parsed location structure
export interface ParsedLocation {
  original: string
  shelfUnit: string      // e.g., "PRN5-1H15-J-01"
  level: string          // e.g., "C"
  levelNumber: number    // e.g., 3 (A=1, B=2, C=3, D=4)
  locationType: string   // SPOKE, LAB, OPTIC, HUB
  isValid: boolean
}

// Level letter to number mapping
const LEVEL_MAP: Record<string, number> = {
  'A': 1,
  'B': 2,
  'C': 3,
  'D': 4,
}

/**
 * Parse a single location code into its components
 * Handles format: PRN5-1H15-J-01-C or variations
 */
export function parseLocation(location: string, locationType: string = 'SPOKE'): ParsedLocation {
  if (!location || location.trim() === '') {
    return {
      original: location,
      shelfUnit: '',
      level: '',
      levelNumber: 0,
      locationType,
      isValid: false,
    }
  }

  const trimmed = location.trim()
  const parts = trimmed.split('-')

  // Need at least 3 parts to have a valid shelf location with level
  // Format: PREFIX-SECTION-NUMBER-LEVEL or PREFIX-PREFIX-SECTION-NUMBER-LEVEL
  if (parts.length < 3) {
    // Could be a non-shelf location like ATN5-1H15F
    return {
      original: trimmed,
      shelfUnit: trimmed,
      level: '',
      levelNumber: 0,
      locationType,
      isValid: false,
    }
  }

  // Check if the last part is a single letter (level indicator)
  const lastPart = parts[parts.length - 1]
  const isLevelIndicator = lastPart.length === 1 && /^[A-D]$/i.test(lastPart)

  if (isLevelIndicator) {
    // Extract shelf unit (everything except the last part)
    const shelfUnit = parts.slice(0, -1).join('-')
    const level = lastPart.toUpperCase()
    const levelNumber = LEVEL_MAP[level] || 0

    return {
      original: trimmed,
      shelfUnit,
      level,
      levelNumber,
      locationType,
      isValid: levelNumber > 0,
    }
  }

  // No level indicator - treat entire string as shelf unit
  return {
    original: trimmed,
    shelfUnit: trimmed,
    level: '',
    levelNumber: 0,
    locationType,
    isValid: false,
  }
}

/**
 * Group parsed locations by their shelf unit
 */
export function groupLocationsByShelf(locations: ParsedLocation[]): Map<string, ParsedLocation[]> {
  const groups = new Map<string, ParsedLocation[]>()

  locations.forEach((loc) => {
    if (!loc.isValid || !loc.shelfUnit) return

    const existing = groups.get(loc.shelfUnit) || []
    
    // Avoid duplicates for the same level
    const hasLevel = existing.some(l => l.level === loc.level)
    if (!hasLevel) {
      existing.push(loc)
    }
    
    groups.set(loc.shelfUnit, existing)
  })

  return groups
}

/**
 * Extract unique shelf units from location codes
 * Returns count of shelves that would be created
 */
export function countUniqueShelves(items: LocationInput[]): number {
  const parsedLocations = items.map(item => parseLocation(item.location, item.itemType || 'SPOKE'))
  const groups = groupLocationsByShelf(parsedLocations)
  return groups.size
}

/**
 * Extract shelf unit from a location code
 * Returns the shelf unit (everything except the level letter)
 */
export function extractShelfUnit(location: string): string {
  const parsed = parseLocation(location)
  return parsed.shelfUnit || location
}

/**
 * Check if a location is a valid shelf location
 * Valid format ends with: SECTION-NUMBER-LEVEL (e.g., A-01-A, J-15-C)
 * The last part must be a single letter A-D (level indicator)
 * The second-to-last part must be a number (shelf number)
 */
export function isValidShelfLocation(location: string): boolean {
  if (!location || location.trim() === '') {
    return false
  }

  const parsed = parseLocation(location)
  
  // Must have a valid level (A, B, C, or D)
  if (!parsed.isValid || parsed.levelNumber === 0) {
    return false
  }

  // The shelf unit must have at least one part with a number (shelf number)
  // Pattern: something-SECTION-NUMBER where NUMBER is like 01, 02, 15, etc.
  const shelfParts = parsed.shelfUnit.split('-')
  if (shelfParts.length < 2) {
    return false
  }

  // The last part of shelfUnit should be a number (the shelf number)
  const shelfNumber = shelfParts[shelfParts.length - 1]
  if (!/^\d+$/.test(shelfNumber)) {
    return false
  }

  return true
}

/**
 * Filter an array of items to only include those with valid shelf locations
 */
export function filterValidLocations<T extends { location: string }>(items: T[]): {
  valid: T[]
  invalid: T[]
  stats: { total: number; validCount: number; invalidCount: number }
} {
  const valid: T[] = []
  const invalid: T[] = []

  for (const item of items) {
    if (isValidShelfLocation(item.location)) {
      valid.push(item)
    } else {
      invalid.push(item)
    }
  }

  return {
    valid,
    invalid,
    stats: {
      total: items.length,
      validCount: valid.length,
      invalidCount: invalid.length,
    },
  }
}
