/**
 * Placement Suggester
 * 
 * Suggests the best location for new part numbers based on the learned shelf order.
 * Provides primary and alternative suggestions with confidence levels and
 * neighboring part number information.
 */

import { InventoryItem, ShelfStats } from '../types/inventory'
import { extractShelfUnit } from './locationParser'
import { partNumberToNumeric } from './patternLearner'
import { parsePartNumber } from './sequenceAnalyzer'
import {
  calculateShelfStats,
  findNeighboringPartNumbers,
  getIdealShelfForPartNumber,
} from './shelfOrderLearner'

/**
 * Placement suggestion result
 */
export interface PlacementSuggestion {
  partNumber: string
  isValid: boolean
  primarySuggestion: {
    location: string
    shelfUnit: string
    level: string
    confidence: number
    reasoning: string[]
  } | null
  alternatives: Array<{
    location: string
    confidence: number
    reason: string
  }>
  neighbors: {
    before: { partNumber: string; location: string } | null
    after: { partNumber: string; location: string } | null
  }
  existsInInventory: boolean
  existingLocation: string | null
}

/**
 * Find the best level on a shelf for a given part number
 * Considers what's already on each level to suggest optimal placement
 */
export function findBestLevel(
  shelfUnit: string,
  partNumber: string,
  items: InventoryItem[]
): string {
  const partNumberValue = partNumberToNumeric(partNumber)
  
  // Get all items on this shelf grouped by level
  const itemsByLevel = new Map<string, InventoryItem[]>()
  
  for (const item of items) {
    const itemShelfUnit = extractShelfUnit(item.location)
    if (itemShelfUnit !== shelfUnit) continue
    
    // Extract level from location (last character)
    const parts = item.location.split('-')
    const level = parts[parts.length - 1]
    
    if (!itemsByLevel.has(level)) {
      itemsByLevel.set(level, [])
    }
    itemsByLevel.get(level)!.push(item)
  }
  
  // If no items on this shelf yet, suggest level A
  if (itemsByLevel.size === 0) {
    return 'A'
  }
  
  // Find the level where this part number would fit best (between existing items)
  let bestLevel = 'A'
  let bestScore = Infinity
  
  for (const [level, levelItems] of itemsByLevel) {
    const partNumberValues = levelItems.map(i => partNumberToNumeric(i.partNumber))
    const min = Math.min(...partNumberValues)
    const max = Math.max(...partNumberValues)
    const median = (min + max) / 2
    
    // Score is distance from median - lower is better
    const distance = Math.abs(partNumberValue - median)
    if (distance < bestScore) {
      bestScore = distance
      bestLevel = level
    }
  }
  
  return bestLevel
}

/**
 * Calculate confidence for a placement suggestion
 */
function calculatePlacementConfidence(
  idealShelf: ShelfStats | null,
  partNumberValue: number,
  shelfStats: ShelfStats[]
): number {
  if (!idealShelf || shelfStats.length === 0) {
    return 0
  }
  
  // Base confidence from shelf's own confidence
  let confidence = idealShelf.confidence
  
  // Adjust based on whether part number falls within the shelf's range
  const { min, max } = idealShelf.partNumberRange
  if (partNumberValue >= min && partNumberValue <= max) {
    confidence = Math.min(100, confidence + 15)
  } else {
    // Check distance from range
    const distanceFromRange = Math.min(
      Math.abs(partNumberValue - min),
      Math.abs(partNumberValue - max)
    )
    const rangeSize = max - min
    const relativeDistance = rangeSize > 0 ? distanceFromRange / rangeSize : 1
    
    if (relativeDistance > 0.5) {
      confidence = Math.max(0, confidence - 20)
    } else if (relativeDistance > 0.25) {
      confidence = Math.max(0, confidence - 10)
    }
  }
  
  return Math.round(confidence)
}

/**
 * Generate reasoning for why a location is suggested
 */
function generateReasoning(
  partNumber: string,
  idealShelf: ShelfStats,
  neighbors: { before: { partNumber: string; location: string } | null; after: { partNumber: string; location: string } | null }
): string[] {
  const reasons: string[] = []
  
  const { min, max } = idealShelf.partNumberRange
  const partNumberValue = partNumberToNumeric(partNumber)
  
  if (partNumberValue >= min && partNumberValue <= max) {
    reasons.push(`Part number falls within shelf's range (${formatPartNumberValue(min)} - ${formatPartNumberValue(max)})`)
  } else if (partNumberValue < min) {
    reasons.push(`Part number is lower than shelf's range (${formatPartNumberValue(min)}) but this is the best match`)
  } else {
    reasons.push(`Part number is higher than shelf's range (${formatPartNumberValue(max)}) but this is the best match`)
  }
  
  if (neighbors.before) {
    reasons.push(`Should come after ${neighbors.before.partNumber}`)
  }
  
  if (neighbors.after) {
    reasons.push(`Should come before ${neighbors.after.partNumber}`)
  }
  
  reasons.push(`Shelf contains ${idealShelf.itemCount} items with median part number ${formatPartNumberValue(idealShelf.medianPartNumber)}`)
  
  return reasons
}

/**
 * Format a numeric part number value back to string format for display
 */
function formatPartNumberValue(value: number): string {
  const prefix = Math.floor(value / 1000000)
  const number = value % 1000000
  return `${prefix}-${String(number).padStart(6, '0')}`
}

/**
 * Find alternative placement locations
 */
function findAlternatives(
  partNumber: string,
  idealShelf: ShelfStats | null,
  shelfStats: ShelfStats[],
  items: InventoryItem[],
  maxAlternatives: number = 3
): Array<{ location: string; confidence: number; reason: string }> {
  const partNumberValue = partNumberToNumeric(partNumber)
  const alternatives: Array<{ location: string; confidence: number; reason: string }> = []
  
  // Get sorted shelves by distance from part number value
  const shelvesWithDistance = shelfStats
    .filter(s => s !== idealShelf)
    .map(shelf => ({
      shelf,
      distance: Math.abs(shelf.medianPartNumber - partNumberValue),
    }))
    .sort((a, b) => a.distance - b.distance)
  
  for (const { shelf, distance } of shelvesWithDistance.slice(0, maxAlternatives)) {
    const level = findBestLevel(shelf.shelfUnit, partNumber, items)
    const location = `${shelf.shelfUnit}-${level}`
    
    // Calculate confidence based on distance
    const maxDistance = shelfStats.length > 1
      ? Math.max(...shelfStats.map(s => s.medianPartNumber)) - Math.min(...shelfStats.map(s => s.medianPartNumber))
      : 1
    const relativeDistance = maxDistance > 0 ? distance / maxDistance : 0
    const confidence = Math.round((1 - relativeDistance) * 70) // Max 70% for alternatives
    
    let reason = ''
    if (shelf.partNumberRange.min <= partNumberValue && partNumberValue <= shelf.partNumberRange.max) {
      reason = 'Part number falls within range'
    } else if (partNumberValue < shelf.partNumberRange.min) {
      reason = `Just below shelf range (min: ${formatPartNumberValue(shelf.partNumberRange.min)})`
    } else {
      reason = `Just above shelf range (max: ${formatPartNumberValue(shelf.partNumberRange.max)})`
    }
    
    alternatives.push({ location, confidence, reason })
  }
  
  return alternatives
}

/**
 * Suggest the best placement for a new part number
 */
export function suggestPlacement(
  partNumber: string,
  items: InventoryItem[]
): PlacementSuggestion {
  // Validate part number
  const parsed = parsePartNumber(partNumber)
  if (!parsed.isValid) {
    return {
      partNumber,
      isValid: false,
      primarySuggestion: null,
      alternatives: [],
      neighbors: { before: null, after: null },
      existsInInventory: false,
      existingLocation: null,
    }
  }
  
  // Check if part number already exists in inventory
  const existingItem = items.find(item => item.partNumber === partNumber)
  if (existingItem) {
    return {
      partNumber,
      isValid: true,
      primarySuggestion: null,
      alternatives: [],
      neighbors: findNeighboringPartNumbers(partNumber, items),
      existsInInventory: true,
      existingLocation: existingItem.location,
    }
  }
  
  // Calculate shelf statistics
  const shelfStats = calculateShelfStats(items)
  
  if (shelfStats.length === 0) {
    return {
      partNumber,
      isValid: true,
      primarySuggestion: null,
      alternatives: [],
      neighbors: { before: null, after: null },
      existsInInventory: false,
      existingLocation: null,
    }
  }
  
  // Sort by median and assign ranks
  shelfStats.sort((a, b) => a.medianPartNumber - b.medianPartNumber)
  for (let i = 0; i < shelfStats.length; i++) {
    shelfStats[i].rank = i + 1
  }
  
  // Find ideal shelf
  const idealShelf = getIdealShelfForPartNumber(partNumber, shelfStats)
  const partNumberValue = partNumberToNumeric(partNumber)
  
  // Find neighboring part numbers
  const neighbors = findNeighboringPartNumbers(partNumber, items)
  
  if (!idealShelf) {
    return {
      partNumber,
      isValid: true,
      primarySuggestion: null,
      alternatives: findAlternatives(partNumber, null, shelfStats, items),
      neighbors,
      existsInInventory: false,
      existingLocation: null,
    }
  }
  
  // Find best level on the shelf
  const level = findBestLevel(idealShelf.shelfUnit, partNumber, items)
  const location = `${idealShelf.shelfUnit}-${level}`
  
  // Calculate confidence
  const confidence = calculatePlacementConfidence(idealShelf, partNumberValue, shelfStats)
  
  // Generate reasoning
  const reasoning = generateReasoning(partNumber, idealShelf, neighbors)
  
  // Find alternatives
  const alternatives = findAlternatives(partNumber, idealShelf, shelfStats, items)
  
  return {
    partNumber,
    isValid: true,
    primarySuggestion: {
      location,
      shelfUnit: idealShelf.shelfUnit,
      level,
      confidence,
      reasoning,
    },
    alternatives,
    neighbors,
    existsInInventory: false,
    existingLocation: null,
  }
}

/**
 * Batch suggest placements for multiple part numbers
 */
export function suggestPlacementsBatch(
  partNumbers: string[],
  items: InventoryItem[]
): PlacementSuggestion[] {
  return partNumbers.map(partNumber => suggestPlacement(partNumber, items))
}
