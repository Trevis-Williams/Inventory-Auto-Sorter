/**
 * Shelf Order Learner
 * 
 * Learns the correct ordering of shelves based on the part number patterns
 * in the inventory data. Uses median part number values per shelf unit to
 * determine the natural sequence of shelves.
 */

import { InventoryItem, ShelfStats, LearnedShelfOrder, LocationStats } from '../types/inventory'
import { extractShelfUnit } from './locationParser'
import { partNumberToNumeric, calculateMedian, calculateMean, calculateStdDev } from './patternLearner'

/**
 * Calculate statistics for each shelf unit based on the part numbers stored there
 * Groups all locations by shelf unit (e.g., "CCO1-1H15-A-01" ignoring the level)
 */
export function calculateShelfStats(items: InventoryItem[]): ShelfStats[] {
  // Group items by shelf unit
  const shelfGroups = new Map<string, InventoryItem[]>()
  
  for (const item of items) {
    const shelfUnit = extractShelfUnit(item.location)
    if (!shelfUnit) continue
    
    if (!shelfGroups.has(shelfUnit)) {
      shelfGroups.set(shelfUnit, [])
    }
    shelfGroups.get(shelfUnit)!.push(item)
  }
  
  // Calculate stats for each shelf unit
  const stats: ShelfStats[] = []
  
  for (const [shelfUnit, shelfItems] of shelfGroups) {
    const partNumberValues = shelfItems
      .map(item => partNumberToNumeric(item.partNumber))
      .filter(v => v > 0)
    
    if (partNumberValues.length === 0) continue
    
    const median = calculateMedian(partNumberValues)
    const min = Math.min(...partNumberValues)
    const max = Math.max(...partNumberValues)
    
    // Calculate confidence based on the spread of values
    // Tighter spread = higher confidence
    const spread = max - min
    const meanValue = calculateMean(partNumberValues)
    const relativeSpread = meanValue > 0 ? spread / meanValue : 1
    
    // Lower relative spread = higher confidence
    let confidence = 100
    if (relativeSpread > 0.5) {
      confidence = 50
    } else if (relativeSpread > 0.3) {
      confidence = 70
    } else if (relativeSpread > 0.1) {
      confidence = 85
    }
    
    stats.push({
      shelfUnit,
      medianPartNumber: median,
      partNumberRange: { min, max },
      itemCount: shelfItems.length,
      rank: 0, // Will be set after sorting
      confidence,
    })
  }
  
  return stats
}

/**
 * Learn the shelf order from inventory data
 * Ranks shelves based on their median part number values
 */
export function learnShelfOrderFromData(items: InventoryItem[]): {
  shelfStats: ShelfStats[]
  learnedOrder: LearnedShelfOrder
  overallConfidence: number
} {
  if (items.length === 0) {
    return {
      shelfStats: [],
      learnedOrder: {
        locations: [],
        locationRankMap: new Map(),
        totalItems: 0,
        learningConfidence: 0,
      },
      overallConfidence: 0,
    }
  }
  
  // Calculate stats for each shelf
  const shelfStats = calculateShelfStats(items)
  
  // Sort by median part number (ascending = lower part numbers first)
  shelfStats.sort((a, b) => a.medianPartNumber - b.medianPartNumber)
  
  // Assign ranks
  for (let i = 0; i < shelfStats.length; i++) {
    shelfStats[i].rank = i + 1
  }
  
  // Calculate overall learning confidence
  const overallConfidence = calculateOverallConfidence(shelfStats)
  
  // Also build the location-based order for backward compatibility
  const locationStats = buildLocationStatsFromShelfStats(items, shelfStats)
  const locationRankMap = new Map<string, number>()
  locationStats.forEach(stat => {
    locationRankMap.set(stat.location, stat.learnedRank)
  })
  
  return {
    shelfStats,
    learnedOrder: {
      locations: locationStats,
      locationRankMap,
      totalItems: items.length,
      learningConfidence: overallConfidence,
    },
    overallConfidence,
  }
}

/**
 * Build location stats from shelf stats for backward compatibility
 */
function buildLocationStatsFromShelfStats(
  items: InventoryItem[],
  shelfStats: ShelfStats[]
): LocationStats[] {
  // Create a map of shelf unit to rank
  const shelfRankMap = new Map<string, number>()
  shelfStats.forEach(stat => {
    shelfRankMap.set(stat.shelfUnit, stat.rank)
  })
  
  // Group items by location
  const locationGroups = new Map<string, InventoryItem[]>()
  for (const item of items) {
    const location = item.location || 'Unknown'
    if (!locationGroups.has(location)) {
      locationGroups.set(location, [])
    }
    locationGroups.get(location)!.push(item)
  }
  
  // Build location stats
  const locationStats: LocationStats[] = []
  
  for (const [location, locationItems] of locationGroups) {
    const partNumberValues = locationItems
      .map(item => partNumberToNumeric(item.partNumber))
      .filter(v => v > 0)
    
    if (partNumberValues.length === 0) continue
    
    const shelfUnit = extractShelfUnit(location)
    const shelfRank = shelfRankMap.get(shelfUnit) || 999
    
    locationStats.push({
      location,
      itemCount: locationItems.length,
      partNumberValues,
      medianPartNumber: calculateMedian(partNumberValues),
      meanPartNumber: calculateMean(partNumberValues),
      stdDev: calculateStdDev(partNumberValues),
      minPartNumber: Math.min(...partNumberValues),
      maxPartNumber: Math.max(...partNumberValues),
      learnedRank: shelfRank,
    })
  }
  
  // Sort by learned rank
  locationStats.sort((a, b) => a.learnedRank - b.learnedRank)
  
  return locationStats
}

/**
 * Calculate overall confidence in the learned order
 * Based on how distinct the median part number values are between shelves
 */
function calculateOverallConfidence(shelfStats: ShelfStats[]): number {
  if (shelfStats.length < 2) return 100
  
  let overlappingPairs = 0
  let totalPairs = 0
  
  for (let i = 0; i < shelfStats.length; i++) {
    for (let j = i + 1; j < shelfStats.length; j++) {
      totalPairs++
      
      // Check if ranges overlap
      const rangeI = shelfStats[i].partNumberRange
      const rangeJ = shelfStats[j].partNumberRange
      
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
 * Find the ideal shelf for a given part number based on the learned order
 */
export function getIdealShelfForPartNumber(
  partNumber: string,
  shelfStats: ShelfStats[]
): ShelfStats | null {
  if (shelfStats.length === 0) return null
  
  const partNumberValue = partNumberToNumeric(partNumber)
  if (partNumberValue === 0) return null
  
  // Find the shelf whose median is closest to this part number value
  let closestShelf = shelfStats[0]
  let closestDistance = Math.abs(closestShelf.medianPartNumber - partNumberValue)
  
  for (const shelf of shelfStats) {
    const distance = Math.abs(shelf.medianPartNumber - partNumberValue)
    if (distance < closestDistance) {
      closestDistance = distance
      closestShelf = shelf
    }
  }
  
  return closestShelf
}

/**
 * Find neighboring shelves for a given part number
 * Returns the shelves that should come before and after
 */
export function findNeighboringPartNumbers(
  partNumber: string,
  items: InventoryItem[]
): { before: { partNumber: string; location: string } | null; after: { partNumber: string; location: string } | null } {
  const partNumberValue = partNumberToNumeric(partNumber)
  if (partNumberValue === 0) {
    return { before: null, after: null }
  }
  
  // Build a sorted list of all part numbers with their locations
  const sortedItems = items
    .filter(item => partNumberToNumeric(item.partNumber) > 0)
    .map(item => ({
      partNumber: item.partNumber,
      location: item.location,
      value: partNumberToNumeric(item.partNumber),
    }))
    .sort((a, b) => a.value - b.value)
  
  // Find the items that should come before and after this part number
  let before: { partNumber: string; location: string } | null = null
  let after: { partNumber: string; location: string } | null = null
  
  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i]
    
    if (item.value < partNumberValue) {
      before = { partNumber: item.partNumber, location: item.location }
    } else if (item.value > partNumberValue && !after) {
      after = { partNumber: item.partNumber, location: item.location }
      break
    }
  }
  
  return { before, after }
}

/**
 * Get the rank of a shelf unit in the learned order
 */
export function getShelfRank(shelfUnit: string, shelfStats: ShelfStats[]): number {
  const shelf = shelfStats.find(s => s.shelfUnit === shelfUnit)
  return shelf?.rank || 999
}

/**
 * Get shelf statistics for a given shelf unit
 */
export function getShelfStats(shelfUnit: string, shelfStats: ShelfStats[]): ShelfStats | null {
  return shelfStats.find(s => s.shelfUnit === shelfUnit) || null
}
