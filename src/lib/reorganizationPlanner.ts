/**
 * Reorganization Planner
 * 
 * Generates actionable plans to fix all misplaced items in the inventory.
 * Organizes moves by source shelf, optimizes move order, and detects conflicts.
 */

import { InventoryItem, MisplacementAnalysis, MoveInstruction, ReorganizationPlan } from '../types/inventory'
import { detectAllMisplacements, getMisplacementSummary } from './misplacementDetector'

/**
 * Generate a unique ID for a move instruction
 */
function generateMoveId(): string {
  return `move-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique ID for a reorganization plan
 */
function generatePlanId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Convert a misplacement analysis to a move instruction
 */
function misplacementToMove(
  misplacement: MisplacementAnalysis,
  sequence: number
): MoveInstruction {
  return {
    id: generateMoveId(),
    partNumber: misplacement.item.partNumber,
    fromLocation: misplacement.item.location,
    toLocation: misplacement.suggestedLocation,
    priority: misplacement.priority,
    sequence,
    completed: false,
  }
}

/**
 * Optimize the order of moves for efficient execution
 * Groups moves by source shelf so workers can clear one shelf at a time
 */
export function optimizeMoveOrder(moves: MoveInstruction[]): MoveInstruction[] {
  // Group by source shelf (from location)
  const bySourceShelf = new Map<string, MoveInstruction[]>()
  
  for (const move of moves) {
    // Extract shelf from location (remove level)
    const parts = move.fromLocation.split('-')
    const shelfUnit = parts.slice(0, -1).join('-')
    
    if (!bySourceShelf.has(shelfUnit)) {
      bySourceShelf.set(shelfUnit, [])
    }
    bySourceShelf.get(shelfUnit)!.push(move)
  }
  
  // Sort each group by priority (high first), then by part number
  for (const [, shelfMoves] of bySourceShelf) {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    shelfMoves.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return a.partNumber.localeCompare(b.partNumber)
    })
  }
  
  // Combine all moves, shelf by shelf
  const optimizedMoves: MoveInstruction[] = []
  let sequence = 1
  
  // Sort shelves by the number of moves (fewest first to build momentum)
  const sortedShelves = [...bySourceShelf.entries()]
    .sort((a, b) => a[1].length - b[1].length)
  
  for (const [, shelfMoves] of sortedShelves) {
    for (const move of shelfMoves) {
      optimizedMoves.push({
        ...move,
        sequence,
      })
      sequence++
    }
  }
  
  return optimizedMoves
}

/**
 * Detect potential conflicts in the move plan
 * Examples: circular moves, capacity issues, etc.
 */
export function detectConflicts(moves: MoveInstruction[]): string[] {
  const warnings: string[] = []
  
  // Check for circular moves (A -> B, B -> A)
  const moveMap = new Map<string, string>() // fromLocation -> toLocation
  for (const move of moves) {
    moveMap.set(move.fromLocation, move.toLocation)
  }
  
  for (const [from, to] of moveMap) {
    const returnMove = moveMap.get(to)
    if (returnMove && returnMove === from) {
      warnings.push(`Circular move detected: items moving between ${from} and ${to}`)
    }
  }
  
  // Check for multiple items moving to the same location
  const toLocationCounts = new Map<string, number>()
  for (const move of moves) {
    const count = toLocationCounts.get(move.toLocation) || 0
    toLocationCounts.set(move.toLocation, count + 1)
  }
  
  for (const [location, count] of toLocationCounts) {
    if (count > 5) {
      warnings.push(`${count} items moving to ${location} - check capacity`)
    }
  }
  
  // Check for high priority items with long moves
  const longHighPriorityMoves = moves.filter(m => {
    if (m.priority !== 'high') return false
    // Count parts in from/to to estimate distance
    const fromParts = m.fromLocation.split('-')
    const toParts = m.toLocation.split('-')
    // If shelf units are very different, it's a long move
    return fromParts[0] !== toParts[0]
  })
  
  if (longHighPriorityMoves.length > 0) {
    warnings.push(`${longHighPriorityMoves.length} high priority items require moves to different areas`)
  }
  
  return warnings
}

/**
 * Estimate time to complete the reorganization
 * Assumes approximately 1 minute per move
 */
function estimateTime(totalMoves: number): number {
  return Math.ceil(totalMoves * 1) // 1 minute per move
}

/**
 * Generate a complete reorganization plan from inventory data
 */
export function generateReorgPlan(
  items: InventoryItem[],
  name?: string,
  minRankDifference: number = 1
): ReorganizationPlan {
  // Detect all misplacements
  const misplacements = detectAllMisplacements(items, minRankDifference)
  const summary = getMisplacementSummary(misplacements)
  
  // Convert to move instructions
  const moves = misplacements.map((m, i) => misplacementToMove(m, i + 1))
  
  // Optimize move order
  const optimizedMoves = optimizeMoveOrder(moves)
  
  // Detect conflicts
  const warnings = detectConflicts(optimizedMoves)
  
  // Create the plan
  return {
    id: generatePlanId(),
    name: name || `Reorganization Plan - ${new Date().toLocaleDateString()}`,
    createdAt: new Date(),
    moves: optimizedMoves,
    summary: {
      totalMoves: optimizedMoves.length,
      shelvesAffected: summary.shelvesAffected.size,
      estimatedMinutes: estimateTime(optimizedMoves.length),
      highPriority: summary.high,
      mediumPriority: summary.medium,
      lowPriority: summary.low,
    },
    completedMoves: 0,
    warnings,
  }
}

/**
 * Mark a move as completed and update the plan
 */
export function completeMoveInPlan(
  plan: ReorganizationPlan,
  moveId: string
): ReorganizationPlan {
  const updatedMoves = plan.moves.map(move => {
    if (move.id === moveId) {
      return { ...move, completed: true }
    }
    return move
  })
  
  const completedCount = updatedMoves.filter(m => m.completed).length
  
  return {
    ...plan,
    moves: updatedMoves,
    completedMoves: completedCount,
  }
}

/**
 * Get moves grouped by source shelf
 */
export function getMovesBySourceShelf(
  plan: ReorganizationPlan
): Map<string, MoveInstruction[]> {
  const byShelf = new Map<string, MoveInstruction[]>()
  
  for (const move of plan.moves) {
    const parts = move.fromLocation.split('-')
    const shelfUnit = parts.slice(0, -1).join('-')
    
    if (!byShelf.has(shelfUnit)) {
      byShelf.set(shelfUnit, [])
    }
    byShelf.get(shelfUnit)!.push(move)
  }
  
  return byShelf
}

/**
 * Export a reorganization plan as CSV
 */
export function exportPlanAsCsv(plan: ReorganizationPlan): string {
  const headers = ['Sequence', 'Priority', 'Part Number', 'From Location', 'To Location', 'Completed']
  const rows = plan.moves.map(move => [
    move.sequence.toString(),
    move.priority,
    move.partNumber,
    move.fromLocation,
    move.toLocation,
    move.completed ? 'Yes' : 'No',
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')
  
  return csvContent
}

/**
 * Export a reorganization plan as printable text
 */
export function exportPlanAsText(plan: ReorganizationPlan): string {
  const lines: string[] = []
  
  lines.push('=' .repeat(60))
  lines.push(`REORGANIZATION PLAN: ${plan.name}`)
  lines.push(`Created: ${plan.createdAt.toLocaleString()}`)
  lines.push('='.repeat(60))
  lines.push('')
  lines.push('SUMMARY')
  lines.push('-'.repeat(40))
  lines.push(`Total Moves: ${plan.summary.totalMoves}`)
  lines.push(`Shelves Affected: ${plan.summary.shelvesAffected}`)
  lines.push(`Estimated Time: ${plan.summary.estimatedMinutes} minutes`)
  lines.push(`High Priority: ${plan.summary.highPriority}`)
  lines.push(`Medium Priority: ${plan.summary.mediumPriority}`)
  lines.push(`Low Priority: ${plan.summary.lowPriority}`)
  lines.push('')
  
  if (plan.warnings.length > 0) {
    lines.push('WARNINGS')
    lines.push('-'.repeat(40))
    for (const warning of plan.warnings) {
      lines.push(`! ${warning}`)
    }
    lines.push('')
  }
  
  lines.push('MOVES')
  lines.push('-'.repeat(40))
  
  // Group by source shelf
  const byShelf = getMovesBySourceShelf(plan)
  
  for (const [shelfUnit, moves] of byShelf) {
    lines.push('')
    lines.push(`FROM: ${shelfUnit}`)
    for (const move of moves) {
      const status = move.completed ? '[X]' : '[ ]'
      const priority = move.priority.toUpperCase().padEnd(6)
      lines.push(`  ${status} #${move.sequence} ${priority} ${move.partNumber} -> ${move.toLocation}`)
    }
  }
  
  lines.push('')
  lines.push('='.repeat(60))
  
  return lines.join('\n')
}

/**
 * Filter moves by priority
 */
export function filterMovesByPriority(
  plan: ReorganizationPlan,
  priorities: Array<'high' | 'medium' | 'low'>
): MoveInstruction[] {
  return plan.moves.filter(move => priorities.includes(move.priority))
}

/**
 * Get progress statistics for a plan
 */
export function getPlanProgress(plan: ReorganizationPlan): {
  total: number
  completed: number
  remaining: number
  percentComplete: number
  byPriority: {
    high: { total: number; completed: number }
    medium: { total: number; completed: number }
    low: { total: number; completed: number }
  }
} {
  const completed = plan.moves.filter(m => m.completed)
  const byPriority = {
    high: { total: 0, completed: 0 },
    medium: { total: 0, completed: 0 },
    low: { total: 0, completed: 0 },
  }
  
  for (const move of plan.moves) {
    byPriority[move.priority].total++
    if (move.completed) {
      byPriority[move.priority].completed++
    }
  }
  
  return {
    total: plan.moves.length,
    completed: completed.length,
    remaining: plan.moves.length - completed.length,
    percentComplete: plan.moves.length > 0
      ? Math.round((completed.length / plan.moves.length) * 100)
      : 100,
    byPriority,
  }
}
