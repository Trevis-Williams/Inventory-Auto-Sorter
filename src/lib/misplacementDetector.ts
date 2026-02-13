/**
 * Misplacement Detector
 * 
 * Analyzes inventory items to detect which ones are on the wrong shelf
 * based on the learned shelf order. Uses part number patterns and shelf statistics
 * to identify misplaced items with confidence levels.
 */

import { InventoryItem, MisplacementAnalysis, ShelfStats } from '../types/inventory'
import { extractShelfUnit } from './locationParser'
import { partNumberToNumeric } from './patternLearner'
import {
  calculateShelfStats,
  getIdealShelfForPartNumber,
  findNeighboringPartNumbers,
  getShelfRank,
  getShelfStats,
} from './shelfOrderLearner'

/**
 * Determine the priority of a misplacement based on rank difference
 */
export function determinePriority(rankDifference: number): 'high' | 'medium' | 'low' {
  if (rankDifference >= 4) return 'high'
  if (rankDifference >= 2) return 'medium'
  return 'low'
}

/**
 * Calculate the confidence that an item is misplaced
 * Based on how far the part number is from the shelf's expected range
 */
export function calculateMisplacementConfidence(
  partNumberValue: number,
  currentShelf: ShelfStats,
  idealShelf: ShelfStats | null,
  rankDifference: number,
  totalShelves: number
): number {
  let confidence = 0
  
  // Base confidence from rank difference
  const rankRatio = totalShelves > 1 ? rankDifference / totalShelves : 0
  if (rankRatio >= 0.3) {
    confidence = 80
  } else if (rankRatio >= 0.2) {
    confidence = 60
  } else if (rankRatio >= 0.1) {
    confidence = 40
  } else {
    confidence = 20
  }
  
  // Adjust based on whether part number is outside the current shelf's range
  const { min, max } = currentShelf.partNumberRange
  if (partNumberValue < min || partNumberValue > max) {
    confidence = Math.min(100, confidence + 15)
  }
  
  // Adjust based on ideal shelf confidence
  if (idealShelf && idealShelf.confidence >= 80) {
    confidence = Math.min(100, confidence + 10)
  }
  
  return Math.round(confidence)
}

/**
 * Generate a human-readable explanation for why an item is misplaced
 */
export function generateExplanation(
  partNumber: string,
  currentShelfUnit: string,
  idealShelf: ShelfStats | null,
  rankDifference: number
): string {
  if (!idealShelf) {
    return 'Unable to determine ideal location'
  }
  
  if (rankDifference === 0) {
    return 'Item appears to be in the correct location'
  }
  
  const direction = rankDifference > 0 ? 'earlier' : 'later'
  const distance = Math.abs(rankDifference)
  
  return `Part number ${partNumber} should be on ${idealShelf.shelfUnit} (${distance} shelf${distance !== 1 ? 's' : ''} ${direction})`
}

/**
 * Find the best suggested location for a misplaced item
 * Returns a specific location code if possible
 */
export function suggestLocation(
  idealShelf: ShelfStats | null,
  items: InventoryItem[]
): string {
  if (!idealShelf) return 'Unknown'
  
  // Find an existing location on the ideal shelf
  const itemsOnIdealShelf = items.filter(item => {
    const shelfUnit = extractShelfUnit(item.location)
    return shelfUnit === idealShelf.shelfUnit
  })
  
  if (itemsOnIdealShelf.length > 0) {
    // Return one of the locations on the ideal shelf
    return itemsOnIdealShelf[0].location
  }
  
  // Construct a location code (add level "A" as default)
  return `${idealShelf.shelfUnit}-A`
}

/**
 * Analyze a single item to determine if it's misplaced
 */
export function analyzeMisplacement(
  item: InventoryItem,
  shelfStats: ShelfStats[],
  allItems: InventoryItem[]
): MisplacementAnalysis {
  const partNumberValue = partNumberToNumeric(item.partNumber)
  const currentShelfUnit = extractShelfUnit(item.location)
  const currentRank = getShelfRank(currentShelfUnit, shelfStats)
  const currentShelf = getShelfStats(currentShelfUnit, shelfStats)
  
  // Find the ideal shelf for this part number
  const idealShelf = getIdealShelfForPartNumber(item.partNumber, shelfStats)
  const idealRank = idealShelf?.rank || currentRank
  const rankDifference = currentRank - idealRank
  
  // Determine if misplaced
  const isMisplaced = Math.abs(rankDifference) >= 1 && idealShelf !== null
  
  // Find neighboring part numbers
  const neighbors = findNeighboringPartNumbers(item.partNumber, allItems)
  
  // Calculate priority and confidence
  const priority = determinePriority(Math.abs(rankDifference))
  const confidence = currentShelf
    ? calculateMisplacementConfidence(
        partNumberValue,
        currentShelf,
        idealShelf,
        Math.abs(rankDifference),
        shelfStats.length
      )
    : 50
  
  // Generate explanation
  const explanation = generateExplanation(
    item.partNumber,
    currentShelfUnit,
    idealShelf,
    rankDifference
  )
  
  // Get suggested location
  const suggestedLocation = suggestLocation(idealShelf, allItems)
  
  return {
    item,
    isMisplaced,
    priority,
    confidence,
    currentShelfUnit,
    currentRank,
    suggestedShelfUnit: idealShelf?.shelfUnit || null,
    suggestedRank: idealRank,
    suggestedLocation,
    rankDifference: Math.abs(rankDifference),
    neighbors,
    explanation,
  }
}

/**
 * Detect all misplaced items in the inventory
 * Returns a list of misplacement analyses sorted by priority
 */
export function detectAllMisplacements(
  items: InventoryItem[],
  minRankDifference: number = 1
): MisplacementAnalysis[] {
  if (items.length === 0) {
    return []
  }
  
  // Calculate shelf statistics
  const shelfStats = calculateShelfStats(items)
  
  if (shelfStats.length === 0) {
    return []
  }
  
  // Sort by median to assign ranks
  shelfStats.sort((a, b) => a.medianPartNumber - b.medianPartNumber)
  for (let i = 0; i < shelfStats.length; i++) {
    shelfStats[i].rank = i + 1
  }
  
  // Analyze each item
  const misplacements: MisplacementAnalysis[] = []
  
  for (const item of items) {
    const analysis = analyzeMisplacement(item, shelfStats, items)
    
    if (analysis.isMisplaced && analysis.rankDifference >= minRankDifference) {
      misplacements.push(analysis)
    }
  }
  
  // Sort by priority (high first), then by confidence (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  misplacements.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return b.confidence - a.confidence
  })
  
  return misplacements
}

/**
 * Get a summary of misplacements by priority
 */
export function getMisplacementSummary(misplacements: MisplacementAnalysis[]): {
  total: number
  high: number
  medium: number
  low: number
  shelvesAffected: Set<string>
} {
  const summary = {
    total: misplacements.length,
    high: 0,
    medium: 0,
    low: 0,
    shelvesAffected: new Set<string>(),
  }
  
  for (const m of misplacements) {
    summary[m.priority]++
    summary.shelvesAffected.add(m.currentShelfUnit)
  }
  
  return summary
}
