import {
  InventoryItem,
  ParsedPartNumber,
  SequenceAnalysis,
  LocationGroup,
  EnhancedSequenceAnalysis,
  EnhancedInventoryAnalysis,
} from '../types/inventory'
import {
  learnShelfOrder,
  partNumberToNumeric,
  checkOutlier,
  calculateOutOfOrderConfidence,
  generateSuggestion,
  findExpectedRank,
} from './patternLearner'

/**
 * Parse a part number string into its components
 * Format: "XX-XXXXXX" (e.g., "24-000328" -> prefix: "24", number: 328)
 */
export function parsePartNumber(partNumber: string): ParsedPartNumber {
  const match = partNumber.match(/^(\d+)-(\d+)$/)
  
  if (!match) {
    return {
      original: partNumber,
      prefix: '',
      number: 0,
      isValid: false,
    }
  }

  return {
    original: partNumber,
    prefix: match[1],
    number: parseInt(match[2], 10),
    isValid: true,
  }
}

/**
 * Compare two part numbers for sorting
 * First by prefix, then by number
 */
export function comparePartNumber(a: string, b: string): number {
  const parsedA = parsePartNumber(a)
  const parsedB = parsePartNumber(b)

  // Invalid part numbers go to the end
  if (!parsedA.isValid && !parsedB.isValid) return a.localeCompare(b)
  if (!parsedA.isValid) return 1
  if (!parsedB.isValid) return -1

  // Compare by prefix first (numerically)
  const prefixNumA = parseInt(parsedA.prefix, 10) || 0
  const prefixNumB = parseInt(parsedB.prefix, 10) || 0
  if (prefixNumA !== prefixNumB) return prefixNumA - prefixNumB

  // Then by number
  return parsedA.number - parsedB.number
}

/**
 * Build a global sorted list of all unique part numbers
 */
export function buildGlobalPartNumberSequence(items: InventoryItem[]): string[] {
  const uniquePartNumbers = [...new Set(items.map(item => item.partNumber))]
  return uniquePartNumbers.sort(comparePartNumber)
}

/**
 * Find the expected neighbors for a part number in the global sequence
 */
export function findExpectedNeighbors(
  partNumber: string,
  globalSequence: string[]
): { before: string | null; after: string | null } {
  const index = globalSequence.indexOf(partNumber)
  
  if (index === -1) {
    return { before: null, after: null }
  }

  return {
    before: index > 0 ? globalSequence[index - 1] : null,
    after: index < globalSequence.length - 1 ? globalSequence[index + 1] : null,
  }
}

/**
 * Group items by location and sort within each group
 */
export function groupByLocation(items: InventoryItem[]): Map<string, InventoryItem[]> {
  const groups = new Map<string, InventoryItem[]>()

  for (const item of items) {
    const location = item.location || 'Unknown'
    if (!groups.has(location)) {
      groups.set(location, [])
    }
    groups.get(location)!.push(item)
  }

  // Sort items within each group by part number
  for (const [location, locationItems] of groups) {
    groups.set(location, locationItems.sort((a, b) => comparePartNumber(a.partNumber, b.partNumber)))
  }

  return groups
}

/**
 * Perform full inventory analysis using learned shelf order from data
 * Order is determined by analyzing part number patterns across shelves
 */
export function analyzeInventory(items: InventoryItem[]): EnhancedInventoryAnalysis {
  if (items.length === 0) {
    return {
      groups: [],
      outOfOrderItems: [],
      totalItems: 0,
      totalOutOfOrder: 0,
      learnedOrder: {
        locations: [],
        locationRankMap: new Map(),
        totalItems: 0,
        learningConfidence: 0,
      },
      enhancedOutOfOrderItems: [],
    }
  }

  // Learn shelf order from data (median part numbers per shelf)
  const learnedOrder = learnShelfOrder(items)
  
  // Build global part number sequence for neighbor lookup
  const globalSequence = buildGlobalPartNumberSequence(items)

  // Group items by location
  const locationMap = groupByLocation(items)

  // Analyze each item and build groups
  const groups: LocationGroup[] = []
  const outOfOrderItems: SequenceAnalysis[] = []
  const enhancedOutOfOrderItems: EnhancedSequenceAnalysis[] = []

  // Sort locations by learned order
  const sortedLocations = [...locationMap.keys()].sort((a, b) => {
    const rankA = learnedOrder.locationRankMap.get(a) || 999
    const rankB = learnedOrder.locationRankMap.get(b) || 999
    return rankA - rankB
  })

  for (const location of sortedLocations) {
    const locationItems = locationMap.get(location)!
    let outOfOrderCount = 0

    // Get stats for this location
    const locationStats = learnedOrder.locations.find(l => l.location === location)
    const actualRank = learnedOrder.locationRankMap.get(location) || 0

    for (const item of locationItems) {
      const partNumberValue = partNumberToNumeric(item.partNumber)
      const { before: expectedBefore, after: expectedAfter } = findExpectedNeighbors(
        item.partNumber,
        globalSequence
      )

      // Find what rank this part number should be at based on its value
      const expectedRank = findExpectedRank(partNumberValue, learnedOrder)

      // Check if item is an outlier for this location
      let isOutOfOrder = false
      let confidence = 0
      let deviation = 0
      let zScore = 0

      if (locationStats) {
        const outlierCheck = checkOutlier(partNumberValue, locationStats, 2.0)
        deviation = outlierCheck.deviation
        zScore = outlierCheck.zScore

        // Item is out of order if:
        // 1. It's a statistical outlier (z-score > 2), OR
        // 2. Its expected rank is significantly different from actual rank
        const rankDifference = Math.abs(expectedRank - actualRank)
        const significantRankDiff = rankDifference > Math.max(1, learnedOrder.locations.length * 0.2)

        if (outlierCheck.isOutlier || significantRankDiff) {
          isOutOfOrder = true
          confidence = calculateOutOfOrderConfidence(
            zScore,
            rankDifference,
            learnedOrder.locations.length
          )
        }
      }

      if (isOutOfOrder) {
        outOfOrderCount++

        const baseAnalysis: SequenceAnalysis = {
          id: item.id,
          partNumber: item.partNumber,
          location: item.location,
          itemType: item.itemType,
          isOutOfOrder: true,
          expectedBefore,
          expectedAfter,
          actualBefore: null,
          actualAfter: null,
        }

        outOfOrderItems.push(baseAnalysis)

        const enhanced: EnhancedSequenceAnalysis = {
          ...baseAnalysis,
          confidence,
          deviationFromMedian: deviation,
          expectedLocationRank: expectedRank,
          actualLocationRank: actualRank,
          suggestion: generateSuggestion(
            item.partNumber,
            item.location,
            expectedRank,
            actualRank,
            learnedOrder
          ),
        }

        enhancedOutOfOrderItems.push(enhanced)
      }
    }

    const group: LocationGroup = {
      location,
      items: locationItems,
      itemCount: locationItems.length,
      outOfOrderCount,
    }

    groups.push(group)
  }

  // Sort enhanced out of order items by confidence (highest first)
  enhancedOutOfOrderItems.sort((a, b) => b.confidence - a.confidence)

  return {
    groups,
    outOfOrderItems,
    totalItems: items.length,
    totalOutOfOrder: outOfOrderItems.length,
    learnedOrder,
    enhancedOutOfOrderItems,
  }
}
