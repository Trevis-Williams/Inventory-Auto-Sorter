import {
  InventoryItem,
  LocationStats,
  LearnedShelfOrder,
} from '../types/inventory'
import { parseFBPN } from './sequenceAnalyzer'

/**
 * Convert an FBPN to a numeric value for comparison
 * Format: "XX-YYYYYY" -> XX * 1000000 + YYYYYY
 * This preserves the natural ordering of FBPNs
 */
export function fbpnToNumeric(fbpn: string): number {
  const parsed = parseFBPN(fbpn)
  if (!parsed.isValid) return 0
  
  // Combine prefix and number into a single sortable value
  // Prefix * 1,000,000 + number
  const prefixNum = parseInt(parsed.prefix, 10) || 0
  return prefixNum * 1000000 + parsed.number
}

/**
 * Calculate the median of an array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Calculate the mean of an array of numbers
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Calculate the standard deviation of an array of numbers
 */
export function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0
  
  const mean = calculateMean(values)
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const avgSquaredDiff = calculateMean(squaredDiffs)
  
  return Math.sqrt(avgSquaredDiff)
}

/**
 * Calculate statistics for each location based on the FBPNs stored there
 */
export function calculateLocationStats(items: InventoryItem[]): LocationStats[] {
  // Group items by location
  const locationGroups = new Map<string, InventoryItem[]>()
  
  for (const item of items) {
    const location = item.location || 'Unknown'
    if (!locationGroups.has(location)) {
      locationGroups.set(location, [])
    }
    locationGroups.get(location)!.push(item)
  }
  
  // Calculate stats for each location
  const stats: LocationStats[] = []
  
  for (const [location, locationItems] of locationGroups) {
    const fbpnValues = locationItems
      .map(item => fbpnToNumeric(item.fbpn))
      .filter(v => v > 0)
    
    if (fbpnValues.length === 0) continue
    
    stats.push({
      location,
      itemCount: locationItems.length,
      fbpnValues,
      medianFBPN: calculateMedian(fbpnValues),
      meanFBPN: calculateMean(fbpnValues),
      stdDev: calculateStdDev(fbpnValues),
      minFBPN: Math.min(...fbpnValues),
      maxFBPN: Math.max(...fbpnValues),
      learnedRank: 0, // Will be set after sorting
    })
  }
  
  return stats
}

/**
 * Learn the shelf order by ranking locations based on their median FBPN values
 * Locations with lower median FBPNs come first (lower numbered parts)
 */
export function learnShelfOrder(items: InventoryItem[]): LearnedShelfOrder {
  if (items.length === 0) {
    return {
      locations: [],
      locationRankMap: new Map(),
      totalItems: 0,
      learningConfidence: 0,
    }
  }
  
  // Calculate stats for each location
  const stats = calculateLocationStats(items)
  
  // Sort locations by median FBPN (ascending = lower FBPNs first)
  stats.sort((a, b) => a.medianFBPN - b.medianFBPN)
  
  // Assign ranks
  const locationRankMap = new Map<string, number>()
  for (let i = 0; i < stats.length; i++) {
    stats[i].learnedRank = i + 1
    locationRankMap.set(stats[i].location, i + 1)
  }
  
  // Calculate learning confidence
  // Higher confidence if locations have distinct median values (less overlap)
  const confidence = calculateLearningConfidence(stats)
  
  return {
    locations: stats,
    locationRankMap,
    totalItems: items.length,
    learningConfidence: confidence,
  }
}

/**
 * Calculate how confident we are in the learned pattern
 * Based on how distinct the median FBPN values are between locations
 */
function calculateLearningConfidence(stats: LocationStats[]): number {
  if (stats.length < 2) return 100
  
  let overlappingPairs = 0
  let totalPairs = 0
  
  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      totalPairs++
      
      // Check if ranges overlap significantly
      const rangeI = { min: stats[i].minFBPN, max: stats[i].maxFBPN }
      const rangeJ = { min: stats[j].minFBPN, max: stats[j].maxFBPN }
      
      // If one range contains part of the other, they overlap
      const overlap = !(rangeI.max < rangeJ.min || rangeJ.max < rangeI.min)
      if (overlap) {
        overlappingPairs++
      }
    }
  }
  
  if (totalPairs === 0) return 100
  
  // Confidence decreases with more overlapping ranges
  const overlapRatio = overlappingPairs / totalPairs
  return Math.round((1 - overlapRatio) * 100)
}

/**
 * Find what rank a given FBPN should have based on its value
 * Returns the rank of the location it would best fit in
 */
export function findExpectedRank(
  fbpnValue: number,
  learnedOrder: LearnedShelfOrder
): number {
  if (learnedOrder.locations.length === 0) return 1
  
  // Find the location whose median is closest to this FBPN value
  let closestRank = 1
  let closestDistance = Infinity
  
  for (const loc of learnedOrder.locations) {
    const distance = Math.abs(loc.medianFBPN - fbpnValue)
    if (distance < closestDistance) {
      closestDistance = distance
      closestRank = loc.learnedRank
    }
  }
  
  return closestRank
}

/**
 * Check if an FBPN is an outlier for its location
 * Returns deviation info
 */
export function checkOutlier(
  fbpnValue: number,
  locationStats: LocationStats,
  threshold: number = 2.0 // Number of standard deviations
): { isOutlier: boolean; deviation: number; zScore: number } {
  if (locationStats.stdDev === 0) {
    // No variation at this location, any different value is an outlier
    const isOutlier = fbpnValue !== locationStats.medianFBPN
    return {
      isOutlier,
      deviation: Math.abs(fbpnValue - locationStats.medianFBPN),
      zScore: isOutlier ? Infinity : 0,
    }
  }
  
  const zScore = Math.abs(fbpnValue - locationStats.meanFBPN) / locationStats.stdDev
  
  return {
    isOutlier: zScore > threshold,
    deviation: Math.abs(fbpnValue - locationStats.medianFBPN),
    zScore,
  }
}

/**
 * Calculate confidence that an item is out of order (0-100)
 */
export function calculateOutOfOrderConfidence(
  zScore: number,
  rankDifference: number,
  totalLocations: number
): number {
  // Base confidence from z-score
  let confidence = 0
  
  if (zScore > 3) {
    confidence = 95
  } else if (zScore > 2) {
    confidence = 80
  } else if (zScore > 1.5) {
    confidence = 60
  } else if (zScore > 1) {
    confidence = 40
  } else {
    confidence = 20
  }
  
  // Boost confidence if rank difference is significant
  if (totalLocations > 1) {
    const rankRatio = Math.abs(rankDifference) / totalLocations
    if (rankRatio > 0.5) {
      confidence = Math.min(100, confidence + 15)
    } else if (rankRatio > 0.25) {
      confidence = Math.min(100, confidence + 10)
    }
  }
  
  return Math.round(confidence)
}

/**
 * Generate a human-readable suggestion for an out-of-order item
 */
export function generateSuggestion(
  _fbpn: string,
  _currentLocation: string,
  expectedRank: number,
  actualRank: number,
  learnedOrder: LearnedShelfOrder
): string {
  if (expectedRank === actualRank) {
    return 'Item appears to be in the correct location'
  }
  
  const expectedLocation = learnedOrder.locations.find(l => l.learnedRank === expectedRank)
  
  if (expectedRank < actualRank) {
    if (expectedLocation) {
      return `Should be on an earlier shelf (around ${expectedLocation.location})`
    }
    return 'Should be on an earlier shelf'
  } else {
    if (expectedLocation) {
      return `Should be on a later shelf (around ${expectedLocation.location})`
    }
    return 'Should be on a later shelf'
  }
}
